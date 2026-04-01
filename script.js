const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxvi5Fc5J9x2MWfV587SusaC6gOp2fgOuEI78qEv0kMK-RvW6LCRi5qEj-parCMJSTK/exec";

let data = null;

// загрузка данных
async function loadData() {
  if (data) return data;
  try {
    const res = await fetch(SCRIPT_URL);
    data = await res.json();
    return data;
  } catch (e) {
    console.error(e);
    alert("Ошибка загрузки данных");
  }
}

/* =======================
   АВТОРИЗАЦИЯ
======================= */

if (document.getElementById("loginBtn")) {
  document.getElementById("loginBtn").onclick = async () => {
    await loadData();

    const u = document.getElementById("username").value.trim();
    const p = document.getElementById("password").value.trim();

    const user = data.users.find(x => x.username === u);

    if (!user) {
      document.getElementById("loginError").innerText = "Пользователь не найден";
      return;
    }

    if (String(user.password) !== p) {
      document.getElementById("loginError").innerText = "Неверный пароль";
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify(user));
    window.location = "main.html";
  };
}

/* =======================
   ГЛАВНАЯ (СТОЛЫ)
======================= */

if (document.getElementById("tablesContainer")) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) window.location = "index.html";

  document.getElementById("userName").innerText = currentUser.username;

  document.getElementById("logoutBtn").onclick = () => {
    localStorage.clear();
    window.location = "index.html";
  };

  loadData().then(() => {
    const container = document.getElementById("tablesContainer");
    container.innerHTML = "";

    data.tables.forEach(table => {
      const btn = document.createElement("button");

      btn.innerText = table.name;

      if (table.items && Object.keys(table.items).length > 0) {
        btn.className = "table-open";
      } else {
        btn.className = "table-closed";
      }

      btn.onclick = () => {
        localStorage.setItem("currentTable", JSON.stringify(table));
        window.location = "table.html";
      };

      container.appendChild(btn);
    });
  });
}

/* =======================
   СТРАНИЦА СТОЛА
======================= */

if (document.getElementById("menuSections")) {
  let table = JSON.parse(localStorage.getItem("currentTable"));
  let order = table.items || {};

  document.getElementById("tableName").innerText = table.name;

  loadData().then(() => {
    renderCategories();
    renderOrder();
  });

  function renderCategories() {
    const container = document.getElementById("menuSections");
    container.innerHTML = "";

    Object.keys(data.menu).forEach(cat => {
      const btn = document.createElement("button");
      btn.innerText = cat;

      btn.onclick = () => renderItems(cat);

      container.appendChild(btn);
    });
  }

  function renderItems(cat) {
    const container = document.getElementById("menuSections");
    container.innerHTML = "";

    data.menu[cat].forEach(item => {
      const div = document.createElement("div");

      div.innerHTML = `
        ${item}
        <button onclick="addItem('${item}')">+</button>
      `;

      container.appendChild(div);
    });
  }

  window.addItem = function(item) {
    order[item] = (order[item] || 0) + 1;
    renderOrder();
  };

  function renderOrder() {
    const container = document.getElementById("orderList");
    container.innerHTML = "";

    Object.keys(order).forEach(item => {
      const div = document.createElement("div");

      div.innerHTML = `
        ${item}
        <button onclick="change('${item}', -1)">-</button>
        ${order[item]}
        <button onclick="change('${item}', 1)">+</button>
      `;

      container.appendChild(div);
    });
  }

  window.change = function(item, delta) {
    order[item] += delta;
    if (order[item] <= 0) delete order[item];
    renderOrder();
  };

  document.getElementById("saveOrderBtn").onclick = () => {
    table.items = order;
    localStorage.setItem("currentTable", JSON.stringify(table));
    window.location = "main.html";
  };

  document.getElementById("closeTableBtn").onclick = async () => {
    const payload = [];
    const now = new Date();

    Object.keys(data.menu).forEach(cat => {
      data.menu[cat].forEach(item => {
        if (order[item]) {
          payload.push({
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString(),
            table: table.name,
            section: cat,
            item: item,
            quantity: order[item]
          });
        }
      });
    });

    await fetch(data.googleSheetEndpoint, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    table.items = {};
    localStorage.setItem("currentTable", JSON.stringify(table));

    window.location = "main.html";
  };
}

/* =======================
   ПРОФИЛЬ
======================= */

if (document.getElementById("profile")) {
  const user = JSON.parse(localStorage.getItem("currentUser"));
  if (!user) window.location = "index.html";

  document.getElementById("userNameProfile").innerText = user.username;

  document.getElementById("profile").innerHTML = `
    <p>Логин: ${user.username}</p>
    <p>Роль: ${user.role}</p>
  `;
}
