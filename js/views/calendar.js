window.App = window.App || {};

(function (App) {
  let calYear, calMonth;

  function initCalendar() {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth() + 1;
    loadCalendar();
  }

  async function loadCalendar() {
    try {
      const data = await App.fetchCalendarData(calYear, calMonth);
      renderCalendar(data);
    } catch (e) {
      // Calendar fails silently — non-critical
    }
  }

  function renderCalendar(checkinData) {
    const label = document.getElementById("calMonthLabel");
    const grid = document.getElementById("calendarGrid");
    if (!label || !grid) return;

    label.textContent = `${calYear}年${calMonth}月`;

    const dateMap = new Map();
    (checkinData || []).forEach((d) => dateMap.set(d.date, d.count));

    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const firstDay = new Date(calYear, calMonth - 1, 1).getDay();

    let html = "";
    ["日", "一", "二", "三", "四", "五", "六"].forEach((d) => {
      html += `<div class="cal-header">${d}</div>`;
    });

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="cal-cell empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = dateMap.get(dateStr) || 0;
      let level = 0;
      if (count >= 4) level = 4;
      else if (count >= 3) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;

      const today = App.localDateISO();
      const isToday = dateStr === today ? " today" : "";

      html += `<div class="cal-cell level-${level}${isToday}" title="${dateStr}: ${count} 次打卡">${day}</div>`;
    }

    grid.innerHTML = html;
  }

  function prevMonth() {
    calMonth--;
    if (calMonth < 1) { calMonth = 12; calYear--; }
    loadCalendar();
  }

  function nextMonth() {
    calMonth++;
    if (calMonth > 12) { calMonth = 1; calYear++; }
    loadCalendar();
  }

  App.initCalendar = initCalendar;
  App.prevMonth = prevMonth;
  App.nextMonth = nextMonth;
})(window.App);
