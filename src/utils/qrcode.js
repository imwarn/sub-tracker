/**
 * Lightweight pure JavaScript QR Code SVG Generator (Zero dependencies).
 * Supports Byte mode (UTF-8/ASCII) with Error Correction Level M/L.
 * Generates clean SVG markup that can be directly inserted into innerHTML.
 */

export function getQRCodeClientScript() {
  return `
function generateQRCodeSVG(text, options) {
  options = options || {};
  var size = options.size || 220;
  var margin = options.margin !== undefined ? options.margin : 2;
  var darkColor = options.darkColor || '#0f172a';
  var lightColor = options.lightColor || '#ffffff';
  if (!text) return '';
  
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      EXP[i + 255] = x;
      LOG[x] = i;
      x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
    }
  })();
  function gfMul(x, y) { return x === 0 || y === 0 ? 0 : EXP[LOG[x] + LOG[y]]; }
  function rsGenPoly(n) {
    var poly = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= gfMul(poly[j], EXP[i]);
        next[j + 1] ^= poly[j];
      }
      poly = next;
    }
    return poly;
  }
  function rsEncode(data, ecCount) {
    var gen = rsGenPoly(ecCount);
    var res = new Array(ecCount).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ res[0];
      res.shift();
      res.push(0);
      for (var j = 0; j < ecCount; j++) {
        res[j] ^= gfMul(gen[j + 1], factor);
      }
    }
    return res;
  }
  var VERSION_SPECS = [
    null,
    { ver: 1, size: 21, totalCW: 26, ecCW: 10, blocks: 1, cap: 14 },
    { ver: 2, size: 25, totalCW: 44, ecCW: 16, blocks: 1, cap: 26 },
    { ver: 3, size: 29, totalCW: 70, ecCW: 26, blocks: 1, cap: 42 },
    { ver: 4, size: 33, totalCW: 100, ecCW: 18, blocks: 2, cap: 62 },
    { ver: 5, size: 37, totalCW: 134, ecCW: 24, blocks: 2, cap: 84 },
    { ver: 6, size: 41, totalCW: 172, ecCW: 16, blocks: 4, cap: 106 },
    { ver: 7, size: 45, totalCW: 196, ecCW: 18, blocks: 4, cap: 122 },
    { ver: 8, size: 49, totalCW: 242, ecCW: 22, blocks: 4, cap: 152 },
    { ver: 9, size: 53, totalCW: 292, ecCW: 22, blocks: 5, cap: 180 },
    { ver: 10, size: 57, totalCW: 346, ecCW: 26, blocks: 5, cap: 213 }
  ];
  function getAlign(ver) {
    if (ver === 1) return [];
    if (ver === 2) return [6, 18];
    if (ver === 3) return [6, 22];
    if (ver === 4) return [6, 26];
    if (ver === 5) return [6, 30];
    if (ver === 6) return [6, 34];
    if (ver === 7) return [6, 22, 38];
    if (ver === 8) return [6, 24, 42];
    if (ver === 9) return [6, 26, 46];
    if (ver === 10) return [6, 28, 50];
    return [6, ver * 4 + 10];
  }
  var utf8 = new TextEncoder().encode(text);
  var spec = null;
  for (var v = 1; v < VERSION_SPECS.length; v++) {
    if (utf8.length <= VERSION_SPECS[v].cap) { spec = VERSION_SPECS[v]; break; }
  }
  if (!spec) spec = VERSION_SPECS[VERSION_SPECS.length - 1];
  var bitBuf = [];
  function pushBits(val, len) {
    for (var i = len - 1; i >= 0; i--) bitBuf.push((val >> i) & 1);
  }
  pushBits(4, 4);
  pushBits(utf8.length, spec.ver < 10 ? 8 : 16);
  for (var i = 0; i < utf8.length; i++) pushBits(utf8[i], 8);
  var dataCWCapacity = spec.totalCW - spec.ecCW * spec.blocks;
  var dataBitCapacity = dataCWCapacity * 8;
  var termLen = Math.min(4, dataBitCapacity - bitBuf.length);
  for (var i = 0; i < termLen; i++) bitBuf.push(0);
  while (bitBuf.length % 8 !== 0) bitBuf.push(0);
  var padBytes = [236, 17];
  var padIdx = 0;
  while (bitBuf.length < dataBitCapacity) { pushBits(padBytes[padIdx % 2], 8); padIdx++; }
  var dataCW = [];
  for (var i = 0; i < bitBuf.length; i += 8) {
    var byte = 0;
    for (var b = 0; b < 8; b++) byte = (byte << 1) | bitBuf[i + b];
    dataCW.push(byte);
  }
  var numBlocks = spec.blocks;
  var blockSize = Math.floor(dataCW.length / numBlocks);
  var extraCW = dataCW.length % numBlocks;
  var dataBlocks = [], ecBlocks = [];
  var cwOffset = 0;
  for (var b = 0; b < numBlocks; b++) {
    var len = blockSize + (b >= numBlocks - extraCW ? 1 : 0);
    var blockData = dataCW.slice(cwOffset, cwOffset + len);
    cwOffset += len;
    dataBlocks.push(blockData);
    ecBlocks.push(rsEncode(blockData, spec.ecCW));
  }
  var finalCW = [];
  var maxDataLen = Math.max.apply(null, dataBlocks.map(function(b) { return b.length; }));
  for (var i = 0; i < maxDataLen; i++) {
    for (var b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) finalCW.push(dataBlocks[b][i]);
    }
  }
  for (var i = 0; i < spec.ecCW; i++) {
    for (var b = 0; b < numBlocks; b++) {
      finalCW.push(ecBlocks[b][i]);
    }
  }
  var N = spec.size;
  var matrix = Array.from({ length: N }, function() { return Array(N).fill(null); });
  var isFunction = Array.from({ length: N }, function() { return Array(N).fill(false); });
  function setFinder(row, col) {
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 7; c++) {
        var isDark = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        matrix[row + r][col + c] = isDark;
        isFunction[row + r][col + c] = true;
      }
    }
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && !isFunction[rr][cc]) {
          matrix[rr][cc] = false;
          isFunction[rr][cc] = true;
        }
      }
    }
  }
  setFinder(0, 0); setFinder(0, N - 7); setFinder(N - 7, 0);
  if (spec.ver >= 2) {
    var alignPos = getAlign(spec.ver);
    for (var ai = 0; ai < alignPos.length; ai++) {
      for (var aj = 0; aj < alignPos.length; aj++) {
        var r = alignPos[ai], c = alignPos[aj];
        if (isFunction[r][c]) continue;
        for (var dr = -2; dr <= 2; dr++) {
          for (var dc = -2; dc <= 2; dc++) {
            var isDark = dr === -2 || dr === 2 || dc === -2 || dc === 2 || (dr === 0 && dc === 0);
            matrix[r + dr][c + dc] = isDark;
            isFunction[r + dr][c + dc] = true;
          }
        }
      }
    }
  }
  for (var i = 8; i < N - 8; i++) {
    if (!isFunction[6][i]) { matrix[6][i] = i % 2 === 0; isFunction[6][i] = true; }
    if (!isFunction[i][6]) { matrix[i][6] = i % 2 === 0; isFunction[i][6] = true; }
  }
  matrix[4 * spec.ver + 9][8] = true; isFunction[4 * spec.ver + 9][8] = true;
  for (var i = 0; i < 9; i++) { if (!isFunction[8][i]) isFunction[8][i] = true; if (!isFunction[i][8]) isFunction[i][8] = true; }
  for (var i = 0; i < 8; i++) { if (!isFunction[8][N - 1 - i]) isFunction[8][N - 1 - i] = true; if (!isFunction[N - 1 - i][8]) isFunction[N - 1 - i] = true; }
  var bitIdx = 0, allBits = [];
  for (var i = 0; i < finalCW.length; i++) {
    for (var b = 7; b >= 0; b--) allBits.push((finalCW[i] >> b) & 1);
  }
  var right = N - 1, upwards = true;
  while (right > 0) {
    if (right === 6) right--;
    for (var step = 0; step < N; step++) {
      var row = upwards ? N - 1 - step : step;
      for (var ci = 0; ci < 2; ci++) {
        var col = right - ci;
        if (!isFunction[row][col]) {
          var bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          var mask = (row + col) % 2 === 0;
          matrix[row][col] = (bit ^ (mask ? 1 : 0)) === 1;
        }
      }
    }
    upwards = !upwards;
    right -= 2;
  }
  var formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  var formatPosTL = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
  for (var i = 0; i < 15; i++) { matrix[formatPosTL[i][0]][formatPosTL[i][1]] = formatBits[i] === 1; }
  var formatPosSplit = [[N-1,8],[N-2,8],[N-3,8],[N-4,8],[N-5,8],[N-6,8],[N-7,8],[8,N-8],[8,N-7],[8,N-6],[8,N-5],[8,N-4],[8,N-3],[8,N-2],[8,N-1]];
  for (var i = 0; i < 15; i++) { matrix[formatPosSplit[i][0]][formatPosSplit[i][1]] = formatBits[i] === 1; }
  
  var n = matrix.length;
  var total = n + margin * 2;
  var cellSize = size / total;
  var rects = '';
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      if (matrix[r][c]) {
        var x = (c + margin) * cellSize;
        var y = (r + margin) * cellSize;
        rects += '<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + cellSize.toFixed(2) + '" height="' + cellSize.toFixed(2) + '" fill="' + darkColor + '"/>';
      }
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges"><rect width="' + size + '" height="' + size + '" fill="' + lightColor + '" rx="12"/>' + rects + '</svg>';
}
`;
}

// QR Code Type Numbers & Tables (Byte mode)
// Simplified and robust QR Code Matrix Builder
export function generateQRCodeSVG(text, { size = 220, margin = 2, darkColor = '#0f172a', lightColor = '#ffffff' } = {}) {
  if (!text) return '';
  const matrix = createQRMatrix(text);
  const n = matrix.length;
  const total = n + margin * 2;
  const cellSize = size / total;

  let rects = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;
        rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${darkColor}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="${lightColor}" rx="12"/>` +
    rects +
    `</svg>`;
}

/* ==========================================================================
   Minimal QR Code Generator Engine (Versions 1-10, Byte Mode, EC Level L/M)
   ========================================================================== */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    EXP[i + 255] = x;
    LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
})();

function gfMul(x, y) {
  return x === 0 || y === 0 ? 0 : EXP[LOG[x] + LOG[y]];
}

function rsGenPoly(n) {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecCount) {
  const gen = rsGenPoly(ecCount);
  const res = new Array(ecCount).fill(0);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.shift();
    res.push(0);
    for (let j = 0; j < ecCount; j++) {
      res[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return res;
}

const VERSION_SPECS = [
  null,
  { ver: 1, size: 21, totalCW: 26, ecCW: 10, blocks: 1, cap: 14 },
  { ver: 2, size: 25, totalCW: 44, ecCW: 16, blocks: 1, cap: 26 },
  { ver: 3, size: 29, totalCW: 70, ecCW: 26, blocks: 1, cap: 42 },
  { ver: 4, size: 33, totalCW: 100, ecCW: 18, blocks: 2, cap: 62 },
  { ver: 5, size: 37, totalCW: 134, ecCW: 24, blocks: 2, cap: 84 },
  { ver: 6, size: 41, totalCW: 172, ecCW: 16, blocks: 4, cap: 106 },
  { ver: 7, size: 45, totalCW: 196, ecCW: 18, blocks: 4, cap: 122 },
  { ver: 8, size: 49, totalCW: 242, ecCW: 22, blocks: 4, cap: 152 },
  { ver: 9, size: 53, totalCW: 292, ecCW: 22, blocks: 5, cap: 180 },
  { ver: 10, size: 57, totalCW: 346, ecCW: 26, blocks: 5, cap: 213 },
];

export function createQRMatrix(text) {
  const utf8 = new TextEncoder().encode(text);
  let spec = null;
  for (let v = 1; v < VERSION_SPECS.length; v++) {
    if (utf8.length <= VERSION_SPECS[v].cap) {
      spec = VERSION_SPECS[v];
      break;
    }
  }
  if (!spec) spec = VERSION_SPECS[VERSION_SPECS.length - 1];

  const bitBuf = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) bitBuf.push((val >> i) & 1);
  }

  pushBits(0b0100, 4);
  const countBits = spec.ver < 10 ? 8 : 16;
  pushBits(utf8.length, countBits);
  for (const b of utf8) pushBits(b, 8);

  const dataCWCapacity = spec.totalCW - spec.ecCW * spec.blocks;
  const dataBitCapacity = dataCWCapacity * 8;

  const termLen = Math.min(4, dataBitCapacity - bitBuf.length);
  for (let i = 0; i < termLen; i++) bitBuf.push(0);

  while (bitBuf.length % 8 !== 0) bitBuf.push(0);

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitBuf.length < dataBitCapacity) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataCW = [];
  for (let i = 0; i < bitBuf.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bitBuf[i + b];
    dataCW.push(byte);
  }

  const numBlocks = spec.blocks;
  const blockSize = Math.floor(dataCW.length / numBlocks);
  const extraCW = dataCW.length % numBlocks;

  const dataBlocks = [];
  const ecBlocks = [];
  let cwOffset = 0;
  for (let b = 0; b < numBlocks; b++) {
    const len = blockSize + (b >= numBlocks - extraCW ? 1 : 0);
    const blockData = dataCW.slice(cwOffset, cwOffset + len);
    cwOffset += len;
    dataBlocks.push(blockData);
    ecBlocks.push(rsEncode(blockData, spec.ecCW));
  }

  const finalCW = [];
  const maxDataLen = Math.max(...dataBlocks.map(b => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b].length) finalCW.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < spec.ecCW; i++) {
    for (let b = 0; b < numBlocks; b++) {
      finalCW.push(ecBlocks[b][i]);
    }
  }

  const N = spec.size;
  const matrix = Array.from({ length: N }, () => Array(N).fill(null));
  const isFunction = Array.from({ length: N }, () => Array(N).fill(false));

  function setFinder(row, col) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isDark = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        matrix[row + r][col + c] = isDark;
        isFunction[row + r][col + c] = true;
      }
    }
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && !isFunction[rr][cc]) {
          matrix[rr][cc] = false;
          isFunction[rr][cc] = true;
        }
      }
    }
  }

  setFinder(0, 0);
  setFinder(0, N - 7);
  setFinder(N - 7, 0);

  if (spec.ver >= 2) {
    const alignPos = getAlignmentPositions(spec.ver);
    for (const r of alignPos) {
      for (const c of alignPos) {
        if (isFunction[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isDark = dr === -2 || dr === 2 || dc === -2 || dc === 2 || (dr === 0 && dc === 0);
            matrix[r + dr][c + dc] = isDark;
            isFunction[r + dr][c + dc] = true;
          }
        }
      }
    }
  }

  for (let i = 8; i < N - 8; i++) {
    if (!isFunction[6][i]) {
      matrix[6][i] = i % 2 === 0;
      isFunction[6][i] = true;
    }
    if (!isFunction[i][6]) {
      matrix[i][6] = i % 2 === 0;
      isFunction[i][6] = true;
    }
  }

  matrix[4 * spec.ver + 9][8] = true;
  isFunction[4 * spec.ver + 9][8] = true;

  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][N - 1 - i]) isFunction[8][N - 1 - i] = true;
    if (!isFunction[N - 1 - i][8]) isFunction[N - 1 - i] = true;
  }

  let bitIdx = 0;
  const allBits = [];
  for (const byte of finalCW) {
    for (let i = 7; i >= 0; i--) allBits.push((byte >> i) & 1);
  }

  let right = N - 1;
  let upwards = true;
  while (right > 0) {
    if (right === 6) right--;
    for (let step = 0; step < N; step++) {
      const row = upwards ? N - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (!isFunction[row][col]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = (bit ^ (mask ? 1 : 0)) === 1;
        }
      }
    }
    upwards = !upwards;
    right -= 2;
  }

  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  const formatPosTL = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatPosTL[i];
    matrix[r][c] = formatBits[i] === 1;
  }
  const formatPosSplit = [
    [N - 1, 8], [N - 2, 8], [N - 3, 8], [N - 4, 8], [N - 5, 8], [N - 6, 8], [N - 7, 8],
    [8, N - 8], [8, N - 7], [8, N - 6], [8, N - 5], [8, N - 4], [8, N - 3], [8, N - 2], [8, N - 1]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatPosSplit[i];
    matrix[r][c] = formatBits[i] === 1;
  }

  return matrix;
}

function getAlignmentPositions(ver) {
  if (ver === 1) return [];
  if (ver === 2) return [6, 18];
  if (ver === 3) return [6, 22];
  if (ver === 4) return [6, 26];
  if (ver === 5) return [6, 30];
  if (ver === 6) return [6, 34];
  if (ver === 7) return [6, 22, 38];
  if (ver === 8) return [6, 24, 42];
  if (ver === 9) return [6, 26, 46];
  if (ver === 10) return [6, 28, 50];
  return [6, ver * 4 + 10];
}
