const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    getItems: () => ipcRenderer.invoke('get-items'),
    addItem: (item) => ipcRenderer.invoke('add-item', item),
    login: ({ username, password }) => ipcRenderer.invoke('auth-login', { username, password }),
    signup: ({ username, email, password }) => ipcRenderer.invoke('auth-signup', { username, email, password }),
})
