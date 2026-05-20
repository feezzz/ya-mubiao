# 模板库 + 规则引擎 + AI 扩能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 模板库扩充至 16 个 + 规则引擎（关键词匹配/打卡分析/复盘文案） + DeepSeek AI（目标拆解/复盘总结）

**Architecture:** 新增 `templates.json` 数据文件、`js/ai.js` AI 模块、`js/views/templates.js` 模板浏览组件。后端新增 5 个 API（templates、checkin-pattern、review-hint、ai/decompose、ai/review）。规则引擎跑纯本地逻辑，AI 通过 DeepSeek API。

**Tech Stack:** Node.js + Express + MySQL + DeepSeek API (OpenAI 兼容格式)

---

### Task 1: 模板数据文件 + API

**Files:**
- Create: `C:\Users\rl109\Desktop\芽目标\templates.json`
- Modify: `C:\Users\rl109\Desktop\芽目标\server.js`（新增 `GET /api/templates`）

- [ ] **Step 1: 创建 templates.json**

```json
[
  { "id":"learn-vocab","category":"study","icon":"📚","name":"30 天背 300 个单词","days":30,"time":"20 分钟","task":"背 10 个单词","keywords":["背单词","词汇","英语","四级","六级","雅思","托福"],"description":"适合备考、想提升词汇量的你" },
  { "id":"learn-reading","category":"study","icon":"📚","name":"每天阅读 20 分钟","days":21,"time":"20 分钟","task":"阅读 20 分钟","keywords":["阅读","读书","看书","充电","学习"],"description":"养成每日阅读的好习惯" },
  { "id":"learn-exam","category":"study","icon":"📚","name":"考证冲刺刷题","days":60,"time":"30 分钟","task":"刷题 30 分钟","keywords":["考证","考试","刷题","笔试","面试","证书","考研","考公"],"description":"为目标考试每天进步一点点" },
  { "id":"sport-daily","category":"sport","icon":"🏃","name":"每天运动 30 分钟","days":21,"time":"30 分钟","task":"运动 20 分钟","keywords":["运动","跑步","健身","减脂","减肥","瘦身","锻炼","体能"],"description":"从今天开始动起来" },
  { "id":"sport-sleep","category":"sport","icon":"🏃","name":"早睡早起","days":30,"time":"10 分钟","task":"22:30 放下手机","keywords":["早睡","早起","睡眠","作息","熬夜","规律"],"description":"用 30 天重建健康作息" },
  { "id":"sport-meditate","category":"sport","icon":"🏃","name":"每天冥想 10 分钟","days":14,"time":"10 分钟","task":"冥想 10 分钟","keywords":["冥想","正念","放松","焦虑","压力","平静","专注"],"description":"给自己 10 分钟的内心平静" },
  { "id":"money-save","category":"money","icon":"💰","name":"存钱 1 万元","days":100,"time":"10 分钟","task":"存下 100 元","keywords":["存钱","省钱","储蓄","攒钱","存款","理财","存"],"description":"每天存一点，100 天后收获惊喜" },
  { "id":"money-track","category":"money","icon":"💰","name":"每日记账","days":21,"time":"5 分钟","task":"记录今日收支","keywords":["记账","消费","支出","账单","开支","花钱"],"description":"21 天养成记账习惯" },
  { "id":"skill-draw","category":"skill","icon":"🎨","name":"每天画画 30 分钟","days":30,"time":"30 分钟","task":"画画 30 分钟","keywords":["画画","绘画","素描","涂鸦","插画","手绘"],"description":"每天一画，30 天看见进步" },
  { "id":"skill-instrument","category":"skill","icon":"🎨","name":"每天练琴/乐器","days":60,"time":"30 分钟","task":"练习 30 分钟","keywords":["乐器","钢琴","吉他","练琴","弹琴","音乐","练字"],"description":"坚持练习是唯一的捷径" },
  { "id":"skill-journal","category":"skill","icon":"🎨","name":"每天写日记","days":21,"time":"15 分钟","task":"写一篇日记","keywords":["日记","写作","记录","随笔","反思","总结"],"description":"记录每一天的思考和成长" },
  { "id":"work-pomodoro","category":"work","icon":"💼","name":"番茄工作法","days":14,"time":"25 分钟","task":"完成 4 个番茄钟","keywords":["番茄","专注","效率","工作","拖延","任务","时间管理"],"description":"用番茄钟打败拖延症" },
  { "id":"work-clean","category":"work","icon":"💼","name":"每日清理待办","days":7,"time":"15 分钟","task":"清理 3 个待办事项","keywords":["待办","任务","清理","整理","计划","清单","GTD"],"description":"每天清掉 3 个小任务" },
  { "id":"digital-less-phone","category":"digital","icon":"🌈","name":"少刷短视频","days":21,"time":"10 分钟","task":"短视频时间控制在 30 分钟内","keywords":["短视频","刷手机","抖音","快手","屏幕时间","戒手机","少看"],"description":"把刷视频的时间还给生活" },
  { "id":"digital-disconnect","category":"digital","icon":"🌈","name":"睡前 1 小时断网","days":14,"time":"20 分钟","task":"睡前 1 小时放下手机","keywords":["断网","睡前","手机","屏幕","蓝光","睡眠质量","关机"],"description":"睡前一小时，还给睡眠" },
  { "id":"custom","category":"custom","icon":"✏️","name":"写自己的目标","days":0,"time":"","task":"","keywords":[],"description":"不用模板，我自己来" }
]
```

- [ ] **Step 2: 在 server.js 顶部添加 fs require，并添加 GET /api/templates**

server.js 第 1 行已有 `const path = require("path");`。在第 2 行后添加 `const fs = require("fs");`。

然后在路由区域添加：

```javascript
let templatesCache = null;

function loadTemplates() {
  if (!templatesCache) {
    templatesCache = JSON.parse(fs.readFileSync(path.join(__dirname, "templates.json"), "utf8"));
  }
  return templatesCache;
}

app.get("/api/templates", (req, res) => {
  const { category } = req.query;
  let templates = loadTemplates();
  if (category && category !== "all") {
    templates = templates.filter((t) => t.category === category);
  }
  res.json(templates);
});
```

- [ ] **Step 3: 重启服务验证**

```bash
cd C:\Users\rl109\Desktop\芽目标
npm start
```

```bash
curl http://localhost:3001/api/templates
curl http://localhost:3001/api/templates?category=study
```

预期：返回完整模板列表 / 仅学习类模板。

---

### Task 2: 模板浏览前端

**Files:**
- Create: `C:\Users\rl109\Desktop\芽目标\js\views\templates.js`
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（替换创建页模板区）
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（添加 script 引用）
- Modify: `C:\Users\rl109\Desktop\芽目标\styles.css`（模板 UI 样式）

- [ ] **Step 1: 创建 js/views/templates.js**

```javascript
window.App = window.App || {};

(function (App) {
  let templates = [];
  let activeCategory = "all";

  async function loadTemplates() {
    try {
      const data = await App.request("/templates");
      templates = data;
      renderTemplates();
    } catch (e) {
      // Templates fail silently, fall back to manual input
    }
  }

  function renderTemplates() {
    const container = document.getElementById("templateBrowser");
    if (!container) return;

    const filtered = activeCategory === "all"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

    const categories = [
      { key: "all", label: "全部" },
      { key: "study", label: "📚 学习" },
      { key: "sport", label: "🏃 运动" },
      { key: "money", label: "💰 理财" },
      { key: "skill", label: "🎨 技能" },
      { key: "work", label: "💼 效率" },
      { key: "digital", label: "🌈 数字" }
    ];

    container.innerHTML = `
      <div class="template-categories">
        ${categories.map((c) =>
          `<button class="template-cat-btn ${c.key === activeCategory ? "active" : ""}" data-cat="${c.key}">${c.label}</button>`
        ).join("")}
      </div>
      <div class="template-grid">
        ${filtered.map((t) =>
          `<button class="template-card" data-template-id="${t.id}" data-template="${t.name}|${t.days}|${t.time}|${t.task}">
            <span class="template-icon">${t.icon}</span>
            <span class="template-name">${App.escapeHTML(t.name)}</span>
            <span class="template-desc">${App.escapeHTML(t.description)}</span>
          </button>`
        ).join("")}
      </div>
    `;

    container.querySelectorAll(".template-cat-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat;
        renderTemplates();
      });
    });

    container.querySelectorAll(".template-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tpl = btn.dataset.template;
        if (btn.dataset.templateId === "custom") {
          return;
        }
        const [name, days, time, task] = tpl.split("|");
        document.getElementById("goalName").value = name;
        document.getElementById("goalDays").value = days;
        document.getElementById("goalTime").value = time || "20 分钟";
        document.getElementById("goalTask").value = task;
        App.updateSeedPreview();
        App.setCreateStep(3);
      });
    });
  }

  App.loadTemplates = loadTemplates;
  App.renderTemplates = renderTemplates;
  App.getTemplates = () => templates;
})(window.App);
```

- [ ] **Step 2: 替换 index.html 中创建页第一步的模板区域**

在创建页第一步（`data-step="1"` 的 div 内），将现有的 4 个 template-row 按钮：

```html
<div class="template-row">
  <button type="button" data-template="...">背单词</button>
  ...
</div>
```

替换为：

```html
<div id="templateBrowser"></div>
<p class="template-or-divider">
  <span>或者直接写目标</span>
</p>
```

- [ ] **Step 3: 在 index.html 添加 templates.js 引用**

在 calendar.js 引用之前添加：

```html
<script src="js/views/templates.js"></script>
```

- [ ] **Step 4: 在 app.js 的 render() 中触发模板加载**

在 `render()` 函数末尾添加：

```javascript
window.App.loadTemplates();
```

- [ ] **Step 5: 模板 UI CSS**

在 `styles.css` 末尾添加：

```css
.template-categories {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.template-cat-btn {
  border: 0;
  padding: 6px 14px;
  border-radius: 99px;
  font-size: 12px;
  font-weight: 800;
  color: var(--muted);
  background: rgba(126,214,193,0.12);
  cursor: pointer;
}

.template-cat-btn.active {
  color: #fff;
  background: var(--mint-deep);
}

.template-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.template-card {
  display: grid;
  gap: 4px;
  padding: 14px;
  border: 1px solid rgba(63,197,143,0.2);
  border-radius: 16px;
  background: rgba(255,255,255,0.7);
  text-align: left;
  cursor: pointer;
}

.template-icon { font-size: 24px; }
.template-name { font-weight: 800; font-size: 13px; }
.template-desc { color: var(--muted); font-size: 11px; line-height: 1.4; }

.template-or-divider {
  text-align: center;
  margin: 10px 0;
  color: var(--muted);
  font-size: 12px;
}
```

---

### Task 3: 关键词模板匹配（规则引擎 1）

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\js\state.js`（新增 `suggestTemplates`）
- Modify: `C:\Users\rl109\Desktop\芽目标\js\views\create.js`（输入时显示匹配建议）

- [ ] **Step 1: 在 state.js 新增 suggestTemplates**

```javascript
function suggestTemplates(query, templates) {
  if (!query || !templates || !templates.length) return [];
  const q = query.toLowerCase();
  const scores = templates
    .filter((t) => t.id !== "custom")
    .map((t) => {
      let score = 0;
      (t.keywords || []).forEach((kw) => {
        if (q.includes(kw.toLowerCase())) score += 1;
      });
      if (q.includes(t.name)) score += 2;
      return { template: t, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return scores;
}

App.suggestTemplates = suggestTemplates;
```

- [ ] **Step 2: 在 create.js 中绑定输入事件**

在 `setCreateStep` 函数中，当 step === 1 时，监听 goalName 输入：

在 create.js 末尾（IIFE 内部）添加：

```javascript
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("goalName");
  if (input) {
    input.addEventListener("input", () => {
      const suggestions = App.suggestTemplates(input.value, App.getTemplates());
      const el = document.getElementById("templateSuggestions");
      if (!el) return;
      if (suggestions.length && input.value.length >= 2) {
        el.innerHTML = suggestions.map((s) =>
          `<button class="template-suggestion" data-template="${s.template.name}|${s.template.days}|${s.template.time}|${s.template.task}">
            ${s.template.icon} ${s.template.name}
          </button>`
        ).join("");
        el.style.display = "block";
        el.querySelectorAll(".template-suggestion").forEach((btn) => {
          btn.addEventListener("click", () => {
            const [name, days, time, task] = btn.dataset.template.split("|");
            input.value = name;
            document.getElementById("goalDays").value = days;
            document.getElementById("goalTime").value = time;
            document.getElementById("goalTask").value = task;
            App.updateSeedPreview();
            App.setCreateStep(2);
            el.style.display = "none";
          });
        });
      } else {
        el.style.display = "none";
      }
    });
  }
});
```

- [ ] **Step 3: 在 index.html 创建页添加建议容器**

在 `#templateBrowser` 和模板分隔线之间添加：

```html
<div id="templateSuggestions" style="display:none;" class="template-suggestions"></div>
```

---

### Task 4: 统计 API（规则引擎 2+3）

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\server.js`（新增两个统计路由）

- [ ] **Step 1: 添加 GET /api/stats/checkin-pattern**

在 server.js 的 checkins 相关路由区域添加：

```javascript
app.get("/api/stats/checkin-pattern", async (req, res, next) => {
  try {
    const { goal_id } = req.query;
    let query = `
      SELECT HOUR(created_at) AS hour, COUNT(*) AS count
      FROM checkins
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
    `;
    const params = [];
    if (goal_id) {
      query += " AND goal_id = ?";
      params.push(Number(goal_id));
    }
    query += " GROUP BY HOUR(created_at) ORDER BY count DESC LIMIT 1";

    const [rows] = await pool.query(query, params);
    if (rows.length) {
      const total = rows.reduce((s, r) => s + r.count, 0);
      res.json({
        bestHour: rows[0].hour,
        confidence: Math.min(1, rows[0].count / Math.max(1, total / 24)),
        pattern: rows[0].hour < 10 ? "morning" : rows[0].hour < 14 ? "noon" : rows[0].hour < 18 ? "afternoon" : "evening"
      });
    } else {
      res.json({ bestHour: null, confidence: 0, pattern: null });
    }
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 2: 添加 GET /api/stats/review-hint**

```javascript
app.get("/api/stats/review-hint", async (req, res, next) => {
  try {
    const goalId = req.query.goal_id ? Number(req.query.goal_id) : null;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + mondayOffset);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    const params = [];
    let filter = "";
    if (goalId) {
      filter = " AND goal_id = ?";
      params.push(goalId);
    }

    const [weekRows] = await pool.query(
      `SELECT COUNT(DISTINCT checkin_date) AS cnt FROM checkins WHERE checkin_date >= ? AND checkin_date < DATE_ADD(?, INTERVAL 7 DAY)${filter}`,
      [thisMonday.toISOString().slice(0, 10), thisMonday.toISOString().slice(0, 10), ...params]
    );
    params.length = 0;
    if (goalId) params.push(goalId);

    const [lastWeekRows] = await pool.query(
      `SELECT COUNT(DISTINCT checkin_date) AS cnt FROM checkins WHERE checkin_date >= ? AND checkin_date < DATE_ADD(?, INTERVAL 7 DAY)${filter}`,
      [lastMonday.toISOString().slice(0, 10), lastMonday.toISOString().slice(0, 10), ...params]
    );
    params.length = 0;
    if (goalId) params.push(goalId);

    const [streakRows] = await pool.query(
      `SELECT MAX(streak_len) AS streak FROM (
        SELECT checkin_date, ROW_NUMBER() OVER (ORDER BY checkin_date) -
          DATEDIFF(checkin_date, ?) AS grp,
          COUNT(*) AS streak_len
        FROM (SELECT DISTINCT checkin_date FROM checkins WHERE 1=1${filter} ORDER BY checkin_date DESC LIMIT 30) d
        GROUP BY grp ORDER BY streak_len DESC LIMIT 1
      ) s`,
      [today.toISOString().slice(0, 10), ...params]
    );
    params.length = 0;
    if (goalId) params.push(goalId);

    const [weekdayRows] = await pool.query(
      `SELECT DAYOFWEEK(checkin_date) AS dow FROM checkins WHERE checkin_date >= ? AND checkin_date < DATE_ADD(?, INTERVAL 7 DAY)${filter}`,
      [thisMonday.toISOString().slice(0, 10), thisMonday.toISOString().slice(0, 10), ...params]
    );

    const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const weekdayCounts = new Array(7).fill(0);
    weekdayRows.forEach((r) => { weekdayCounts[(r.dow - 1 + 7) % 7]++; });
    let weakDay = null;
    let minCount = Infinity;
    // Only consider weekdays Mon-Fri that have passed
    for (let i = 1; i <= Math.min(5, dayOfDay(today)); i++) {
      if (weekdayCounts[i] < minCount) { minCount = weekdayCounts[i]; weakDay = weekdayNames[i]; }
    }

    const weeklyTotal = weekRows[0]?.cnt || 0;
    const lastWeekTotal = lastWeekRows[0]?.cnt || 0;

    res.json({
      weeklyTotal,
      lastWeekTotal,
      trend: weeklyTotal > lastWeekTotal ? "up" : weeklyTotal < lastWeekTotal ? "down" : "same",
      streak: streakRows[0]?.streak || 0,
      weakDay
    });
  } catch (error) {
    next(error);
  }
});

function dayOfDay(date) {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}
```

- [ ] **Step 3: 验证**

```bash
curl http://localhost:3001/api/stats/checkin-pattern
curl http://localhost:3001/api/stats/review-hint
```

---

### Task 5: 前端 — 最佳时间提示 + 复盘草稿按钮

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\js\views\home.js`（芽芽熊卡片显示最佳时间）
- Modify: `C:\Users\rl109\Desktop\芽目标\js\views\review.js`（复盘草稿按钮）
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（复盘页新增草稿按钮）

- [ ] **Step 1: 首页熊卡片显示打卡时间建议**

在 `home.js` 的 `App.renderHome` 中，在设置 `bearMessage` 之前添加异步调用：

```javascript
App.renderHome = function () {
    // ... existing code ...

    // Async: fetch checkin pattern
    App.request("/stats/checkin-pattern").then((pattern) => {
      if (pattern.confidence > 0.6 && pattern.bestHour) {
        const period = pattern.pattern === "morning" ? "早上" : pattern.pattern === "noon" ? "中午" : pattern.pattern === "afternoon" ? "下午" : "晚上";
        const msg = `${period} ${pattern.bestHour} 点左右是你最常打卡的时间，要不要固定下来？`;
        document.getElementById("bearMessage").textContent = msg;
        document.getElementById("bearRoomMessage").textContent = msg;
        document.getElementById("sidebarMessage").textContent = msg;
      }
    }).catch(() => {});
  };
```

注意：将异步逻辑嵌入现有同步 render 函数中，不阻塞渲染。

- [ ] **Step 2: 复盘页新增"规则引擎草稿"按钮**

在 index.html 复盘表单中，`review-actions` 之前添加：

```html
<button class="ghost-btn wide" type="button" id="reviewHintBtn">📝 生成本周草稿</button>
```

- [ ] **Step 3: 在 app.js bindEvents 中绑定草稿按钮**

```javascript
const reviewHintBtn = $("#reviewHintBtn");
if (reviewHintBtn) {
  reviewHintBtn.addEventListener("click", async () => {
    try {
      const hint = await window.App.request("/stats/review-hint");
      const weekMsg = `本周完成 ${hint.weeklyTotal}/7 天`;
      const trendMsg = hint.trend === "up" ? "比上周进步了！" : hint.trend === "down" ? "比上周少了一些。" : "和上周持平。";
      const streakMsg = hint.streak > 0 ? `连续 ${hint.streak} 天打卡。` : "";
      const weakMsg = hint.weakDay ? `${hint.weakDay}最容易中断，试试那天安排轻松一点的任务？` : "";

      const done = document.getElementById("reviewDone");
      const stuck = document.getElementById("reviewStuck");
      const next = document.getElementById("reviewNext");
      if (done && !done.value) done.value = `${weekMsg}，${trendMsg}`;
      if (stuck && !stuck.value) stuck.value = weakMsg || "暂无明显的卡点。";
      if (next && !next.value) next.value = `${streakMsg}保持节奏，一步一步来。`;
      window.App.showToast("草稿已生成，你可以修改后再保存。");
    } catch (e) {
      window.App.showToast("暂时无法生成草稿。");
    }
  });
}
```

---

### Task 6: AI 模块 — js/ai.js + 速率限制

**Files:**
- Create: `C:\Users\rl109\Desktop\芽目标\js\ai.js`
- Modify: `C:\Users\rl109\Desktop\芽目标\server.js`（速率限制中间件 + 两个 AI 路由）
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（添加 ai.js 引用）

- [ ] **Step 1: 创建 js/ai.js**

```javascript
window.App = window.App || {};

(function (App) {
  async function aiDecompose(goal) {
    try {
      const result = await App.request("/ai/decompose", {
        method: "POST",
        body: JSON.stringify({ goal })
      });
      return result;
    } catch (e) {
      if (e.message.includes("429")) {
        App.showToast("AI 今天有点累了，休息一下再试试。");
      } else {
        App.showToast("AI 暂时不可用: " + e.message);
      }
      return null;
    }
  }

  async function aiReview(goalId) {
    try {
      const result = await App.request("/ai/review", {
        method: "POST",
        body: JSON.stringify({ goalId })
      });
      return result;
    } catch (e) {
      if (e.message.includes("429")) {
        App.showToast("AI 今天有点累了，休息一下再试试。");
      } else {
        App.showToast("AI 暂时不可用: " + e.message);
      }
      return null;
    }
  }

  App.aiDecompose = aiDecompose;
  App.aiReview = aiReview;
})(window.App);
```

- [ ] **Step 2: 在 index.html 添加引用**

在 calendar.js 之前：

```html
<script src="js/ai.js"></script>
```

- [ ] **Step 3: 在 server.js 添加速率限制和 AI 路由**

速率限制中间件（放在其他 app.use 之后）：

```javascript
const aiRateLimit = new Map();

function checkAIRateLimit(req, res, next) {
  const ip = req.ip || "127.0.0.1";
  const key = ip + "_" + new Date().toISOString().slice(0, 13); // hour key
  const count = aiRateLimit.get(key) || 0;
  if (count >= 10) {
    return res.status(429).json({ message: "AI 今天有点累了，休息一下再试试。" });
  }
  aiRateLimit.set(key, count + 1);
  next();
}
```

AI 拆解路由：

```javascript
app.post("/api/ai/decompose", checkAIRateLimit, async (req, res, next) => {
  try {
    const aiEnabled = process.env.AI_ENABLED !== "false";
    if (!aiEnabled) return res.status(503).json({ message: "AI 功能未开启。" });

    const { goal } = req.body;
    if (!goal || !goal.trim()) return res.status(400).json({ message: "请描述你的目标。" });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

    if (!apiKey) return res.status(503).json({ message: "AI 未配置，请设置 DEEPSEEK_API_KEY。" });

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "你是芽目标的 AI 助手芽芽熊。把用户模糊的目标拆成具体可执行的每日行动。返回纯 JSON，不要 markdown 代码块。格式: { name: 目标名, days: 天数(整数), time: 每日投入, task: 今日小行动, reason: 为什么这样拆 }" },
          { role: "user", content: `目标：${goal}` }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    // Extract JSON from potential markdown wrapping
    const json = JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, "").trim());
    res.json(json);
  } catch (error) {
    if (error.status === 429) return res.status(429).json({ message: "AI 今天有点累了，休息一下再试试。" });
    console.error("AI decompose error:", error.message);
    res.status(500).json({ message: "AI 暂时不可用，请手动填写。" });
  }
});
```

AI 复盘路由：

```javascript
app.post("/api/ai/review", checkAIRateLimit, async (req, res, next) => {
  try {
    const aiEnabled = process.env.AI_ENABLED !== "false";
    if (!aiEnabled) return res.status(503).json({ message: "AI 功能未开启。" });

    const { goalId } = req.body;
    if (!goalId) return res.status(400).json({ message: "缺少目标 ID。" });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    if (!apiKey) return res.status(503).json({ message: "AI 未配置。" });

    // Gather context
    const [[goalRow]] = await pool.query("SELECT * FROM goals WHERE id = ?", [Number(goalId)]);
    if (!goalRow) return res.status(404).json({ message: "目标不存在。" });

    const [checkins] = await pool.query(
      "SELECT DATE_FORMAT(checkin_date, '%Y-%m-%d') AS date FROM checkins WHERE goal_id = ? ORDER BY checkin_date DESC LIMIT 30",
      [Number(goalId)]
    );

    const [reviews] = await pool.query(
      "SELECT done_text, stuck_text, next_text FROM reviews ORDER BY id DESC LIMIT 3"
    );

    const today = new Date();
    const mondayOffset = today.getDay() === 0 ? -6 : 1 - today.getDay();
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + mondayOffset);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    const thisWeek = checkins.filter((c) => c.date >= thisMonday.toISOString().slice(0, 10));
    const lastWeek = checkins.filter((c) => c.date >= lastMonday.toISOString().slice(0, 10) && c.date < thisMonday.toISOString().slice(0, 10));

    const context = `目标: ${goalRow.name} (${goalRow.checkins ? goalRow.checkins.length : '?'}/${goalRow.days} 天)
本周打卡: ${thisWeek.map(c => c.date).join(', ') || '无'}
上周打卡: ${lastWeek.map(c => c.date).join(', ') || '无'}
最近复盘: ${reviews.map(r => `完成:${r.done_text}, 卡点:${r.stuck_text}, 明天:${r.next_text}`).join(' | ') || '无'}`;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "你是芽目标的分析助手。根据打卡数据生成三段式复盘。返回纯 JSON: { done: 完成了什么、趋势, stuck: 可能的卡点和风险, next: 明天具体建议 }。每段 1-3 句话，温暖鼓励，不说教。" },
          { role: "user", content: context }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const json = JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, "").trim());
    res.json(json);
  } catch (error) {
    console.error("AI review error:", error.message);
    res.status(500).json({ message: "AI 暂时不可用，请手动复盘。" });
  }
});
```

- [ ] **Step 4: 确认 server.js 顶部有 fs require**

已在 Task 1 Step 2 添加 `const fs = require("fs");`，`path` 原本就有。不重复添加。

---

### Task 7: 前端 — AI 拆解按钮 + AI 复盘按钮

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\index.html`（创建页 + 复盘页加按钮）
- Modify: `C:\Users\rl109\Desktop\芽目标\js\app.js`（绑定按钮事件）

- [ ] **Step 1: 创建页添加 AI 拆解按钮**

在 index.html 创建页第一步 `#templateBrowser` 下方、`#templateSuggestions` 附近添加：

```html
<button class="ghost-btn wide" type="button" id="aiDecomposeBtn" style="margin-top:8px;">
  ✨ AI 帮我拆解目标
</button>
<div id="aiDecomposeResult" style="display:none;" class="ai-result-card"></div>
```

- [ ] **Step 2: 复盘页添加 AI 复盘按钮**

在复盘表单 `#reviewHintBtn` 旁边添加：

```html
<button class="primary-btn" type="button" id="aiReviewBtn">🤖 AI 帮我总结</button>
```

- [ ] **Step 3: 在 app.js bindEvents 中绑定 AI 按钮**

```javascript
const aiDecomposeBtn = $("#aiDecomposeBtn");
if (aiDecomposeBtn) {
  aiDecomposeBtn.addEventListener("click", async () => {
    const goalText = $("#goalName").value.trim();
    if (!goalText) {
      window.App.showToast("先简单描述一下你的目标。");
      return;
    }
    aiDecomposeBtn.disabled = true;
    aiDecomposeBtn.textContent = "🤔 AI 思考中...";
    const result = await window.App.aiDecompose(goalText);
    aiDecomposeBtn.disabled = false;
    aiDecomposeBtn.textContent = "✨ AI 帮我拆解目标";
    if (result) {
      const el = $("#aiDecomposeResult");
      el.style.display = "block";
      el.innerHTML = `
        <div class="ai-result-content">
          <strong>${window.App.escapeHTML(result.name || "")}</strong>
          <p>${window.App.escapeHTML(result.reason || "")}</p>
          <small>${result.days || 30} 天 · ${result.time || "20 分钟"} · ${window.App.escapeHTML(result.task || "")}</small>
          <div class="ai-result-actions">
            <button class="primary-btn" id="acceptAiResult">采用</button>
            <button class="ghost-btn" id="dismissAiResult">不用</button>
          </div>
        </div>
      `;
      $("#acceptAiResult").addEventListener("click", () => {
        $("#goalName").value = result.name || goalText;
        $("#goalDays").value = result.days || 30;
        $("#goalTime").value = result.time || "20 分钟";
        $("#goalTask").value = result.task || goalText;
        window.App.updateSeedPreview();
        window.App.setCreateStep(3);
        el.style.display = "none";
      });
      $("#dismissAiResult").addEventListener("click", () => { el.style.display = "none"; });
    }
  });
}

const aiReviewBtn = $("#aiReviewBtn");
if (aiReviewBtn) {
  aiReviewBtn.addEventListener("click", async () => {
    const goal = window.App.activeGoal();
    if (!goal) {
      window.App.showToast("先选择一个目标。");
      return;
    }
    aiReviewBtn.disabled = true;
    aiReviewBtn.textContent = "🤔 AI 分析中...";
    const result = await window.App.aiReview(goal.id);
    aiReviewBtn.disabled = false;
    aiReviewBtn.textContent = "🤖 AI 帮我总结";
    if (result) {
      const done = document.getElementById("reviewDone");
      const stuck = document.getElementById("reviewStuck");
      const next = document.getElementById("reviewNext");
      if (done && result.done) done.value = result.done;
      if (stuck && result.stuck) stuck.value = result.stuck;
      if (next && result.next) next.value = result.next;
      window.App.showToast("AI 总结已生成，你可以修改后再保存。");
    }
  });
}
```

---

### Task 8: AI 结果卡片 CSS

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\styles.css`（ai-result 样式）

- [ ] **Step 1: 添加 AI 结果卡片样式**

```css
.ai-result-card {
  margin-top: 10px;
  padding: 16px;
  border: 2px solid var(--mint-deep);
  border-radius: 18px;
  background: rgba(63,197,143,0.06);
}

.ai-result-content strong {
  display: block;
  font-size: 16px;
  margin-bottom: 6px;
}

.ai-result-content p {
  color: var(--muted);
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.6;
}

.ai-result-content small {
  display: block;
  color: var(--mint-deep);
  font-weight: 800;
  margin-bottom: 12px;
}

.ai-result-actions {
  display: flex;
  gap: 8px;
}

.ai-result-actions .primary-btn,
.ai-result-actions .ghost-btn {
  min-height: 38px;
  padding: 0 16px;
  font-size: 13px;
}
```

---

### Task 9: 配置 + .env 更新

**Files:**
- Modify: `C:\Users\rl109\Desktop\芽目标\.env`
- Modify: `C:\Users\rl109\Desktop\芽目标\.env.example`

- [ ] **Step 1: 更新 .env**

```bash
echo "" >> .env
echo "# DeepSeek AI (可选)" >> .env
echo "DEEPSEEK_API_KEY=sk-your-key-here" >> .env
echo "DEEPSEEK_BASE_URL=https://api.deepseek.com" >> .env
echo "DEEPSEEK_MODEL=deepseek-chat" >> .env
echo "AI_ENABLED=true" >> .env
```

- [ ] **Step 2: 更新 .env.example**

```bash
echo "# DeepSeek AI (可选，不需要 AI 功能可不填)" >> .env.example
echo "DEEPSEEK_API_KEY=" >> .env.example
echo "DEEPSEEK_BASE_URL=https://api.deepseek.com" >> .env.example
echo "DEEPSEEK_MODEL=deepseek-chat" >> .env.example
echo "AI_ENABLED=false" >> .env.example
```

---

### Task 10: 全面验证

- [ ] **Step 1: 启动服务**

```bash
cd C:\Users\rl109\Desktop\芽目标
npm start
```

- [ ] **Step 2: 验证清单**

| # | 验证项 | 操作 | 预期 |
|---|--------|------|------|
| 1 | 模板加载 | `curl localhost:3001/api/templates` | 返回 16 个模板 |
| 2 | 分类过滤 | `curl localhost:3001/api/templates?category=study` | 返回 3 个学习模板 |
| 3 | 模板浏览 | 打开创建页 | 显示分类标签 + 模板卡片网格 |
| 4 | 模板点击 | 点击"每天阅读 20 分钟" | 自动填入表单跳到第 3 步 |
| 5 | 关键词匹配 | 在目标名输入"跑步" | 显示运动类模板建议 |
| 6 | 打卡时间统计 | `curl localhost:3001/api/stats/checkin-pattern` | 返回 JSON |
| 7 | 复盘草稿 | 点击"生成本周草稿" | 三个字段都有内容 |
| 8 | AI 拆解（需 Key） | 输入目标后点"AI 帮我拆" | AI 返回拆解结果 |
| 9 | AI 复盘（需 Key） | 复盘页点"AI 帮我总结" | AI 返回三段式文本 |
| 10 | 关闭 AI | `.env` 设 `AI_ENABLED=false` 重启 | AI 按钮隐藏，返回 503 |
| 11 | 速率限制 | 连续发 11 次 AI 请求 | 第 11 次返回 429 |
| 12 | 无 Key 降级 | 删掉 `DEEPSEEK_API_KEY` | AI 返回 503 "AI 未配置" |
| 13 | 移动端 | DevTools 手机模式 | 模板网格 2 列正常 |
