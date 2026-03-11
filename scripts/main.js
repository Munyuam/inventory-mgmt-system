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
        }
        return result;
    });

    ipcMain.handle('auth-login', async (event, { username, password }) => {
        const result = await db.authenticateUser(userDataPath, username, password);
        if (result.success) {
            currentUser = result.user;
            logAction(username, 'Login', `${username} logged in successfully`);
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
        const result = db.addProduct(userDataPath, item.name, item.quantity, item.price, item.category);
        if (result && result.changes > 0) {
            logAction(username, 'Add Product', `${username} added product: ${item.name} (Qty: ${item.quantity}, Price: ${item.price}, Category: ${item.category})`);
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
