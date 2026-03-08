const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const db = require('./database.js')

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.loadFile('index.html')
}

app.whenReady().then(() => {
    ipcMain.handle('get-items', () => {
        return db.getItems();
    });

    ipcMain.handle('add-item', (event, item) => {
        return db.addItem(item.name, item.quantity, item.price);
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
