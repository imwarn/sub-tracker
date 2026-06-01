# Sub-Tracker 架构设计

## 概述

Sub-Tracker 是一个基于 Cloudflare Workers + KV 的个人资产管理看板，融合了 eSIM 保号管理（Number-preservation）和订阅费用管理（laowang-subscription）的功能。

## 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 运行时 | Cloudflare Workers | 全球边缘节点，零冷启动 |
| 存储 | Cloudflare KV | 键值数据库，免费额度 100K 读/天 |
| 定时 | CF Cron Triggers | 每日自动检查到期提醒 |
| 前端 | 原生 HTML + TailwindCSS | 内嵌 Worker，无需额外托管 |
| 认证 | Telegram OTP | 6位动态码，防爆破机制 |

## 目录结构

```
sub-tracker/
├── src/
│   ├── index.js              # Worker 入口 (fetch + scheduled)
│   ├── router.js             # 请求路由分发
│   ├── handlers/
│   │   ├── auth.js           # 认证: TG OTP 登录
│   │   └── items.js          # 业务: 统一 CRUD (eSIM + 订阅)
│   ├── services/
│   │   ├── telegram.js       # Telegram 消息发送
│   │   └── reminder.js       # 到期提醒逻辑
│   ├── data/
│   │   ├── schema.js         # 数据模型定义 & 校验
│   │   └── store.js          # KV 读写操作封装
│   ├── utils/
│   │   ├── response.js       # HTTP 响应工具 (JSON/CORS)
│   │   ├── country.js        # 国旗匹配 (区号→emoji)
│   │   └── date.js           # 日期工具 (UTC+8)
│   └── ui/
│       └── template.js       # 完整前端 HTML 模板
├── scripts/
│   └── build.js              # esbuild 构建脚本
├── worker/
│   └── worker.js             # 构建产物 (用于 Dashboard 部署)
├── wrangler.toml             # Wrangler 配置
├── package.json
├── ARCHITECTURE.md           # 本文档
└── README.md
```

## 数据模型

### KV Key 布局

| Key | 类型 | 说明 |
|-----|------|------|
| `items` | JSON Array | 所有条目 (eSIM + 订阅) |
| `TG_BOT_TOKEN` | String | Telegram Bot Token |
| `TG_CHAT_ID` | String | Telegram Chat ID |
| `admin_auth_code` | String (TTL 300s) | 当前 OTP 验证码 |
| `admin_auth_attempts` | String (TTL 300s) | 失败尝试计数 |
| `session_token_<uuid>` | String (TTL 30d) | 有效会话令牌 |

### Item 统一模型

```json
{
  "id": "1717200000000",
  "type": "esim | subscription",
  "name": "T-Mobile eSIM",
  "expireDate": "2026-08-01",
  "cycle": 180,
  "remark": "备用号码",
  "status": "active | paused",
  "createdAt": "2026-06-01T00:00:00Z",

  // eSIM 专有字段
  "number": "+12025551234",

  // 订阅专有字段
  "category": "VPN | Cloud | Streaming | ...",
  "price": "9.99",
  "currency": "USD",
  "autoRenew": false,
  "remindDays": 3,
  "url": "https://netflix.com"
}
```

## API 路由

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/send` | 发送 OTP 到 TG | ✗ |
| POST | `/api/auth/verify` | 验证 OTP，返回 token | ✗ |
| GET | `/api/auth/check` | 检查会话有效性 | ✓ |
| GET | `/api/items` | 获取所有条目 | ✓ |
| POST | `/api/items` | 创建新条目 | ✓ |
| PUT | `/api/items/:id` | 更新条目 | ✓ |
| DELETE | `/api/items/:id` | 删除条目 | ✓ |
| POST | `/api/items/:id/renew` | 一键续期 | ✓ |
| `*` | `/*` | 返回前端 HTML | ✗ |

## 安全机制

1. **TG OTP 认证**: 不在代码中写死密码，每次登录需要 TG 机器人动态验证码
2. **防爆破**: 连续输错 5 次自动作废验证码，带并发延迟防御
3. **会话管理**: UUID token，30天 TTL，存储在 KV 中
4. **CORS**: 所有 API 响应带 CORS 头

## 提醒策略 (Cron)

| 条件 | 提醒类型 | 频率 |
|------|---------|------|
| 到期前 15 天内 | ⚠️ 提醒 | 每天 |
| 到期当天 | 🚨 紧急 | 当天 |
| 过期后 | ❌ 警告 | 每 7 天 |

## 部署方式

### 方式 1: GitHub Actions 自动部署 (推荐)
- Fork 仓库 → 配置 GitHub Secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
- 修改 `wrangler.toml` 填入 KV ID
- Push 到 main 分支自动触发部署 (`.github/workflows/deploy.yml`)
- Worker + Cron Triggers + KV 绑定全部自动同步

### 方式 2: Wrangler CLI 手动部署
```bash
npm install
npx wrangler login
npx wrangler kv namespace create DB    # KV 命名空间名称: sub-tracker
npx wrangler dev                       # 本地开发
npx wrangler deploy                    # 部署到 CF
```

### 方式 3: CF Dashboard 手动部署
```bash
npm run build                          # 生成 worker/worker.js
# CF Dashboard → Workers → Connect to Git → Entry point: worker/worker.js
```

## 开发路线图

- [x] Phase 1: eSIM 保号管理 (核心功能)
- [ ] Phase 2: 订阅费用管理 (分类、统计、日历)
- [ ] Phase 3: 数据导入导出 (JSON/CSV)
- [ ] Phase 4: 多渠道推送 (Bark、企业微信、Webhook)
