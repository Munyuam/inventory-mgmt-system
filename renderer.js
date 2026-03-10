let categoryChart = null;
let issuedChart = null;

const loadItems = async () => {
    const items = await window.api.getItems();
    const listElement = document.getElementById('inventoryList');
    if (listElement) listElement.innerHTML = '';

    let totalQuantity = 0;
    let lowStockCount = 0;
    let totalValue = 0;

    // Aggregation for category chart
    const categories = {};

    items.forEach(item => {
        totalQuantity += item.quantity;
        totalValue += (item.price * item.quantity);
        if (item.quantity < 10) {
            lowStockCount++;
        }

        const cat = item.category || 'General';
        categories[cat] = (categories[cat] || 0) + item.quantity;

        if (listElement) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${item.id}</td>
                <td>${item.name}</td>
                <td style="color: var(--text-muted); font-size: 0.8rem;">${cat}</td>
                <td><span class="badge ${item.quantity < 10 ? 'badge-warning' : 'badge-success'}">${item.quantity}</span></td>
                <td>$${item.price.toFixed(2)}</td>
            `;
            listElement.appendChild(row);
        }
    });

    // Ranking "Most Issued" items
    const mostIssued = [...items]
        .sort((a, b) => b.issued_count - a.issued_count)
        .slice(0, 5);

    // Update Dashboard Stats
    if (document.getElementById('stat-total')) document.getElementById('stat-total').textContent = items.length;
    if (document.getElementById('stat-low')) document.getElementById('stat-low').textContent = lowStockCount;
    if (document.getElementById('stat-value')) document.getElementById('stat-value').textContent = `$${totalValue.toFixed(2)}`;

    updateCharts(categories, mostIssued);
};

const updateCharts = (categoryData, mostIssuedItems) => {
    // TEMPORARY: Use descriptive dummy data as requested
    categoryData = {
        'Electronics & Gadgets': 35,
        'Office Furniture': 25,
        'Stationery Supplies': 20,
        'Maintenance Tools': 15,
        'Employee Gear': 5
    };

    const ctxCategory = document.getElementById('categoryChart');
    if (!ctxCategory) return;

    // --- High-Detail Category Pie Chart ---
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctxCategory, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                data: Object.values(categoryData),
                backgroundColor: [
                    '#2563eb', // Blue
                    '#10b981', // Green
                    '#f59e0b', // Amber
                    '#ef4444', // Red
                    '#8b5cf6'  // Violet
                ],
                hoverOffset: 20,
                borderWidth: 2,
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    padding: 12,
                    bodyFont: { size: 14 },
                    callbacks: {
                        label: (item) => ` ${item.label}: ${item.raw} units (${((item.raw / 100) * 100).toFixed(1)}%)`
                    }
                },
                legend: {
                    position: 'right',
                    labels: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-main'),
                        font: { size: 14, weight: '500' },
                        padding: 25,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            layout: {
                padding: 20
            }
        }
    });
};

// --- Add Item Logic ---
const handleAddItem = async () => {
    const nameInput = document.getElementById('itemName');
    const categoryInput = document.getElementById('itemCategory');
    const qtyInput = document.getElementById('itemQuantity');
    const priceInput = document.getElementById('itemPrice');
    const btn = document.getElementById('addItemBtn');

    const name = nameInput.value;
    const category = categoryInput.value;
    const quantity = parseInt(qtyInput.value, 10);
    const price = parseFloat(priceInput.value);

    if (!name) return alert('Name is required!');

    btn.textContent = 'Adding...';
    btn.disabled = true;

    await window.api.addItem({ name, quantity, price, category });

    nameInput.value = '';
    qtyInput.value = '0';
    priceInput.value = '0.00';

    await loadItems();

    btn.textContent = 'Add to Inventory';
    btn.disabled = false;
};

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

// --- Navigation Logic (Dynamic Loading) ---
const loadView = async (viewName) => {
    const loader = document.getElementById('view-loader');
    const container = document.getElementById('dynamic-content');
    if (!loader || !container) return;

    // Show loader
    loader.classList.add('active');
    container.style.opacity = '0.5';

    try {
        const response = await fetch(`../services/${viewName}.html`);
        if (!response.ok) throw new Error(`Failed to load view: ${viewName}`);

        const html = await response.text();

        // Brief delay to make the transition feel smoother and show the loader
        await new Promise(r => setTimeout(r, 600));

        container.innerHTML = html;
        container.style.opacity = '1';

        // Re-initialize view-specific logic
        if (viewName === 'dashboard') {
            await loadItems(); // Re-renders charts
        } else if (viewName === 'items') {
            await loadItems(); // Fills the table
        }
    } catch (error) {
        console.error('Error loading view:', error);
        container.innerHTML = `<div class="error-msg">Failed to load content. Please try again.</div>`;
    } finally {
        loader.classList.remove('active');
    }
};

const setupNavigation = () => {
    const navItems = document.querySelectorAll('.nav-item:not(.logout-link)');
    const pageTitle = document.querySelector('.page-title');

    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const viewId = item.getAttribute('data-view');
            if (!viewId) return;

            // Update Active Nav State
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Update Page Title
            if (pageTitle) pageTitle.textContent = item.textContent.trim();

            await loadView(viewId);
        });
    });

    // Load initial view
    loadView('dashboard');
};

// --- User Menu Dropdown ---
const setupUserMenu = () => {
    const trigger = document.getElementById('user-menu-trigger');
    const dropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');

    const handleLogout = (e) => {
        e.preventDefault();
        window.location.href = './login.html';
    };

    if (trigger && dropdown) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });
    }

    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', handleLogout);
};

// --- Collapsible Sidebar Logic ---
const setupSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const mainContent = document.querySelector('.main-content');

    if (!sidebar || !toggleBtn) return;

    // Load saved state
    const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
    }

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const state = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebar-collapsed', state);
    });
};

window.handleAddItem = handleAddItem;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupTheme();
    setupSidebar();
    loadItems();
    updateGreeting();
    setupNavigation();
    setupUserMenu();
});
