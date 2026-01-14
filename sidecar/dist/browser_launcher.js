"use strict";
/**
 * browser_launcher.ts - 浏览器启动/CDP连接管理
 *
 * 提供 CDP Stealth 模式的浏览器连接：
 * - 避免 navigator.webdriver = true
 * - 保留用户真实 Cookies、历史记录、插件
 * - 完全真实的浏览器指纹
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_DATA_DIR = exports.CDP_ENDPOINT = exports.CDP_PORT = void 0;
exports.connectCDP = connectCDP;
exports.getOrCreatePage = getOrCreatePage;
exports.ensureBrowser = ensureBrowser;
exports.disconnectBrowser = disconnectBrowser;
exports.killBrowser = killBrowser;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const playwright_1 = require("playwright");
const utils_1 = require("./utils");
const CDP_PORT = 9222;
exports.CDP_PORT = CDP_PORT;
const CDP_ENDPOINT = `http://127.0.0.1:${CDP_PORT}`;
exports.CDP_ENDPOINT = CDP_ENDPOINT;
// Chrome 可执行文件路径 (macOS)
const CHROME_PATHS = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    path.join(os.homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
];
// 用户数据目录
const USER_DATA_DIR = path.join(os.homedir(), '.auto-tauri', 'browser-profile');
exports.USER_DATA_DIR = USER_DATA_DIR;
let chromeProcess = null;
/**
 * 获取 Chrome 可执行文件路径
 */
function getChromePath() {
    for (const chromePath of CHROME_PATHS) {
        if (fs.existsSync(chromePath)) {
            return chromePath;
        }
    }
    return null;
}
/**
 * 检查 CDP 端口是否可用
 */
async function isCDPAvailable() {
    try {
        const response = await fetch(`${CDP_ENDPOINT}/json/version`);
        return response.ok;
    }
    catch {
        return false;
    }
}
/**
 * 启动 Chrome 进程 (带 CDP 端口)
 */
async function launchChrome() {
    const chromePath = getChromePath();
    if (!chromePath) {
        throw new Error('Chrome 未找到，请安装 Google Chrome');
    }
    // 确保用户数据目录存在
    if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }
    (0, utils_1.log)(`[BrowserLauncher] 正在启动 Chrome (CDP 模式)...`);
    (0, utils_1.log)(`[BrowserLauncher] Chrome 路径: ${chromePath}`);
    (0, utils_1.log)(`[BrowserLauncher] 用户数据目录: ${USER_DATA_DIR}`);
    chromeProcess = (0, child_process_1.spawn)(chromePath, [
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${USER_DATA_DIR}`,
        '--no-first-run',
        '--no-default-browser-check',
    ], {
        detached: true,
        stdio: 'ignore'
    });
    chromeProcess.unref();
    // 等待 CDP 端口就绪
    (0, utils_1.log)(`[BrowserLauncher] 等待 CDP 端口就绪...`);
    let retries = 0;
    const maxRetries = 20;
    while (retries < maxRetries) {
        if (await isCDPAvailable()) {
            (0, utils_1.log)(`[BrowserLauncher] CDP 端口已就绪`);
            return;
        }
        await (0, utils_1.sleep)(500);
        retries++;
    }
    throw new Error('Chrome 启动超时');
}
/**
 * 通过 CDP 连接到浏览器
 */
async function connectCDP() {
    // 检查是否已有浏览器运行
    if (await isCDPAvailable()) {
        (0, utils_1.log)(`[BrowserLauncher] 检测到已运行的 Chrome，正在连接...`);
    }
    else {
        // 启动新浏览器
        await launchChrome();
    }
    // 连接到浏览器
    const browser = await playwright_1.chromium.connectOverCDP(CDP_ENDPOINT);
    (0, utils_1.log)(`[BrowserLauncher] 已通过 CDP 连接到浏览器`);
    return browser;
}
/**
 * 获取或创建页面
 */
async function getOrCreatePage(browser) {
    const contexts = browser.contexts();
    if (contexts.length > 0) {
        const context = contexts[0];
        const pages = context.pages();
        if (pages.length > 0) {
            (0, utils_1.log)(`[BrowserLauncher] 使用现有页面`);
            return { context, page: pages[0] };
        }
        (0, utils_1.log)(`[BrowserLauncher] 在现有上下文中创建新页面`);
        const page = await context.newPage();
        return { context, page };
    }
    // 如果没有上下文，创建一个新的
    (0, utils_1.log)(`[BrowserLauncher] 创建新的浏览器上下文和页面`);
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    return { context, page };
}
/**
 * 确保浏览器连接并返回页面
 * 这是主要的入口函数
 */
async function ensureBrowser() {
    const browser = await connectCDP();
    const { context, page } = await getOrCreatePage(browser);
    return { browser, context, page };
}
/**
 * 关闭浏览器连接 (不关闭浏览器进程)
 */
async function disconnectBrowser(browser) {
    try {
        // 断开连接而不关闭浏览器
        await browser.close();
        (0, utils_1.log)(`[BrowserLauncher] 已断开浏览器连接`);
    }
    catch (e) {
        (0, utils_1.log)(`[BrowserLauncher] 断开连接时出错: ${e.message}`);
    }
}
/**
 * 强制关闭浏览器进程
 */
function killBrowser() {
    if (chromeProcess) {
        chromeProcess.kill();
        chromeProcess = null;
        (0, utils_1.log)(`[BrowserLauncher] 已终止 Chrome 进程`);
    }
}
