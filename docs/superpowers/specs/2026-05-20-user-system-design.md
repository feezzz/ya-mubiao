# 芽目标 — 极简用户系统设计

## 目标

多用户数据隔离，无需密码。通过 localStorage 存 userId，x-user-id header 传递身份。

## 数据库变化

新增 `users` 表，三张业务表加 `user_id` 列：

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE goals ADD COLUMN user_id INT;
ALTER TABLE checkins ADD COLUMN user_id INT;
ALTER TABLE reviews ADD COLUMN user_id INT;
```

保留已有数据：`user_id` 默认 NULL，可后续手动分配。

## 后端变化

### 中间件

提取 `x-user-id` header，注入 `req.userId`。所有业务 SQL 加 `WHERE user_id = ?`。

```javascript
app.use((req, res, next) => {
  const uid = req.headers["x-user-id"];
  req.userId = uid ? Number(uid) : null;
  next();
});
```

### 新 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/users` | `{ name }` → 创建用户，返回 `{ id, name }` |
| GET | `/api/users` | 返回所有用户列表 `[{ id, name, createdAt }]` |

### 已有 API 改动

所有涉及 goals/checkins/reviews 的查询和写入，加上 `user_id` 过滤：

- **GET /api/goals** — `WHERE user_id = ?`
- **POST /api/goals** — `INSERT ... user_id = ?`
- **DELETE /api/goals/:id** — 加 `AND user_id = ?`
- **PUT /api/goals/:id** — 加 `AND user_id = ?`
- **POST /api/goals/:id/checkins** — 先验证 goal 的 user_id
- **GET /api/reviews** — `WHERE user_id = ?`
- **POST /api/reviews** — `INSERT ... user_id = ?`
- **GET /api/checkins** — `WHERE checkins.user_id = ?`
- **GET /api/stats/* ** — 加 user_id 过滤

### 自动迁移

`initDatabase()` 中每个 ALTER TABLE 用 try/catch 包裹，列已存在则跳过。

## 前端变化

### 新模块 `js/user.js`

```javascript
App.getUserId()    → localStorage "ya_user_id" || null
App.setUser(id)    → localStorage + 刷新
App.switchUser(id) → 切换用户 + 重载数据
```

### api.js

`request()` 自动附加 `x-user-id` header。

### 用户切换 UI

侧边栏底部，芽芽熊上方，显示：

```
当前用户：小明 ▼
[点击弹出用户列表，可切换或新建]
```

无用户时首页全屏弹出"你是谁？"引导。

### 首页用户引导

```
┌─────────────────────┐
│    🐻 芽芽熊        │
│                     │
│  欢迎来到芽目标！    │
│  先告诉我你是谁？    │
│                     │
│  [___________] 输入名字 │
│  [      开始      ]  │
│                     │
│  已有用户：          │
│  ┌─ 小明 ─┐         │
│  └─ 小红 ─┘         │
└─────────────────────┘
```

## 文件清单

- 新增：`js/user.js`
- 新增：用户引导/切换 HTML 结构
- 修改：`server.js`（中间件 + users API + 所有路由加 user_id）
- 修改：`js/api.js`（header 注入）
- 修改：`js/app.js`（启动时检查用户）
- 修改：`index.html`（用户 UI）
- 修改：`styles.css`（用户 UI 样式）
