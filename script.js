const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXM3XH848SHHxu5Dci5uascEWoI1m4BI-Y2Tha8Qq_d_GJsrGfJDDiR-rW8pgsZoAk/exec";

// 1. ПОЛУЧЕНИЕ ДАННЫХ С КЭШИРОВАНИЕМ
async function getAppData(forceRefresh = false) {
    let data = localStorage.getItem('appData');
    
    // Если данных нет в памяти или нажата кнопка "Обновить"
    if (!data || forceRefresh) {
        console.log("Загрузка данных из Google Sheets...");
        try {
            const res = await fetch(SCRIPT_URL);
            const json = await res.json();
            localStorage.setItem('appData', JSON.stringify(json));
            return json;
        } catch (e) {
            alert("Ошибка сети. Проверьте SCRIPT_URL.");
            return null;
        }
    }
    return JSON.parse(data);
}

// 2. ВХОД В СИСТЕМУ
async function login() {
    const userInp = document.getElementById('login').value.trim();
    const passInp = document.getElementById('pass').value.trim();
    const errorEl = document.getElementById('error');

    errorEl.innerText = "Проверка...";

    const data = await getAppData();
    if (!data) return;

    const found = data.users.find(u => 
        u.login.toString().toLowerCase() === userInp.toLowerCase() && 
        u.pass.toString() === passInp
    );

    if (found) {
        localStorage.setItem('currentUser', JSON.stringify(found));
        location.href = 'main.html';
    } else {
        errorEl.innerText = "Неверный логин или пароль";
    }
}

// 3. ГЛАВНАЯ (СТОЛЫ)
async function loadTables() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) { location.href = 'index.html'; return; }
    document.getElementById('userName').innerText = user.name;

    const data = await getAppData();
    const activeOrders = JSON.parse(localStorage.getItem('activeOrders')) || {};
    const grid = document.getElementById('tablesGrid');
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

// 4. СТРАНИЦА СТОЛА (РАЗДЕЛЕННЫЙ ЭКРАН)
let currentOrder = [];
let menuData = [];

async function initTable() {
    const tableId = localStorage.getItem('currentTable');
    document.getElementById('tableNum').innerText = tableId;

    const data = await getAppData();
    menuData = data.menu;

    const activeOrders = JSON.parse(localStorage.getItem('activeOrders')) || {};
    currentOrder = activeOrders[tableId] || [];
    
    renderOrder();
    showCategories();
}

function showCategories() {
    const menuDiv = document.getElementById('menuContent');
    const categories = [...new Set(menuData.map(m => m.category))];
    
    menuDiv.innerHTML = `<div class="menu-grid"></div>`;
    const grid = menuDiv.querySelector('.menu-grid');

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'btn-menu';
        btn.innerText = cat;
        btn.onclick = () => showItems(cat);
        grid.appendChild(btn);
    });
}

function showItems(catName) {
    const menuDiv = document.getElementById('menuContent');
    menuDiv.innerHTML = `<button class="btn" onclick="showCategories()" style="background:#7f8c8d; color:white; margin-bottom:10px">← Назад к категориям</button>
                         <div class="menu-grid"></div>`;
    const grid = menuDiv.querySelector('.menu-grid');

    menuData.filter(m => m.category === catName).forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'btn-menu item-btn';
        btn.innerText = item.name;
        btn.onclick = () => {
            addItem(item);
            showCategories(); // АВТОВОЗВРАТ ПОСЛЕ ВЫБОРА
        };
        grid.appendChild(btn);
    });
}

function addItem(item) {
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
        <div class="order-row">
            <span>${i.name}</span>
            <div class="qty-btns">
                <button onclick="updateQty('${i.name}', -1)">-</button>
                <span>${i.quantity}</span>
                <button onclick="updateQty('${i.name}', 1)">+</button>
            </div>
        </div>
    `).join('');
}

function saveLocal() {
    const tableId = localStorage.getItem('currentTable');
    const allOrders = JSON.parse(localStorage.getItem('activeOrders')) || {};
    if (currentOrder.length > 0) allOrders[tableId] = currentOrder;
    else delete allOrders[tableId];
    localStorage.setItem('activeOrders', JSON.stringify(allOrders));
    location.href = 'main.html';
}

async function closeTable() {
    if (currentOrder.length === 0) return;
    if (!confirm("Закрыть стол и отправить в отчет?")) return;

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const tableId = localStorage.getItem('currentTable');

    const payload = {
        action: 'closeTable',
        tableId: tableId,
        userName: user.name,
        items: currentOrder
    };

    document.body.style.opacity = "0.5";
    await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
    
    const allOrders = JSON.parse(localStorage.getItem('activeOrders')) || {};
    delete allOrders[tableId];
    localStorage.setItem('activeOrders', JSON.stringify(allOrders));
    location.href = 'main.html';
}

// 5. АДМИН: СИНХРОНИЗАЦИЯ
async function adminRefresh() {
    if (confirm("Обновить меню и столы из Google Таблиц?")) {
        await getAppData(true);
        alert("Данные обновлены!");
        location.reload();
    }
}
