# 📱 Sub-Tracker

> **eSIM 保号 & 订阅费用管理看板**
>
> 基于 Cloudflare Workers + KV 构建，零成本、高颜值、极度安全的个人资产管理面板。

告别忘记充值、眼睁睁看着靓号被回收的惨痛经历！前端展示、后端 API、定时提醒逻辑，全部浓缩在一个 Worker 内。

## ✨ 核心功能

- 🔐 **TG 动态密码登录**：不在代码中写死密码，6位动态验证码，防爆破机制
- 📱 **eSIM 保号管理**：号码到期监控、一键续期、智能区域识别
- 💳 **订阅费用管理**：分类管理各类订阅服务，费用统计
- 💰 **话费余额管理**：余额追踪、月租/扣费日管理、预计停机日计算、充值/校正
- ⏰ **智能 Telegram 提醒**：支持自定义提前提醒天数（30/15/7/3/1/当天），话费停机提醒
- 🔄 **一键续期**：发完保号短信后，自动顺延到期日
- 🌍 **智能区域识别**：输入带区号的号码，自动匹配 ISO 国家/地区代码
- 🎨 **毛玻璃 UI**：深色渐变背景 + Glassmorphism 设计，手机/PC 自适应

---

## 🚀 部署

### 方式一：Deploy 按钮（推荐新用户）

适合想直接使用、不关心代码的用户。点击后会自动 Fork 到你的账号并部署。

<p align="center">
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/imwarn/sub-tracker">
    <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare">
  </a>
</p>

> ⚠️ 如果提示"已存在同名仓库"，换个名字即可（如 `my-sub-tracker`）。

### 方式二：Connect to Git（推荐仓库 Owner）

适合 Fork 过仓库或自己维护仓库的用户。

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧 → **Workers & Pages** → **Create Application**
3. 选择 **Connect to Git** → 授权 GitHub → 选择仓库
4. Build 配置：
   - Root directory: **留空**
   - Build command: **留空** 或 `npm run build`
   - Entry point: **`src/index.js`**
5. 点击 **Save and Deploy**
6. 部署后进入 **Settings** → **Variables and Secrets**，添加：
   - `TG_BOT_TOKEN` — Telegram Bot Token
   - `TG_CHAT_ID` — Telegram Chat ID

> 此后 push 到 main 分支会自动重新部署。

### 方式三：Wrangler CLI（本地开发）

需要 Node.js 22 或更高版本。

```bash
git clone https://github.com/imwarn/sub-tracker.git && cd sub-tracker
npm install
npx wrangler login
npx wrangler dev          # 本地开发
npx wrangler deploy       # 部署
```

---

## 🔑 环境变量

| 变量名 | 说明 | 配置方式 |
|---|---|---|
| `TG_BOT_TOKEN` | Telegram Bot Token | Deploy 时填写 / CF Dashboard / KV |
| `TG_CHAT_ID` | Telegram Chat ID | 同上 |

代码优先读取 Worker 环境变量，其次读 KV 数据库。

---

## 📄 许可证

MIT License
