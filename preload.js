const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    getProducts: () => ipcRenderer.invoke('get-products'),
    getTransactions: () => ipcRenderer.invoke('get-transactions'),
    addProduct: (product) => ipcRenderer.invoke('add-product', product),
    login: (credentials) => ipcRenderer.invoke('auth-login', credentials),
    signup: (userData) => ipcRenderer.invoke('auth-signup', userData),
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
    logout: () => ipcRenderer.invoke('logout'),
    saveProcurement: (data) => ipcRenderer.invoke('save-procurement', data),
    logAction: (action, details) => ipcRenderer.invoke('emit-log', { action, details }),
    issueProduct: (data) => ipcRenderer.invoke('issue-product', data),
    updateProduct: (data) => ipcRenderer.invoke('update-product', data),
    updateProfile: (data) => ipcRenderer.invoke('update-profile', data),
    changePassword: (data) => ipcRenderer.invoke('change-password', data),
    getAuditLogs: () => ipcRenderer.invoke('get-audit-logs')
})
