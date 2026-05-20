# 芽目标 UX & 功能优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打磨核心体验（空状态、目标卡片、打卡反馈、对话式复盘）+ 新增日历热力图和目标编辑

**Architecture:** 前端拆分为 `js/api.js` + `js/state.js` + `js/views/*.js` + `js/app.js`，通过 `window.App` 全局命名空间共享。后端新增 2 个 API（编辑目标、查询打卡日历）。零新依赖。

**Tech Stack:** Node.js + Express + MySQL + 原生 HTML/CSS/JS

---

### Task 1: 后端 — 新增编辑目标 API

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\server.js:151-152`（在 delete 之后插入）

- [ ] **Step 1: 在 server.js 添加 PUT /api/goals/:id 路由**

在 `app.delete("/api/goals/:id", ...)` 块结束后（约第163行 `});` 之后），插入以下代码：

```javascript
app.put("/api/goals/:id", async (req, res, next) => {
  try {
    const goalId = Number(req.params.id);
    const { name, days, time, task } = req.body;

    if (!name || !days || !time || !task) {
      return res.status(400).json({ message: "目标名称、天数、每天投入和今日小行动都要填写。" });
    }
    if (Number(days) < 1 || Number(days) > 365) {
      return res.status(400).json({ message: "目标天数建议填写 1 到 365 天。" });
    }

    const [result] = await pool.query(
      "UPDATE goals SET name = ?, days = ?, time_investment = ?, task = ? WHERE id = ?",
      [String(name).trim(), Number(days), String(time).trim(), String(task).trim(), goalId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "没有找到这个目标。" });
    }

    const [rows] = await pool.query("SELECT * FROM goals WHERE id = ?", [goalId]);
    const [checkins] = await pool.query(
      "SELECT DATE_FORMAT(checkin_date, '%Y-%m-%d') AS checkin_date FROM checkins WHERE goal_id = ? ORDER BY checkin_date ASC",
      [goalId]
    );
    res.json(toGoal(rows[0], checkins.map((r) => r.checkin_date)));
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 2: 重启服务并验证**

```bash
# 在 PowerShell 中重启
cd C:\Users\rl109\Desktop\芽目标
# 先停掉旧进程 (Ctrl+C)，再启动
npm start
```

用 curl 测试（另开一个终端）：

```bash
curl -X PUT http://localhost:3001/api/goals/1 \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"测试编辑\",\"days\":60,\"time\":\"30 分钟\",\"task\":\"测试任务\"}"
```

预期：返回 JSON 包含更新后的目标数据。

---

### Task 2: 后端 — 新增打卡日历查询 API

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\server.js`（在 Task 1 新增代码之后插入）

- [ ] **Step 1: 在 server.js 添加 GET /api/checkins 路由**

在 Task 1 新增的 `app.put(...)` 块结束后，插入：

```javascript
app.get("/api/checkins", async (req, res, next) => {
  try {
    const { goal_id, year, month } = req.query;

    let query = `
      SELECT DATE_FORMAT(checkin_date, '%Y-%m-%d') AS date, COUNT(*) AS count
      FROM checkins
      WHERE 1=1
    `;
    const params = [];

    if (goal_id) {
      query += " AND goal_id = ?";
      params.push(Number(goal_id));
    }
    if (year) {
      query += " AND YEAR(checkin_date) = ?";
      params.push(Number(year));
    }
    if (month) {
      query += " AND MONTH(checkin_date) = ?";
      params.push(Number(month));
    }

    query += " GROUP BY checkin_date ORDER BY checkin_date ASC";

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 2: 重启服务并验证**

```bash
curl http://localhost:3001/api/checkins?year=2026\&month=5
```

预期：返回 JSON 数组，如 `[{"date":"2026-05-13","count":2}]`

---

### Task 3: 前端拆分 — 创建 js/api.js

**Files:**
- Create: `C:\Users\rl109\Desktop\芽目标\js\api.js`
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（添加 script 引用）

- [ ] **Step 1: 创建 js/ 目录并编写 api.js**

```bash
mkdir -p "C:/Users/rl109/Desktop/芽目标/js/views"
```

创建 `js/api.js`：

```javascript
window.App = window.App || {};

(function (App) {
  const API_BASE = "/api";

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || "请求失败，请检查后端服务。");
    }
    return data;
  }

  async function loadData() {
    try {
      const [goals, reviews] = await Promise.all([
        request("/goals"),
        request("/reviews")
      ]);
      App.state.goals = goals;
      App.state.reviews = reviews;
      if (!App.state.activeGoalId && goals.length) {
        App.state.activeGoalId = goals[0].id;
      }
      if (App.state.activeGoalId && !goals.some((g) => g.id === App.state.activeGoalId)) {
        App.state.activeGoalId = goals[0]?.id || null;
      }
      App.render();
    } catch (error) {
      App.showToast("后端还没启动，请先运行 npm start。");
      App.render();
    }
  }

  async function createGoal(data) {
    const goal = await request("/goals", {
      method: "POST",
      body: JSON.stringify(data)
    });
    App.state.goals.unshift(goal);
    App.state.activeGoalId = goal.id;
    App.render();
    App.showToast("目标种下啦，今天先完成一小步。");
    App.showView("home");
  }

  async function checkin() {
    const goal = App.activeGoal();
    if (!goal) {
      App.showToast("先种下一个目标，再开始打卡。");
      App.showView("create");
      return;
    }
    try {
      await request(`/goals/${goal.id}/checkins`, {
        method: "POST",
        body: JSON.stringify({})
      });
      App.state.lastCompletedGoalId = goal.id;
      await loadData();
      document.getElementById("completeMessage").textContent =
        `今天完成：${goal.task}。你的「${goal.name}」已经发芽一点点。`;
      App.showToast("完成啦！小芽长大了一点点。");
      App.showView("complete");
    } catch (error) {
      App.showToast(error.message);
    }
  }

  async function deleteActiveGoal() {
    const goal = App.activeGoal();
    if (!goal) {
      App.showToast("现在还没有可删除的目标。");
      return;
    }
    const confirmed = window.confirm(`确认删除「${goal.name}」吗？相关打卡记录也会一起删除。`);
    if (!confirmed) return;
    try {
      await request(`/goals/${goal.id}`, { method: "DELETE" });
      App.state.goals = App.state.goals.filter((item) => item.id !== goal.id);
      App.state.activeGoalId = App.state.goals[0]?.id || null;
      App.render();
      App.showToast("目标已删除。");
      App.showView("home");
    } catch (error) {
      App.showToast(error.message);
    }
  }

  async function updateGoal(id, data) {
    const goal = await request(`/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
    const index = App.state.goals.findIndex((g) => g.id === id);
    if (index !== -1) {
      App.state.goals[index] = goal;
    }
    App.render();
    App.showToast("目标已更新。");
  }

  async function fetchCalendarData(year, month, goalId) {
    const params = new URLSearchParams({ year, month });
    if (goalId) params.set("goal_id", goalId);
    return await request(`/checkins?${params.toString()}`);
  }

  async function saveReview(data) {
    const review = await request("/reviews", {
      method: "POST",
      body: JSON.stringify(data)
    });
    App.state.reviews.unshift(review);
    App.render();
    App.showToast("复盘保存好了，今天辛苦啦。");
  }

  App.request = request;
  App.loadData = loadData;
  App.createGoal = createGoal;
  App.checkin = checkin;
  App.deleteActiveGoal = deleteActiveGoal;
  App.updateGoal = updateGoal;
  App.fetchCalendarData = fetchCalendarData;
  App.saveReview = saveReview;
})(window.App);
```

- [ ] **Step 2: 在 index.html 中引用 api.js**

在 `index.html` 的 `<script src="app.js"></script>` **前面**添加：

```html
<script src="js/api.js"></script>
```

---

### Task 4: 前端拆分 — 创建 js/state.js

**Files:**
- Create: `C:\Users\rl109\Desktop\芽目标\js\state.js`
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（添加引用）

- [ ] **Step 1: 编写 state.js（状态 + 纯函数）**

创建 `js/state.js`：

```javascript
window.App = window.App || {};

(function (App) {
  App.state = {
    goals: [],
    activeGoalId: null,
    reviews: [],
    lastCompletedGoalId: null
  };

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function localDateISO(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateLabel(isoDate) {
    if (!isoDate) return "";
    const [, month, day] = isoDate.split("-");
    return `${month}/${day}`;
  }

  function activeGoal() {
    return App.state.goals.find((g) => g.id === App.state.activeGoalId) || App.state.goals[0] || null;
  }

  function goalProgress(goal) {
    if (!goal) return 0;
    return Math.min(100, Math.round((goal.checkins.length / goal.days) * 100));
  }

  function hasCheckedToday(goal) {
    return Boolean(goal?.checkins.includes(localDateISO()));
  }

  function totalCheckins() {
    return App.state.goals.reduce((sum, g) => sum + g.checkins.length, 0);
  }

  function stageFor(goal) {
    const count = goal ? goal.checkins.length : 0;
    if (count >= 20) return { name: "结果", icon: "🍎", level: 4 };
    if (count >= 12) return { name: "开花", icon: "🌼", level: 4 };
    if (count >= 6) return { name: "长叶", icon: "🍃", level: 3 };
    if (count >= 1) return { name: "发芽", icon: "🌱", level: 2 };
    return { name: "种子", icon: "🌰", level: 1 };
  }

  function bearFor(goal) {
    if (!goal) return { mood: "好奇", message: "你想先养大哪一个目标？" };
    const count = goal.checkins.length;
    if (hasCheckedToday(goal)) {
      return { mood: "开心", message: "今天完成啦！你的目标又长大了一点。" };
    }
    if (count >= 3) return { mood: "认真", message: `已经打卡 ${count} 次了，稳住，我们慢慢来。` };
    if (count > 0) return { mood: "安静", message: "不用追求完美，今天重新开始也很好。" };
    return { mood: "好奇", message: "今天先做一个小行动，让目标发芽吧。" };
  }

  function simpleStreak(goal) {
    if (!goal || !goal.checkins.length) return 0;
    const dates = new Set(goal.checkins);
    let cursor = new Date();
    if (!dates.has(localDateISO(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    let streak = 0;
    while (dates.has(localDateISO(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function buildPlan(goal) {
    if (!goal) return [];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const iso = localDateISO(date);
      return {
        label: i === 0 ? "今天" : `第 ${i + 1} 天`,
        date: iso,
        task: goal.task,
        done: goal.checkins.includes(iso)
      };
    });
  }

  function createFormData() {
    const $ = (s) => document.querySelector(s);
    return {
      name: $("#goalName")?.value?.trim() || "",
      days: Number($("#goalDays")?.value || 30),
      time: $("#goalTime")?.value || "20 分钟",
      task: $("#goalTask")?.value?.trim() || ""
    };
  }

  App.escapeHTML = escapeHTML;
  App.localDateISO = localDateISO;
  App.dateLabel = dateLabel;
  App.activeGoal = activeGoal;
  App.goalProgress = goalProgress;
  App.hasCheckedToday = hasCheckedToday;
  App.totalCheckins = totalCheckins;
  App.stageFor = stageFor;
  App.bearFor = bearFor;
  App.simpleStreak = simpleStreak;
  App.buildPlan = buildPlan;
  App.createFormData = createFormData;
})(window.App);
```

- [ ] **Step 2: 在 index.html 中引用 state.js**

在 api.js 引用之后添加：

```html
<script src="js/state.js"></script>
```

---

### Task 5: 前端拆分 — 创建 js/views/home.js

**Files:**
- Create: `C:\Users\rl109\Desktop\芽目标\js\views\home.js`
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（添加引用）

- [ ] **Step 1: 编写 home.js（首页渲染）**

创建 `js/views/home.js`：

```javascript
window.App = window.App || {};

(function (App) {

  function renderEmptyState() {
    const goalList = document.getElementById("goalList");
    goalList.innerHTML = `
      <div class="empty-state">
        <div class="empty-bear"></div>
        <div class="empty-speech">
          <strong>来，我陪你种第一个目标 🌱</strong>
          <p>不用一开始就很完美，做一点也算数</p>
        </div>
        <div class="empty-templates">
          <button class="empty-template-card" data-template="30 天背 300 个单词|30|20 分钟|背 10 个单词">
            <span class="empty-template-icon">📚</span>
            <span class="empty-template-label">每天阅读</span>
            <span class="empty-template-hint">20 分钟</span>
          </button>
          <button class="empty-template-card" data-template="每天运动 30 分钟|21|30 分钟|运动 20 分钟">
            <span class="empty-template-icon">🏃</span>
            <span class="empty-template-label">坚持运动</span>
            <span class="empty-template-hint">30 分钟</span>
          </button>
          <button class="empty-template-card" data-template="存钱 1 万元|100|10 分钟|存下 100 元">
            <span class="empty-template-icon">💰</span>
            <span class="empty-template-label">开始存钱</span>
            <span class="empty-template-hint">每天一点点</span>
          </button>
          <button class="empty-template-card" data-template="">
            <span class="empty-template-icon">✏️</span>
            <span class="empty-template-label">自定义</span>
            <span class="empty-template-hint">写自己的</span>
          </button>
        </div>
      </div>
    `;

    goalList.querySelectorAll(".empty-template-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tpl = btn.dataset.template;
        if (tpl) {
          const [name, days, time, task] = tpl.split("|");
          document.getElementById("goalName").value = name;
          document.getElementById("goalDays").value = days;
          document.getElementById("goalTime").value = time || "20 分钟";
          document.getElementById("goalTask").value = task;
          App.updateSeedPreview();
          App.setCreateStep(2);
        }
        App.showView("create");
      });
    });
  }

  function renderGoalCards() {
    const list = document.getElementById("goalList");
    list.innerHTML = "";

    if (!App.state.goals.length) {
      renderEmptyState();
      return;
    }

    App.state.goals.forEach((goal) => {
      const stage = App.stageFor(goal);
      const progress = App.goalProgress(goal);
      const streak = App.simpleStreak(goal);
      const checkedToday = App.hasCheckedToday(goal);

      const card = document.createElement("div");
      card.className = `goal-card-v2 ${goal.id === App.state.activeGoalId ? "active" : ""} ${!checkedToday && goal.checkins.length === 0 ? "dormant" : ""}`;
      card.innerHTML = `
        <div class="goal-card-icon">${stage.icon}</div>
        <div class="goal-card-body">
          <strong>${App.escapeHTML(goal.name)}</strong>
          <small>${App.escapeHTML(goal.task)}</small>
          <div class="goal-card-bar">
            <div class="goal-card-fill" style="width:${progress}%"></div>
          </div>
        </div>
        <div class="goal-card-stats">
          <strong>${goal.checkins.length}<small>/${goal.days}</small></strong>
          ${streak > 0 ? `<span class="goal-card-streak">🔥 ${streak} 天</span>` : (goal.checkins.length === 0 ? `<span class="goal-card-hint">等待开始</span>` : `<span class="goal-card-hint">今天待打卡</span>`)}
        </div>
      `;
      card.addEventListener("click", () => {
        App.state.activeGoalId = goal.id;
        App.render();
        App.showView("detail");
      });
      list.appendChild(card);
    });
  }

  App.renderHome = function () {
    const goal = App.activeGoal();
    const progress = App.goalProgress(goal);
    const stage = App.stageFor(goal);
    const bear = App.bearFor(goal);
    const checkedToday = App.hasCheckedToday(goal);
    const streak = App.simpleStreak(goal);

    document.getElementById("goalCount").textContent = `${App.state.goals.length} 个`;
    document.getElementById("todaySummary").textContent = goal
      ? `今天先完成：${goal.task}`
      : "先种下一个目标，芽芽熊会陪你拆成今天能做的小行动。";
    document.getElementById("growthStage").textContent = stage.name;
    document.getElementById("growthPlant").className = `growth-plant level-${stage.level}`;
    document.getElementById("progressBar").style.width = `${progress}%`;
    document.getElementById("progressText").textContent = goal
      ? `已完成 ${goal.checkins.length}/${goal.days} 次，进度 ${progress}%。`
      : "完成 0 次打卡后，小芽会开始长大。";
    document.getElementById("bearMood").textContent = bear.mood;
    document.getElementById("bearMessage").textContent = bear.message;
    document.getElementById("sidebarMessage").textContent = bear.message;
    document.getElementById("bearRoomMood").textContent = bear.mood;
    document.getElementById("bearRoomMessage").textContent = bear.message;

    document.getElementById("todayStatus").textContent = checkedToday ? "已完成" : goal ? "待开始" : "未种下";
    document.getElementById("todayTaskTitle").textContent = goal ? goal.task : "先种下一个目标";
    document.getElementById("totalCheckins").textContent = `${App.totalCheckins()} 次`;
    document.getElementById("streakText").textContent = `${streak} 天`;
    document.getElementById("homeReviewCount").textContent = `${App.state.reviews.length} 条`;

    App.setCheckinButtons(checkedToday);
    renderGoalCards();
  };
})(window.App);
```

- [ ] **Step 2: 在 index.html 中引用 home.js**

在 state.js 引用之后添加：

```html
<script src="js/views/home.js"></script>
```

---

### Task 6: 前端拆分 — 创建剩余的 view 文件

**Files:**
- Create: `C:\Users\rl109\Desktop\芽目标\js\views\create.js`
- Create: `C:\Users\rl109\Desktop\芽目标\js\views\detail.js`
- Create: `C:\Users\rl109\Desktop\芽目标\js\views\review.js`
- Create: `C:\Users\rl109\Desktop\芽目标\js\views\bear.js`
- Create: `C:\Users\rl109\Desktop\芽目标\js\views\complete.js`
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（添加引用）

- [ ] **Step 1: 创建 js/views/create.js**

```javascript
window.App = window.App || {};

(function (App) {
  let createStep = 1;

  function updateSeedPreview() {
    const data = App.createFormData();
    const textEl = document.getElementById("seedPreviewText");
    if (!textEl) return;
    const text = data.task
      ? `今天先完成：${data.task}`
      : data.name
        ? `先把「${data.name}」变成今天能做的一小步。`
        : "今天做一点，也算数。";
    textEl.textContent = text;
  }

  function validateCreateStep(step) {
    const data = App.createFormData();
    if (step === 1 && !data.name) {
      App.showToast("先写下你想养大的目标。");
      document.getElementById("goalName")?.focus();
      return false;
    }
    if (step === 2 && (!data.days || data.days < 1 || data.days > 365)) {
      App.showToast("目标天数建议填写 1 到 365 天。");
      document.getElementById("goalDays")?.focus();
      return false;
    }
    if (step === 3 && !data.task) {
      App.showToast("写一个今天能完成的小行动。");
      document.getElementById("goalTask")?.focus();
      return false;
    }
    return true;
  }

  function setCreateStep(step) {
    createStep = Math.min(3, Math.max(1, step));
    document.querySelectorAll(".create-step").forEach((panel) => {
      panel.classList.toggle("active", Number(panel.dataset.step) === createStep);
    });
    document.querySelectorAll(".step-dot").forEach((dot) => {
      dot.classList.toggle("active", Number(dot.dataset.stepDot) <= createStep);
    });
    const form = document.getElementById("goalForm");
    if (form) {
      form.classList.toggle("first-step", createStep === 1);
      form.classList.toggle("final-step", createStep === 3);
    }
    updateSeedPreview();
  }

  function resetCreateFlow() {
    createStep = 1;
    setCreateStep(1);
  }

  App._getCreateStep = () => createStep;
  App.updateSeedPreview = updateSeedPreview;
  App.validateCreateStep = validateCreateStep;
  App.setCreateStep = setCreateStep;
  App.resetCreateFlow = resetCreateFlow;
})(window.App);
```

- [ ] **Step 2: 创建 js/views/detail.js**

```javascript
window.App = window.App || {};

(function (App) {

  function renderHistory(goal) {
    const history = document.getElementById("historyList");
    if (!history) return;
    history.innerHTML = "";
    const records = goal ? goal.checkins.slice().reverse() : [];
    const countEl = document.getElementById("recordCount");
    if (countEl) countEl.textContent = `${records.length} 条`;

    if (!records.length) {
      history.innerHTML = `<div class="history-item"><strong>暂无记录</strong><small>完成一次打卡后，这里会留下成长痕迹。</small></div>`;
      return;
    }

    records.slice(0, 6).forEach((date, i) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `<strong>第 ${records.length - i} 次打卡</strong><small>${App.escapeHTML(date)} · ${App.escapeHTML(goal.task)}</small>`;
      history.appendChild(item);
    });
  }

  function renderPlan(goal) {
    const list = document.getElementById("planList");
    if (!list) return;
    list.innerHTML = "";

    if (!goal) {
      list.innerHTML = `<div class="history-item"><strong>还没有计划</strong><small>创建目标后，这里会显示未来 7 天的小行动。</small></div>`;
      return;
    }

    App.buildPlan(goal).forEach((day) => {
      const item = document.createElement("div");
      item.className = `plan-day ${day.done ? "done" : ""}`;
      item.innerHTML = `
        <strong>${App.escapeHTML(day.label)}</strong>
        <span>${App.escapeHTML(App.dateLabel(day.date))}<br>${App.escapeHTML(day.done ? "已完成" : day.task)}</span>
      `;
      list.appendChild(item);
    });
  }

  function renderEditForm(goal) {
    const section = document.getElementById("editGoalSection");
    if (!section) return;
    if (!goal) {
      section.style.display = "none";
      return;
    }
    section.style.display = "block";
    document.getElementById("editGoalName").value = goal.name;
    document.getElementById("editGoalDays").value = goal.days;
    document.getElementById("editGoalTime").value = goal.time;
    document.getElementById("editGoalTask").value = goal.task;
  }

  App.renderDetail = function () {
    const goal = App.activeGoal();
    const stage = App.stageFor(goal);
    const checkedToday = App.hasCheckedToday(goal);

    document.getElementById("detailTitle").textContent = goal ? goal.name : "还没有目标";
    document.getElementById("detailDays").textContent = goal ? `${goal.checkins.length}/${goal.days} 天` : "0 天";
    document.getElementById("detailTask").textContent = goal ? goal.task : "暂无任务";
    document.getElementById("plantStage").textContent = stage.icon;
    document.getElementById("stageTitle").textContent = `${stage.name}阶段`;
    document.getElementById("stageCopy").textContent = stage.copy || "";

    App.setCheckinButtons(checkedToday);
    renderHistory(goal);
    renderPlan(goal);
  };

  App.renderHistory = renderHistory;
  App.renderPlan = renderPlan;
})(window.App);
```

- [ ] **Step 3: 创建 js/views/review.js**

```javascript
window.App = window.App || {};

(function (App) {
  let reviewStep = 0;

  function showReviewStep(step) {
    reviewStep = step;
    document.querySelectorAll(".review-step").forEach((el, i) => {
      el.classList.toggle("active", i === step);
    });
    const progress = document.getElementById("reviewProgress");
    if (progress) {
      progress.textContent = `${step + 1}/3`;
    }
  }

  App.renderReview = function () {
    const list = document.getElementById("reviewList");
    if (!list) return;
    list.innerHTML = "";
    const countEl = document.getElementById("reviewCount");
    if (countEl) countEl.textContent = `${App.state.reviews.length} 条`;

    if (!App.state.reviews.length) {
      list.innerHTML = `<div class="history-item"><strong>还没有复盘</strong><small>一句话也可以，记录今天做过的努力。</small></div>`;
      return;
    }

    App.state.reviews.slice(0, 8).forEach((review) => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <strong>${App.escapeHTML(review.date)}</strong>
        <small>完成：${App.escapeHTML(review.done || "一点点")}<br>卡点：${App.escapeHTML(review.stuck || "暂无")}<br>明天：${App.escapeHTML(review.next || "继续一小步")}</small>
      `;
      list.appendChild(item);
    });
  };

  App.nextReviewStep = function () {
    const fields = [
      { id: "reviewDone", label: "今天我完成了什么？" },
      { id: "reviewStuck", label: "我卡在哪里？" },
      { id: "reviewNext", label: "明天我想先做什么？" }
    ];

    if (reviewStep < 2) {
      const current = fields[reviewStep];
      if (current && !document.getElementById(current.id).value.trim()) {
        App.showToast("写一点也可以，不用很多。");
        return;
      }
      showReviewStep(reviewStep + 1);
    } else {
      App.submitReview();
    }
  };

  App.submitReview = async function () {
    const data = {
      done: document.getElementById("reviewDone").value.trim(),
      stuck: document.getElementById("reviewStuck").value.trim(),
      next: document.getElementById("reviewNext").value.trim()
    };
    if (!data.done && !data.stuck && !data.next) {
      App.showToast("至少写一句，记录今天的努力。");
      return;
    }
    try {
      await App.saveReview(data);
      document.getElementById("reviewDone").value = "";
      document.getElementById("reviewStuck").value = "";
      document.getElementById("reviewNext").value = "";
      showReviewStep(0);
    } catch (error) {
      App.showToast(error.message);
    }
  };
})(window.App);
```

- [ ] **Step 4: 创建 js/views/bear.js**

```javascript
window.App = window.App || {};

(function (App) {

  App.renderBear = function () {
    const goal = App.activeGoal();
    const stage = App.stageFor(goal);

    const badgeGoal = document.getElementById("badgeGoal");
    const badgeCheckin = document.getElementById("badgeCheckin");
    const badgeStreak = document.getElementById("badgeStreak");
    const badgeFlower = document.getElementById("badgeFlower");

    if (badgeGoal) badgeGoal.classList.toggle("unlocked", App.state.goals.length > 0);
    if (badgeCheckin) badgeCheckin.classList.toggle("unlocked", App.totalCheckins() > 0);
    if (badgeStreak) badgeStreak.classList.toggle("unlocked", goal ? goal.checkins.length >= 3 : false);
    if (badgeFlower) badgeFlower.classList.toggle("unlocked", stage.level >= 4);
  };
})(window.App);
```

- [ ] **Step 5: 创建 js/views/complete.js**

```javascript
window.App = window.App || {};

(function (App) {

  App.renderComplete = function () {
    const goal = App.state.goals.find((g) => g.id === App.state.lastCompletedGoalId);
    if (!goal) return;

    const total = App.totalCheckins();
    const msg = document.getElementById("completeMessage");
    if (!msg) return;

    if (total === 1) {
      msg.textContent = "第一颗种子已经发芽！每一天都有意义。";
    } else if (App.simpleStreak(goal) >= 3) {
      msg.textContent = `连续 ${App.simpleStreak(goal)} 天了，你正在养成真正的习惯。`;
    } else {
      msg.textContent = `今天完成：${goal.task}。你的「${goal.name}」已经发芽一点点。`;
    }
  };
})(window.App);
```

- [ ] **Step 6: 在 index.html 中按顺序添加引用**

```html
<script src="js/views/create.js"></script>
<script src="js/views/detail.js"></script>
<script src="js/views/review.js"></script>
<script src="js/views/bear.js"></script>
<script src="js/views/complete.js"></script>
```

---

### Task 7: 前端拆分 — 创建 js/app.js（核心编排）

**Files:**
- Create: `C:\Users\rl109\Desktop\芽目标\js\app.js`
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（替换旧的 app.js 引用）

- [ ] **Step 1: 编写 js/app.js**

```javascript
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  function setCheckinButtons(checkedToday) {
    ["#quickCheckin", "#mobileQuickCheckin", "#detailCheckin"].forEach((sel) => {
      const btn = $(sel);
      if (!btn) return;
      btn.disabled = checkedToday;
    });
    const qc = $("#quickCheckin");
    const mqc = $("#mobileQuickCheckin");
    const dc = $("#detailCheckin");
    if (qc) qc.textContent = checkedToday ? "今日已完成" : "完成打卡";
    if (mqc) mqc.textContent = checkedToday ? "今日已完成" : "完成打卡";
    if (dc) dc.textContent = checkedToday ? "今日已完成" : "完成今天";
  }

  function showView(id) {
    const target = document.getElementById(id) ? id : "home";
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === target));
    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === target));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function render() {
    window.App.renderHome();
    window.App.renderDetail();
    window.App.renderReview();
    window.App.renderBear();
  }

  function bindEvents() {
    $$(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => showView(btn.dataset.view));
    });

    $$("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => showView(btn.dataset.go));
    });

    ["#quickCheckin", "#mobileQuickCheckin", "#detailCheckin"].forEach((sel) => {
      const btn = $(sel);
      if (btn) btn.addEventListener("click", window.App.checkin);
    });

    const delBtn = $("#deleteGoal");
    if (delBtn) delBtn.addEventListener("click", window.App.deleteActiveGoal);

    $$(".template-row button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [name, days, time, task] = btn.dataset.template.split("|");
        $("#goalName").value = name;
        $("#goalDays").value = days;
        $("#goalTime").value = time || "20 分钟";
        $("#goalTask").value = task;
        window.App.updateSeedPreview();
        window.App.setCreateStep(2);
      });
    });

    const goalForm = $("#goalForm");
    if (goalForm) {
      goalForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!window.App.validateCreateStep(3)) return;
        await window.App.createGoal(window.App.createFormData());
        e.target.reset();
        $("#goalDays").value = 30;
        $("#goalTime").value = "20 分钟";
        window.App.resetCreateFlow();
      });
    }

    const prevBtn = $("#prevCreateStep");
    const nextBtn = $("#nextCreateStep");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        window.App.setCreateStep(window.App._getCreateStep ? window.App._getCreateStep() - 1 : 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (!window.App.validateCreateStep(window.App._getCreateStep ? window.App._getCreateStep() : 1)) return;
        window.App.setCreateStep(window.App._getCreateStep ? window.App._getCreateStep() + 1 : 2);
      });
    }

    ["#goalName", "#goalDays", "#goalTime", "#goalTask"].forEach((sel) => {
      const el = $(sel);
      if (el) {
        el.addEventListener("input", window.App.updateSeedPreview);
        el.addEventListener("change", window.App.updateSeedPreview);
      }
    });
  }

  function openInitialView() {
    const view = new URLSearchParams(window.location.search).get("view");
    if (view) showView(view);
  }

  window.App.$ = $;
  window.App.$$ = $$;
  window.App.setCheckinButtons = setCheckinButtons;
  window.App.showView = showView;
  window.App.showToast = showToast;
  window.App.render = render;
  window.App.bindEvents = bindEvents;

  bindEvents();
  window.App.resetCreateFlow();
  openInitialView();
  window.App.loadData();
})();
```

- [ ] **Step 2: 更新 index.html**

将 `index.html` 中旧的 `<script src="app.js"></script>` 替换为 `<script src="js/app.js"></script>`。

最终 script 加载顺序：
```html
<script src="js/api.js"></script>
<script src="js/state.js"></script>
<script src="js/views/create.js"></script>
<script src="js/views/home.js"></script>
<script src="js/views/detail.js"></script>
<script src="js/views/review.js"></script>
<script src="js/views/bear.js"></script>
<script src="js/views/complete.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 3: 启动服务验证拆分后功能正常**

```bash
cd C:\Users\rl109\Desktop\芽目标
npm start
```

打开 `http://localhost:3001`，验证：
- 5 个页面导航正常
- 创建目标正常
- 打卡正常
- 复盘正常
- 芽芽熊页徽章正常

---

### Task 8: 对话式复盘 UI（HTML + CSS + 按钮绑定）

> **注意：** 对话逻辑（`nextReviewStep`、`submitReview`、`showReviewStep`）已在 Task 6 Step 3 的 `js/views/review.js` 中实现，本 Task 只改 HTML 结构和样式。

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（复盘区域改版）
- Modify: `C:\Users\rl109\Desktop\芽目标\styles.css`（新增复盘对话样式）
- Modify: `C:\Users\rl109\Desktop\芽目标\js\app.js`（绑定新按钮）

- [ ] **Step 1: 更新 index.html 中的复盘表单为对话式**

将复盘区域（`<section class="view review-view" id="review">` 内的表单）替换为：

```html
<form class="review-form" id="reviewForm">
  <div class="review-dialogue">
    <div class="review-bear-icon"></div>

    <div class="review-step active" data-review-step="0">
      <p class="review-question">今天我完成了什么？</p>
      <textarea id="reviewDone" placeholder="哪怕一点点也可以..."></textarea>
    </div>

    <div class="review-step" data-review-step="1">
      <p class="review-question">我卡在哪里了？</p>
      <textarea id="reviewStuck" placeholder="不顺利也没关系..."></textarea>
    </div>

    <div class="review-step" data-review-step="2">
      <p class="review-question">明天我想先做什么？</p>
      <textarea id="reviewNext" placeholder="一小步就好..."></textarea>
    </div>
  </div>

  <div class="review-actions">
    <span class="review-progress" id="reviewProgress">1/3</span>
    <button class="primary-btn" type="button" id="reviewNextBtn">继续</button>
    <button class="primary-btn" type="button" id="reviewSubmitBtn" style="display:none;">保存复盘</button>
  </div>
</form>
```

- [ ] **Step 2: 绑定新增按钮事件**

在 `js/app.js` 的 `bindEvents()` 函数末尾添加：

```javascript
    const reviewNextBtn = $("#reviewNextBtn");
    const reviewSubmitBtn = $("#reviewSubmitBtn");
    if (reviewNextBtn) reviewNextBtn.addEventListener("click", window.App.nextReviewStep);
    if (reviewSubmitBtn) reviewSubmitBtn.addEventListener("click", window.App.submitReview);
```

- [ ] **Step 3: 新增复盘对话样式**

在 `styles.css` 末尾添加：

```css
.review-dialogue {
  position: relative;
  padding-left: 60px;
}

.review-bear-icon {
  position: absolute;
  left: 0;
  top: 0;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: var(--cream) url("../designv2/ChatGPT Image 2026年5月12日 14_03_17 (2).png") center/cover no-repeat;
}

.review-step {
  display: none;
  gap: 12px;
}

.review-step.active {
  display: grid;
  animation: fadeSlideIn 0.3s ease;
}

.review-question {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--charcoal);
}

.review-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.review-progress {
  color: var(--muted);
  font-weight: 800;
  font-size: 14px;
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

### Task 9: 打卡完成页动画升级

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\styles.css`（新增动画）
- Modify: `C:\Users\rl109\Desktop\芽目标\js\views\complete.js`（已含动态文案）
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（完成页增加动画元素）

- [ ] **Step 1: 更新 index.html 完成页结构**

将 `<section class="view complete-view" id="complete">` 内的内容替换为：

```html
<div class="complete-card">
  <div class="complete-animation">
    <div class="sprout-stage stage-seed"></div>
    <div class="sprout-stage stage-sprout"></div>
    <div class="sprout-stage stage-leaf"></div>
  </div>
  <p class="eyebrow">打卡完成</p>
  <h2>目标又长大了一点</h2>
  <p id="completeMessage">今天完成啦，芽芽熊已经帮你记下来了。</p>
  <div class="complete-actions">
    <button class="primary-btn" data-go="review">写一句复盘</button>
    <button class="ghost-btn" data-go="home">回到今日</button>
  </div>
</div>
```

- [ ] **Step 2: 新增植物生长 CSS 动画**

在 `styles.css` 末尾添加：

```css
.complete-animation {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto 12px;
}

.sprout-stage {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
}

.stage-seed {
  width: 24px;
  height: 24px;
  bottom: 10px;
  border-radius: 50%;
  background: var(--mint-deep);
  animation: seedAppear 2s ease forwards;
}

.stage-sprout {
  width: 6px;
  height: 0;
  bottom: 34px;
  border-radius: 99px;
  background: var(--mint);
  animation: sproutGrow 0.8s ease 0.6s forwards;
}

.stage-leaf {
  width: 0;
  height: 0;
  bottom: 74px;
  border-radius: 50%;
  background: var(--mint-deep);
  animation: leafUnfold 0.8s ease 1.4s forwards;
}

@keyframes seedAppear {
  0% { opacity: 0; transform: translateX(-50%) scale(0); }
  50% { opacity: 1; transform: translateX(-50%) scale(1.3); }
  100% { opacity: 1; transform: translateX(-50%) scale(1); }
}

@keyframes sproutGrow {
  from { height: 0; opacity: 0; }
  to { height: 40px; opacity: 1; }
}

@keyframes leafUnfold {
  from { width: 0; height: 0; opacity: 0; }
  to { width: 36px; height: 20px; opacity: 1; }
}
```

- [ ] **Step 3: 验证动画**

启动服务，完成一次打卡，确认动画播放流畅。

---

### Task 10: 打卡日历热力图

**Files:**
- Create: `C:\Users\rl109\Desktop\芽目标\js\views\calendar.js`
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（首页新增日历入口 + 添加引用）
- Modify: `C:\Users\rl109\Desktop\芽目标\styles.css`（日历热力图样式）

- [ ] **Step 1: 在 index.html 首页添加日历面板**

在首页 `</section>`（`<section class="view home-view active" id="home">` 结束）之前，在 `</div>` (dashboard-grid) 之后添加：

```html
<article class="panel calendar-panel" id="calendarPanel">
  <div class="panel-head">
    <span>打卡日历</span>
    <div class="calendar-nav">
      <button class="calendar-arrow" id="calPrev">&lt;</button>
      <strong id="calMonthLabel">2026年5月</strong>
      <button class="calendar-arrow" id="calNext">&gt;</button>
    </div>
  </div>
  <div class="calendar-grid" id="calendarGrid"></div>
  <div class="calendar-legend">
    <span>少</span><span class="cal-dot level-1"></span><span class="cal-dot level-2"></span><span class="cal-dot level-3"></span><span class="cal-dot level-4"></span><span>多</span>
  </div>
</article>
```

- [ ] **Step 2: 创建 js/views/calendar.js**

```javascript
window.App = window.App || {};

(function (App) {
  let calYear, calMonth;

  function initCalendar() {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth() + 1;
    loadCalendar();
  }

  async function loadCalendar() {
    const data = await App.fetchCalendarData(calYear, calMonth);
    renderCalendar(data);
  }

  function renderCalendar(checkinData) {
    const label = document.getElementById("calMonthLabel");
    const grid = document.getElementById("calendarGrid");
    if (!label || !grid) return;

    label.textContent = `${calYear}年${calMonth}月`;

    const dateMap = new Map();
    (checkinData || []).forEach((d) => dateMap.set(d.date, d.count));

    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();

    let html = "";
    ["日", "一", "二", "三", "四", "五", "六"].forEach((d) => {
      html += `<div class="cal-header">${d}</div>`;
    });

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="cal-cell empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = dateMap.get(dateStr) || 0;
      let level = 0;
      if (count >= 4) level = 4;
      else if (count >= 3) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;

      const today = App.localDateISO();
      const isToday = dateStr === today ? " today" : "";

      html += `<div class="cal-cell level-${level}${isToday}" title="${dateStr}: ${count} 次打卡">${day}</div>`;
    }

    grid.innerHTML = html;
  }

  function prevMonth() {
    calMonth--;
    if (calMonth < 1) { calMonth = 12; calYear--; }
    loadCalendar();
  }

  function nextMonth() {
    calMonth++;
    if (calMonth > 12) { calMonth = 1; calYear++; }
    loadCalendar();
  }

  App.initCalendar = initCalendar;
  App.prevMonth = prevMonth;
  App.nextMonth = nextMonth;
})(window.App);
```

- [ ] **Step 3: 在 index.html 中引用 calendar.js**

```html
<script src="js/views/calendar.js"></script>
```

- [ ] **Step 4: 在 app.js 的 bindEvents 末尾绑定日历事件，并在 render 中初始化**

在 `bindEvents()` 末尾添加：

```javascript
    const calPrev = $("#calPrev");
    const calNext = $("#calNext");
    if (calPrev) calPrev.addEventListener("click", window.App.prevMonth);
    if (calNext) calNext.addEventListener("click", window.App.nextMonth);
```

在 `render()` 末尾添加 `window.App.initCalendar()`。

- [ ] **Step 5: 新增日历热力图 CSS**

在 `styles.css` 末尾添加：

```css
.calendar-panel { margin-top: 18px; }

.calendar-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.calendar-arrow {
  border: 0;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(126,214,193,0.16);
  color: var(--mint-deep);
  font-weight: 800;
  cursor: pointer;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  text-align: center;
}

.cal-header {
  padding: 6px 0;
  font-size: 12px;
  color: var(--muted);
  font-weight: 800;
}

.cal-cell {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  background: rgba(126,214,193,0.06);
}

.cal-cell.empty { background: transparent; }

.cal-cell.level-1 { background: rgba(63,197,143,0.2); }
.cal-cell.level-2 { background: rgba(63,197,143,0.4); }
.cal-cell.level-3 { background: rgba(63,197,143,0.65); color: #fff; }
.cal-cell.level-4 { background: #3fc58f; color: #fff; }

.cal-cell.today {
  box-shadow: inset 0 0 0 2px var(--mint-deep);
}

.calendar-legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 10px;
  font-size: 11px;
  color: var(--muted);
}

.cal-dot {
  width: 14px;
  height: 14px;
  border-radius: 4px;
}

.cal-dot.level-1 { background: rgba(63,197,143,0.2); }
.cal-dot.level-2 { background: rgba(63,197,143,0.4); }
.cal-dot.level-3 { background: rgba(63,197,143,0.65); }
.cal-dot.level-4 { background: #3fc58f; }
```

---

### Task 11: 目标编辑功能

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（详情页添加编辑表单）
- Modify: `C:\Users\rl109\Desktop\芽目标\styles.css`（编辑表单样式）
- Modify: `C:\Users\rl109\Desktop\芽目标\js\app.js`（绑定编辑事件）

- [ ] **Step 1: 在 index.html 的 detail 视图中添加编辑区域**

在详情页 `</section>` 之前（`<section class="view detail-view" id="detail">` 内），在文章 `plan-panel` 之后添加：

```html
<article class="panel" id="editGoalSection" style="display:none;">
  <div class="panel-head"><span>编辑目标</span></div>
  <div class="edit-form">
    <label>目标名称 <input id="editGoalName" type="text" /></label>
    <div class="form-row">
      <label>目标天数 <input id="editGoalDays" type="number" min="1" max="365" /></label>
      <label>每天投入 <select id="editGoalTime">
        <option>10 分钟</option><option>20 分钟</option><option>30 分钟</option><option>60 分钟</option>
      </select></label>
    </div>
    <label>今日小行动 <input id="editGoalTask" type="text" /></label>
    <div class="edit-actions">
      <button class="primary-btn" id="saveEditBtn">保存修改</button>
      <button class="ghost-btn" id="cancelEditBtn">取消</button>
    </div>
  </div>
</article>
```

- [ ] **Step 2: 在详情页添加"编辑"按钮**

在 `detail` 视图中 `#deleteGoal` 按钮之前添加：

```html
<button class="ghost-btn wide" id="editGoalBtn">编辑目标</button>
```

- [ ] **Step 3: 在 app.js 的 bindEvents 中绑定编辑事件**

```javascript
    const editBtn = $("#editGoalBtn");
    const saveEditBtn = $("#saveEditBtn");
    const cancelEditBtn = $("#cancelEditBtn");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        const goal = window.App.activeGoal();
        if (!goal) return;
        document.getElementById("editGoalSection").style.display = "block";
        document.getElementById("editGoalName").value = goal.name;
        document.getElementById("editGoalDays").value = goal.days;
        document.getElementById("editGoalTime").value = goal.time;
        document.getElementById("editGoalTask").value = goal.task;
      });
    }
    if (saveEditBtn) {
      saveEditBtn.addEventListener("click", async () => {
        const goal = window.App.activeGoal();
        if (!goal) return;
        await window.App.updateGoal(goal.id, {
          name: document.getElementById("editGoalName").value.trim(),
          days: Number(document.getElementById("editGoalDays").value),
          time: document.getElementById("editGoalTime").value,
          task: document.getElementById("editGoalTask").value.trim()
        });
        document.getElementById("editGoalSection").style.display = "none";
      });
    }
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", () => {
        document.getElementById("editGoalSection").style.display = "none";
      });
    }
```

- [ ] **Step 4: 新增编辑表单样式**

在 `styles.css` 末尾添加：

```css
.edit-form {
  display: grid;
  gap: 14px;
}

.edit-actions {
  display: flex;
  gap: 10px;
}
```

---

### Task 12: 空状态 + 目标卡片 CSS

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\styles.css`（新增空状态和卡片样式）

- [ ] **Step 1: 添加空状态和卡片 v2 样式**

在 `styles.css` 末尾添加：

```css
.empty-state {
  text-align: center;
  padding: 20px 0;
}

.empty-bear {
  width: 100px;
  height: 100px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(126,214,193,0.2), rgba(255,247,238,0.8)) url("../designv2/ChatGPT Image 2026年5月12日 14_03_17 (2).png") center/80% no-repeat;
}

.empty-speech {
  display: inline-block;
  padding: 14px 18px;
  margin-bottom: 18px;
  border-radius: 18px;
  background: var(--cream);
}

.empty-speech strong { display: block; margin-bottom: 4px; }
.empty-speech p { margin: 0; color: var(--muted); font-size: 13px; }

.empty-templates {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  max-width: 360px;
  margin: 0 auto;
}

.empty-template-card {
  display: grid;
  gap: 4px;
  place-items: center;
  padding: 16px 8px;
  border: 2px dashed rgba(63,197,143,0.3);
  border-radius: 16px;
  background: rgba(126,214,193,0.06);
  cursor: pointer;
}

.empty-template-icon { font-size: 28px; }
.empty-template-label { font-weight: 800; font-size: 13px; }
.empty-template-hint { color: var(--muted); font-size: 11px; }

/* Goal Card V2 */
.goal-card-v2 {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 16px;
  border: 1px solid rgba(126,214,193,0.24);
  border-radius: 16px;
  background: rgba(255,255,255,0.72);
  cursor: pointer;
  transition: background 0.2s;
}

.goal-card-v2:hover { background: rgba(126,214,193,0.08); }
.goal-card-v2.active { background: linear-gradient(135deg, rgba(126,214,193,0.2), rgba(255,247,238,0.8)); }
.goal-card-v2.dormant { opacity: 0.55; }

.goal-card-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  font-size: 22px;
  background: linear-gradient(135deg, rgba(126,214,193,0.2), rgba(255,247,238,0.8));
}

.goal-card-body strong { display: block; font-size: 14px; margin-bottom: 2px; }
.goal-card-body small { color: var(--muted); font-size: 12px; }

.goal-card-bar {
  height: 6px;
  margin-top: 8px;
  border-radius: 99px;
  background: rgba(126,214,193,0.15);
  overflow: hidden;
}

.goal-card-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--mint-deep), var(--yellow), var(--pink));
  transition: width 0.3s ease;
}

.goal-card-stats { text-align: right; }
.goal-card-stats strong { font-size: 18px; color: var(--mint-deep); }
.goal-card-stats strong small { font-size: 12px; color: var(--muted); font-weight: normal; }
.goal-card-streak { display: block; color: #ff9500; font-weight: 800; font-size: 10px; margin-top: 2px; }
.goal-card-hint { display: block; color: var(--muted); font-size: 10px; margin-top: 2px; }
```

---

### Task 13: 全面验证

- [ ] **Step 1: 启动服务**

```bash
cd C:\Users\rl109\Desktop\芽目标
npm start
```

- [ ] **Step 2: 验证清单**

逐项验证：

| # | 验证项 | 操作 | 预期 |
|---|--------|------|------|
| 1 | 空状态 | 删除所有目标 | 显示芽芽熊引导 + 4 个模板卡片 |
| 2 | 模板快速创建 | 点击"每天阅读"模板 | 跳转到创建页第 2 步，已填好 |
| 3 | 目标卡片 | 创建 2+ 个目标回到首页 | 卡片显示图标、进度条、连续天数 |
| 4 | 打卡 | 点击打卡 | 跳转完成页，植物动画播放 |
| 5 | 完成页文案 | 首次/连续打卡 | 文案不同 |
| 6 | 对话式复盘 | 进入复盘页 | 一次一个问题，进度 1/3→2/3→3/3 |
| 7 | 日历热力图 | 首页滚动到底部 | 当月日历，打卡日绿色 |
| 8 | 日历翻月 | 点击左右箭头 | 切换月份 |
| 9 | 编辑目标 | 进入成长页，点"编辑目标" | 弹出编辑表单 |
| 10 | 保存编辑 | 修改名称后保存 | 列表即时更新 |
| 11 | 移动端 | Chrome DevTools 手机模式 | 空状态、卡片、日历正常 |
| 12 | 删除目标 | 点击删除 | 确认后删除，回到首页 |

---

### Task 14: 清理旧文件 + 最终确认

- [ ] **Step 1: 删除旧的 app.js**

```bash
rm "C:/Users/rl109/Desktop/芽目标/app.js"
```

（index.html 已经改为引用 js/app.js，旧文件不再需要）

- [ ] **Step 2: 检查所有引用**

确认 `index.html` 中所有 script 标签正确：

```html
<script src="js/api.js"></script>
<script src="js/state.js"></script>
<script src="js/views/create.js"></script>
<script src="js/views/home.js"></script>
<script src="js/views/detail.js"></script>
<script src="js/views/review.js"></script>
<script src="js/views/bear.js"></script>
<script src="js/views/complete.js"></script>
<script src="js/views/calendar.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 3: 重启服务，再次跑验证清单**

确认所有功能在清理后仍然正常。
