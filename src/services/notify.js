/**
 * Multi-channel notification service.
 */

import { getConfig } from '../data/store.js';
import { sendTelegram } from './telegram.js';

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

export async function getConfiguredNotificationChannels(env) {
  const channels = [];
  if (await config(env, 'TG_BOT_TOKEN') && await config(env, 'TG_CHAT_ID')) channels.push('telegram');
  if (await config(env, 'BARK_URL') || await config(env, 'BARK_KEY')) channels.push('bark');
  if (await config(env, 'WECOM_WEBHOOK_URL') || await config(env, 'WECHAT_WORK_WEBHOOK_URL')) channels.push('wecom');
  if (await config(env, 'WEBHOOK_URL')) channels.push('webhook');
  return channels;
}

export async function sendNotifications(env, text, options = {}) {
  const title = options.title || 'Sub-Tracker';
  const senders = [
    () => sendTelegramIfConfigured(env, text),
    () => sendBark(env, title, text),
    () => sendWeCom(env, title, text),
    () => sendGenericWebhook(env, title, text),
  ];

  const results = [];
  for (const sender of senders) {
    try {
      const result = await sender();
      if (result) results.push(result);
    } catch (err) {
      results.push({ channel: 'unknown', ok: false, message: err.message });
    }
  }
  return results;
}
