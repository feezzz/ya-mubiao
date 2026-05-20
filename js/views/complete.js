window.App = window.App || {};

(function (App) {

  App.renderComplete = function () {
    const goal = App.state.goals.find((g) => g.id === App.state.lastCompletedGoalId);
    if (!goal) return;

    const stage = App.stageFor(goal);
    const total = App.totalCheckins();
    const msg = document.getElementById("completeMessage");
    const title = document.getElementById("completeTitle");
    const card = document.querySelector(".complete-card");
    if (!msg) return;

    // Check if goal just completed
    if (stage.complete) {
      if (title) title.textContent = "目标完成啦！";
      msg.textContent = `「${goal.name}」经过 ${goal.checkins.length} 天的坚持，你做到了！`;
      if (card) card.classList.add("complete-celebration");
    } else if (total === 1) {
      if (title) title.textContent = "目标又长大了一点";
      msg.textContent = "第一颗种子已经发芽！每一天都有意义。";
      if (card) card.classList.remove("complete-celebration");
    } else if (App.simpleStreak(goal) >= 3) {
      if (title) title.textContent = "目标又长大了一点";
      msg.textContent = `连续 ${App.simpleStreak(goal)} 天了，你正在养成真正的习惯。`;
      if (card) card.classList.remove("complete-celebration");
    } else {
      if (title) title.textContent = "目标又长大了一点";
      msg.textContent = `今天完成：${goal.task}。你的「${goal.name}」已经发芽一点点。`;
      if (card) card.classList.remove("complete-celebration");
    }

    // Show review reminder
    var hint = document.getElementById("completeReviewHint");
    if (hint) {
      var todayStr = App.localDateISO();
      var hasReview = App.state.reviews.some(function(r) {
        return r.date === todayStr && String(r.goalId) === String(goal.id);
      });
      hint.style.display = hasReview ? "none" : "block";
    }

    // Show tomorrow preview
    var tomorrow = document.getElementById("completeTomorrow");
    if (tomorrow) {
      tomorrow.textContent = "明天继续：" + goal.task;
    }
  };
})(window.App);
