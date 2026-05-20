# 芽目标 YA MUBIAO

陪你把目标慢慢养大的可爱目标管理 App。

## 产品定位

芽目标不是冷冰冰的待办清单，而是一个**目标养成花园**。把大目标拆成每天能做的小行动，每完成一次打卡，目标就像小芽一样成长一点。芽芽熊负责提醒、鼓励、陪伴和安慰。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | 原生 HTML/CSS/JS，响应式 PWA |
| 后端 | Node.js + Express |
| 数据库 | PostgreSQL (Supabase) |
| AI | DeepSeek API |
| 部署 | Vercel Serverless |

## 功能

### 核心闭环
- **种目标** — 三步创建，16 个分类模板 + AI 智能拆解
- **每日打卡** — 一键完成，植物生长动画反馈
- **成长可视化** — 种子→发芽→长叶→开花→结果→完成
- **复盘日记** — 对话式三步复盘 + AI 总结 + 规则引擎草稿

### 陪伴系统
- **芽芽熊** — 6 种心情状态，呼吸/弹跳/挥手动画
- **徽章系统** — 种下目标、首次打卡、连续 3 天、开花阶段
- **花园视图** — 所有目标植物卡片化展示

### 数据洞察
- **打卡日历** — GitHub 风格热力图
- **最佳时间** — 打卡时段分析
- **连续记录** — 连续打卡天数追踪
- **断签恢复** — 温柔鼓励重新开始

### 多用户
- 无密码极简用户切换
- localStorage 存储身份
- 数据完全隔离

### 其他
- PWA 可安装到手机桌面
- 浏览器通知提醒
- 成长记录导出分享
- 响应式桌面 + 移动端

## 本地运行

```bash
# 安装依赖
npm install

# 配置环境变量 (.env)
DATABASE_URL=postgresql://user:pass@host:5432/db
DEEPSEEK_API_KEY=sk-your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
AI_ENABLED=true

# 启动
npm start
# 打开 http://localhost:3001
```

## 项目结构

```
芽目标/
├── server.js           # Express 后端
├── index.html          # SPA 入口
├── styles.css          # 全局样式
├── templates.json      # 16 个目标模板
├── js/
│   ├── api.js          # 网络请求层
│   ├── state.js        # 状态管理 + 纯函数
│   ├── ai.js           # AI API 封装
│   ├── user.js         # 用户管理
│   ├── app.js          # 路由 + 事件绑定
│   └── views/
│       ├── home.js     # 首页
│       ├── create.js   # 创建目标
│       ├── detail.js   # 成长详情
│       ├── review.js   # 对话式复盘
│       ├── bear.js     # 芽芽熊 + 花园
│       ├── complete.js # 打卡完成
│       ├── calendar.js # 打卡日历
│       ├── garden.js   # 目标花园
│       └── templates.js# 模板浏览器
├── designv2/           # 设计素材
├── icons/              # PWA 图标
└── docs/               # 设计文档
```

## 部署

项目已配置 Vercel 一键部署，需在 Vercel 面板设置以下环境变量：

| Key | 说明 |
|-----|------|
| `DATABASE_URL` | Supabase PostgreSQL 连接字符串 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | `deepseek-chat` |
| `AI_ENABLED` | `true` |

## License

MIT
