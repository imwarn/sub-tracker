import assert from 'node:assert/strict';
import test from 'node:test';
import { generateQRCodeSVG, createQRMatrix } from '../src/utils/qrcode.js';

test('generateQRCodeSVG produces valid SVG markup for LPA strings', () => {
  const lpa = 'LPA:1$rsp.truphone.com$ABC-12345-DEF';
  const svg = generateQRCodeSVG(lpa, { size: 200 });

  assert.ok(typeof svg === 'string');
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('<rect'));
});

test('createQRMatrix returns a square matrix of booleans', () => {
  const matrix = createQRMatrix('LPA:1$test.com$code');
  assert.ok(Array.isArray(matrix));
  assert.ok(matrix.length > 20);
  assert.equal(matrix.length, matrix[0].length);
  assert.equal(typeof matrix[0][0], 'boolean');
});
