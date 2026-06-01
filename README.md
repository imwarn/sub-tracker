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

## 🚀 部署指南

### 准备工作

1. 一个 [Cloudflare](https://dash.cloudflare.com/) 账号
2. 一个 Telegram 账号，搜索 @BotFather 发送 `/newbot` 创建机器人，记录 **Bot Token**
3. 搜索 @userinfobot 发送任意消息，记录你的数字 **Chat ID**
4. **主动给你刚建的机器人发送任意一条消息激活它**

### 方式 1: Wrangler CLI (推荐)

```bash
# 1. 克隆仓库
git clone https://github.com/imwarn/sub-tracker.git
cd sub-tracker

# 2. 安装依赖
npm install

# 3. 创建 KV 命名空间
npx wrangler kv namespace create DB
# 记录输出的 ID，填入 wrangler.toml 的 id 字段

# 4. 配置 KV 中的 TG 密钥
npx wrangler kv key put TG_BOT_TOKEN "你的BotToken" --binding DB
npx wrangler kv key put TG_CHAT_ID "你的ChatID" --binding DB

# 5. 本地开发
npx wrangler dev

# 6. 部署
npx wrangler deploy
```

### 方式 2: CF Dashboard + Git

1. Fork 本仓库到你的 GitHub
2. 在 Cloudflare 创建 KV 命名空间，命名为 `DB`，记录 ID
3. 编辑 `wrangler.toml`，将 `id` 替换为你的真实 KV ID
4. 在 KV 中手动添加 `TG_BOT_TOKEN` 和 `TG_CHAT_ID`
5. CF Dashboard → Workers → Connect to Git → 选择仓库
6. Entry point 设为 `worker/worker.js`（需先运行 `npm run build`）
7. 点击部署，访问分配的域名即可使用

## 📄 许可证

MIT License
