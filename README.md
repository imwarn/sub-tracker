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

## 🚀 一键部署（5 分钟）

Fork 后 **不用改任何文件**，只需配置 GitHub Secrets 即可自动部署。

### 第一步：Fork 仓库

点击右上角 **Fork** → 选择你的账号。

### 第二步：创建 KV 命名空间

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧 → **Workers & Pages** → **KV**
3. **Create a namespace**，名称填 `sub-tracker`
4. 复制生成的 **ID**（如 `09fe63fac...`）

### 第三步：获取 Cloudflare API Token

1. 访问 [API Tokens 页面](https://dash.cloudflare.com/profile/api-tokens)
2. **Create Token** → 选择 **Edit Cloudflare Workers** 模板
3. 复制生成的 Token

### 第四步：配置 GitHub Secrets

进入你 Fork 的仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret 名称 | 值 | 必填 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | 第三步的 API Token | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | [Dashboard 首页](https://dash.cloudflare.com/) 右侧可见 | ✅ |
| `KV_NAMESPACE_ID` | 第二步的 KV ID | ✅ |
| `TG_BOT_TOKEN` | @BotFather 获取的 Token | 可选* |
| `TG_CHAT_ID` | @userinfobot 获取的 ID | 可选* |

> *TG 密钥可在这里设置（推荐），也可以部署后在 Cloudflare Dashboard → Workers → Settings → Variables 中配置。

### 第五步：推送触发部署

```bash
# 随便改点什么触发 Actions（比如空提交）
git commit --allow-empty -m "trigger deploy"
git push origin main
```

进入仓库 **Actions** 标签页，等待绿色 ✅ 出现。

部署完成后，在 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **sub-tracker** → **Settings** → **Domains & Routes** 找到分配的域名访问。

> **此后每次 push 到 main 分支，都会自动重新部署，无需手动操作。**

---

## 🔑 配置说明

### TG 密钥配置（两种方式任选）

**方式 A：GitHub Secrets（推荐）**
- 设置 `TG_BOT_TOKEN` 和 `TG_CHAT_ID` 两个 Secret
- CI 自动注入为 Cloudflare Worker 环境变量
- 无需手动操作 Cloudflare

**方式 B：Cloudflare Dashboard**
- 部署后进入 Worker → Settings → Variables and Secrets
- 添加 `TG_BOT_TOKEN` 和 `TG_CHAT_ID` 两个环境变量
- 适合后续需要更换密钥的场景

> 两种方式都生效，代码会优先读取 Worker 环境变量，其次读 KV 数据库。

### KV 命名空间 ID

只在首次部署时需要配置一次。ID 写在 GitHub Secret 中，CI 自动注入 `wrangler.toml`。

---

## 🛠️ 本地开发

```bash
git clone https://github.com/你的用户名/sub-tracker.git
cd sub-tracker
npm install

# 登录 Cloudflare
npx wrangler login

# 创建 KV（如果还没有）
npx wrangler kv namespace create DB

# 本地开发（会读取 wrangler.toml 中的 KV ID）
npx wrangler dev

# 部署
npx wrangler deploy
```

---

## 📄 许可证

MIT License
