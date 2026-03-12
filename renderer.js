const loadProducts = async () => {
    const products = await window.api.getProducts();

    // --- Update Dashboard Stats (if on dashboard) ---
    const listElement = document.getElementById('inventoryList');
    if (listElement) listElement.innerHTML = '';

    let totalQuantity = 0;
    let lowStockCount = 0;
    let totalValue = 0;
    const categories = {};

    products.forEach(item => {
        totalQuantity += item.quantity;
        totalValue += (item.unit_price * item.quantity);
        if (item.quantity < 10) lowStockCount++;

        const cat = item.product_category || 'General';
        categories[cat] = (categories[cat] || 0) + item.quantity;

        if (listElement) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${item.product_id}</td>
                <td>${item.product_name}</td>
                <td style="color: var(--text-muted); font-size: 0.8rem;">${cat}</td>
                <td><span class="badge ${item.quantity < 10 ? 'badge-low' : 'badge-ok'}">${item.quantity}</span></td>
                <td>MK${item.unit_price.toFixed(2)}</td>
            `;
            listElement.appendChild(row);
        }
    });

    if (document.getElementById('stat-total')) document.getElementById('stat-total').textContent = products.length;
    if (document.getElementById('stat-low')) document.getElementById('stat-low').textContent = lowStockCount;
    if (document.getElementById('stat-value')) document.getElementById('stat-value').textContent = `MK${totalValue.toFixed(2)}`;

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
                productsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">No products found.</td></tr>';
                return;
            }
            products.forEach((p, i) => {
                const qtyBadge = `<span class="badge ${p.quantity < 10 ? 'badge-low' : 'badge-ok'}">${p.quantity}</span>`;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${p.product_id}</td>
                    <td><strong>${p.product_name}</strong></td>
                    <td>${p.product_category || 'General'}</td>
                    <td>${p.supplier_name || '—'}</td>
                    <td>${p.invoice_number || '—'}</td>
                    <td>${qtyBadge}</td>
                    <td>MK${parseFloat(p.unit_price).toFixed(2)}</td>`;
                productsTbody.appendChild(row);
            });
        }
    }
};

const updateCharts = (categoryData, mostIssuedProducts) => {
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
        if (typeof $ !== 'undefined' && dtInstance) {
            dtInstance.clear();
            products.forEach((p, i) => {
                const qtyBadge = `<span class="badge ${p.quantity < 10 ? 'badge-low' : 'badge-ok'}">${p.quantity}</span>`;
                dtInstance.row.add([
                    p.product_id,
                    `<strong>${p.product_name}</strong>`,
                    p.product_category || 'General',
                    p.supplier_name || '—',
                    p.invoice_number || '—',
                    qtyBadge,
                    `MK${parseFloat(p.unit_price).toFixed(2)}`
                ]);
            });
            dtInstance.draw();
        }
    };

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
            document.getElementById('li-price').value = '0.00';
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
        document.getElementById('prod-price').value = item.price.toFixed(2);
        // Match category dropdown — fall back to General if value not in list
        const catSelect = document.getElementById('prod-category');
        const matchingOpt = Array.from(catSelect.options).find(o => o.value === item.category || o.textContent === item.category);
        catSelect.value = matchingOpt ? matchingOpt.value : 'General';
        document.getElementById('prod-description').value = item.description || '';
    }

    document.getElementById('prod-submit')?.addEventListener('click', async () => {
        const name = document.getElementById('prod-name').value.trim();
        const qty = parseInt(document.getElementById('prod-qty').value) || 0;
        const price = parseFloat(document.getElementById('prod-price').value) || 0;
        const category = document.getElementById('prod-category').value;
        const description = document.getElementById('prod-description').value.trim();
        if (!name) { setErr('prod-name', true); return; }
        setErr('prod-name', false);

        // Update the selected line item with any Step-4 overrides before saving
        const selIdx = parseInt(document.getElementById('prod-select')?.value);
        if (!isNaN(selIdx) && pState.lineItems[selIdx]) {
            pState.lineItems[selIdx].name = name;
            pState.lineItems[selIdx].qty = qty;
            pState.lineItems[selIdx].price = price;
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
                // data[0] is #ID, data[1] is Name, data[5] is Qty badge, data[6] is MKPrice
                const id = data[0].replace('#', '');
                const name = data[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
                const qtyText = data[5].replace(/<\/?[^>]+(>|$)/g, "").trim();
                const priceText = data[6].replace('MK', '').trim();
                rows.push({ id, name, category: data[2], qty: qtyText, price: parseFloat(priceText) || 0, idx: rowIdx });
            });
        } else {
            document.querySelectorAll('#products-tbody tr').forEach((tr, i) => {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 7) {
                    const id = tds[0].textContent.replace('#', '').trim();
                    const name = tds[1].textContent.trim();
                    const priceText = tds[6].textContent.replace('MK', '').trim();
                    rows.push({
                        id,
                        name,
                        category: tds[2].textContent.trim(),
                        qty: tds[5].textContent.trim(),
                        price: parseFloat(priceText) || 0,
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
        document.getElementById('issue-invoice-id').value = '';
        document.getElementById('issue-recipient').value = '';
        document.getElementById('issue-notes').value = '';
        openModal('modal-issue-details');
    });

    document.getElementById('issue-details-back')?.addEventListener('click', () => openModal('modal-issue-select'));

    document.getElementById('issue-details-submit')?.addEventListener('click', () => {
        const invoiceId = document.getElementById('issue-invoice-id').value.trim();
        const qty = parseInt(document.getElementById('issue-qty').value) || 0;
        const stockQty = parseInt(issueSelected?.qty) || 0;

        if (!invoiceId) { document.getElementById('issue-invoice-id').style.borderColor = '#f59e0b'; return; }
        document.getElementById('issue-invoice-id').style.borderColor = '';
        if (qty < 1) { showFeedback('Quantity must be at least 1.', 'error'); return; }
        if (qty > stockQty) { showFeedback(`Only ${stockQty} units available.`, 'error'); return; }

        // Update badge in DataTable / table row
        const newQty = stockQty - qty;
        if (typeof $ !== 'undefined' && dtInstance) {
            const rowData = dtInstance.row(issueSelected.idx).data();
            rowData[5] = `<span class="badge ${newQty < 10 ? 'badge-low' : 'badge-ok'}">${newQty}</span>`;
            dtInstance.row(issueSelected.idx).data(rowData).draw(false);
        }

        // Log the issuance in audit log
        window.api.logAction('Issue Product', `Issued ${qty} units of "${issueSelected.name}" (Ref: ${invoiceId})`);

        // Persist to database
        window.api.issueProduct({
            product_id: issueSelected.id,
            quantity: qty,
            transaction_date: new Date().toISOString().split('T')[0],
            transaction_description: `Issued to: ${document.getElementById('issue-recipient').value || 'Unknown'} - Ref: ${invoiceId}`,
            unit_price: issueSelected.price
        });

        closeAll();
        showFeedback(`Issued ${qty}× "${issueSelected.name}" — Ref: ${invoiceId}`, 'success');
        issueSelected = null;
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
