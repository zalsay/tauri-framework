"use strict";
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
exports.saveCache = saveCache;
exports.loadCache = loadCache;
exports.clearCache = clearCache;
exports.createNewCache = createNewCache;
exports.addMessage = addMessage;
exports.updateWorkflowSteps = updateWorkflowSteps;
exports.getConversationSummary = getConversationSummary;
exports.canContinue = canContinue;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * HyperAgent Cache Manager
 *
 * Manages session state persistence for AI workflow generation.
 * Stores conversation history, workflow steps, and browser state.
 */
const CACHE_BASE_DIR = path.join(os.homedir(), '.auto-tauri', 'hyperagent-cache');
/**
 * Ensures the cache directory exists for a given project
 */
function ensureCacheDir(projectId) {
    const cacheDir = path.join(CACHE_BASE_DIR, projectId);
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }
    return cacheDir;
}
/**
 * Gets the cache file path for a project
 */
function getCachePath(projectId) {
    return path.join(ensureCacheDir(projectId), 'session.json');
}
/**
 * Saves session cache to disk
 */
async function saveCache(projectId, cache) {
    const cachePath = getCachePath(projectId);
    cache.updatedAt = new Date().toISOString();
    await fs.promises.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
    console.error(JSON.stringify({
        type: 'log',
        message: `[CacheManager] Cache saved for project ${projectId}`,
        timestamp: new Date().toISOString()
    }));
}
/**
 * Loads session cache from disk
 */
async function loadCache(projectId) {
    const cachePath = getCachePath(projectId);
    if (!fs.existsSync(cachePath)) {
        console.error(JSON.stringify({
            type: 'log',
            message: `[CacheManager] No cache found for project ${projectId}`,
            timestamp: new Date().toISOString()
        }));
        return null;
    }
    try {
        const data = await fs.promises.readFile(cachePath, 'utf-8');
        const cache = JSON.parse(data);
        console.error(JSON.stringify({
            type: 'log',
            message: `[CacheManager] Cache loaded for project ${projectId}, status: ${cache.status}`,
            timestamp: new Date().toISOString()
        }));
        return cache;
    }
    catch (e) {
        console.error(JSON.stringify({
            type: 'log',
            message: `[CacheManager] Failed to load cache: ${e.message}`,
            timestamp: new Date().toISOString()
        }));
        return null;
    }
}
/**
 * Clears session cache for a project
 */
async function clearCache(projectId) {
    const cachePath = getCachePath(projectId);
    if (fs.existsSync(cachePath)) {
        await fs.promises.unlink(cachePath);
        console.error(JSON.stringify({
            type: 'log',
            message: `[CacheManager] Cache cleared for project ${projectId}`,
            timestamp: new Date().toISOString()
        }));
    }
}
/**
 * Creates a new session cache
 */
function createNewCache(projectId, taskId) {
    const now = new Date().toISOString();
    return {
        projectId,
        taskId,
        createdAt: now,
        updatedAt: now,
        status: 'generating',
        conversationHistory: [],
        workflowSteps: []
    };
}
/**
 * Adds a message to the conversation history
 */
function addMessage(cache, role, content) {
    cache.conversationHistory.push({
        role,
        content,
        timestamp: new Date().toISOString()
    });
    return cache;
}
/**
 * Updates workflow steps in the cache
 */
function updateWorkflowSteps(cache, steps) {
    cache.workflowSteps = steps;
    return cache;
}
/**
 * Gets a summary of the conversation for context
 */
function getConversationSummary(cache) {
    if (cache.conversationHistory.length === 0) {
        return '';
    }
    return cache.conversationHistory
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
}
/**
 * Checks if cache exists and is valid for continuation
 */
async function canContinue(projectId) {
    const cache = await loadCache(projectId);
    if (!cache)
        return false;
    // Can continue if status is generating or pending confirmation
    return cache.status === 'generating' || cache.status === 'pending_confirm';
}
