# Sub-Tracker

eSIM 保号、订阅费用和话费余额管理看板 — Cloudflare Workers + KV 单文件部署。

## 功能

- **三种类型独立管理**: eSIM 保号、订阅续费、话费余额（各自独立字段，不做统一 schema）
- **多币种**: CNY/USD/EUR/GBP/JPY 等 15 种货币，按币种分组统计
- **到期提醒**: 支持 Telegram / Bark / 企业微信 / Webhook 四通道通知，cron 每日 09:00 (北京时间) 检查
- **一键续期**: eSIM 和订阅类型支持按周期自动计算新到期日
- **话费充值**: 余额类型支持充值记录，自动重算预计停机日
- **导入导出**: JSON / CSV 格式，导入自动去重
- **OTP 登录**: 6 位验证码，5 次锁定，60s 冷却，30 天 session
- **PWA**: Service Worker 离线缓存，可添加到主屏幕
- **活动日志**: 记录所有 CRUD / 续期 / 充值 / 导入操作

## 架构

```
src/
  index.js            Worker 入口 (fetch + scheduled)
  router.js           路由分发
  handlers/
    auth.js           OTP 登录 (send/verify/logout/check)
    items.js          CRUD + 导出导入 + 续期充值 + 测试通知
    history.js        活动日志
  services/
    notify.js         多通道通知分发 (TG/Bark/企微/Webhook)
    telegram.js       Telegram Bot API + HTML 转义
    reminder.js       Cron 到期检查
  data/
    store.js          KV 操作（单 key JSON 数组）
    schema.js         校验、规范化、创建、合并更新
    constants.js      类型、货币、计费周期、提醒天数
  ui/
    template.js       完整 HTML+CSS+JS 前端（模板字面量）
    brand-assets.js   Base64 图标
  utils/
    response.js       CORS + 响应 helpers
    date.js           UTC+8 时区计算
    country.js        号码 → 国家映射
```

## 部署

### 方式一: Cloudflare Dashboard (推荐)

1. Fork 本仓库
2. Cloudflare Dashboard → Workers → Create → **Connect to Git**
3. 选择仓库，自动部署
4. Settings → Variables and Secrets 添加通知配置

### 方式二: Wrangler CLI

```bash
npm install
npm run dev          # 本地开发
npx wrangler deploy  # 部署到生产
```

### 通知配置 (Secrets)

通过 CF Dashboard → Settings → Variables and Secrets 设置:

| 变量 | 说明 |
|------|------|
| `TG_BOT_TOKEN` | Telegram Bot Token |
| `TG_CHAT_ID` | Telegram Chat ID |
| `BARK_KEY` 或 `BARK_URL` | Bark 推送 |
| `WECOM_WEBHOOK_URL` | 企业微信 Webhook |
| `WEBHOOK_URL` | 通用 Webhook |
| `ALLOWED_ORIGIN` | 允许的域名 (逗号分隔) |

### 定时任务

`0 1 * * *` UTC (北京时间 09:00) 自动检查到期提醒。

## 开发

```bash
npm run dev           # wrangler dev 本地调试
npm run build         # esbuild 打包
npm run build:icons   # 重新生成图标
npm test              # 运行测试
```

## 安全

- CORS: 动态 origin，不用 `*`
- OTP: crypto.getRandomValues + 重试限制 + 冷却期
- Session: UUID token, 30 天 TTL
- URL: `safeHref()` 阻止 javascript:/data:/vbscript: 协议
- 导入去重: 基于 id 的 Set 去重
- 所有用户输入通过 `esc()` HTML 转义

## License

MIT
