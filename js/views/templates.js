window.App = window.App || {};

(function (App) {
  let templates = [];
  let activeCategory = "all";

  async function loadTemplates() {
    try {
      const data = await App.request("/templates");
      templates = data;
      renderTemplates();
    } catch (e) {
      // fail silently
    }
  }

  function renderTemplates() {
    const container = document.getElementById("templateBrowser");
    if (!container) return;

    const filtered = activeCategory === "all"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

    const categories = [
      { key: "all", label: "全部" },
      { key: "study", label: "📚 学习" },
      { key: "sport", label: "🏃 运动" },
      { key: "money", label: "💰 理财" },
      { key: "skill", label: "🎨 技能" },
      { key: "work", label: "💼 效率" },
      { key: "digital", label: "🌈 数字" }
    ];

    container.innerHTML = `
      <div class="template-categories">
        ${categories.map((c) =>
          `<button class="template-cat-btn ${c.key === activeCategory ? "active" : ""}" data-cat="${c.key}">${c.label}</button>`
        ).join("")}
      </div>
      <div class="template-grid">
        ${filtered.map((t) =>
          `<button type="button" class="template-card" data-template-id="${t.id}" data-template="${t.name}|${t.days}|${t.time}|${t.task}">
            <span class="template-icon">${t.icon}</span>
            <span class="template-name">${App.escapeHTML(t.name)}</span>
            <span class="template-desc">${App.escapeHTML(t.description)}</span>
          </button>`
        ).join("")}
      </div>
    `;

    container.querySelectorAll(".template-cat-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeCategory = btn.dataset.cat;
        renderTemplates();
      });
    });

    container.querySelectorAll(".template-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tpl = btn.dataset.template;
        if (btn.dataset.templateId === "custom") return;
        const [name, days, time, task] = tpl.split("|");
        document.getElementById("goalName").value = name;
        document.getElementById("goalDays").value = days;
        document.getElementById("goalTime").value = time || "20 分钟";
        document.getElementById("goalTask").value = task;
        App.updateSeedPreview();
        App.setCreateStep(2);
      });
    });
  }

  App.loadTemplates = loadTemplates;
  App.renderTemplates = renderTemplates;
  App.getTemplates = () => templates;
})(window.App);
