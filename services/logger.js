const fs = require('fs');
const path = require('path');

const logDir = path.join(process.cwd(), '.syslog');
const logFile = path.join(logDir, 'audit.log');

/**
 * Ensures the log directory exists.
 */
function ensureLogDir() {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
}

/**
 * Logs an action to the audit log.
 * @param {string} user - The username or 'Guest'
 * @param {string} action - The action performed
 * @param {string} details - Additional details about the action
 */
function logAction(user, action, details = '') {
    ensureLogDir();
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const logMessage = `[${timestamp}] [User: ${user || 'Guest'}] Action: ${action}${details ? ` - ${details}` : ''}\n`;

    fs.appendFileSync(logFile, logMessage, 'utf8');
}
/**
 * Reads the most recent audit logs.
 * @param {number} limit - Maximum number of lines to return.
 * @returns {Array<string>} - Array of log lines (newest first).
 */
function getAuditLogs(limit = 200) {
    ensureLogDir();
    if (!fs.existsSync(logFile)) return [];

    try {
        const fileContent = fs.readFileSync(logFile, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        // Return latest lines first
        return lines.reverse().slice(0, limit);
    } catch (err) {
        console.error('Failed to read audit log:', err);
        return [];
    }
}

module.exports = {
    logAction,
    getAuditLogs
};
