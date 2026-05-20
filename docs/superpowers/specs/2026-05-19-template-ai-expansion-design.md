# 芽目标 — 模板库 + 规则引擎 + AI 扩建设计

## 目标

本轮新增三个子系统：

1. **模板库扩充** — 从 4 个硬编码模板扩展到 16 个，按 6 个生活场景分类，支持分类浏览和关键词匹配
2. **规则引擎** — 关键词模板匹配、最佳打卡时间分析、自动复盘文案生成（全本地，零成本）
3. **AI 功能** — 接入 DeepSeek API，AI 目标拆解 + AI 复盘总结，用户可开关

---

## 模板库

### 数据模型

`templates.json`（项目根目录）：

```json
[
  {
    "id": "learn-vocab",
    "category": "study",
    "icon": "📚",
    "name": "30 天背 300 个单词",
    "days": 30,
    "time": "20 分钟",
    "task": "背 10 个单词",
    "keywords": ["背单词", "词汇", "英语", "四级", "六级", "雅思", "托福"],
    "description": "适合备考、想提升词汇量的你"
  }
]
```

### 16 个模板清单

| 分类 | ID | 模板名称 | 天数 | 每日投入 |
|------|-----|---------|------|---------|
| 📚 学习 | learn-vocab | 30 天背 300 个单词 | 30 | 20 分钟 |
| 📚 学习 | learn-reading | 每天阅读 20 分钟 | 21 | 20 分钟 |
| 📚 学习 | learn-exam | 考证冲刺刷题 | 60 | 30 分钟 |
| 🏃 运动 | sport-daily | 每天运动 30 分钟 | 21 | 30 分钟 |
| 🏃 运动 | sport-sleep | 早睡早起 | 30 | 10 分钟 |
| 🏃 运动 | sport-meditate | 每天冥想 10 分钟 | 14 | 10 分钟 |
| 💰 理财 | money-save | 存钱 1 万元 | 100 | 10 分钟 |
| 💰 理财 | money-track | 每日记账 | 21 | 5 分钟 |
| 🎨 技能 | skill-draw | 每天画画 30 分钟 | 30 | 30 分钟 |
| 🎨 技能 | skill-instrument | 每天练琴/乐器 | 60 | 30 分钟 |
| 🎨 技能 | skill-journal | 每天写日记 | 21 | 15 分钟 |
| 💼 效率 | work-pomodoro | 番茄工作法 | 14 | 25 分钟 |
| 💼 效率 | work-clean | 每日清理待办 | 7 | 15 分钟 |
| 🌈 数字 | digital-less-phone | 少刷短视频 | 21 | 10 分钟 |
| 🌈 数字 | digital-disconnect | 睡前 1 小时断网 | 14 | 20 分钟 |
| ✏️ 自定义 | custom | 写自己的目标 | — | — |

### 前端交互

创建页第一步："你想养大什么？"下方替换现有 4 个模板按钮，改为：
- 顶部：6 个分类标签（全部/学习/运动/理财/技能/效率/数字），点击筛选
- 中间：2 列卡片网格，每张卡片显示图标 + 名称 + 描述
- 底部：✨ AI 推荐按钮

点击模板 → 自动填入创建表单（名称、天数、时间、任务）→ 跳到第 3 步确认

### API

```
GET /api/templates?category=study
返回: 模板数组，可选按分类过滤
```

直接读 `templates.json` 返回，不经过数据库。

---

## 规则引擎

### 1. 关键词模板匹配

用户输入目标名称时，用 `templates.json` 中每个模板的 `keywords` 数组做匹配。

**实现位置：** `js/state.js` 新增 `App.suggestTemplates(query)` 纯函数。

```
输入: "我想每天跑步减脂"
→ 匹配: "跑步" → sport-daily, "减脂" → sport-daily
→ 返回: [{ template: sport-daily, score: 2 }, { template: sport-meditate, score: 1 }, ...]
```

首页空状态 + 创建页第一步，如果用户输入文字，自动显示匹配建议。

### 2. 最佳打卡时间

**API：** `GET /api/stats/checkin-pattern?goal_id=`

```
从 checkins 表的 created_at 提取 HOUR()
统计过去 14 天打卡时间分布
返回: { bestHour: 8, confidence: 0.75, pattern: "morning" }
```

前端首页芽芽熊卡片，如果 confidence > 0.6，显示：
> "你通常在早上 8 点左右打卡，要不要设置这个时间提醒？"

### 3. 自动复盘文案

**API：** `GET /api/stats/review-hint?goal_id=`

```
统计本周打卡天数、与上周对比、最长连续、中断日
返回: {
  weeklyTotal: 5,
  lastWeekTotal: 4,
  trend: "up",
  streak: 3,
  weakDay: "周三"
}
```

复盘页新增"生成草稿"按钮，调用此 API + 前端模板拼出文案：
> 本周完成 5/7 天，比上周多 1 天。连续 3 天打卡！周三最容易中断，试试那天安排轻松一点的任务？

---

## AI 功能

### 配置

`.env` 新增：
```
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
AI_ENABLED=true
```

`AI_ENABLED=false` 时，所有 AI 入口隐藏，仅保留规则引擎。

### API 设计

**1. AI 目标拆解** `POST /api/ai/decompose`

```
请求: { goal: "用户的一句话目标描述" }

System prompt:
"你是芽目标的 AI 助手芽芽熊。你的任务是把用户模糊的目标拆成具体可执行的每日行动。
返回纯 JSON，不要带 markdown 代码块，不要解释。
格式: { name: 目标名, days: 天数(整数), time: 每日投入(如'20 分钟'), task: 今日可执行的一个小行动, reason: 为什么这样拆(一句话) }"

User prompt: "目标：{goal}"

DeepSeek 返回:
{ "name": "3 个月健康减脂 5 斤", "days": 90, "time": "30 分钟", "task": "运动 20 分钟 + 记录饮食", "reason": "90 天合理，包含运动和饮食两块的微习惯" }

前端展示给用户确认 → 修改 → 填入创建表单
```

**2. AI 复盘总结** `POST /api/ai/review`

```
请求: { goalId: "目标ID" }

后端拼接上下文:
- 目标名称、进度
- 本周打卡记录（日期列表）
- 上周打卡记录（日期列表）
- 最近 3 条已有复盘

System prompt:
"你是芽目标的分析助手。根据用户的打卡数据，生成三段式复盘。
返回纯 JSON: { done: '完成了什么、趋势如何', stuck: '可能的卡点和风险', next: '明天具体建议' }
每段 1-3 句话，语气温暖鼓励，不说教。"

前端展示 → 用户可编辑 → 填入对话式复盘的三个步骤
```

### 速率限制

- 内存计数器，每 IP 每小时最多 10 次 AI 请求
- 超过返回 429: "AI 今天有点累了，休息一下再试试。"

### 新增文件

```
js/ai.js              # AI API 请求 + 速率限制 fallback
js/views/templates.js # 模板浏览组件
templates.json        # 16 个模板数据
```

---

## 数据流

```
用户创建目标
  → 浏览模板 / 关键词匹配 / AI 拆解
  → 表单填入
  → POST /api/goals

用户打卡
  → checkins 表记录
  → 规则引擎：分析打卡模式 → GET /api/stats/checkin-pattern
  → 首页提醒最佳时间

用户复盘
  → 规则引擎：GET /api/stats/review-hint → 生成草稿
  → 或 AI 复盘：POST /api/ai/review → 生成总结
  → POST /api/reviews
```

---

## 不做的

- 用户系统/登录（无需求）
- 推送通知（浏览器兼容差、需后端常驻）
- 目标完成后的花园/归档（本轮不涉及）
- AI 流式输出（增加复杂度）
- 多语言支持
