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
    const goalReviews = goal ? App.state.reviews.filter((r) => String(r.goalId) === String(goal.id)).length : 0;
    document.getElementById("homeReviewCount").textContent = `${goalReviews} 条`;

    App.setCheckinButtons(checkedToday, goal);
    renderGoalCards();

    const gid = goal ? `?goal_id=${goal.id}` : "";
    // Review reminder on home
    var reviewReminder = document.getElementById("homeReviewReminder");
    if (reviewReminder && goal && checkedToday) {
      var todayStr = App.localDateISO();
      var hasReview = App.state.reviews.some(function(r) {
        return r.date === todayStr && String(r.goalId) === String(goal.id);
      });
      reviewReminder.style.display = hasReview ? "none" : "block";
    } else if (reviewReminder) {
      reviewReminder.style.display = "none";
    }

    App.request(`/stats/checkin-pattern${gid}`).then((pattern) => {
      if (pattern && pattern.confidence > 0.6 && pattern.bestHour) {
        const periods = { morning: "早上", noon: "中午", afternoon: "下午", evening: "晚上" };
        const period = periods[pattern.pattern] || "";
        const msg = `${period} ${pattern.bestHour} 点左右是你最常打卡的时间，要不要固定下来？`;
        document.getElementById("bearMessage").textContent = msg;
        document.getElementById("bearRoomMessage").textContent = msg;
        document.getElementById("sidebarMessage").textContent = msg;
      }
    }).catch(() => {});
  };
})(window.App);
