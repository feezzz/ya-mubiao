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

  function getCheckinDates(goal) {
    if (!goal || !goal.checkins) return [];
    return goal.checkins.map(function(c) {
      return typeof c === 'string' ? c : c.date;
    });
  }

  function getCheckinNote(goal, dateStr) {
    if (!goal || !goal.checkins) return "";
    var found = goal.checkins.find(function(c) {
      return (typeof c === 'string' ? c : c.date) === dateStr;
    });
    return found && found.note ? found.note : "";
  }

  function hasCheckedToday(goal) {
    if (!goal) return false;
    var today = localDateISO();
    return getCheckinDates(goal).some(function(d) { return d === today; });
  }

  function totalCheckins() {
    return App.state.goals.reduce((sum, g) => sum + g.checkins.length, 0);
  }

  function stageFor(goal) {
    if (!goal) return { name: "种子", icon: "🌰", level: 1, copy: "种子已经准备好，等你完成第一步。" };
    const count = goal.checkins.length;
    if (goal.days > 0 && count >= goal.days) return { name: "完成", icon: "🏆", level: 5, complete: true, copy: "你做到了！这个目标已经完成啦！" };
    if (count >= 20) return { name: "结果", icon: "🍎", level: 4, copy: "目标已经结出果实，继续保持这份节奏。" };
    if (count >= 12) return { name: "开花", icon: "🌼", level: 4, copy: "你已经走过一段路了，目标正在开花。" };
    if (count >= 6) return { name: "长叶", icon: "🍃", level: 3, copy: "小芽长出叶子了，你的坚持开始变明显。" };
    if (count >= 1) return { name: "发芽", icon: "🌱", level: 2, copy: "第一次行动已经完成，目标开始发芽。" };
    return { name: "种子", icon: "🌰", level: 1, copy: "种子已经准备好，等你完成第一步。" };
  }

  function daysSinceLastCheckin(goal) {
    if (!goal || !goal.checkins.length) return -1;
    var dates = new Set(getCheckinDates(goal));
    var today2 = new Date();
    var todayStr2 = localDateISO(today2);
    if (dates.has(todayStr2)) return 0;
    var days = 0;
    var cursor = new Date(today2);
    cursor.setDate(cursor.getDate() - 1);
    while (days < 14 && !dates.has(localDateISO(cursor))) {
      days++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return days;
  }

  function bearFor(goal) {
    if (!goal) return { mood: "好奇", message: "你想先养大哪一个目标？" };
    const count = goal.checkins.length;
    const stage = stageFor(goal);
    if (stage.complete) {
      return { mood: "骄傲", message: "你做到了！这个目标已经完成啦！太厉害了！" };
    }
    if (hasCheckedToday(goal)) {
      return { mood: "开心", message: "今天完成啦！你的目标又长大了一点。" };
    }
    var daysAway = daysSinceLastCheckin(goal);
    if (daysAway > 2 && count > 0) {
      return { mood: "挂念", message: `${daysAway} 天没见了，今天做一点点也可以哦。` };
    }
    if (daysAway === 1 && count > 0) {
      return { mood: "安静", message: "昨天休息了一下，今天重新开始也很好。" };
    }
    if (count >= 3) return { mood: "认真", message: `已经打卡 ${count} 次了，稳住，我们慢慢来。` };
    if (count > 0) return { mood: "安静", message: "不用追求完美，今天重新开始也很好。" };
    return { mood: "好奇", message: "今天先做一个小行动，让目标发芽吧。" };
  }

  function simpleStreak(goal) {
    if (!goal || !goal.checkins.length) return 0;
    const dates = new Set(getCheckinDates(goal));
    var cursor = new Date();
    if (!dates.has(localDateISO(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    var streak = 0;
    while (dates.has(localDateISO(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function buildPlan(goal) {
    if (!goal) return [];
    const today = new Date();
    var dates = getCheckinDates(goal);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const iso = localDateISO(date);
      return {
        label: i === 0 ? "今天" : `第 ${i + 1} 天`,
        date: iso,
        task: goal.task,
        done: dates.indexOf(iso) !== -1
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
  App.getCheckinDates = getCheckinDates;
  App.getCheckinNote = getCheckinNote;
  App.daysSinceLastCheckin = daysSinceLastCheckin;
  App.buildPlan = buildPlan;
  App.createFormData = createFormData;
})(window.App);
