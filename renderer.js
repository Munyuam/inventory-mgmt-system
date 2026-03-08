const loadItems = async () => {
    const items = await window.api.getItems();
    const listElement = document.getElementById('inventoryList');
    listElement.innerHTML = ''; // clear current items

    let totalQuantity = 0;
    let lowStockCount = 0;
    let totalValue = 0;

    items.forEach(item => {
        // Calculate statistics
        totalQuantity += item.quantity;
        totalValue += (item.price * item.quantity);
        if (item.quantity < 10) { // arbitrary threshold for low stock
            lowStockCount++;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
      <td>#${item.id}</td>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${item.price.toFixed(2)}</td>
    `;
        listElement.appendChild(row);
    });

    // Update Dashboard Stats
    document.getElementById('stat-total').textContent = items.length;
    document.getElementById('stat-low').textContent = lowStockCount;
    document.getElementById('stat-value').textContent = `$${totalValue.toFixed(2)}`;
};

document.getElementById('addItemBtn').addEventListener('click', async () => {
    const nameInput = document.getElementById('itemName');
    const qtyInput = document.getElementById('itemQuantity');
    const priceInput = document.getElementById('itemPrice');

    const name = nameInput.value;
    const quantity = parseInt(qtyInput.value, 10);
    const price = parseFloat(priceInput.value);

    if (!name) return alert('Name is required!');

    // Change button text while processing
    const btn = document.getElementById('addItemBtn');
    btn.textContent = 'Adding...';
    btn.disabled = true;

    const item = { name, quantity, price };

    // Call the main process to insert the item
    await window.api.addItem(item);

    // Clear inputs
    nameInput.value = '';
    qtyInput.value = '0';
    priceInput.value = '0.00';

    // Reload the list & update stats
    await loadItems();

    // Reset button
    btn.textContent = 'Add to Inventory';
    btn.disabled = false;
});

// --- Theming Logic for Dashboard ---
const themeToggle = document.getElementById('theme-toggle');
const iconSun = document.getElementById('icon-sun');
const iconMoon = document.getElementById('icon-moon');

const applyThemeIcons = (theme) => {
    if (theme === 'dark') {
        iconSun.style.display = 'block'; // Show sun button to switch to light
        iconMoon.style.display = 'none';
    } else {
        iconSun.style.display = 'none';
        iconMoon.style.display = 'block'; // Show moon button to switch to dark
    }
};

const setupTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    applyThemeIcons(currentTheme);

    themeToggle.addEventListener('click', () => {
        const activeTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = activeTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('app-theme', newTheme);
        applyThemeIcons(newTheme);
    });
};

// --- Greeting Logic ---
const updateGreeting = () => {
    const greetingElement = document.getElementById('greeting-text');
    const dateElement = document.getElementById('current-date-text');
    if (!greetingElement || !dateElement) return;

    const hour = new Date().getHours();
    let greeting = 'Good Evening';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 18) greeting = 'Good Afternoon';

    greetingElement.innerHTML = `${greeting}, <span style="color: var(--primary-color);">John</span>!`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = new Date().toLocaleDateString(undefined, options);
};

// --- Navigation Logic ---
const setupNavigation = () => {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.content-view');
    const pageTitle = document.querySelector('.page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.getAttribute('data-view');
            if (!viewId) return;

            // Update Active Nav State
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Switch Views
            views.forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById(`view-${viewId}`);
            if (targetView) targetView.classList.add('active');

            // Update Page Title
            if (pageTitle) {
                pageTitle.textContent = item.textContent.trim();
            }
        });
    });
};

// --- User Menu Dropdown ---
const setupUserMenu = () => {
    const trigger = document.getElementById('user-menu-trigger');
    const dropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (trigger && dropdown) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // In a real app, clear sessions/tokens here
            window.location.href = './login.html';
        });
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    loadItems();
    updateGreeting();
    setupNavigation();
    setupUserMenu();
});
