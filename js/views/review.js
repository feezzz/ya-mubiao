window.App = window.App || {};

(function (App) {
  let reviewStep = 0;

  function showReviewStep(step) {
    reviewStep = step;
    document.querySelectorAll(".review-step").forEach((el, i) => {
      el.classList.toggle("active", i === step);
    });
    const progress = document.getElementById("reviewProgress");
    const nextBtn = document.getElementById("reviewNextBtn");
    const submitBtn = document.getElementById("reviewSubmitBtn");
    if (progress) progress.textContent = `${step + 1}/3`;
    if (nextBtn) nextBtn.style.display = step < 2 ? "" : "none";
    if (submitBtn) submitBtn.style.display = step === 2 ? "" : "none";
  }

  App.renderReview = function () {
    const goal = App.activeGoal();
    const goalNameEl = document.getElementById("reviewGoalName");
    if (goalNameEl) {
      goalNameEl.textContent = goal ? `正在复盘：${goal.name}` : "先选择一个目标再复盘";
    }

    const list = document.getElementById("reviewList");
    if (!list) return;

    // Filter reviews by active goal, or show all if no goal
    const reviews = goal
      ? App.state.reviews.filter((r) => String(r.goalId) === String(goal.id))
      : App.state.reviews;

    list.innerHTML = "";
    const countEl = document.getElementById("reviewCount");
    if (countEl) countEl.textContent = `${reviews.length} 条`;

    if (!reviews.length) {
      list.innerHTML = `<div class="history-item"><strong>还没有复盘</strong><small>一句话也可以，记录今天做过的努力。</small></div>`;
      return;
    }

    reviews.slice(0, 8).forEach((review) => {
      // Try to find goal name if different from current
      const reviewGoal = (review.goalId && String(review.goalId) !== String(goal ? goal.id : null))
        ? App.state.goals.find((g) => g.id === review.goalId)
        : null;
      const goalLabel = reviewGoal ? ` · ${reviewGoal.name}` : "";

      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <strong>${App.escapeHTML(review.date)}${goalLabel}</strong>
        <small>完成：${App.escapeHTML(review.done || "一点点")}<br>卡点：${App.escapeHTML(review.stuck || "暂无")}<br>明天：${App.escapeHTML(review.next || "继续一小步")}</small>
      `;
      list.appendChild(item);
    });
  };

  App.nextReviewStep = function () {
    const fields = ["reviewDone", "reviewStuck", "reviewNext"];
    if (reviewStep < 2) {
      const val = document.getElementById(fields[reviewStep]).value.trim();
      if (!val) {
        App.showToast("写一点也可以，不用很多。");
        return;
      }
      showReviewStep(reviewStep + 1);
    }
  };

  App.submitReview = async function () {
    const done = document.getElementById("reviewDone").value.trim();
    const stuck = document.getElementById("reviewStuck").value.trim();
    const next = document.getElementById("reviewNext").value.trim();
    if (!done && !stuck && !next) {
      App.showToast("至少写一句，记录今天的努力。");
      return;
    }
    try {
      await App.saveReview({ done, stuck, next });
      document.getElementById("reviewDone").value = "";
      document.getElementById("reviewStuck").value = "";
      document.getElementById("reviewNext").value = "";
      showReviewStep(0);
    } catch (error) {
      App.showToast(error.message);
    }
  };
})(window.App);
