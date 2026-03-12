const loadProducts = async () => {
    const products = await window.api.getProducts();

    const listElement = document.getElementById('inventoryList');
    if (listElement) listElement.innerHTML = '';

    let totalQuantity = 0;
    let lowStockCount = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    const categories = {};

    products.forEach(item => {
        totalQuantity += item.quantity;
        totalRevenue += (item.unit_price * item.quantity);
        totalCost += ((item.unit_cost || 0) * item.quantity);
        if (item.quantity < 10) lowStockCount++;

        const cat = item.product_category || 'General';
        categories[cat] = (categories[cat] || 0) + item.quantity;

        if (listElement) {
            const row = document.createElement('tr');
            const unitCost = item.unit_cost || 0;
            const unitPrice = item.unit_price || 0;
            const totalCost = unitCost * item.quantity;
            const totalRevenue = unitPrice * item.quantity;
            row.innerHTML = `
                <td>#${item.product_id}</td>
                <td>${item.product_name}</td>
                <td style="color: var(--text-muted); font-size: 0.8rem;">${cat}</td>
                <td><span class="badge ${item.quantity < 10 ? 'badge-low' : 'badge-ok'}">${item.quantity}</span></td>
                <td>MK${unitCost.toFixed(2)}</td>
                <td>MK${unitPrice.toFixed(2)}</td>
                <td>MK${totalCost.toFixed(2)}</td>
                <td>MK${totalRevenue.toFixed(2)}</td>
            `;
            listElement.appendChild(row);
        }
    });

    if (document.getElementById('stat-total')) document.getElementById('stat-total').textContent = products.length;
    if (document.getElementById('stat-low')) document.getElementById('stat-low').textContent = lowStockCount;
    if (document.getElementById('stat-value')) document.getElementById('stat-value').textContent = `MK${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (document.getElementById('stat-cost')) document.getElementById('stat-cost').textContent = `MK${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const estimatedProfit = totalRevenue - totalCost;
    const profitEl = document.getElementById('stat-profit');
    if (profitEl) {
        profitEl.textContent = `MK${estimatedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        profitEl.style.color = estimatedProfit >= 0 ? '#10b981' : '#ef4444'; // Green for profit, red for loss
    }

    // Ranking "Most Issued" Products
    const mostIssued = [...products].sort((a, b) => b.issued_count - a.issued_count).slice(0, 5);
    updateCharts(categories, mostIssued);

    // --- Update Products Table (if on products view) ---
    const productsTbody = document.getElementById('products-tbody');
    if (productsTbody) {
        // We use window.refreshProductsTable if initProductsView has set it up with DataTables
        if (window.refreshProductsTableData) {
            window.refreshProductsTableData(products);
        } else {
            // fallback: manual render
            productsTbody.innerHTML = '';
            if (products.length === 0) {
                productsTbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted);">No products found.</td></tr>';
                return;
            }
            products.forEach((p, i) => {
                const qtyBadge = `<span class="badge ${p.quantity < 10 ? 'badge-low' : 'badge-ok'}">${p.quantity}</span>`;
                const unitCost = p.unit_cost || 0;
                const unitPrice = p.unit_price || 0;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${p.product_id}</td>
                    <td><strong>${p.product_name}</strong></td>
                    <td>${p.product_category || 'General'}</td>
                    <td>${p.supplier_name || '—'}</td>
                    <td>${p.invoice_number || '—'}</td>
                    <td>${qtyBadge}</td>
                    <td>MK${parseFloat(unitCost).toFixed(2)}</td>
                    <td>MK${parseFloat(unitPrice).toFixed(2)}</td>
                    <td>
                        <div style="display:flex; gap: 6px;">
                            <button class="mbtn mbtn-ghost" style="padding:4px 8px;font-size:0.8rem;border:1px solid #ddd;" onclick="window.openViewProductModal(${p.product_id})">View</button>
                            <button class="mbtn mbtn-primary" style="padding:4px 8px;font-size:0.8rem;" onclick="window.openEditProductModal(${p.product_id})">Edit</button>
                        </div>
                    </td>`;
                productsTbody.appendChild(row);
            });
        }
    }
};

let categoryChart = null;

const updateCharts = (categoryData, mostIssuedProducts) => {
    // If there is no data, provide a fallback so the chart doesn't break
    if (Object.keys(categoryData).length === 0) {
        categoryData = { 'No Products': 1 };
    }

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

// --- Utility Functions ---
const showProductFeedback = (message, type = 'success') => {
    const feedback = document.getElementById('product-feedback');
    if (!feedback) return;

    feedback.textContent = message;
    feedback.className = `auth-feedback ${type}`;
    feedback.style.display = 'block';

    setTimeout(() => {
        feedback.style.display = 'none';
    }, 5000);
};

// --- Add Product Logic ---
const handleAddProduct = async () => {
    const nameInput = document.getElementById('productName');
    const categoryInput = document.getElementById('productCategory');
    const qtyInput = document.getElementById('productQuantity');
    const priceInput = document.getElementById('productPrice');
    const btn = document.getElementById('addProductBtn');

    const name = nameInput.value;
    const category = categoryInput.value;
    const quantity = parseInt(qtyInput.value, 10);
    const price = parseFloat(priceInput.value);

    if (!name) {
        showProductFeedback('Product name is required!', 'error');
        return;
    }

    try {
        btn.textContent = 'Adding...';
        btn.disabled = true;

        const result = await window.api.addProduct({ name, quantity, price, category });

        if (result && result.changes > 0) {
            showProductFeedback(`Successfully added "${name}"`, 'success');
            // Log manually if not using saveFullProcurement workflow
            window.api.logAction('Manual Product Add', `Product "${name}" added manually via simple form.`);
            nameInput.value = '';
            qtyInput.value = '0';
            priceInput.value = '0.00';
            await loadProducts();
        } else {
            showProductFeedback('Failed to add product. Please try again.', 'error');
            window.api.logAction('Add Product Failed', `Attempted to add "${name}" but database update returned no changes.`);
        }
    } catch (error) {
        console.error('Add Product Error:', error);
        showProductFeedback('An unexpected error occurred.', 'error');
    } finally {
        btn.textContent = 'Add to Inventory';
        btn.disabled = false;
    }
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
const updateGreeting = (user) => {
    const greetingElement = document.getElementById('greeting-text');
    const dateElement = document.getElementById('current-date-text');
    const userNameElement = document.querySelector('.user-name');
    const avatarElement = document.querySelector('.avatar');

    if (!greetingElement || !dateElement) return;

    const hour = new Date().getHours();
    let greeting = 'Good Evening';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 18) greeting = 'Good Afternoon';

    const displayName = user ? user.username : 'Guest';
    greetingElement.innerHTML = `${greeting}, <span style="color: var(--primary-color); text-transform: capitalize;">${displayName}</span>!`;

    if (userNameElement) userNameElement.textContent = displayName;
    if (avatarElement && user) {
        avatarElement.textContent = user.username.substring(0, 2).toUpperCase();
    }

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = new Date().toLocaleDateString(undefined, options);
};

// --- Weekly Summary Logic ---
const loadWeeklySummary = async () => {
    const container = document.getElementById('summary-view-content');
    const selector = document.getElementById('week-selector');
    if (!container) return;

    try {
        const transactions = await window.api.getTransactions();
        if (!transactions || transactions.length === 0) {
            container.innerHTML = '<div class="content-card">No transactions found to generate summary.</div>';
            return;
        }

        // Grouping: MondayDate -> ProductID -> data
        const weeklyData = {};

        transactions.forEach(t => {
            const date = new Date(t.transaction_date);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date.setDate(diff)).toISOString().split('T')[0];

            if (!weeklyData[monday]) weeklyData[monday] = {};

            const pid = t.product_id;
            if (!weeklyData[monday][pid]) {
                weeklyData[monday][pid] = {
                    name: t.product_name,
                    purchased: 0,
                    issued: 0,
                    price: t.unit_price || 0,
                    revenue: 0
                };
            }

            if (t.transaction_type === 'Procurement') {
                weeklyData[monday][pid].purchased += t.quantity;
            } else if (t.transaction_type === 'Issue') {
                weeklyData[monday][pid].issued += t.quantity;
            }

            const p = weeklyData[monday][pid];
            p.stockLevel = p.purchased - p.issued;
            p.revenue = p.stockLevel * p.price;
        });

        const weeks = Object.keys(weeklyData).sort((a, b) => new Date(b) - new Date(a));

        // Helper to format date range
        const getWeekStr = (monday) => {
            const startDate = new Date(monday);
            const endDate = new Date(monday);
            endDate.setDate(startDate.getDate() + 6);
            return `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        };

        // Populate selector if it's the first load or if weeks changed
        if (selector && selector.options.length <= 1) {
            weeks.forEach(monday => {
                const opt = document.createElement('option');
                opt.value = monday;
                opt.textContent = `Week of ${getWeekStr(monday)}`;
                selector.appendChild(opt);
            });

            selector.addEventListener('change', () => renderSelectedWeeks());
        }

        const renderSelectedWeeks = () => {
            const selected = selector.value;
            const targetWeeks = selected === 'all' ? weeks : [selected];

            let html = '';
            const tableIds = [];

            targetWeeks.forEach((monday, wIdx) => {
                const weekProducts = weeklyData[monday];
                let weekTotalRevenue = 0;
                const dateStr = getWeekStr(monday);
                const tableId = `summary-dt-${wIdx}`;
                tableIds.push({ id: tableId, label: dateStr });

                let tableRows = '';
                Object.values(weekProducts).forEach(p => {
                    weekTotalRevenue += p.revenue;
                    tableRows += `
                        <tr>
                            <td><strong>${p.name}</strong></td>
                            <td><span class="badge ${p.stockLevel < 5 ? 'badge-low' : 'badge-ok'}">${p.stockLevel}</span></td>
                            <td>${p.purchased}</td>
                            <td>${p.issued}</td>
                            <td>MK${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td class="sum-revenue">MK${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                    `;
                });

                html += `
                    <div class="weekly-card">
                        <div class="weekly-header">
                            <div class="weekly-title">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                Week of ${dateStr}
                            </div>
                            <div class="weekly-stats">
                                <div class="w-stat">
                                    <span class="w-stat-label">Total Weekly Accumulated Revenue</span>
                                    <span class="w-stat-value">MK${weekTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                        <div class="products-table-wrap">
                            <table id="${tableId}" class="display" style="width:100%">
                                <thead>
                                    <tr>
                                        <th>Product Name</th>
                                        <th>Stock Level</th>
                                        <th>Purchased</th>
                                        <th>Issued</th>
                                        <th>Unit Price</th>
                                        <th>Revenue</th>
                                    </tr>
                                </thead>
                                <tbody>${tableRows}</tbody>
                            </table>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;

            if (typeof $ !== 'undefined' && $.fn.DataTable) {
                tableIds.forEach(item => {
                    $(`#${item.id}`).DataTable({
                        dom: 'Bfrtip',
                        buttons: [
                            {
                                extend: 'excelHtml5',
                                text: 'Export to Excel',
                                className: 'btn-export-excel',
                                title: `Weekly Summary - ${item.label}`
                            }
                        ],
                        pageLength: 5,
                        lengthMenu: [5, 10, 25, 50],
                        order: [[0, 'asc']],
                        language: {
                            search: "_INPUT_",
                            searchPlaceholder: "Filter products..."
                        }
                    });
                });
            }
        };

        renderSelectedWeeks();

    } catch (err) {
        console.error('Weekly summary error:', err);
        container.innerHTML = `<div class="content-card" style="color:var(--bg-error)">Failed to load weekly summary: ${err.message}</div>`;
    }
};

// --- Navigation Logic (Dynamic Loading) ---
const loadView = async (viewName) => {
    const loader = document.getElementById('view-loader');
    const container = document.getElementById('dynamic-content');
    if (!loader || !container) return;

    // Log view navigation
    window.api.logAction('View Navigation', `User navigated to "${viewName}" page.`);

    // Show loader
    loader.classList.add('active');
    container.style.opacity = '0.5';

    try {
        const response = await fetch(`../views/${viewName}.html`);
        if (!response.ok) throw new Error(`Failed to load view: ${viewName}`);

        const html = await response.text();

        // Brief delay to make the transition feel smoother and show the loader
        await new Promise(r => setTimeout(r, 600));

        container.innerHTML = html;
        container.style.opacity = '1';

        // Re-initialize view-specific logic
        if (viewName === 'dashboard') {
            await loadProducts(); // Re-renders charts
        } else if (viewName === 'products') {
            // Wire up modal logic now that the HTML is in the DOM
            if (typeof window.initProductsView === 'function') {
                window.initProductsView();
            }
            await loadProducts();
        } else if (viewName === 'summary') {
            await loadWeeklySummary();
        } else if (viewName === 'activity') {
            if (typeof window.initActivityView === 'function') {
                window.initActivityView();
            }
        } else if (viewName === 'settings') {
            const user = await window.api.getCurrentUser();
            if (user) {
                document.getElementById('settings-username').value = user.username || '';
                document.getElementById('settings-email').value = user.email || '';
            }

            // Profile Update Handler
            document.getElementById('settings-update-profile-btn')?.addEventListener('click', async () => {
                const btn = document.getElementById('settings-update-profile-btn');
                const newUsername = document.getElementById('settings-username').value.trim();
                const newEmail = document.getElementById('settings-email').value.trim();

                if (!newUsername || !newEmail) {
                    alert('Please provide both username and email.');
                    return;
                }

                btn.textContent = 'Updating...';
                btn.disabled = true;

                const result = await window.api.updateProfile({ username: newUsername, email: newEmail });
                if (result.success) {
                    alert('Profile Updated Successfully!');
                    updateGreeting({ username: newUsername, email: newEmail }); // Refresh header
                } else {
                    alert(`Update Failed: ${result.error}`);
                }

                btn.textContent = 'Update Profile';
                btn.disabled = false;
            });

            // Password Change Handler
            document.getElementById('settings-change-pwd-btn')?.addEventListener('click', async () => {
                const btn = document.getElementById('settings-change-pwd-btn');
                const curPass = document.getElementById('settings-cur-pass').value;
                const newPass = document.getElementById('settings-new-pass').value;

                if (!curPass || !newPass) {
                    alert('Please provide both current and new passwords.');
                    return;
                }
                if (newPass.length < 6) {
                    alert('New password must be at least 6 characters long.');
                    return;
                }

                btn.textContent = 'Changing...';
                btn.disabled = true;

                const result = await window.api.changePassword({ currentPassword: curPass, newPassword: newPass });
                if (result.success) {
                    alert('Password Changed Successfully! Please use it on your next login.');
                    document.getElementById('settings-cur-pass').value = '';
                    document.getElementById('settings-new-pass').value = '';
                } else {
                    alert(`Change Failed: ${result.error}`);
                }

                btn.textContent = 'Change Password';
                btn.disabled = false;
            });

            // System Monitor Handler
            document.getElementById('settings-sysmon-btn')?.addEventListener('click', async () => {
                const container = document.getElementById('settings-sysmon-container');
                const content = document.getElementById('settings-sysmon-content');
                if (!container || !content) return;

                // Toggle visibility
                if (container.style.display !== 'none') {
                    container.style.display = 'none';
                    return;
                }

                container.style.display = 'flex';
                content.innerHTML = '<span style="color:#aaa;">Fetching system logs...</span>';

                try {
                    const logs = await window.api.getAuditLogs();
                    if (!logs || logs.length === 0) {
                        content.innerHTML = '<span style="color:#888;">No logs found.</span>';
                        return;
                    }

                    // Neatly format logs with color coding and structured classes
                    const formattedLogs = logs.map(log => {
                        const match = log.match(/^\[(.*?)\]\s+\[User:\s+(.*?)\]\s+Action:\s+(.*?)\s+-\s+(.*)$/);
                        if (match) {
                            const [_, time, user, action, details] = match;
                            return `<div class="log-entry">
                                <span class="log-time">[${time}]</span>
                                <span class="log-user">${user}:</span>
                                <span class="log-action">${action}</span>
                                <span class="log-details">${details}</span>
                            </div>`;
                        }
                        return `<div class="log-entry">${log}</div>`;
                    }).join('');

                    content.innerHTML = formattedLogs;
                } catch (err) {
                    content.innerHTML = `<span style="color:#f87171;">Failed to load logs: ${err.message}</span>`;
                }
            });
        }
        // Other views are self-contained
    } catch (error) {
        console.error('Error loading view:', error);
        window.api.logAction('View Load Error', `Failed to load "${viewName}": ${error.message}`);
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

    const handleLogout = async (e) => {
        e.preventDefault();
        await window.api.logout();
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

window.handleAddProduct = handleAddProduct;

// ============================================================
// PRODUCTS VIEW — initialised after the HTML view is injected
// ============================================================
window.initProductsView = function () {

    /* ----- state ----- */
    const pState = { supplier: null, invoice: null, lineItems: [] };
    let liFormOpen = false;
    let dtInstance = null;

    /* ----- helpers ----- */
    function openModal(id) {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
        const el = document.getElementById(id);
        if (el) el.classList.add('open');
    }
    function closeAll() {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
    }
    function stag(cls, txt) {
        return `<span class="stag ${cls}">${txt}</span>`;
    }
    function setErr(fieldId, hasErr) {
        const el = document.getElementById(fieldId);
        if (el) el.style.borderColor = hasErr ? '#ef4444' : '';
    }
    function showFeedback(msg, type = 'success') {
        const el = document.getElementById('product-feedback');
        if (!el) return;
        el.textContent = msg;
        el.className = `auth-feedback ${type}`;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 6000);
    }

    /* ----- DataTables init ----- */
    function ensureDataTable() {
        if (typeof $ === 'undefined' || typeof $.fn.DataTable === 'undefined') return;
        if (dtInstance) return;                         // already inited
        dtInstance = $('#products-dt').DataTable({
            dom: 'Blfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Export to Excel',
                    className: 'btn-export-excel',
                    title: 'Product Inventory List'
                }
            ],
            pageLength: 10,
            language: {
                emptyTable: 'No products yet. Click "Add Product" to get started.',
                zeroRecords: 'No matching products found.'
            },
            columnDefs: [{ orderable: false, targets: -1 }]
        });
    }
    ensureDataTable();

    /* ===================== STEP 1: SUPPLIER ===================== */
    document.getElementById('open-supplier-btn')?.addEventListener('click', () => {
        openModal('modal-supplier');
    });
    document.getElementById('sup-cancel')?.addEventListener('click', closeAll);
    document.getElementById('sup-next')?.addEventListener('click', () => {
        const name = document.getElementById('sup-name').value.trim();
        if (!name) { setErr('sup-name', true); return; }
        setErr('sup-name', false);
        pState.supplier = {
            name,
            phone: document.getElementById('sup-phone')?.value.trim() || '',
            email: document.getElementById('sup-email')?.value.trim() || ''
        };
        // populate tag in step 2
        document.getElementById('inv-stags').innerHTML = stag('stag-s', '✓ ' + pState.supplier.name);
        // default date
        document.getElementById('inv-date').value = new Date().toISOString().split('T')[0];
        openModal('modal-invoice');
    });

    // Bridge for main loadProducts to refresh the DataTables table
    window.refreshProductsTableData = (products) => {
        window.allProducts = products; // Keep a reference for editing
        if (typeof $ !== 'undefined' && dtInstance) {
            dtInstance.clear();
            products.forEach((p, i) => {
                const qtyBadge = `<span class="badge ${p.quantity < 10 ? 'badge-low' : 'badge-ok'}">${p.quantity}</span>`;
                const unitCost = p.unit_cost || 0;
                const unitPrice = p.unit_price || 0;
                dtInstance.row.add([
                    p.product_id,
                    `<strong>${p.product_name}</strong>`,
                    p.product_category || 'General',
                    p.supplier_name || '—',
                    p.invoice_number || '—',
                    qtyBadge,
                    `MK${parseFloat(unitCost).toFixed(2)}`,
                    `MK${parseFloat(unitPrice).toFixed(2)}`,
                    `<div style="display:flex; gap: 6px;">
                        <button class="mbtn mbtn-ghost" style="padding:4px 8px;font-size:0.8rem;border:1px solid #ddd;" onclick="window.openViewProductModal(${p.product_id})">View</button>
                        <button class="mbtn mbtn-primary" style="padding:4px 8px;font-size:0.8rem;" onclick="window.openEditProductModal(${p.product_id})">Edit</button>
                    </div>`
                ]);
            });
            dtInstance.draw();
        }
    };

    // --- Product View Logic ---
    window.openViewProductModal = (productId) => {
        const product = (window.allProducts || []).find(p => p.product_id === productId);
        if (!product) return;

        document.getElementById('view-prod-subtitle').textContent = `ID #${product.product_id}`;
        document.getElementById('view-prod-name').textContent = product.product_name || '—';
        document.getElementById('view-prod-category').textContent = product.product_category || 'General';
        document.getElementById('view-prod-desc').textContent = product.product_description || 'No description provided.';

        document.getElementById('view-prod-stock').textContent = product.quantity || '0';
        document.getElementById('view-prod-issued').textContent = '0'; // Stub for future sum of issues

        document.getElementById('view-prod-cost').textContent = product.unit_cost ? product.unit_cost.toFixed(2) : '0.00';
        document.getElementById('view-prod-price').textContent = product.unit_price ? product.unit_price.toFixed(2) : '0.00';

        document.getElementById('view-prod-supplier').textContent = product.supplier_name || '—';
        document.getElementById('view-prod-invoice').textContent = product.invoice_number || '—';

        document.getElementById('modal-view-product').classList.add('open');
    };

    // --- Product Edit Logic ---
    window.openEditProductModal = (productId) => {
        const product = (window.allProducts || []).find(p => p.product_id === productId);
        if (!product) return;

        document.getElementById('edit-prod-id').value = product.product_id;
        document.getElementById('edit-prod-name').value = product.product_name;
        document.getElementById('edit-prod-price').value = product.unit_price ? product.unit_price.toFixed(2) : '0.00';
        document.getElementById('edit-prod-desc').value = product.product_description || '';

        // Match category dropdown
        const catSelect = document.getElementById('edit-prod-category');
        if (catSelect) {
            const matchingOpt = Array.from(catSelect.options).find(o => o.value === product.product_category || o.textContent === product.product_category);
            catSelect.value = matchingOpt ? matchingOpt.value : 'General';
        }

        document.getElementById('edit-prod-stock').textContent = product.quantity;
        document.getElementById('edit-prod-cost').textContent = product.unit_cost ? product.unit_cost.toFixed(2) : '0.00';

        document.getElementById('modal-edit-product').classList.add('open');
    };

    document.getElementById('edit-prod-submit')?.addEventListener('click', async () => {
        const productId = parseInt(document.getElementById('edit-prod-id').value);
        const name = document.getElementById('edit-prod-name').value.trim();
        const category = document.getElementById('edit-prod-category').value;
        const price = parseFloat(document.getElementById('edit-prod-price').value) || 0;
        const desc = document.getElementById('edit-prod-desc').value.trim();

        if (!name) { setErr('edit-prod-name', true); return; } else setErr('edit-prod-name', false);

        const data = {
            product_id: productId,
            product_name: name,
            product_category: category,
            unit_price: price,
            product_description: desc
        };

        const result = await window.api.updateProduct(data);
        if (result.success) {
            document.getElementById('modal-edit-product').classList.remove('open');
            if (typeof loadProducts === 'function') {
                await loadProducts();
            }
        } else {
            alert('Failed to update product: ' + result.error);
        }
    });

    /* ===================== STEP 2: INVOICE ===================== */
    document.getElementById('inv-back')?.addEventListener('click', () => openModal('modal-supplier'));
    document.getElementById('inv-next')?.addEventListener('click', () => {
        const num = document.getElementById('inv-number')?.value.trim() || '';
        const date = document.getElementById('inv-date')?.value || '';
        let ok = true;
        if (!num) { setErr('inv-number', true); ok = false; } else setErr('inv-number', false);
        if (!date) { setErr('inv-date', true); ok = false; } else setErr('inv-date', false);
        if (!ok) return;
        pState.invoice = {
            number: num,
            date,
            terms: document.getElementById('inv-terms')?.value || 'Cash',
            currency: document.getElementById('inv-currency')?.value || 'MK',
            notes: document.getElementById('inv-notes')?.value.trim() || '',
            total_cost: parseFloat(document.getElementById('inv-unit-cost')?.value) || 0
        };
        document.getElementById('items-stags').innerHTML =
            stag('stag-s', '✓ ' + pState.supplier.name) +
            stag('stag-i', '✓ ' + pState.invoice.number);
        renderLineItems();
        openModal('modal-items');
    });

    /* ===================== STEP 3: LINE ITEMS ===================== */
    document.getElementById('items-back')?.addEventListener('click', () => openModal('modal-invoice'));

    document.getElementById('li-add-toggle')?.addEventListener('click', () => {
        liFormOpen = !liFormOpen;
        const form = document.getElementById('li-form');
        form.classList.toggle('open', liFormOpen);
        if (liFormOpen) {
            document.getElementById('li-name').value = '';
            document.getElementById('li-qty').value = '1';
            // Pre-fill the line-item unit cost with the invoice-level unit cost as a default convenience
            document.getElementById('li-price').value = pState.invoice?.total_cost?.toFixed(2) || '0.00';
            document.getElementById('li-name').focus();
        }
    });

    document.getElementById('li-form-cancel')?.addEventListener('click', () => {
        liFormOpen = false;
        document.getElementById('li-form').classList.remove('open');
    });

    document.getElementById('li-form-add')?.addEventListener('click', () => {
        const nameEl = document.getElementById('li-name');
        const name = nameEl.value.trim();
        if (!name) { nameEl.style.borderColor = '#ef4444'; nameEl.focus(); return; }
        nameEl.style.borderColor = '';
        pState.lineItems.push({
            name,
            qty: parseFloat(document.getElementById('li-qty').value) || 1,
            price: parseFloat(document.getElementById('li-price').value) || 0,
            category: document.getElementById('li-category')?.value || 'General',
            description: '',   // description is set/overridden in Step 4
        });
        liFormOpen = false;
        document.getElementById('li-form').classList.remove('open');
        renderLineItems();
    });

    document.getElementById('items-next')?.addEventListener('click', () => {
        if (pState.lineItems.length === 0) {
            showFeedback('Please add at least one invoice item.', 'warning');
            return;
        }

        // Calculate total_cost for the invoice
        pState.invoice.total_cost = pState.lineItems.reduce((sum, item) => sum + (item.qty * item.price), 0);

        // populate product select
        const sel = document.getElementById('prod-select');
        sel.innerHTML = '';
        pState.lineItems.forEach((item, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${item.name}  (×${item.qty}, MK${item.price.toFixed(2)})`;
            sel.appendChild(opt);
        });
        prefillProdFromSel();
        document.getElementById('prod-stags').innerHTML =
            stag('stag-s', '✓ ' + pState.supplier.name) +
            stag('stag-i', '✓ ' + pState.invoice.number) +
            stag('stag-n', pState.lineItems.length + ' item(s)');
        openModal('modal-product');
    });

    function renderLineItems() {
        const list = document.getElementById('li-list');
        if (!list) return;
        list.innerHTML = '';
        if (pState.lineItems.length === 0) {
            list.innerHTML = '<div class="li-empty">No items yet. Click "Add Line Item" to start.</div>';
            return;
        }
        pState.lineItems.forEach((item, i) => {
            const row = document.createElement('div');
            row.className = 'li-row';
            row.innerHTML = `
                <span class="li-name">${item.name}</span>
                <span class="li-meta">${item.category}</span>
                <span class="li-meta">×${item.qty}</span>
                <span class="li-meta">MK${item.price.toFixed(2)}</span>
                <button class="mbtn-remove" data-idx="${i}">✕</button>`;
            list.appendChild(row);
        });
        list.querySelectorAll('.mbtn-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                pState.lineItems.splice(parseInt(btn.dataset.idx), 1);
                renderLineItems();
            });
        });
    }

    /* ===================== STEP 4: PRODUCT ===================== */
    document.getElementById('prod-back')?.addEventListener('click', () => openModal('modal-items'));

    document.getElementById('prod-select')?.addEventListener('change', prefillProdFromSel);

    function prefillProdFromSel() {
        const sel = document.getElementById('prod-select');
        const idx = parseInt(sel?.value);
        const item = pState.lineItems[idx];
        if (!item) return;
        document.getElementById('prod-name').value = item.name;
        document.getElementById('prod-qty').value = item.qty;
        document.getElementById('prod-price').value = item.price.toFixed(2); // unit cost (read-only)
        document.getElementById('prod-unit-price').value = item.sellingPrice ? item.sellingPrice.toFixed(2) : ''; // selling price
        // Match category dropdown — fall back to General if value not in list
        const catSelect = document.getElementById('prod-category');
        const matchingOpt = Array.from(catSelect.options).find(o => o.value === item.category || o.textContent === item.category);
        catSelect.value = matchingOpt ? matchingOpt.value : 'General';
        document.getElementById('prod-description').value = item.description || '';
    }

    document.getElementById('prod-submit')?.addEventListener('click', async () => {
        const name = document.getElementById('prod-name').value.trim();
        const qty = parseInt(document.getElementById('prod-qty').value) || 0;
        const price = parseFloat(document.getElementById('prod-price').value) || 0; // unit cost
        const sellingPrice = parseFloat(document.getElementById('prod-unit-price').value) || 0; // selling price
        const category = document.getElementById('prod-category').value;
        const description = document.getElementById('prod-description').value.trim();

        let valid = true;
        if (!name) { setErr('prod-name', true); valid = false; } else setErr('prod-name', false);
        if (sellingPrice <= 0) {
            document.getElementById('prod-unit-price').style.borderColor = '#ef4444';
            valid = false;
        } else {
            document.getElementById('prod-unit-price').style.borderColor = '';
        }
        if (!valid) return;

        // Update the selected line item with any Step-4 overrides before saving
        const selIdx = parseInt(document.getElementById('prod-select')?.value);
        if (!isNaN(selIdx) && pState.lineItems[selIdx]) {
            pState.lineItems[selIdx].name = name;
            pState.lineItems[selIdx].qty = qty;
            pState.lineItems[selIdx].price = price;
            pState.lineItems[selIdx].sellingPrice = sellingPrice;
            pState.lineItems[selIdx].category = category;
            pState.lineItems[selIdx].description = description;
        }

        // Prepare full data object
        const procurementData = {
            supplier: pState.supplier,
            invoice: pState.invoice,
            lineItems: pState.lineItems
        };

        // Call backend to save
        const result = await window.api.saveProcurement(procurementData);

        if (result.success) {
            // Re-load all products to ensure table is fresh
            await loadProducts();

            // reset state
            pState.supplier = null;
            pState.invoice = null;
            pState.lineItems = [];
            liFormOpen = false;
            closeAll();
            showFeedback(`"${name}" procurement saved to database successfully.`, 'success');
        } else {
            showFeedback(`Error: ${result.error}`, 'error');
        }
    });

    /* ===================== ISSUE PRODUCT FLOW ===================== */
    let issueSelected = null; // { rowIndex, name, qty, price, category }

    function buildIssueProductList(filter = '') {
        const listEl = document.getElementById('issue-product-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        // Pull rows from the inventory table
        let rows = [];
        if (typeof $ !== 'undefined' && dtInstance) {
            dtInstance.rows().every(function (rowIdx) {
                const data = this.data();
                // data[0]=id (number), data[1]=name (HTML), data[2]=category,
                // data[3]=supplier, data[4]=invoice, data[5]=qty badge, data[6]=price
                const id = String(data[0]);
                const name = data[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
                const qtyText = data[5].replace(/<\/?[^>]+(>|$)/g, "").trim();
                const costText = String(data[6]).replace('MK', '').trim();
                const priceText = String(data[7]).replace('MK', '').trim();
                const invoiceNumber = String(data[4] || '').trim();
                rows.push({
                    id,
                    name,
                    category: data[2],
                    qty: qtyText,
                    cost: parseFloat(costText) || 0,
                    price: parseFloat(priceText) || 0,
                    invoiceNumber,
                    idx: rowIdx
                });
            });
        } else {
            document.querySelectorAll('#products-tbody tr').forEach((tr, i) => {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 7) {
                    const id = tds[0].textContent.trim();
                    const name = tds[1].textContent.trim();
                    const costText = tds[6].textContent.replace('MK', '').trim();
                    const priceText = tds[7].textContent.replace('MK', '').trim();
                    const invoiceNumber = tds[4].textContent.trim();
                    rows.push({
                        id,
                        name,
                        category: tds[2].textContent.trim(),
                        qty: tds[5].textContent.trim(),
                        cost: parseFloat(costText) || 0,
                        price: parseFloat(priceText) || 0,
                        invoiceNumber,
                        idx: i
                    });
                }
            });
        }

        const filtered = rows.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()));

        if (filtered.length === 0) {
            listEl.innerHTML = `<div class="issue-empty">${rows.length === 0 ? 'No products in inventory yet.' : 'No matching products.'}</div>`;
            return;
        }

        filtered.forEach(r => {
            const row = document.createElement('label');
            row.className = 'issue-product-row';
            row.innerHTML = `
                <input type="radio" name="issue-product-radio" value="${r.idx}" />
                <span class="ipr-name">${r.name}</span>
                <span class="ipr-meta">${r.category}</span>
                <span class="ipr-meta">Qty: ${r.qty}</span>
                <span class="ipr-meta">${r.price}</span>`;
            row.querySelector('input').addEventListener('change', () => {
                document.querySelectorAll('.issue-product-row').forEach(el => el.classList.remove('selected'));
                row.classList.add('selected');
                issueSelected = r;
            });
            if (issueSelected && issueSelected.idx === r.idx) {
                row.classList.add('selected');
                row.querySelector('input').checked = true;
            }
            listEl.appendChild(row);
        });
    }

    document.getElementById('open-issue-btn')?.addEventListener('click', () => {
        issueSelected = null;
        document.getElementById('issue-search').value = '';
        buildIssueProductList();
        openModal('modal-issue-select');
    });

    document.getElementById('issue-search')?.addEventListener('input', e => {
        buildIssueProductList(e.target.value);
    });

    document.getElementById('issue-select-cancel')?.addEventListener('click', closeAll);

    document.getElementById('issue-select-next')?.addEventListener('click', () => {
        if (!issueSelected) {
            showFeedback('Please select a product to issue.', 'warning');
            return;
        }
        // Pre-fill step 2 tags and defaults
        document.getElementById('issue-detail-tags').innerHTML =
            `<span class="stag stag-n"> ${issueSelected.name}</span>
             <span class="stag stag-i">Qty in stock: ${issueSelected.qty}</span>`;
        document.getElementById('issue-qty').value = '1';
        document.getElementById('issue-qty').max = parseInt(issueSelected.qty) || 9999;
        // Auto-fill invoice / reference from the product's last procurement invoice
        const invField = document.getElementById('issue-invoice-id');
        invField.value = (issueSelected.invoiceNumber && issueSelected.invoiceNumber !== '—')
            ? issueSelected.invoiceNumber
            : '';
        openModal('modal-issue-details');
    });

    document.getElementById('issue-details-back')?.addEventListener('click', () => openModal('modal-issue-select'));

    document.getElementById('issue-details-submit')?.addEventListener('click', async () => {
        const invoiceId = document.getElementById('issue-invoice-id').value.trim();
        const qty = parseInt(document.getElementById('issue-qty').value) || 0;
        const stockQty = parseInt(issueSelected?.qty) || 0;

        if (!invoiceId) { document.getElementById('issue-invoice-id').style.borderColor = '#f59e0b'; return; }
        document.getElementById('issue-invoice-id').style.borderColor = '';
        if (qty < 1) { showFeedback('Quantity must be at least 1.', 'error'); return; }
        if (qty > stockQty) { showFeedback(`Only ${stockQty} units available.`, 'error'); return; }

        // Log the issuance in audit log
        const reason = document.getElementById('issue-reason')?.value || 'Issue';
        window.api.logAction('Issue Product', `Issued ${qty} units of "${issueSelected.name}" (Ref: ${invoiceId}) — Reason: ${reason}`);

        // Persist to database
        const result = await window.api.issueProduct({
            product_id: issueSelected.id,
            quantity: qty,
            transaction_date: new Date().toISOString().split('T')[0],
            transaction_description: `${reason} — Ref: ${invoiceId}`,
            unit_price: issueSelected.price // Using Selling Price
        });

        if (result && result.changes > 0) {
            // Re-load all products to ensure everything is fresh
            await loadProducts();
            closeAll();
            showFeedback(`Issued ${qty}× "${issueSelected.name}" — ${reason}`, 'success');
            issueSelected = null;
        } else {
            showFeedback('Failed to save issue transaction to database.', 'error');
        }
    });

    /* close on backdrop click & ESC */
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', e => { if (e.target === backdrop) closeAll(); });
    });
    document.addEventListener('keydown', function escClose(e) {
        if (e.key === 'Escape') closeAll();
    });
};




// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.api.getCurrentUser();

    // Security check: Redirect to login if no active session
    if (!user) {
        window.location.href = './login.html';
        return;
    }

    setupTheme();
    setupSidebar();
    loadProducts();
    updateGreeting(user);
    setupNavigation();
    setupUserMenu();
});

// --- Activity / Movement Schedule Logic ---
window.initActivityView = async function () {
    const productSelector = document.getElementById('schedule-product-selector');
    if (!productSelector) return;

    try {
        const products = await window.api.getProducts();
        products.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.product_id;
            opt.textContent = p.product_name;
            productSelector.appendChild(opt);
        });

        productSelector.addEventListener('change', (e) => {
            loadMovementSchedule(parseInt(e.target.value));
        });
    } catch (err) {
        console.error('Failed to init Activity view:', err);
    }
};

const loadMovementSchedule = async (productId) => {
    const tableBody = document.getElementById('movement-schedule-tbody');
    const tableCard = document.getElementById('schedule-table-card');
    const placeholder = document.getElementById('schedule-placeholder');
    if (!tableBody) return;

    try {
        const transactions = await window.api.getTransactions();
        // Filter and sort transactions for the selected product
        const pTrans = transactions
            .filter(t => t.product_id === productId)
            .sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

        if (pTrans.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">No transaction history for this product.</td></tr>';
            tableCard.style.display = 'block';
            placeholder.style.display = 'none';
            return;
        }

        // Monthly grouping
        const monthlyData = {};
        let runningBalance = 0;

        pTrans.forEach(t => {
            const date = new Date(t.transaction_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    label: monthLabel,
                    opening: runningBalance,
                    purchases: 0,
                    adjust: 0,
                    sales: 0,
                    totalPurchasesVal: 0,
                    salesValue: 0
                };
            }

            const m = monthlyData[monthKey];
            if (t.transaction_type === 'Procurement') {
                m.purchases += t.quantity;
                m.totalPurchasesVal += (t.quantity * (t.unit_cost || 0));
                runningBalance += t.quantity;
            } else if (t.transaction_type === 'Issue') {
                m.sales += t.quantity;
                m.salesValue += (t.quantity * (t.unit_price || 0));
                runningBalance -= t.quantity;
            }

            m.hand = runningBalance;
        });

        // Convert grouped data to rows
        let html = '';

        // Add the initial Opening Balance row as requested
        const keys = Object.keys(monthlyData).sort();
        if (keys.length > 0) {
            const firstMonth = monthlyData[keys[0]];
            html += `
                <tr style="background: hsla(222, 30%, 50%, 0.05); font-style: italic;">
                    <td><strong>Stock Opening Balance</strong></td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td><span class="badge badge-ok">${firstMonth.opening}</span></td>
                    <td>—</td>
                    <td>—</td>
                </tr>
            `;
        }

        keys.forEach(key => {
            const m = monthlyData[key];
            html += `
                <tr>
                    <td><strong>${m.label}</strong></td>
                    <td>${m.purchases}</td>
                    <td>${m.adjust}</td>
                    <td>${m.sales}</td>
                    <td><span class="badge ${m.hand < 5 ? 'badge-low' : 'badge-ok'}">${m.hand}</span></td>
                    <td>MK${m.totalPurchasesVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>MK${m.salesValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
        tableCard.style.display = 'block';
        placeholder.style.display = 'none';

        // Re-init DataTable if it exists
        if ($.fn.DataTable.isDataTable('#movement-schedule-dt')) {
            $('#movement-schedule-dt').DataTable().destroy();
        }

        $('#movement-schedule-dt').DataTable({
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Export to Excel',
                    className: 'btn-export-excel',
                    title: `Inventory Movement - Product ${productId}`
                }
            ],
            pageLength: 12,
            lengthMenu: [12, 24, 48],
            order: [[0, 'desc']],
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Filter months..."
            }
        });

    } catch (err) {
        console.error('Movement schedule error:', err);
    }
};
