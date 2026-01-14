"use strict";
/**
 * env_loader.ts - 环境变量加载
 *
 * 负责从多个可能的路径加载 .env 文件
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = loadEnv;
exports.getOpenRouterApiKey = getOpenRouterApiKey;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
// 可能的 .env 文件路径列表
const envPaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../resources/.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../../../.env'),
];
let envLoaded = false;
/**
 * 加载环境变量
 * 尝试从多个路径加载 .env 文件
 * @returns 是否成功加载
 */
function loadEnv() {
    if (envLoaded)
        return true;
    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            dotenv_1.default.config({ path: envPath });
            if (process.env.OSS_ACCESS_KEY_ID) {
                console.error(`[dotenv] Successfully loaded from: ${envPath}`);
                console.error(`[dotenv] OSS_ACCESS_KEY_ID: ${process.env.OSS_ACCESS_KEY_ID.substring(0, 4)}...`);
            }
            envLoaded = true;
            return true;
        }
    }
    console.error("[dotenv] No .env file found in any of these paths:");
    console.error(envPaths);
    return false;
}
/**
 * 获取 OpenRouter API Key
 */
function getOpenRouterApiKey() {
    return process.env.OPENROUTER_API_KEY || '';
}
// 自动加载
loadEnv();
