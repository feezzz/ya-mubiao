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

    App.setCheckinButtons(checkedToday, goal);
    renderHistory(goal);
    renderPlan(goal);
  };

  App.renderHistory = renderHistory;
  App.renderPlan = renderPlan;
})(window.App);
