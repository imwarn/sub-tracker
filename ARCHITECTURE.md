# Sub-Tracker 架构设计 & 开发规划

## 概述

Sub-Tracker 是一个基于 Cloudflare Workers + KV 的个人资产管理看板，融合了 eSIM 保号管理、订阅费用管理和话费余额管理的功能。

GitHub: https://github.com/imwarn/sub-tracker

## 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 运行时 | Cloudflare Workers | 全球边缘节点，零冷启动 |
| 存储 | Cloudflare KV | 键值数据库，免费额度 100K 读/天 |
| 定时 | CF Cron Triggers | 每日自动检查到期/停机提醒 |
| 前端 | 原生 HTML + TailwindCSS CDN | 内嵌 Worker，无需额外托管 |
| 构建 | esbuild | `src/` → `worker/worker.js` 单文件打包 |
| 认证 | Telegram OTP | 6位动态码，防爆破机制 |

## 目录结构

```
sub-tracker/
├── src/
│   ├── index.js              # Worker 入口 (fetch + scheduled)
│   ├── router.js             # 请求路由分发
│   ├── handlers/
│   │   ├── auth.js           # 认证: TG OTP 登录
│   │   └── items.js          # 业务: 统一 CRUD + 导入导出 + 充值 + 测试通知
│   ├── services/
│   │   ├── telegram.js       # Telegram 消息发送
│   │   └── reminder.js       # 到期/停机提醒逻辑 (支持货币显示)
│   ├── data/
│   │   ├── schema.js         # 数据模型定义 & 校验
│   │   └── store.js          # KV 读写操作封装
│   ├── utils/
│   │   ├── response.js       # HTTP 响应工具 (JSON/CORS)
│   │   ├── country.js        # 国旗匹配 (E.164 完整码表)
│   │   └── date.js           # 日期工具 (UTC+8) + 预计停机日计算
│   └── ui/
│       └── template.js       # 完整前端 HTML/JS 模板
├── scripts/
│   ├── build.js              # esbuild 构建脚本
│   └── deploy.sh             # 部署脚本 (读 .env → 设 secrets → deploy)
├── worker/
│   └── worker.js             # 构建产物 (用于 Dashboard 部署)
├── wrangler.toml             # Wrangler 配置 (无 [vars]，防覆盖)
├── .env.example              # 环境变量模板
├── package.json
└── ARCHITECTURE.md           # 本文档
```

## 数据模型

### KV Key 布局

| Key | 类型 | 说明 |
|-----|------|------|
| `items` | JSON Array | 所有条目 (eSIM + 订阅 + 话费) |
| `TG_BOT_TOKEN` | Secret | Telegram Bot Token (通过 Dashboard 或 wrangler secret 设置) |
| `TG_CHAT_ID` | Secret | Telegram Chat ID (通过 Dashboard 或 wrangler secret 设置) |
| `admin_auth_code` | String (TTL 300s) | 当前 OTP 验证码 |
| `admin_auth_attempts` | String (TTL 300s) | 失败尝试计数 |
| `session_token_<uuid>` | String (TTL 30d) | 有效会话令牌 |

### Item 统一模型

```json
{
  "id": "1717200000000",
  "type": "esim | subscription | balance",
  "name": "T-Mobile eSIM",
  "remark": "备用号码",
  "status": "active | paused",
  "createdAt": "2026-06-01T00:00:00Z",

  // eSIM 专有字段
  "number": "+120****1234",
  "expireDate": "2026-08-01",
  "cycle": 180,

  // 订阅专有字段
  "category": "VPN | Cloud | AI 服务 | 游戏 | ...",
  "region": "CN | US | TR | ...",
  "subId": "user@example.com",
  "price": "9.99",
  "currency": "USD",
  "billing": "monthly | yearly | once",
  "autoRenew": false,
  "remindDays": [3, 1, 0],
  "url": "https://netflix.com",

  // 话费专有字段
  "number": "+861****8000",
  "balance": 50.00,
  "monthlyFee": 18.00,
  "billingDay": 5,
  "currency": "CNY",
  "remindDays": [3, 1, 0],
  "predictedSuspendDate": "2026-08-05",
  "lastRecharge": { "amount": 50, "date": "2026-06-01", "note": "微信充值" }
}
```

### 话费预计停机日计算

```
N = Math.floor(balance / monthlyFee)    // 余额可撑 N 个月
若今天 ≤ 本月扣费日: 基准月 = 本月
若今天 > 本月扣费日: 基准月 = 下月
预计停机日 = 基准月 + N 个月的扣费日
扣费日不存在时 fallback 到当月最后一天
```

## API 路由

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/send` | 发送 OTP 到 TG | ✗ |
| POST | `/api/auth/verify` | 验证 OTP，返回 token | ✗ |
| GET | `/api/auth/check` | 检查会话有效性 | ✓ |
| GET | `/api/items` | 获取所有条目 (?type=esim\|subscription\|balance) | ✓ |
| POST | `/api/items` | 创建新条目 | ✓ |
| PUT | `/api/items/:id` | 更新条目 | ✓ |
| DELETE | `/api/items/:id` | 删除条目 | ✓ |
| POST | `/api/items/:id/renew` | 一键续期 (eSIM) | ✓ |
| POST | `/api/items/:id/recharge` | 充值/校正余额 (话费) | ✓ |
| POST | `/api/items/:id/test-notify` | 测试 TG 通知 | ✓ |
| GET | `/api/items/export/json` | 导出 JSON | ✓ |
| GET | `/api/items/export/csv` | 导出 CSV | ✓ |
| POST | `/api/items/import/json` | 导入 JSON | ✓ |
| `*` | `/*` | 返回前端 HTML | ✗ |

## 前端功能

| 功能 | 状态 | 说明 |
|------|------|------|
| TG OTP 登录 | ✅ | 无密码，TG 验证码登录 |
| 三种视图 | ✅ | 卡片/列表/日历，切换自如 |
| eSIM 保号管理 | ✅ | 添加/编辑/删除/一键续期 |
| 订阅费用管理 | ✅ | 分类/区域/费用/计费周期 |
| 话费余额管理 | ✅ | 余额/月租/扣费日/预计停机日/充值校正 |
| 国旗自动匹配 | ✅ | E.164 完整国家/地区码 |
| 货币单位 | ✅ | 15 种常用货币 (CNY/USD/EUR/GBP/JPY...) |
| 费用统计 | ✅ | 月度支出（含话费月租）统计栏 |
| 搜索/筛选 | ✅ | 按类型筛选（eSIM/订阅/话费/全部）+ 关键词搜索 |
| 到期/停机提醒 | ✅ | Cron 每日检查，TG 推送，支持自定义提前提醒天数 |
| 测试通知 | ✅ | 单条记录发送测试 TG 通知 |
| 数据导入导出 | ✅ | JSON/CSV 导出，JSON 导入 |
| 毛玻璃 UI | ✅ | 深色渐变 + glass morphism |

## 安全机制

1. **TG OTP 认证**: 不在代码中写死密码，每次登录需要 TG 机器人动态验证码
2. **防爆破**: 连续输错 5 次自动作废验证码，带并发延迟防御
3. **会话管理**: UUID token，30天 TTL，存储在 KV 中
4. **CORS**: 所有 API 响应带 CORS 头
5. **Secrets 管理**: TG 敏感配置通过 CF Secrets 管理，不进代码/部署

## 部署方式

### 方式 1: Wrangler CLI (推荐)
```bash
npm install
npx wrangler login
npx wrangler kv namespace create DB
# 在 .env 中配置 TG_BOT_TOKEN 和 TG_CHAT_ID
npm run deploy   # → bash scripts/deploy.sh (自动设 secrets + deploy)
```

### 方式 2: CF Dashboard Connect to Git
- 关联 GitHub 仓库 imwarn/sub-tracker
- Entry point: `src/index.js`
- 在 Dashboard → Settings → Variables and Secrets 设置 TG 密钥
- Push 到 main 自动部署

### 方式 3: GitHub Actions
- 配置 Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `KV_NAMESPACE_ID`, `TG_BOT_TOKEN`, `TG_CHAT_ID`
- Push 到 main 自动触发

## ⚠️ 部署注意事项

- **wrangler.toml 不声明 `[vars]`**：防止 deploy 用空值覆盖 Dashboard 设置的 Variables
- **TG 配置建议用 Secrets** 而非 Variables（加密存储，Dashboard 不明文显示）
- **deploy.sh 逻辑**：.env 非空才 `wrangler secret put`，不会覆盖已有值

---

## 开发规划 (Roadmap)

### ✅ 已完成

- [x] **Phase 1**: eSIM 保号管理 — CRUD、一键续期、国旗匹配
- [x] **Phase 2**: 订阅费用管理 — 分类/区域/费用/计费周期
- [x] **Phase 2.1**: 国旗识别 — E.164 完整覆盖国家/地区码
- [x] **Phase 2.2**: 货币单位 — 15 种常用货币，卡片/列表/统计/通知全链路
- [x] **Phase 2.3**: TG 配置防覆盖 — 移除 [vars]，deploy.sh 管理 secrets
- [x] **Phase 3**: 数据导入导出 — JSON/CSV
- [x] **Phase 3.1**: 测试通知 — 单条记录发送测试 TG 消息
- [x] **Phase 4**: 话费余额管理 — 余额/月租/扣费日/预计停机日/充值校正/停机提醒

### 🔲 待开发

- [ ] **Phase 5: 多渠道推送**
  - [ ] Bark 推送 (iOS)
  - [ ] 企业微信推送
  - [ ] Webhook 通用推送
  - [ ] 推送渠道设置页面

- [ ] **Phase 6: 数据统计增强**
  - [ ] 按分类统计订阅支出饼图
  - [ ] 月度/年度支出趋势折线图
  - [ ] 多货币汇率换算（或分货币统计）

- [ ] **Phase 7: 高级功能**
  - [ ] 订阅自动续费提醒（结合 autoRenew 字段）
  - [ ] eSIM 保号操作记录（上次保号时间）
  - [ ] 批量操作（批量暂停/删除）
  - [ ] 暗色/亮色主题切换

- [ ] **Phase 8: 移动端优化**
  - [ ] PWA 支持 (manifest + service worker)
  - [ ] 离线缓存
  - [ ] iOS/Android 添加到主屏幕

### 🐛 已知问题

- (暂无)

---

## 开发备忘

### 关键设计决策

1. **单 KV key 存所有 items**：简单直接，数据量小（个人使用）无需分页
2. **前端内嵌 Worker**：`template.js` 返回完整 HTML，无需 CDN 托管前端
3. **esbuild 打包**：开发时拆分模块，构建时合并为单文件，兼容 CF Dashboard 部署
4. **国旗匹配**：后端 `country.js` 导出 `getFlag()`，前端 `template.js` 内联 `FLAG_MAP`（独立维护，保证一致性），3→2→1 位前缀匹配
5. **货币处理**：`currSym()` 函数统一获取货币符号，`CURRENCY_SYMBOLS` map 在 template.js、reminder.js、items.js 各维护一份
6. **三种 item 类型独立**：esim / subscription / balance 各自有专有字段和业务逻辑，共享基础 CRUD 框架
7. **话费停机日计算**：`calcSuspendDate()` 基于余额/月租/扣费日推算，前端实时计算 + 后端 cron 提醒双保障

### 调试技巧

```bash
# 本地开发
npx wrangler dev

# 查看 Worker 日志
npx wrangler tail

# 构建检查
npm run build && echo "OK"

# 检查构建产物关键函数
python3 -c "
with open('worker/worker.js') as f: c = f.read()
idx = c.find('function getFlag')
print(repr(c[idx:idx+200]))
"
```

### ⚠️ esbuild 踩坑

1. **`\d` 被吞反斜杠**：esbuild 构建时 `/[^\d]/g` → `/[^d]/g`，导致正则完全失效
   - 修复：用 `[0-9]` 替代 `\d`，字符类不含反斜杠，esbuild 不会破坏
   - 规则：**项目中所有正则一律用 `[0-9]` 不用 `\d`**
2. **tree-shaking**：未被 import 的函数会被删除（如后端 `parseCountry`），前端代码内嵌在 `template.js` 不受影响

### ⚠️ 模板字符串转义踩坑

1. **onclick 处理器**：模板字面量中需要 `\\\\''` (4个反斜杠) 才能在 HTML 输出中产生 `\\'` (2个反斜杠+引号)，保证浏览器 JS 的 onclick 字符串正确转义
2. **`\n` 转义**：模板字面量中 `\n` 会变成真实换行（破坏 JS 语法），需要 `\\\\n` 才能在输出中保留为 `\\n` (浏览器 JS 的换行转义)
3. **hidden + required**：浏览器无法聚焦隐藏的 `required` 字段，改用 JS 端按类型校验
4. **验证方法**：`new Function(script)` 检查渲染后 JS 语法，`node --check` 检查源文件

### 修改 checklist

修改代码后的标准流程：
1. `npm run build` — 确保构建通过
2. `git add -A && git commit` — 提交
3. `git push origin main` — 推送（触发自动部署）
4. 检查 CF Dashboard 部署状态
5. 访问线上 URL 验证功能
