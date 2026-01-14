"use strict";
/**
 * utils.ts - 公共工具函数
 *
 * 提供 Sidecar 中通用的辅助函数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.sleep = sleep;
/**
 * 输出结构化日志到 stderr
 * @param message 日志消息
 */
function log(message) {
    console.error(JSON.stringify({ type: 'log', message, timestamp: new Date().toISOString() }));
}
/**
 * 异步延时
 * @param ms 毫秒数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
