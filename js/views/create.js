window.App = window.App || {};

(function (App) {
  let createStep = 1;

  function updateSeedPreview() {
    const data = App.createFormData();
    const textEl = document.getElementById("seedPreviewText");
    if (!textEl) return;
    const text = data.task
      ? `今天先完成：${data.task}`
      : data.name
        ? `先把「${data.name}」变成今天能做的一小步。`
        : "今天做一点，也算数。";
    textEl.textContent = text;
  }

  function validateCreateStep(step) {
    const data = App.createFormData();
    if (step === 1 && !data.name) {
      App.showToast("先写下你想养大的目标。");
      document.getElementById("goalName")?.focus();
      return false;
    }
    if (step === 2 && (!data.days || data.days < 1 || data.days > 365)) {
      App.showToast("目标天数建议填写 1 到 365 天。");
      document.getElementById("goalDays")?.focus();
      return false;
    }
    if (step === 3 && !data.task) {
      App.showToast("写一个今天能完成的小行动。");
      document.getElementById("goalTask")?.focus();
      return false;
    }
    return true;
  }

  function setCreateStep(step) {
    createStep = Math.min(3, Math.max(1, step));
    document.querySelectorAll(".create-step").forEach((panel) => {
      panel.classList.toggle("active", Number(panel.dataset.step) === createStep);
    });
    document.querySelectorAll(".step-dot").forEach((dot) => {
      dot.classList.toggle("active", Number(dot.dataset.stepDot) <= createStep);
    });
    const form = document.getElementById("goalForm");
    if (form) {
      form.classList.toggle("first-step", createStep === 1);
      form.classList.toggle("final-step", createStep === 3);
    }
    updateSeedPreview();
  }

  function resetCreateFlow() {
    createStep = 1;
    setCreateStep(1);
  }

  App._getCreateStep = () => createStep;
  App.updateSeedPreview = updateSeedPreview;
  App.validateCreateStep = validateCreateStep;
  App.setCreateStep = setCreateStep;
  App.resetCreateFlow = resetCreateFlow;
})(window.App);
