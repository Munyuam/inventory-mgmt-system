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

module.exports = {
    logAction
};
