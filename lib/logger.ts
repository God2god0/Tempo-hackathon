import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'server-debug.log');

export function logToServer(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message} ${data ? JSON.stringify(data) : ''}\n`;

    try {
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (e) {
        console.error("Failed to write to log file", e);
    }
}
