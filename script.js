const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXM3XH848SHHxu5Dci5uascEWoI1m4BI-Y2Tha8Qq_d_GJsrGfJDDiR-rW8pgsZoAk/exec";

// 1. Авторизация
async function login() {
    const userVal = document.getElementById('login').value;
    const passVal = document.getElementById('pass').value;
    const errorEl = document.getElementById('error');

    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        const found = data.users.find(u => u.login == userVal && u.pass.toString() == passVal);

        if (found) {
            localStorage.setItem('currentUser', JSON.stringify(found));
            location.href = 'main.html';
        } else {
            errorEl.innerText = "Неверный логин или пароль";
        }
    } catch (e) {
        alert("Ошибка подключения к серверу");
    }
}

// 2. Главная страница (Столы)
async function loadTables() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) { location.href = 'index.html'; return; }
    document.getElementById('userName').innerText = user.name;

    const grid = document.getElementById('tablesGrid');
    const activeOrders = JSON.parse(localStorage.getItem('activeOrders')) || {};

    const res = await fetch(SCRIPT_URL);
    const data = await res.json();

    grid.innerHTML = "";
    data.tables.forEach(t => {
        const isOpened = !!activeOrders[t.number];
        const btn = document.createElement('button');
        btn.className = `table-card ${isOpened ? 'open' : 'empty'}`;
        btn.innerText = `Стол №${t.number}`;
        btn.onclick = () => {
            localStorage.setItem('currentTable', t.number);
            location.href = 'table.html';
        };
        grid.appendChild(btn);
    });
}

// 3. Страница стола (Меню и Заказ)
let currentOrder = [];

async function loadMenuAndOrder() {
    const tableId = localStorage.getItem('currentTable');
    document.getElementById('tableNum').innerText = tableId;
    
    const allOrders = JSON.parse(localStorage.getItem('activeOrders')) || {};
    currentOrder = allOrders[tableId] || [];
    renderOrder();

    const res = await fetch(SCRIPT_URL);
    const data = await res.json();
    const menuDiv = document.getElementById('menuContent');
    
    const categories = [...new Set(data.menu.map(m => m.category))];
    categories.forEach(cat => {
        const catBox = document.createElement('div');
        catBox.innerHTML = `<h3>${cat}</h3>`;
        data.menu.filter(m => m.category === cat).forEach(item => {
            const div = document.createElement('div');
            div.className = 'item-row';
            div.innerHTML = `<span>${item.name} (${item.price}₽)</span> 
                <button class="btn btn-add" onclick='addToOrder(${JSON.stringify(item)})'>+</button>`;
            catBox.appendChild(div);
        });
        menuDiv.appendChild(catBox);
    });
}

function addToOrder(item) {
    const existing = currentOrder.find(i => i.name === item.name);
    if (existing) existing.quantity++;
    else currentOrder.push({...item, quantity: 1});
    renderOrder();
}

function updateQty(name, delta) {
    const item = currentOrder.find(i => i.name === name);
    item.quantity += delta;
    if (item.quantity <= 0) currentOrder = currentOrder.filter(i => i.name !== name);
    renderOrder();
}

function renderOrder() {
    const list = document.getElementById('orderList');
    list.innerHTML = currentOrder.map(i => `
        <div class="item-row">
            <span>${i.name}</span>
            <div class="qty-controls">
                <button class="qty-btn" onclick="updateQty('${i.name}', -1)">-</button>
                <b>${i.quantity}</b>
                <button class="qty-btn" onclick="updateQty('${i.name}', 1)">+</button>
            </div>
        </div>
    `).join('');
}

function saveOrder() {
    const tableId = localStorage.getItem('currentTable');
    const allOrders = JSON.parse(localStorage.getItem('activeOrders')) || {};
    if (currentOrder.length > 0) allOrders[tableId] = currentOrder;
    else delete allOrders[tableId];
    localStorage.setItem('activeOrders', JSON.stringify(allOrders));
    location.href = 'main.html';
}

async function closeTable() {
    if (currentOrder.length === 0) return;
    if (!confirm("Закрыть стол и отправить данные в систему?")) return;

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const tableId = localStorage.getItem('currentTable');

    const data = { action: 'closeTable', tableId, userName: user.name, items: currentOrder };
    
    document.body.style.opacity = "0.5";
    await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(data) });
    
    const allOrders = JSON.parse(localStorage.getItem('activeOrders')) || {};
    delete allOrders[tableId];
    localStorage.setItem('activeOrders', JSON.stringify(allOrders));
    location.href = 'main.html';
}
