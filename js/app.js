(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  function setCheckinButtons(checkedToday, goal) {
    ["#quickCheckin", "#mobileQuickCheckin", "#detailCheckin"].forEach((sel) => {
      const btn = $(sel);
      if (!btn) return;
      btn.disabled = checkedToday;
      if (!checkedToday && goal) {
        btn.classList.add("pulse");
      } else {
        btn.classList.remove("pulse");
      }
    });
    const taskLabel = goal ? `：${goal.task}` : "";
    const qc = $("#quickCheckin");
    const mqc = $("#mobileQuickCheckin");
    const dc = $("#detailCheckin");
    if (qc) qc.textContent = checkedToday ? "今日已完成" : `完成打卡${taskLabel}`;
    if (mqc) mqc.textContent = checkedToday ? "今日已完成" : `完成打卡${taskLabel}`;
    if (dc) dc.textContent = checkedToday ? "今日已完成" : `完成今天${taskLabel}`;

    // Badge dot on mobile "今日" tab
    var homeTab = document.querySelector('.mobile-tabbar .nav-item[data-view="home"]');
    if (homeTab) {
      var existingBadge = homeTab.querySelector('.tab-badge');
      if (!checkedToday && goal) {
        if (!existingBadge) {
          var badge = document.createElement('span');
          badge.className = 'tab-badge';
          homeTab.appendChild(badge);
        }
      } else {
        if (existingBadge) existingBadge.remove();
      }
    }
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
    window.App.initCalendar();
    window.App.loadTemplates();
    window.App.renderUserSwitch();
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
        window.App.setCreateStep(window.App._getCreateStep() - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (!window.App.validateCreateStep(window.App._getCreateStep())) return;
        window.App.setCreateStep(window.App._getCreateStep() + 1);
      });
    }

    ["#goalName", "#goalDays", "#goalTime", "#goalTask"].forEach((sel) => {
      const el = $(sel);
      if (el) {
        el.addEventListener("input", window.App.updateSeedPreview);
        el.addEventListener("change", window.App.updateSeedPreview);
      }
    });

    const reviewNextBtn = $("#reviewNextBtn");
    const reviewSubmitBtn = $("#reviewSubmitBtn");
    if (reviewNextBtn) reviewNextBtn.addEventListener("click", window.App.nextReviewStep);
    if (reviewSubmitBtn) reviewSubmitBtn.addEventListener("click", window.App.submitReview);

    const calPrev = $("#calPrev");
    const calNext = $("#calNext");
    if (calPrev) calPrev.addEventListener("click", window.App.prevMonth);
    if (calNext) calNext.addEventListener("click", window.App.nextMonth);

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

    const reviewHintBtn = $("#reviewHintBtn");
    if (reviewHintBtn) {
      reviewHintBtn.addEventListener("click", async () => {
        try {
          const goal = window.App.activeGoal();
          const qs = goal ? `?goal_id=${goal.id}` : "";
          const hint = await window.App.request(`/stats/review-hint${qs}`);
          const weekMsg = `本周完成 ${hint.weeklyTotal}/7 天`;
          const trendMsg = hint.trend === "up" ? "比上周进步了！" : hint.trend === "down" ? "比上周少了一些。" : "和上周持平。";
          const streakMsg = hint.streak > 0 ? `连续 ${hint.streak} 天打卡。` : "";
          const done = document.getElementById("reviewDone");
          const stuck = document.getElementById("reviewStuck");
          const next = document.getElementById("reviewNext");
          if (done && !done.value) done.value = `${weekMsg}，${trendMsg}`;
          if (stuck && !stuck.value) stuck.value = streakMsg || "慢慢来，不着急。";
          if (next && !next.value) next.value = "继续一小步，明天也会更好。";
          window.App.showToast("草稿已生成，你可以修改后再保存。");
        } catch (e) {
          window.App.showToast("暂时无法生成草稿。");
        }
      });
    }

    const aiDecomposeBtn = $("#aiDecomposeBtn");
    if (aiDecomposeBtn) {
      aiDecomposeBtn.addEventListener("click", async () => {
        const goalText = $("#goalName").value.trim();
        if (!goalText) { window.App.showToast("先简单描述一下你的目标。"); return; }
        aiDecomposeBtn.disabled = true;
        aiDecomposeBtn.textContent = "🤔 AI 思考中...";
        const result = await window.App.aiDecompose(goalText);
        aiDecomposeBtn.disabled = false;
        aiDecomposeBtn.textContent = "✨ AI 帮我拆解目标";
        if (result) {
          const el = $("#aiDecomposeResult");
          el.style.display = "block";
          el.innerHTML = `<div class="ai-result-content">
            <strong>${window.App.escapeHTML(result.name || "")}</strong>
            <p>${window.App.escapeHTML(result.reason || "")}</p>
            <small>${result.days || 30} 天 · ${result.time || "20 分钟"} · ${window.App.escapeHTML(result.task || "")}</small>
            <div class="ai-result-actions">
              <button type="button" class="primary-btn" id="acceptAiResult">采用</button>
              <button type="button" class="ghost-btn" id="dismissAiResult">不用</button>
            </div>
          </div>`;
          $("#acceptAiResult").addEventListener("click", () => {
            $("#goalName").value = result.name || goalText;
            $("#goalDays").value = result.days || 30;
            $("#goalTime").value = result.time || "20 分钟";
            $("#goalTask").value = result.task || goalText;
            window.App.updateSeedPreview();
            window.App.setCreateStep(2);
            el.style.display = "none";
          });
          $("#dismissAiResult").addEventListener("click", () => { el.style.display = "none"; });
        }
      });
    }

    async function doAiReview(goal, btn) {
      btn.disabled = true;
      var origText = btn.textContent;
      btn.textContent = "🤔 AI 分析中...";
      var result = await window.App.aiReview(goal.id);
      btn.disabled = false;
      btn.textContent = origText;
      if (result) {
        var doneEl = document.getElementById("reviewDone");
        var stuckEl = document.getElementById("reviewStuck");
        var nextEl = document.getElementById("reviewNext");
        if (doneEl && result.done) doneEl.value = result.done;
        if (stuckEl && result.stuck) stuckEl.value = result.stuck;
        if (nextEl && result.next) nextEl.value = result.next;
        window.App.showToast("AI 总结已生成，你可以修改后再保存。");
      }
    }

    var aiReviewBtn = $("#aiReviewBtn");
    if (aiReviewBtn) {
      aiReviewBtn.addEventListener("click", function() {
        var goal = window.App.activeGoal();
        if (!goal) { window.App.showToast("先选择一个目标。"); return; }
        doAiReview(goal, aiReviewBtn);
      });
    }

    var undoCheckinBtn = $("#undoCheckinBtn");
    if (undoCheckinBtn) {
      undoCheckinBtn.addEventListener("click", async function() {
        var goal = window.App.state.goals.find(function(g) {
          return g.id === window.App.state.lastCompletedGoalId;
        });
        if (!goal) return;
        if (!confirm('撤销今天的打卡？')) return;
        await window.App.undoCheckin(goal.id);
        window.App.showView('home');
      });
    }

    var exportGoalBtn = $("#exportGoalBtn");
    if (exportGoalBtn) {
      exportGoalBtn.addEventListener("click", function() {
        var goal = window.App.activeGoal();
        if (!goal) return;
        var stage = window.App.stageFor(goal);
        var streak = window.App.simpleStreak(goal);
        var text = [
          "🌱 芽目标 · " + goal.name,
          "每日行动：" + goal.task,
          "成长阶段：" + stage.icon + " " + stage.name,
          "进度：" + goal.checkins.length + "/" + goal.days + " 天",
          "连续：" + streak + " 天",
          "——",
          "在芽目标 App 里把目标慢慢养大 🌿"
        ].join("\n");
        navigator.clipboard.writeText(text).then(function() {
          window.App.showToast("已复制到剪贴板，可以分享给朋友啦。");
        }).catch(function() {
          window.App.showToast("复制失败，请手动截图分享。");
        });
      });
    }

    var detailAiReviewBtn = $("#detailAiReviewBtn");
    if (detailAiReviewBtn) {
      detailAiReviewBtn.addEventListener("click", function() {
        var goal = window.App.activeGoal();
        if (!goal) { window.App.showToast("先选择一个目标。"); return; }
        doAiReview(goal, detailAiReviewBtn);
      });
    }

    var userSwitchBtn = $("#userSwitchBtn");
    if (userSwitchBtn) {
      userSwitchBtn.addEventListener("click", function() {
        var dd = document.getElementById("userDropdown");
        if (dd) {
          var isOpen = dd.style.display === "block";
          dd.style.display = isOpen ? "none" : "block";
          if (!isOpen) window.App.renderUserSwitch();
        }
      });
    }

    var createUserBtn = $("#createUserBtn");
    if (createUserBtn) {
      createUserBtn.addEventListener("click", function() {
        var name = $("#newUserName").value.trim();
        if (!name) { window.App.showToast("请输入你的名字。"); return; }
        window.App.createUser(name);
      });
    }

    var newUserName = $("#newUserName");
    if (newUserName) {
      newUserName.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
          var name = newUserName.value.trim();
          if (name) window.App.createUser(name);
        }
      });
    }
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
  window.App.initUser();

  // Scroll shadow on top bar
  window.addEventListener('scroll', function() {
    var sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.toggle('scrolled', window.scrollY > 4);
    }
  }, { passive: true });

  // Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/service-worker.js').catch(function() {});
    });
  }

  // Notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(function() {
      Notification.requestPermission();
    }, 5000);
  }

  // Check-in reminder: show notification at 20:00 if not checked in today
  function scheduleReminder() {
    var now = new Date();
    var target = new Date(now);
    target.setHours(20, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    var delay = target - now;

    setTimeout(function() {
      if ('Notification' in window && Notification.permission === 'granted') {
        var goal = window.App.activeGoal();
        if (goal && !window.App.hasCheckedToday(goal)) {
          new Notification('芽目标', { body: '今天还没打卡哦～做一点也算数 🌱', icon: '/icons/icon-192.png' });
        }
      }
      scheduleReminder();
    }, delay);
  }
  scheduleReminder();
})();
