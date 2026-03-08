const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const db = require('./database.js')

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.loadFile('login.html')
}

app.whenReady().then(() => {
    const userDataPath = app.getPath('userData');

    // Initialize DB early so it is ready
    db.initDb(userDataPath);

    ipcMain.handle('get-items', () => {
        return db.getItems(userDataPath);
    });

    ipcMain.handle('add-item', (event, item) => {
        return db.addItem(userDataPath, item.name, item.quantity, item.price);
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
