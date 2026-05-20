window.App = window.App || {};

(function (App) {
  async function aiDecompose(goal) {
    try {
      const result = await App.request("/ai/decompose", {
        method: "POST",
        body: JSON.stringify({ goal })
      });
      return result;
    } catch (e) {
      if (e.message && e.message.includes("429")) {
        App.showToast("AI 今天有点累了，休息一下再试试。");
      } else {
        App.showToast("AI 暂时不可用: " + (e.message || "未知错误"));
      }
      return null;
    }
  }

  async function aiReview(goalId) {
    try {
      const result = await App.request("/ai/review", {
        method: "POST",
        body: JSON.stringify({ goalId })
      });
      return result;
    } catch (e) {
      if (e.message && e.message.includes("429")) {
        App.showToast("AI 今天有点累了，休息一下再试试。");
      } else {
        App.showToast("AI 暂时不可用: " + (e.message || "未知错误"));
      }
      return null;
    }
  }

  App.aiDecompose = aiDecompose;
  App.aiReview = aiReview;
})(window.App);
