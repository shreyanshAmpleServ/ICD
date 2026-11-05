"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTerminalTimestamp = formatTerminalTimestamp;
function formatTerminalTimestamp(date = new Date()) {
    return date.toISOString();
}
