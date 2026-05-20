window.App = window.App || {};
(function(App) {
  App.renderStatsPage = async function() {
    var container = document.getElementById("statsContent");
    if (!container) return;
    try {
      var stats = await App.request("/stats/overview");
      container.innerHTML = `
        <div class="stats-hero">
          <div class="stats-big-num">${stats.totalCheckins}<span>次总打卡</span></div>
          <div class="stats-big-num">${stats.streak}<span>天连续</span></div>
          <div class="stats-big-num">${stats.completionRate}%<span>完成率</span></div>
        </div>
        <div class="stats-monthly">
          <h3>月度趋势</h3>
          <div class="stats-bars">
            ${stats.monthlyTrend.map(function(m){
              var max = Math.max.apply(null, stats.monthlyTrend.map(function(x){return x.count;}));
              var h = max > 0 ? Math.round(m.count/max*100) : 0;
              return '<div class="stats-bar-item"><div class="stats-bar-fill" style="height:'+h+'%"></div><span>'+m.month.slice(5)+'月</span><small>'+m.count+'次</small></div>';
            }).join('')}
          </div>
        </div>
        <p style="text-align:center;color:var(--muted)">${stats.totalGoals} 个目标 · ${stats.completedGoals} 个已完成</p>
      `;
    } catch(e) {
      container.innerHTML = '<p style="text-align:center;color:var(--muted)">统计数据加载失败</p>';
    }
  };
})(window.App);
