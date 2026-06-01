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

## 🚀 部署指南

### 准备工作

1. 一个 [Cloudflare](https://dash.cloudflare.com/) 账号
2. 一个 Telegram 账号：
   - 搜索 `@BotFather` → 发送 `/newbot` → 记录 **Bot Token**
   - 搜索 `@userinfobot` → 发送任意消息 → 记录你的数字 **Chat ID**
   - **主动给机器人发一条消息激活它**（机器人不能主动发起会话）

---

### 方式一：GitHub Actions 自动部署（推荐）

**优势**：push 到 main 分支即自动部署，Worker + Cron + KV 全部自动同步。

#### 第一步：Fork 仓库

Fork [imwarn/sub-tracker](https://github.com/imwarn/sub-tracker) 到你的 GitHub。

#### 第二步：创建 KV 命名空间

登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)：

1. 左侧菜单 → **Workers & Pages** → **KV**
2. 点击 **Create a namespace**，名称填 `sub-tracker`，点击添加
3. 复制生成的 **ID**（如 `09fe63fac...`）备用

#### 第三步：添加 TG 密钥到 KV

在刚才创建的 `sub-tracker` KV 命名空间中：

1. 点击 **KV Entries** 选项卡
2. 添加两条数据：
   - Key: `TG_BOT_TOKEN` → Value: 你的 Bot Token
   - Key: `TG_CHAT_ID` → Value: 你的 Chat ID

#### 第四步：获取 Cloudflare API Token

1. 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 **Create Token** → 使用 **Edit Cloudflare Workers** 模板
3. 记录生成的 Token

#### 第五步：配置 GitHub Secrets

在你 Fork 的仓库中：

1. 进入 **Settings** → **Secrets and variables** → **Actions**
2. 添加两个 Repository Secrets：
   - `CLOUDFLARE_API_TOKEN` → 上一步获取的 API Token
   - `CLOUDFLARE_ACCOUNT_ID` → 在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 右侧栏可见

#### 第六步：修改 wrangler.toml

编辑 `wrangler.toml`，将 `YOUR_KV_NAMESPACE_ID` 替换为第二步复制的真实 KV ID。

#### 第七步：推送部署

```bash
git push origin main
```

GitHub Actions 会自动触发部署。进入仓库 **Actions** 标签页可查看部署进度。

部署完成后，在 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** 中找到分配的域名，即可访问。

> **此后每次 push 到 main 分支，都会自动重新部署。**

---

### 方式二：Wrangler CLI 手动部署

适合本地开发调试。

```bash
# 1. 克隆仓库
git clone https://github.com/imwarn/sub-tracker.git
cd sub-tracker

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
npx wrangler login

# 4. 创建 KV 命名空间 (名称: sub-tracker)
npx wrangler kv namespace create DB
# 记录输出的 id，填入 wrangler.toml

# 5. 添加 TG 密钥
npx wrangler kv key put TG_BOT_TOKEN "你的BotToken" --binding DB
npx wrangler kv key put TG_CHAT_ID "你的ChatID" --binding DB

# 6. 本地开发
npx wrangler dev

# 7. 部署
npx wrangler deploy
```

---

### 方式三：CF Dashboard 手动部署

不推荐（无法自动同步），适合快速验证。

1. Fork 仓库 → 本地运行 `npm run build` → 提交 `worker/worker.js`
2. Cloudflare Dashboard → Workers & Pages → Create Application → Connect to Git
3. Entry point 设为 `worker/worker.js`
4. 手动在 KV 中添加 `TG_BOT_TOKEN` 和 `TG_CHAT_ID`

---

## 📄 许可证

MIT License
