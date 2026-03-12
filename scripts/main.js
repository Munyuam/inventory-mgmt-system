const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const db = require('../database.js')
const { logAction } = require('../services/logger.js')

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, '../preload.js')
        }
    })

    win.loadFile(path.join(__dirname, '../screens/login.html'))
}

let currentUser = null;

app.whenReady().then(() => {
    const userDataPath = app.getPath('userData');

    // Initialize DB early so it is ready
    db.initDb(userDataPath);
    logAction('System', 'System started', 'Application initialized and database connected.');

    ipcMain.handle('get-products', () => {
        return db.getProducts(userDataPath);
    });

    ipcMain.handle('auth-signup', async (event, { username, email, password }) => {
        const result = await db.registerUser(userDataPath, username, email, password);
        if (result.success) {
            currentUser = { username, email };
            logAction(username, 'Account Created', `${username} registered with email: ${email}`);
        } else {
            logAction('Guest', 'Account Creation Failed', `Attempted username: ${username}, Error: ${result.error}`);
        }
        return result;
    });

    ipcMain.handle('auth-login', async (event, { username, password }) => {
        const result = await db.authenticateUser(userDataPath, username, password);
        if (result.success) {
            currentUser = result.user;
            logAction(username, 'Login', `${username} logged in successfully`);
        } else {
            logAction(username || 'Guest', 'Login Failed', `Failed login attempt for user: ${username || 'Unknown'}. Reason: ${result.error}`);
        }
        return result;
    });

    ipcMain.handle('get-current-user', () => {
        return currentUser;
    });

    ipcMain.handle('logout', (event) => {
        const username = currentUser ? currentUser.username : 'Unknown';
        logAction(username, 'Logout', `${username} logged out`);
        currentUser = null;
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            windows[0].loadFile(path.join(__dirname, '../screens/login.html'));
        }
    });

    ipcMain.handle('add-product', (event, item) => {
        const username = currentUser ? currentUser.username : 'Guest';
        // Map old schema parameters to new logic if needed, 
        // but transitioning to saveFullProcurement is preferred.
        const result = db.addProduct(userDataPath, item.name, item.quantity, item.price, item.category);
        if (result && result.changes > 0) {
            logAction(username, 'Add Product', `${username} added product: ${item.name} (Qty: ${item.quantity}, Price: MK${item.price}, Category: ${item.category})`);
        }
        return result;
    });

    ipcMain.handle('save-procurement', async (event, data) => {
        const username = currentUser ? currentUser.username : 'Guest';
        const userId = currentUser ? currentUser.id : 1;

        // Inject user_id into data for the database layer
        const enrichedData = { ...data, user_id: userId };

        const result = await db.saveFullProcurement(userDataPath, enrichedData);
        if (result.success) {
            logAction(username, 'Procurement Saved', `${username} processed invoice ${data.invoice.number} from ${data.supplier.name} with ${data.lineItems.length} items.`);
        } else {
            logAction(username, 'Procurement Error', `Failed to save invoice ${data.invoice.number}. Error: ${result.error}`);
        }
        return result;
    });

    ipcMain.handle('emit-log', (event, { action, details }) => {
        const username = currentUser ? currentUser.username : 'Guest';
        logAction(username, action, details);
    });

    ipcMain.handle('issue-product', async (event, data) => {
        return db.issueProduct(userDataPath, data);
    });

    ipcMain.handle('update-product', async (event, data) => {
        const username = currentUser ? currentUser.username : 'Guest';
        const result = db.updateProduct(userDataPath, data);
        if (result.success) {
            logAction(username, 'Update Product', `${username} updated product: ${data.product_name} (ID: ${data.product_id})`);
        }
        return result;
    });

    ipcMain.handle('update-profile', async (event, data) => {
        if (!currentUser) return { success: false, error: 'Not logged in.' };
        const result = await db.updateUserProfile(userDataPath, currentUser.id, data.username, data.email);
        if (result.success) {
            // Update the in-memory user
            currentUser.username = data.username;
            currentUser.email = data.email;
            logAction(currentUser.username, 'Update Profile', `${currentUser.username} updated their profile details.`);
        }
        return result;
    });

    ipcMain.handle('change-password', async (event, data) => {
        if (!currentUser) return { success: false, error: 'Not logged in.' };
        const result = await db.changeUserPassword(userDataPath, currentUser.id, data.currentPassword, data.newPassword);
        if (result.success) {
            logAction(currentUser.username, 'Change Password', `${currentUser.username} changed their password.`);
        }
        return result;
    });

    createWindow()

    // Open a window if none are open (macOS specific)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
