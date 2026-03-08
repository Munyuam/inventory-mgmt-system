const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    getItems: () => ipcRenderer.invoke('get-items'),
    addItem: (item) => ipcRenderer.invoke('add-item', item)
})
