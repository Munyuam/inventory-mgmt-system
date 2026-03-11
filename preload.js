const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    getProducts: () => ipcRenderer.invoke('get-products'),
    addProduct: (product) => ipcRenderer.invoke('add-product', product),
    login: (credentials) => ipcRenderer.invoke('auth-login', credentials),
    signup: (userData) => ipcRenderer.invoke('auth-signup', userData),
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
    logout: () => ipcRenderer.invoke('logout'),
})
