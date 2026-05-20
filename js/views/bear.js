window.App = window.App || {};

(function (App) {

  App.renderBear = function () {
    const goal = App.activeGoal();
    const stage = App.stageFor(goal);

    const badgeGoal = document.getElementById("badgeGoal");
    const badgeCheckin = document.getElementById("badgeCheckin");
    const badgeStreak = document.getElementById("badgeStreak");
    const badgeFlower = document.getElementById("badgeFlower");

    if (badgeGoal) badgeGoal.classList.toggle("unlocked", App.state.goals.length > 0);
    if (badgeCheckin) badgeCheckin.classList.toggle("unlocked", App.totalCheckins() > 0);
    if (badgeStreak) badgeStreak.classList.toggle("unlocked", goal ? goal.checkins.length >= 3 : false);
    if (badgeFlower) badgeFlower.classList.toggle("unlocked", stage.level >= 4);
    App.renderGarden();
  };
})(window.App);
