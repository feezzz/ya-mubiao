window.App = window.App || {};
(function (App) {
  const KEY = "ya_user_id";

  App.getUserId = function() {
    return localStorage.getItem(KEY) || null;
  };

  App.setUserId = function(id) {
    localStorage.setItem(KEY, id);
  };

  App.initUser = async function() {
    const uid = App.getUserId();
    if (uid) {
      try {
        const users = await App.request("/users");
        const found = users.find(function(u) { return u.id === uid; });
        if (found) {
          App.state.currentUser = found;
          App.render();
          App.loadData();
          return;
        }
      } catch (e) {}
      localStorage.removeItem(KEY);
    }
    App.showUserPicker();
    App.render();
  };

  App.switchUser = async function(id) {
    App.setUserId(id);
    try {
      const users = await App.request("/users");
      const user = users.find(function(u) { return u.id === id; });
      if (user) {
        App.state.currentUser = user;
        App.state.goals = [];
        App.state.reviews = [];
        App.state.activeGoalId = null;
        App.loadData();
      }
    } catch (e) {}
    document.getElementById("userDropdown").style.display = "none";
    App.render();
  };

  App.createUser = async function(name) {
    try {
      const user = await App.request("/users", {
        method: "POST",
        body: JSON.stringify({ name: name })
      });
      App.setUserId(user.id);
      App.state.currentUser = user;
      document.getElementById("userPicker").style.display = "none";
      App.loadData();
      App.render();
    } catch (e) {
      App.showToast("创建失败：" + (e.message || "请重试"));
    }
  };

  App.logoutUser = function() {
    localStorage.removeItem(KEY);
    App.state.currentUser = null;
    App.state.goals = [];
    App.state.reviews = [];
    App.state.activeGoalId = null;
    App.render();
    App.showUserPicker();
  };

  App.showUserPicker = async function() {
    var picker = document.getElementById("userPicker");
    if (!picker) return;
    picker.style.display = "flex";
    document.getElementById("newUserName").value = "";
    // Load existing users
    try {
      var users = await App.request("/users");
      var list = document.getElementById("existingUsers");
      if (list && users.length) {
        list.innerHTML = "<p style='color:var(--muted);margin:0 0 8px'>已有用户：</p>" +
          users.map(function(u) {
            return "<button type='button' class='existing-user-btn' data-uid='" + u.id + "'>" + App.escapeHTML(u.name) + "</button>";
          }).join("");
        list.querySelectorAll(".existing-user-btn").forEach(function(btn) {
          btn.addEventListener("click", function() {
            App.switchUser(btn.dataset.uid);
            picker.style.display = "none";
          });
        });
      }
    } catch (e) {}
  };

  App.renderUserSwitch = function() {
    var btn = document.getElementById("userSwitchBtn");
    var name = document.getElementById("userSwitchName");
    var avatar = document.getElementById("userAvatar");
    if (!btn || !name) return;
    if (App.state.currentUser) {
      name.textContent = App.state.currentUser.name;
      if (avatar) avatar.textContent = App.state.currentUser.name.charAt(0).toUpperCase();
    } else {
      name.textContent = "未登录";
      if (avatar) avatar.textContent = "?";
    }
    // Load dropdown
    var dd = document.getElementById("userDropdown");
    if (!dd) return;
    dd.innerHTML = "";
    App.request("/users").then(function(users) {
      users.forEach(function(u) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = "user-dropdown-item";
        item.textContent = u.name;
        if (App.state.currentUser && u.id === App.state.currentUser.id) {
          item.style.fontWeight = "bold";
          item.style.color = "var(--mint-deep)";
        }
        item.addEventListener("click", function() {
          App.switchUser(u.id);
        });
        dd.appendChild(item);
      });
      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "user-dropdown-item";
      addBtn.textContent = "+ 新建用户";
      addBtn.addEventListener("click", function() {
        dd.style.display = "none";
        App.logoutUser();
      });
      dd.appendChild(addBtn);
    }).catch(function() {});
  };
})(window.App);
