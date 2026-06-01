# 📱 Sub-Tracker

> **eSIM 保号 & 订阅费用管理看板**
>
> 基于 Cloudflare Workers + KV 构建，零成本、高颜值、极度安全的个人资产管理面板。

告别忘记充值、眼睁睁看着靓号被回收的惨痛经历！前端展示、后端 API、定时提醒逻辑，全部浓缩在一个 Worker 内。

## ✨ 核心功能

- 🔐 **TG 动态密码登录**：不在代码中写死密码，6位动态验证码，防爆破机制
- 📱 **eSIM 保号管理**：号码到期监控、一键续期、智能国旗匹配
- 💳 **订阅费用管理**：分类管理各类订阅服务，费用统计
- ⏰ **智能 Telegram 提醒**：到期前15天、当天、过期后，定时推送告警
- 🔄 **一键续期**：发完保号短信后，自动顺延到期日
- 🌍 **智能国旗匹配**：输入带区号的号码，自动显示对应国旗
- 🎨 **毛玻璃 UI**：深色渐变背景 + Glassmorphism 设计，手机/PC 自适应

---

## 🚀 一键部署（2 分钟）

<p align="center">
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/imwarn/sub-tracker">
    <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare">
  </a>
</p>

点击上方按钮，按页面提示操作：

1. **授权** Cloudflare 账号
2. **填写环境变量**（可选，也可部署后配置）：
   - `TG_BOT_TOKEN` — Telegram Bot Token
   - `TG_CHAT_ID` — Telegram Chat ID
3. 点击 **Deploy**

Cloudflare 会自动：
- ✅ 创建 KV 命名空间并绑定
- ✅ 构建并部署 Worker
- ✅ 配置 Cron 定时任务

部署完成后直接访问分配的 `*.workers.dev` 域名即可使用。

> **后续更新**：Fork 后 push 到 main，重新点击 Deploy 按钮即可同步。或使用 [GitHub Actions 自动部署](#github-actions-自动部署)。

---

## 🔑 环境变量配置

| 变量名 | 说明 | 必填 |
|---|---|---|
| `TG_BOT_TOKEN` | Telegram Bot Token（@BotFather 获取） | 推荐 |
| `TG_CHAT_ID` | Telegram Chat ID（@userinfobot 获取） | 推荐 |

**配置方式**（三选一）：

1. **Deploy 时填写** — 一键部署页面会提示
2. **CF Dashboard** — Workers → sub-tracker → Settings → Variables and Secrets
3. **KV 数据库** — 在 KV 中手动添加 `TG_BOT_TOKEN` / `TG_CHAT_ID` 键值对

> 代码优先读取 Worker 环境变量，其次读 KV 数据库。

---

## 🛠️ 其他部署方式

### GitHub Actions 自动部署

适合需要持续部署的场景（push main 自动同步）。

1. Fork 仓库
2. 添加 GitHub Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`
3. 推送即自动部署

详见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

### Wrangler CLI 本地开发

```bash
git clone https://github.com/imwarn/sub-tracker.git && cd sub-tracker
npm install
npx wrangler login
npx wrangler dev          # 本地开发
npx wrangler deploy       # 部署
```

---

## 📄 许可证

MIT License
