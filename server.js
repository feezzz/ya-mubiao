const path = require("path");
const fs = require("fs");
const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 3001);
const isVercel = !!process.env.VERCEL;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(express.static(__dirname, {
  setHeaders(res, filePath) {
    if (filePath.endsWith(".webmanifest")) {
      res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    }
  }
}));

app.use((req, res, next) => {
  const uid = req.headers["x-user-id"];
  req.userId = uid ? Number(uid) : null;
  next();
});

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INT,
      name VARCHAR(255) NOT NULL,
      days INT NOT NULL,
      time_investment VARCHAR(50) NOT NULL,
      task VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS checkins (
      id SERIAL PRIMARY KEY,
      goal_id INT NOT NULL,
      checkin_date DATE NOT NULL,
      user_id INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Unique constraint may already exist; ignore if so
  try {
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_goal_day ON checkins (goal_id, checkin_date)`);
  } catch (e) {}

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      goal_id INT,
      review_date DATE NOT NULL,
      done_text TEXT,
      stuck_text TEXT,
      next_text TEXT,
      user_id INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

function todayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toGoal(row, checkins) {
  return {
    id: String(row.id),
    name: row.name,
    days: row.days,
    time: row.time_investment,
    task: row.task,
    createdAt: row.created_at,
    checkins: checkins || []
  };
}

async function fetchGoals(userId) {
  if (!userId) return [];
  const { rows: goals } = await pool.query(
    "SELECT * FROM goals WHERE user_id = $1 ORDER BY id DESC", [userId]
  );
  const { rows: checkins } = await pool.query(
    "SELECT goal_id, TO_CHAR(checkin_date, 'YYYY-MM-DD') AS checkin_date FROM checkins WHERE user_id = $1 ORDER BY checkin_date ASC",
    [userId]
  );

  const byGoal = new Map();
  for (const row of checkins) {
    const id = String(row.goal_id);
    if (!byGoal.has(id)) byGoal.set(id, []);
    byGoal.get(id).push(row.checkin_date);
  }

  return goals.map((goal) => toGoal(goal, byGoal.get(String(goal.id)) || []));
}

// === API Routes ===

app.get("/api/debug", (req, res) => {
  const fs = require("fs");
  const rootFiles = fs.readdirSync(__dirname);
  const designFiles = fs.existsSync(path.join(__dirname, "designv2"))
    ? fs.readdirSync(path.join(__dirname, "designv2")) : [];
  const jsFiles = fs.existsSync(path.join(__dirname, "js"))
    ? fs.readdirSync(path.join(__dirname, "js")) : [];
  res.json({ __dirname, cwd: process.cwd(), rootFiles, designFiles, jsFiles });
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

// Templates (unchanged — reads from JSON file)
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

// Users
app.post("/api/users", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "请输入名字。" });
    const { rows } = await pool.query("INSERT INTO users (name) VALUES ($1) RETURNING id, name", [name.trim()]);
    res.status(201).json({ id: String(rows[0].id), name: rows[0].name });
  } catch (error) { next(error); }
});

app.get("/api/users", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT id, name, created_at AS \"createdAt\" FROM users ORDER BY id");
    res.json(rows.map((r) => ({ ...r, id: String(r.id) })));
  } catch (error) { next(error); }
});

// Goals
app.get("/api/goals", async (req, res, next) => {
  try {
    res.json(await fetchGoals(req.userId));
  } catch (error) { next(error); }
});

app.post("/api/goals", async (req, res, next) => {
  try {
    if (!req.userId) return res.status(400).json({ message: "请先选择用户。" });
    const { name, days, time, task } = req.body;
    if (!name || !days || !time || !task) {
      return res.status(400).json({ message: "目标名称、天数、每天投入和今日小行动都要填写。" });
    }
    if (Number(days) < 1 || Number(days) > 365) {
      return res.status(400).json({ message: "目标天数建议填写 1 到 365 天。" });
    }

    const { rows } = await pool.query(
      "INSERT INTO goals (name, days, time_investment, task, user_id) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [String(name).trim(), Number(days), String(time).trim(), String(task).trim(), req.userId]
    );
    res.status(201).json(toGoal(rows[0], []));
  } catch (error) { next(error); }
});

app.delete("/api/goals/:id", async (req, res, next) => {
  try {
    if (!req.userId) return res.status(400).json({ message: "请先选择用户。" });
    const goalId = Number(req.params.id);
    const { rowCount } = await pool.query(
      "DELETE FROM goals WHERE id = $1 AND user_id = $2", [goalId, req.userId]
    );
    if (!rowCount) return res.status(404).json({ message: "没有找到这个目标。" });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.put("/api/goals/:id", async (req, res, next) => {
  try {
    if (!req.userId) return res.status(400).json({ message: "请先选择用户。" });
    const goalId = Number(req.params.id);
    const { name, days, time, task } = req.body;
    if (!name || !days || !time || !task) {
      return res.status(400).json({ message: "目标名称、天数、每天投入和今日小行动都要填写。" });
    }
    if (Number(days) < 1 || Number(days) > 365) {
      return res.status(400).json({ message: "目标天数建议填写 1 到 365 天。" });
    }

    const { rowCount, rows } = await pool.query(
      "UPDATE goals SET name = $1, days = $2, time_investment = $3, task = $4 WHERE id = $5 AND user_id = $6 RETURNING *",
      [String(name).trim(), Number(days), String(time).trim(), String(task).trim(), goalId, req.userId]
    );
    if (!rowCount) return res.status(404).json({ message: "没有找到这个目标。" });

    const { rows: checkins } = await pool.query(
      "SELECT TO_CHAR(checkin_date, 'YYYY-MM-DD') AS checkin_date FROM checkins WHERE goal_id = $1 ORDER BY checkin_date ASC",
      [goalId]
    );
    res.json(toGoal(rows[0], checkins.map((c) => c.checkin_date)));
  } catch (error) { next(error); }
});

// Checkins
app.post("/api/goals/:id/checkins", async (req, res, next) => {
  try {
    if (!req.userId) return res.status(400).json({ message: "缺少用户信息。" });
    const goalId = Number(req.params.id);
    const date = req.body.date || todayDate();

    const { rows: goals } = await pool.query("SELECT id FROM goals WHERE id = $1 AND user_id = $2", [goalId, req.userId]);
    if (!goals.length) return res.status(404).json({ message: "没有找到这个目标。" });

    try {
      await pool.query(
        "INSERT INTO checkins (goal_id, checkin_date, user_id) VALUES ($1, $2, $3)",
        [goalId, date, req.userId]
      );
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({ message: "今天已经打卡过啦，休息一下也可以。" });
      }
      throw error;
    }

    res.status(201).json({ ok: true, date });
  } catch (error) { next(error); }
});

app.delete("/api/goals/:id/checkins", async (req, res, next) => {
  try {
    if (!req.userId) return res.status(400).json({ message: "缺少用户信息。" });
    const goalId = Number(req.params.id);
    const date = req.body.date || todayDate();

    const { rows: goals } = await pool.query("SELECT id FROM goals WHERE id = $1 AND user_id = $2", [goalId, req.userId]);
    if (!goals.length) return res.status(404).json({ message: "没有找到这个目标。" });

    const { rowCount } = await pool.query(
      "DELETE FROM checkins WHERE goal_id = $1 AND checkin_date = $2 AND user_id = $3",
      [goalId, date, req.userId]
    );
    if (!rowCount) return res.status(404).json({ message: "今天还没有打卡记录。" });

    res.json({ ok: true, date });
  } catch (error) { next(error); }
});

app.get("/api/checkins", async (req, res, next) => {
  try {
    if (!req.userId) return res.json([]);
    const { goal_id, year, month } = req.query;
    let query = `
      SELECT TO_CHAR(checkin_date, 'YYYY-MM-DD') AS date, COUNT(*) AS count
      FROM checkins
      WHERE user_id = $1
    `;
    const params = [req.userId];
    let idx = 2;

    if (goal_id) {
      query += ` AND goal_id = $${idx++}`;
      params.push(Number(goal_id));
    }
    if (year) {
      query += ` AND EXTRACT(YEAR FROM checkin_date) = $${idx++}`;
      params.push(Number(year));
    }
    if (month) {
      query += ` AND EXTRACT(MONTH FROM checkin_date) = $${idx++}`;
      params.push(Number(month));
    }

    query += " GROUP BY checkin_date ORDER BY checkin_date ASC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) { next(error); }
});

// Stats
app.get("/api/stats/checkin-pattern", async (req, res, next) => {
  try {
    if (!req.userId) return res.json({ bestHour: null, confidence: 0, pattern: null });
    const { goal_id } = req.query;
    let query = `
      SELECT EXTRACT(HOUR FROM created_at) AS hour, COUNT(*) AS count
      FROM checkins
      WHERE created_at >= NOW() - INTERVAL '14 days' AND user_id = $1
    `;
    const params = [req.userId];
    if (goal_id) { query += " AND goal_id = $2"; params.push(Number(goal_id)); }
    query += " GROUP BY EXTRACT(HOUR FROM created_at) ORDER BY count DESC LIMIT 1";

    const { rows } = await pool.query(query, params);
    if (rows.length) {
      const { rows: totalRows } = await pool.query(
        "SELECT COUNT(*) AS total FROM checkins WHERE created_at >= NOW() - INTERVAL '14 days' AND user_id = $1",
        [req.userId]
      );
      const total = Number(totalRows[0].total);
      const hour = Number(rows[0].hour);
      res.json({
        bestHour: hour,
        confidence: Math.min(1, Number(rows[0].count) / Math.max(1, total / 24)),
        pattern: hour < 10 ? "morning" : hour < 14 ? "noon" : hour < 18 ? "afternoon" : "evening"
      });
    } else {
      res.json({ bestHour: null, confidence: 0, pattern: null });
    }
  } catch (error) { next(error); }
});

app.get("/api/stats/review-hint", async (req, res, next) => {
  try {
    if (!req.userId) return res.json({ weeklyTotal: 0, lastWeekTotal: 0, trend: "same", streak: 0, weakDay: null });
    const goalId = req.query.goal_id ? Number(req.query.goal_id) : null;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + mondayOffset);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    let filter = "";
    const params = [thisMonday.toISOString().slice(0, 10), thisMonday.toISOString().slice(0, 10), req.userId];
    if (goalId) { filter = " AND goal_id = $4"; params.push(goalId); }

    const { rows: weekRows } = await pool.query(
      `SELECT COUNT(DISTINCT checkin_date) AS cnt FROM checkins WHERE checkin_date >= $1 AND checkin_date < ($2::date + INTERVAL '7 days') AND user_id = $3${filter}`,
      params
    );
    const { rows: lastWeekRows } = await pool.query(
      `SELECT COUNT(DISTINCT checkin_date) AS cnt FROM checkins WHERE checkin_date >= $1 AND checkin_date < ($2::date + INTERVAL '7 days') AND user_id = $3${filter}`,
      [lastMonday.toISOString().slice(0, 10), lastMonday.toISOString().slice(0, 10), req.userId, ...(goalId ? [goalId] : [])]
    );

    const weeklyTotal = Number(weekRows[0]?.cnt || 0);
    const lastWeekTotal = Number(lastWeekRows[0]?.cnt || 0);

    // Simple streak
    let streak = 0;
    try {
      const { rows: streakRows } = await pool.query(
        `SELECT checkin_date FROM checkins WHERE user_id = $1${goalId ? " AND goal_id = $2" : ""} ORDER BY checkin_date DESC LIMIT 30`,
        goalId ? [req.userId, goalId] : [req.userId]
      );
      const dates = streakRows.map((r) => {
        const d = new Date(r.checkin_date);
        return d.toISOString().slice(0, 10);
      });
      let cursor = new Date();
      const todayStr = cursor.toISOString().slice(0, 10);
      if (!dates.includes(todayStr)) { cursor.setDate(cursor.getDate() - 1); }
      while (dates.includes(cursor.toISOString().slice(0, 10))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
    } catch (e) { streak = 0; }

    res.json({ weeklyTotal, lastWeekTotal, trend: weeklyTotal > lastWeekTotal ? "up" : weeklyTotal < lastWeekTotal ? "down" : "same", streak, weakDay: null });
  } catch (error) { next(error); }
});

// Reviews
app.get("/api/reviews", async (req, res, next) => {
  try {
    if (!req.userId) return res.json([]);
    const { goal_id } = req.query;
    let query = `
      SELECT id, goal_id AS "goalId",
        TO_CHAR(review_date, 'YYYY-MM-DD') AS date,
        done_text AS done, stuck_text AS stuck, next_text AS next
      FROM reviews
      WHERE user_id = $1
    `;
    const params = [req.userId];
    if (goal_id) { query += " AND goal_id = $2"; params.push(Number(goal_id)); }
    query += " ORDER BY id DESC";

    const { rows } = await pool.query(query, params);
    res.json(rows.map((row) => ({ ...row, id: String(row.id) })));
  } catch (error) { next(error); }
});

app.post("/api/reviews", async (req, res, next) => {
  try {
    if (!req.userId) return res.status(400).json({ message: "请先选择用户。" });
    const { done, stuck, next: nextText, goalId } = req.body;
    const { rows } = await pool.query(
      "INSERT INTO reviews (goal_id, review_date, done_text, stuck_text, next_text, user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [goalId || null, todayDate(), done || "", stuck || "", nextText || "", req.userId]
    );
    res.status(201).json({
      id: String(rows[0].id),
      goalId: goalId || null,
      date: todayDate(),
      done: done || "",
      stuck: stuck || "",
      next: nextText || ""
    });
  } catch (error) { next(error); }
});

// AI routes (DeepSeek)
const aiRateLimit = new Map();

function checkAIRateLimit(req, res, next) {
  const ip = req.ip || "127.0.0.1";
  const key = ip + "_" + new Date().toISOString().slice(0, 13);
  const count = aiRateLimit.get(key) || 0;
  if (count >= 10) return res.status(429).json({ message: "AI 今天有点累了，休息一下再试试。" });
  aiRateLimit.set(key, count + 1);
  next();
}

app.post("/api/ai/decompose", checkAIRateLimit, async (req, res, next) => {
  try {
    const aiEnabled = process.env.AI_ENABLED !== "false";
    if (!aiEnabled) return res.status(503).json({ message: "AI 功能未开启。" });
    const { goal } = req.body;
    if (!goal || !goal.trim()) return res.status(400).json({ message: "请描述你的目标。" });
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    if (!apiKey) return res.status(503).json({ message: "AI 未配置。" });

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "你是芽目标的 AI 助手芽芽熊。把用户模糊的目标拆成具体可执行的每日行动。返回纯 JSON，不要 markdown 代码块。格式: { name: 目标名, days: 天数(整数), time: 每日投入, task: 今日小行动, reason: 为什么这样拆 }" },
          { role: "user", content: `目标：${goal}` }
        ],
        temperature: 0.7, max_tokens: 300
      })
    });
    if (!response.ok) return res.status(502).json({ message: "AI 服务暂时不可用。" });
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const json = JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, "").trim());
    res.json(json);
  } catch (error) {
    console.error("AI decompose error:", error.message);
    res.status(500).json({ message: "AI 暂时不可用，请手动填写。" });
  }
});

app.post("/api/ai/review", checkAIRateLimit, async (req, res, next) => {
  try {
    const aiEnabled = process.env.AI_ENABLED !== "false";
    if (!aiEnabled) return res.status(503).json({ message: "AI 功能未开启。" });
    const { goalId } = req.body;
    if (!goalId) return res.status(400).json({ message: "缺少目标 ID。" });
    if (!req.userId) return res.status(400).json({ message: "请先选择用户。" });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    if (!apiKey) return res.status(503).json({ message: "AI 未配置。" });

    const { rows: goalRows } = await pool.query(
      "SELECT name, days, task, time_investment FROM goals WHERE id = $1 AND user_id = $2",
      [Number(goalId), req.userId]
    );
    if (!goalRows.length) return res.status(404).json({ message: "目标不存在。" });
    const goalRow = goalRows[0];

    const { rows: checkins } = await pool.query(
      "SELECT TO_CHAR(checkin_date, 'YYYY-MM-DD') AS date FROM checkins WHERE goal_id = $1 ORDER BY checkin_date DESC LIMIT 30",
      [Number(goalId)]
    );
    const total = checkins.length;

    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() + mondayOffset);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    const thisWeek = checkins.filter((c) => c.date >= thisMonday.toISOString().slice(0, 10));
    const lastWeek = checkins.filter((c) => c.date >= lastMonday.toISOString().slice(0, 10) && c.date < thisMonday.toISOString().slice(0, 10));

    const { rows: reviews } = await pool.query(
      "SELECT done_text, stuck_text, next_text FROM reviews WHERE user_id = $1 ORDER BY id DESC LIMIT 3",
      [req.userId]
    );

    const context = `目标名称: ${goalRow.name}
每天任务: ${goalRow.task} (每天投入: ${goalRow.time_investment})
总进度: ${total}/${goalRow.days} 天
本周打卡(${thisWeek.length}天): ${thisWeek.map(c => c.date).join(', ') || '无'}
上周打卡(${lastWeek.length}天): ${lastWeek.map(c => c.date).join(', ') || '无'}
最近复盘: ${reviews.map(r => `完成:${r.done_text}, 卡点:${r.stuck_text}, 明天:${r.next_text}`).join(' | ') || '无'}`;

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "你是芽目标的分析助手。根据打卡数据生成三段式复盘。返回纯 JSON: { done: 完成了什么和趋势, stuck: 可能的卡点和风险, next: 明天具体建议 }。每段 1-3 句话，温暖鼓励，不说教。" },
          { role: "user", content: context }
        ],
        temperature: 0.7, max_tokens: 500
      })
    });
    if (!response.ok) return res.status(502).json({ message: "AI 服务暂时不可用。" });
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const json = JSON.parse(content.replace(/```json\n?/g, "").replace(/```/g, "").trim());
    res.json(json);
  } catch (error) {
    console.error("AI review error:", error.message);
    res.status(500).json({ message: "AI 暂时不可用，请手动复盘。" });
  }
});

// Catch-all
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "服务暂时出错了，请稍后再试。", detail: error.message });
});

// Lazy init for Vercel
let dbReady = false;
if (isVercel) {
  app.use(async (req, res, next) => {
    if (!dbReady) {
      try { await initDatabase(); dbReady = true; } catch (e) { console.error(e); }
    }
    next();
  });
  module.exports = app;
} else {
  initDatabase()
    .then(() => {
      app.listen(port, () => {
        console.log(`芽目标 Demo 已启动：http://localhost:${port}`);
      });
    })
    .catch((error) => {
      console.error("启动失败：", error.message);
      process.exit(1);
    });
}
