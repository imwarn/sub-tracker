/**
 * Authentication handlers - OTP login
 */

import { errorResponse, successResponse, corsPreFlight } from '../utils/response.js';
import { getConfig, setConfig } from '../data/store.js';
import { getAuthNotificationChannel, sendNotifications } from '../services/notify.js';

const OTP_SEND_COOLDOWN_KEY = 'admin_auth_send_cooldown';

/**
 * Handle auth-related routes
 */
export async function handleAuth(request, env, path) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return corsPreFlight();
  }

  // POST /api/auth/send - Send OTP via configured notification channel
  if (path === '/api/auth/send' && request.method === 'POST') {
    return await sendOTP(env);
  }

  // POST /api/auth/verify - Verify OTP code
  if (path === '/api/auth/verify' && request.method === 'POST') {
    return await verifyOTP(request, env);
  }

  // POST /api/auth/logout - Revoke current session token
  if (path === '/api/auth/logout' && request.method === 'POST') {
    return await logoutSession(request, env);
  }

  // GET /api/auth/check - Check session validity
  if (path === '/api/auth/check' && request.method === 'GET') {
    return checkSession(request, env);
  }

  return null; // Not handled
}

function generateOTP() {
  const range = 900000;
  const max = 0xFFFFFFFF;
  const limit = max - (max % range);
  const values = new Uint32Array(1);

  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);

  return String(100000 + (values[0] % range));
}

function channelLabel(channel) {
  return {
    telegram: 'Telegram',
    bark: 'Bark',
    wecom: '企业微信',
    webhook: 'Webhook',
  }[channel] || '通知';
}

function channelRequirements(channel) {
  return {
    telegram: 'TG_BOT_TOKEN 和 TG_CHAT_ID',
    bark: 'BARK_KEY 或 BARK_URL',
    wecom: 'WECOM_WEBHOOK_URL',
    webhook: 'WEBHOOK_URL',
  }[channel] || 'Telegram、Bark、企业微信或 Webhook 中的一种';
}

/**
 * Send 6-digit OTP to configured notification channel.
 */
async function sendOTP(env) {
  const cooldown = await getConfig(env.DB, OTP_SEND_COOLDOWN_KEY);
  if (cooldown) {
    return errorResponse('验证码发送过于频繁，请稍后再试', 429);
  }

  const channel = await getAuthNotificationChannel(env);
  if (!channel) {
    return errorResponse(
      `未配置可用的登录验证码通道。请至少配置 Telegram、Bark、企业微信或 Webhook 中的一种。\n` +
      `1. Cloudflare Dashboard → Workers → Settings → Variables (推荐)\n` +
      `2. KV 数据库中手动添加对应键值对`,
      500
    );
  }

  const code = generateOTP();

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

  const results = await sendNotifications(env, text, {
    title: 'Sub-Tracker 安全验证',
    channel,
  });

  if (results.some(result => result.ok)) {
    await setConfig(env.DB, OTP_SEND_COOLDOWN_KEY, '1', { expirationTtl: 60 });
    return successResponse({ channel });
  }

  await env.DB.delete('admin_auth_code');
  await env.DB.delete('admin_auth_attempts');

  const failure = results.find(result => result.channel === channel);
  const detail = failure?.message ? `（${failure.message}）` : '';
  return errorResponse(
    `${channelLabel(channel)} 验证码发送失败${detail}，请检查 ${channelRequirements(channel)} 配置`,
    500
  );
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
      await env.DB.delete('admin_auth_attempts');
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

async function logoutSession(request, env) {
  const token = request.headers.get('Authorization');
  if (token) {
    await env.DB.delete(`session_token_${token}`);
  }
  return successResponse();
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
