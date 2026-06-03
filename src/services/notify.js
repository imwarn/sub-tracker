/**
 * Multi-channel notification service.
 */

import { getConfig } from '../data/store.js';
import { sendTelegram } from './telegram.js';

const CHANNELS = ['telegram', 'bark', 'wecom', 'webhook'];

async function config(env, key) {
  if (env[key]) return env[key];
  try {
    return await getConfig(env.DB, key);
  } catch {
    return '';
  }
}

function stripHTML(value) {
  return String(value == null ? '' : value)
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

async function sendBark(env, title, text) {
  const barkUrl = await config(env, 'BARK_URL');
  const barkKey = await config(env, 'BARK_KEY');
  const barkServer = (await config(env, 'BARK_SERVER')) || 'https://api.day.app';
  const endpoint = barkUrl || (barkKey ? `${barkServer.replace(/\/$/, '')}/${encodeURIComponent(barkKey)}` : '');
  if (!endpoint) return null;

  return {
    channel: 'bark',
    ok: await postJSON(endpoint, {
      title,
      body: stripHTML(text),
      group: 'Sub-Tracker',
    }),
  };
}

async function sendWeCom(env, title, text) {
  const webhook = await config(env, 'WECOM_WEBHOOK_URL') || await config(env, 'WECHAT_WORK_WEBHOOK_URL');
  if (!webhook) return null;

  return {
    channel: 'wecom',
    ok: await postJSON(webhook, {
      msgtype: 'text',
      text: { content: `${title}\n\n${stripHTML(text)}` },
    }),
  };
}

async function sendGenericWebhook(env, title, text) {
  const webhook = await config(env, 'WEBHOOK_URL');
  if (!webhook) return null;

  return {
    channel: 'webhook',
    ok: await postJSON(webhook, {
      source: 'sub-tracker',
      title,
      text: stripHTML(text),
      html: text,
      timestamp: new Date().toISOString(),
    }),
  };
}

async function sendTelegramIfConfigured(env, text) {
  const token = await config(env, 'TG_BOT_TOKEN');
  const chatId = await config(env, 'TG_CHAT_ID');
  if (!token || !chatId) return null;

  return {
    channel: 'telegram',
    ok: await sendTelegram(token, chatId, text),
  };
}

function normalizeChannel(value, { allowAll = false } = {}) {
  const raw = String(value || '').trim().toLowerCase();
  if (allowAll && raw === 'all') return 'all';

  const aliases = {
    tg: 'telegram',
    telegram: 'telegram',
    bark: 'bark',
    wecom: 'wecom',
    wechat: 'wecom',
    wechat_work: 'wecom',
    wechatwork: 'wecom',
    qywx: 'wecom',
    webhook: 'webhook',
  };

  const channel = aliases[raw] || '';
  return CHANNELS.includes(channel) ? channel : '';
}

async function getDefaultNotificationMode(env) {
  return normalizeChannel(await config(env, 'DEFAULT_NOTIFY_CHANNEL'), { allowAll: true }) || 'all';
}

async function getTargetChannels(env, requestedChannel) {
  const requested = normalizeChannel(requestedChannel, { allowAll: true });
  const mode = requested || await getDefaultNotificationMode(env);

  if (mode === 'all') {
    return {
      channels: await getConfiguredNotificationChannels(env),
      explicit: false,
    };
  }

  return {
    channels: [mode],
    explicit: true,
  };
}

const SENDERS = {
  telegram: (env, title, text) => sendTelegramIfConfigured(env, text),
  bark: (env, title, text) => sendBark(env, title, text),
  wecom: (env, title, text) => sendWeCom(env, title, text),
  webhook: (env, title, text) => sendGenericWebhook(env, title, text),
};

export async function getConfiguredNotificationChannels(env) {
  const channels = [];
  if (await config(env, 'TG_BOT_TOKEN') && await config(env, 'TG_CHAT_ID')) channels.push('telegram');
  if (await config(env, 'BARK_URL') || await config(env, 'BARK_KEY')) channels.push('bark');
  if (await config(env, 'WECOM_WEBHOOK_URL') || await config(env, 'WECHAT_WORK_WEBHOOK_URL')) channels.push('wecom');
  if (await config(env, 'WEBHOOK_URL')) channels.push('webhook');
  return channels;
}

export async function getAuthNotificationChannel(env) {
  const authChannel = normalizeChannel(await config(env, 'AUTH_NOTIFY_CHANNEL'));
  if (authChannel) return authChannel;

  const defaultMode = await getDefaultNotificationMode(env);
  if (defaultMode !== 'all') return defaultMode;

  const configured = await getConfiguredNotificationChannels(env);
  return configured.includes('telegram') ? 'telegram' : (configured[0] || '');
}

export async function sendNotifications(env, text, options = {}) {
  const title = options.title || 'Sub-Tracker';
  const { channels, explicit } = await getTargetChannels(env, options.channel);

  const results = [];
  for (const channel of channels) {
    try {
      const result = await SENDERS[channel](env, title, text);
      if (result) results.push(result);
      else if (explicit) results.push({ channel, ok: false, message: '通知渠道未配置' });
    } catch (err) {
      results.push({ channel, ok: false, message: err.message });
    }
  }
  return results;
}
