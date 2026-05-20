# 极简用户系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 多用户数据隔离 — users 表 + x-user-id 中间件 + 所有 API user_id 过滤 + 前端用户切换 UI

**Architecture:** 无密码认证通过 localStorage + x-user-id header。server.js 中间件提取 userId，SQL 自动过滤。前端 js/user.js 管理用户状态。

**Tech Stack:** Node.js + Express + MySQL + localStorage

---

### Task 1: 数据库 + 中间件 + Users API

**Files:** Modify `server.js`

- [ ] **Step 1: 在 initDatabase() 中新增 users 表 + ALTER TABLE**

在 `initDatabase()` 的 CREATE TABLE reviews 之后（`}`之前）添加：

```javascript
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Auto-migrate: add user_id to existing tables
  try { await pool.query("ALTER TABLE goals ADD COLUMN user_id INT NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE checkins ADD COLUMN user_id INT NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE reviews ADD COLUMN user_id INT NULL AFTER goal_id"); } catch (e) {}
```

- [ ] **Step 2: 添加用户中间件**

在 `app.use(express.json())` 之后添加：

```javascript
app.use((req, res, next) => {
  const uid = req.headers["x-user-id"];
  req.userId = uid ? Number(uid) : null;
  next();
});
```

- [ ] **Step 3: 添加 users API 路由**

```javascript
app.post("/api/users", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "请输入名字。" });
    const [result] = await pool.query("INSERT INTO users (name) VALUES (?)", [name.trim()]);
    res.status(201).json({ id: String(result.insertId), name: name.trim() });
  } catch (error) { next(error); }
});

app.get("/api/users", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT id, name, created_at AS createdAt FROM users ORDER BY id");
    res.json(rows.map(r => ({ ...r, id: String(r.id) })));
  } catch (error) { next(error); }
});
```

- [ ] **Step 4: 更新所有业务路由加 user_id 过滤**

每个 SQL 操作加上 `user_id`：

- `GET /api/goals`: `WHERE user_id = ?` (用 `req.userId`)
- `POST /api/goals`: INSERT 加 `user_id = ?`
- `DELETE /api/goals/:id`: 加 `AND user_id = ?`（DELETE 前验证归属）
- `PUT /api/goals/:id`: UPDATE WHERE 加 `AND user_id = ?`
- `POST /api/goals/:id/checkins`: 先验证 goal 归属，INSERT 加 user_id
- `GET /api/checkins`: WHERE 加 `checkins.user_id = ?`
- `GET /api/reviews`: WHERE 加 `user_id = ?`
- `POST /api/reviews`: INSERT 加 `user_id = ?`
- `GET /api/stats/checkin-pattern`: 子查询用 goal 的 user_id
- `GET /api/stats/review-hint`: WHERE 加 user_id

无 userId 时返回空数组（不报错）。

### Task 2: 前端 user.js

**Files:** Create `js/user.js`

```javascript
window.App = window.App || {};
(function (App) {
  const KEY = "ya_user_id";

  App.getUserId = () => localStorage.getItem(KEY) || null;
  App.setUserId = (id) => { localStorage.setItem(KEY, id); };

  App.initUser = async function () {
    const uid = App.getUserId();
    if (uid) {
      try {
        const users = await App.request("/users");
        const found = users.find(u => u.id === uid);
        if (found) { App.state.currentUser = found; App.loadData(); return; }
      } catch (e) {}
      localStorage.removeItem(KEY);
    }
    // Show user picker
    App.showUserPicker();
  };

  App.switchUser = async function (id) {
    App.setUserId(id);
    const users = await App.request("/users");
    const user = users.find(u => u.id === id);
    if (user) {
      App.state.currentUser = user;
      App.state.goals = [];
      App.state.reviews = [];
      App.state.activeGoalId = null;
      App.loadData();
    }
    App.render();
  };

  App.createUser = async function (name) {
    const user = await App.request("/users", { method: "POST", body: JSON.stringify({ name }) });
    App.setUserId(user.id);
    App.state.currentUser = user;
    App.loadData();
    App.render();
  };
})(window.App);
```

### Task 3: api.js 自动注入 header + loadData 检查用户

**Files:** Modify `js/api.js`

在 `request()` 函数中自动加 header：

```javascript
const uid = App.getUserId();
if (uid) { options.headers = { ...options.headers, "x-user-id": uid }; }
```

在 `loadData()` 开头检查用户：

```javascript
if (!App.getUserId()) { App.render(); return; }
```

### Task 4: 前端 UI — 用户引导 + 切换

**Files:** Modify `index.html`（新增用户区域）, Modify `styles.css`

在 index.html 侧边栏 bear-note 上方添加：

```html
<div class="user-area">
  <button class="user-switch-btn" id="userSwitchBtn">
    <span id="userSwitchName">未登录</span>
    <span>▼</span>
  </button>
  <div class="user-dropdown" id="userDropdown" style="display:none;"></div>
</div>

<div class="user-picker-overlay" id="userPicker">
  <div class="user-picker-card">
    <div class="empty-bear"></div>
    <h2>欢迎来到芽目标 🌱</h2>
    <p>先告诉我，你是谁？</p>
    <input id="newUserName" type="text" placeholder="输入你的名字" />
    <button class="primary-btn wide" id="createUserBtn">开始</button>
    <div id="existingUsers" class="existing-users"></div>
  </div>
</div>
```

CSS 约 60 行（overlay、dropdown、picker 样式）。

### Task 5: app.js 启动时调用 initUser + 用户切换事件

**Files:** Modify `js/app.js`

替换启动代码：

```javascript
window.App.initUser();
```

在 bindEvents 中添加用户切换事件。

### Task 6: 验证

重启 → 打开页面 → 无用户时弹出引导 → 创建用户 → 创建目标/打卡/复盘 → 切换用户 → 数据隔离验证
