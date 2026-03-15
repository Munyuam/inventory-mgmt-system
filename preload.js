const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    getProducts: () => ipcRenderer.invoke('get-products'),
    getTransactions: () => ipcRenderer.invoke('get-transactions'),
    addProduct: (product) => ipcRenderer.invoke('add-product', product),
    login: (credentials) => ipcRenderer.invoke('auth-login', credentials),
    adminAddUser: (userData) => ipcRenderer.invoke('admin-add-user', userData),
    getUsers: () => ipcRenderer.invoke('get-users'),
    adminUpdateUser: (userId, data) => ipcRenderer.invoke('admin-update-user', { userId, data }),
    adminDeleteUser: (userId) => ipcRenderer.invoke('admin-delete-user', userId),
    getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
    logout: () => ipcRenderer.invoke('logout'),
    saveProcurement: (data) => ipcRenderer.invoke('save-procurement', data),
    logAction: (action, details) => ipcRenderer.invoke('emit-log', { action, details }),
    issueProduct: (data) => ipcRenderer.invoke('issue-product', data),
    adjustProductStock: (data) => ipcRenderer.invoke('adjust-product-stock', data),
    updateProduct: (data) => ipcRenderer.invoke('update-product', data),
    updateProfile: (data) => ipcRenderer.invoke('update-profile', data),
    changePassword: (data) => ipcRenderer.invoke('change-password', data),
    getAuditLogs: () => ipcRenderer.invoke('get-audit-logs')
})
