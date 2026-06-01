/**
 * Authentication handlers - Telegram OTP login
 */

import { errorResponse, successResponse, corsPreFlight } from '../utils/response.js';
import { getConfig, setConfig } from '../data/store.js';

/**
 * Handle auth-related routes
 */
export async function handleAuth(request, env, path) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return corsPreFlight();
  }

  // POST /api/auth/send - Send OTP via Telegram
  if (path === '/api/auth/send' && request.method === 'POST') {
    return await sendOTP(env);
  }

  // POST /api/auth/verify - Verify OTP code
  if (path === '/api/auth/verify' && request.method === 'POST') {
    return await verifyOTP(request, env);
  }

  // GET /api/auth/check - Check session validity
  if (path === '/api/auth/check' && request.method === 'GET') {
    return checkSession(request, env);
  }

  return null; // Not handled
}

/**
 * Get TG config from env vars or KV
 */
async function getTGConfig(env) {
  let token = env.TG_BOT_TOKEN;
  let chatId = env.TG_CHAT_ID;
  try {
    if (!token) token = await getConfig(env.DB, 'TG_BOT_TOKEN');
    if (!chatId) chatId = await getConfig(env.DB, 'TG_CHAT_ID');
  } catch {}
  return { token, chatId };
}

/**
 * Send 6-digit OTP to user's Telegram
 */
async function sendOTP(env) {
  const { token, chatId } = await getTGConfig(env);

  if (!token || !chatId) {
    const missing = [];
    if (!token) missing.push('TG_BOT_TOKEN');
    if (!chatId) missing.push('TG_CHAT_ID');
    return errorResponse(
      `环境缺失：缺少 ${missing.join(' 和 ')}。可通过以下方式配置：\n` +
      `1. Cloudflare Dashboard → Workers → Settings → Variables (推荐)\n` +
      `2. KV 数据库中手动添加这两个键值对`,
      500
    );
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store code with 5min TTL, reset attempts
  await setConfig(env.DB, 'admin_auth_code', code, { expirationTtl: 300 });
  await setConfig(env.DB, 'admin_auth_attempts', '0', { expirationTtl: 300 });

  const text = [
    '🔐 <b>【Sub-Tracker 安全验证】</b>',
    '',
    '有人正在尝试登录您的看板。',
    '',
    `您的动态验证码是：<code>${code}</code>`,
    '',
    '<i>(验证码 5 分钟内有效，连续输错 5 次将自动作废)</i>',
  ].join('\n');

  const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(tgUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });

  if (res.ok) {
    return successResponse();
  }
  return errorResponse('TG 消息发送失败，请检查 Bot Token 是否有效、是否已激活', 500);
}

/**
 * Verify OTP code and issue session token
 */
async function verifyOTP(request, env) {
  try {
    const { code } = await request.json();
    const storedCode = await getConfig(env.DB, 'admin_auth_code');

    let attempts = parseInt(await getConfig(env.DB, 'admin_auth_attempts')) || 0;
    if (attempts >= 5) {
      await env.DB.delete('admin_auth_code');
      return errorResponse('错误次数过多，验证码已作废。请重新获取！', 403);
    }

    if (!storedCode) {
      return errorResponse('请先获取验证码或验证码已过期', 400);
    }

    if (code && storedCode === code.toString()) {
      const token = crypto.randomUUID();
      await setConfig(env.DB, `session_token_${token}`, 'valid', { expirationTtl: 2592000 });
      await env.DB.delete('admin_auth_code');
      await env.DB.delete('admin_auth_attempts');
      return successResponse({ token });
    }

    // Wrong code
    attempts++;
    await setConfig(env.DB, 'admin_auth_attempts', attempts.toString(), { expirationTtl: 300 });
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
    return errorResponse(`验证码错误！剩余尝试次数: ${5 - attempts} 次`, 401);
  } catch {
    return errorResponse('校验失败', 500);
  }
}

/**
 * Check if a session token is valid
 */
async function checkSession(request, env) {
  const token = request.headers.get('Authorization');
  if (!token) return errorResponse('未登录', 401);

  const valid = await getConfig(env.DB, `session_token_${token}`);
  if (!valid) return errorResponse('会话已过期', 401);

  return successResponse();
}

/**
 * Middleware: validate session token from Authorization header
 * Returns null if valid, or an error Response if invalid
 */
export async function requireAuth(request, env) {
  const token = request.headers.get('Authorization');
  if (!token) return errorResponse('Unauthorized: Missing Token', 401);

  const valid = await getConfig(env.DB, `session_token_${token}`);
  if (!valid) return errorResponse('Unauthorized: Invalid or Expired Token', 401);

  return null; // Valid
}
