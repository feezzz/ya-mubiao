window.App = window.App || {};

(function (App) {

  App.renderGarden = function () {
    var container = document.getElementById("gardenGrid");
    if (!container) return;

    if (!App.state.goals.length) {
      container.innerHTML = "<p class='garden-empty'>还没有种下目标，花园里空空的 🌱</p>";
      return;
    }

    container.innerHTML = App.state.goals.map(function(goal) {
      var stage = App.stageFor(goal);
      var progress = App.goalProgress(goal);
      var checkedToday = App.hasCheckedToday(goal);

      var plantEmoji = stage.icon;
      var plantSize = 40 + (stage.level * 14);

      return '<div class="garden-plant ' + (stage.complete ? 'complete' : '') + ' ' + (checkedToday ? 'watered' : '') + '">' +
        '<div class="garden-plant-icon" style="font-size:' + plantSize + 'px">' + plantEmoji + '</div>' +
        '<div class="garden-plant-name">' + App.escapeHTML(goal.name) + '</div>' +
        '<div class="garden-plant-stage">' + stage.name + '</div>' +
        '<div class="garden-plant-bar"><div class="garden-plant-fill" style="width:' + progress + '%"></div></div>' +
        (stage.complete ? '<div class="garden-badge">🏆</div>' : '') +
        (checkedToday ? '<div class="garden-watered-dot">💧</div>' : '') +
      '</div>';
    }).join("");
  };

})(window.App);
