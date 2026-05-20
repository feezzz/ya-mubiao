window.App = window.App || {};

(function (App) {
  const API_BASE = "/api";

  async function request(path, options = {}) {
    var isWrite = options.method && options.method !== "GET";
    if (isWrite && App.showLoading) App.showLoading();
    try {
      const headers = { "Content-Type": "application/json" };
      const uid = App.getUserId();
      if (uid) { headers["x-user-id"] = uid; }
      const response = await fetch(`${API_BASE}${path}`, {
        headers: headers,
        ...options
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || "请求失败，请检查后端服务。");
      }
      return data;
    } finally {
      if (isWrite && App.hideLoading) App.hideLoading();
    }
  }

  async function loadData() {
    if (!App.getUserId()) { App.render(); return; }
    try {
      const data = await request("/init");
      App.state.goals = data.goals;
      App.state.reviews = data.reviews;
      if (data.templates && data.templates.length) {
        App._templatesCache = data.templates;
      }
      if (!App.state.activeGoalId && data.goals.length) {
        App.state.activeGoalId = data.goals[0].id;
      }
      if (App.state.activeGoalId && !data.goals.some((g) => g.id === App.state.activeGoalId)) {
        App.state.activeGoalId = data.goals[0]?.id || null;
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
      try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; gain.gain.value = 0.1;
        osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.stop(ctx.currentTime + 0.3);
      } catch(e) {}
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
    const goalId = data.goalId || (App.state.activeGoalId || null);
    const review = await request("/reviews", {
      method: "POST",
      body: JSON.stringify({ ...data, goalId })
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
  async function undoCheckin(goalId) {
    await request(`/goals/${goalId}/checkins`, { method: "DELETE", body: JSON.stringify({}) });
    await loadData();
    App.showToast("打卡已撤销。");
  }

  App.saveReview = saveReview;
  App.undoCheckin = undoCheckin;
})(window.App);
