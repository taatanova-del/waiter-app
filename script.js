const SCRIPT_URL = "Вhttps://script.google.com/macros/s/AKfycbzXM3XH848SHHxu5Dci5uascEWoI1m4BI-Y2Tha8Qq_d_GJsrGfJDDiR-rW8pgsZoAk/exec";

// Загрузка данных из Google Sheets в LocalStorage
async function syncData() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        localStorage.setItem('appData', JSON.stringify(data));
        alert("Данные успешно обновлены!");
        location.reload();
    } catch (e) {
        alert("Ошибка обновления: " + e);
    }
}

// Получение данных (из кэша или из сети если кэш пуст)
async function getAppData() {
    let data = localStorage.getItem('appData');
    if (!data) {
        const res = await fetch(SCRIPT_URL);
        data = await res.json();
        localStorage.setItem('appData', JSON.stringify(data));
        return data;
    }
    return JSON.parse(data);
}

// АВТОРИЗАЦИЯ
async function login() {
    const userVal = document.getElementById('login').value;
    const passVal = document.getElementById('pass').value;
    const data = await getAppData();
    const found = data.users.find(u => u.login == userVal && u.pass.toString() == passVal);

    if (found) {
        localStorage.setItem('currentUser', JSON.stringify(found));
        location.href = 'main.html';
    } else {
        document.getElementById('error').innerText = "Ошибка входа";
    }
}

// ГЛАВНАЯ СТРАНИЦА
async function loadTables() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    document.getElementById('userName').innerText = user.name;
    const data = await getAppData();
    const activeOrders = JSON.parse(localStorage.getItem('activeOrders')) || {};
    const grid = document.getElementById('tablesGrid');

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

// СТРАНИЦА СТОЛА
let currentOrder = [];
let allMenu = [];

async function initTablePage() {
    const tableId = localStorage.getItem('currentTable');
    document.getElementById('tableNum').innerText = tableId;
    
    const data = await getAppData();
    allMenu = data.menu;

    const activeOrders = JSON.parse(localStorage.getItem('activeOrders')) || {};
    currentOrder = activeOrders[tableId] || [];
    
    renderOrder();
    showCategories();
}

function showCategories() {
    const menuDiv = document.getElementById('menuContent');
    const categories = [...new Set(allMenu.map(m => m.category))];
    
    menuDiv.innerHTML = `<h3>Категории</h3><div class="menu-grid"></div>`;
    const grid = menuDiv.querySelector('.menu-grid');

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'btn-menu';
        btn.innerText = cat;
        btn.onclick = () => showItems(cat);
        grid.appendChild(btn);
    });
}

function showItems(category) {
    const menuDiv = document.getElementById('menuContent');
    menuDiv.innerHTML = `<h3>${category}</h3><div class="menu-grid"></div>`;
    const grid = menuDiv.querySelector('.menu-grid');

    allMenu.filter(m => m.category === category).forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'btn-menu btn-item';
        btn.innerText = item.name;
        btn.onclick = () => {
            addToOrder(item);
            showCategories(); // Автовозврат к категориям
        };
        grid.appendChild(btn);
    });
    
    const backBtn = document.createElement('button');
    backBtn.className = 'btn';
    backBtn.innerText = '← К категориям';
    backBtn.onclick = showCategories;
    menuDiv.appendChild(backBtn);
}

function addToOrder(item) {
    const existing = currentOrder.find(i => i.name === item.name);
    if (existing) existing.quantity++;
    else currentOrder.push({ name: item.name, category: item.category, quantity: 1 });
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
                <span style="margin: 0 10px">${i.quantity}</span>
                <button class="qty-btn" onclick="updateQty('${i.name}', 1)">+</button>
            </div>
        </div>
    `).join('');
}

// СОХРАНЕНИЕ И ЗАКРЫТИЕ
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
    if (!confirm("Закрыть стол?")) return;

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
