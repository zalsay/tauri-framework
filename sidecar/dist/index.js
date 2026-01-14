"use strict";
/**
 * Sidecar 主入口文件
 *
 * ============================================================================
 * 功能模块说明
 * ============================================================================
 *
 * 1. env_loader           - 环境变量加载（.env 文件路径解析）
 * 2. llm_config           - LLM 配置解析（Provider, Model, API Key）
 * 3. ai_call              - 大模型调用封装（直接调用 OpenAI 兼容 API）
 * 4. hyperagent_handler   - HyperAgent 任务处理（浏览器自动化、OSS上传）
 * 5. ai_workflow_handler  - AI 工作流生成（生成/继续/确认）
 * 6. cache_manager        - 会话缓存管理
 * 7. api_client           - 后端 API 通信
 * 8. page_analyzer        - 页面分析与 prompt 优化
 * 9. utils                - 公共工具函数（log, sleep）
 *
 * ============================================================================
 * 任务类型
 * ============================================================================
 *
 * - default (hyperagent)  : 浏览器自动化任务
 * - ai_workflow           : AI 工作流生成任务
 *
 * ============================================================================
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
const readline = __importStar(require("readline"));
const fs = __importStar(require("fs"));
// 模块导入
require("./env_loader"); // 自动加载环境变量
const llm_config_1 = require("./llm_config");
const hyperagent_handler_1 = require("./hyperagent_handler");
const ai_workflow_handler_1 = require("./ai_workflow_handler");
const utils_1 = require("./utils");
// Fetch polyfill for snapshot fonts (pkg compatibility)
const originalFetch = globalThis.fetch;
if (typeof originalFetch === 'function') {
    globalThis.fetch = (async (input, init) => {
        try {
            if (typeof input === 'string' && input.startsWith('/snapshot/fonts/')) {
                try {
                    const buffer = await fs.promises.readFile(input);
                    const NodeResponse = globalThis.Response;
                    if (NodeResponse) {
                        if (buffer && buffer.length > 0) {
                            return new NodeResponse(buffer);
                        }
                        const fallback = 'info face="" size=16\n';
                        return new NodeResponse(fallback, { status: 200 });
                    }
                }
                catch (e) {
                    const NodeResponse = globalThis.Response;
                    if (NodeResponse) {
                        const fallback = 'info face="" size=16\n';
                        return new NodeResponse(fallback, { status: 200 });
                    }
                }
            }
        }
        catch (e) {
        }
        return originalFetch(input, init);
    });
}
/**
 * 主函数
 * 从 stdin 读取任务指令并处理
 */
async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
    (0, utils_1.log)('Sidecar 已就绪。等待指令...');
    for await (const line of rl) {
        if (line.trim()) {
            try {
                const input = JSON.parse(line);
                await processTask(input);
                break;
            }
            catch (e) {
                (0, utils_1.log)(`指令解析错误: ${e.message}`);
                process.exit(1);
            }
        }
    }
}
/**
 * 任务路由
 * 根据任务类型分发到对应处理器
 */
async function processTask(input) {
    const config = (0, llm_config_1.getLLMConfig)(input);
    (0, utils_1.log)(`收到任务: ${input.taskId}, 类型: ${input.type || 'hyperagent'}`);
    (0, utils_1.log)(`执行配置: Provider=${config.provider}, Model=${config.model}, BaseURL=${config.baseURL || 'default'}, APIKey=${(0, llm_config_1.getMaskedApiKey)(config.apiKey)}`);
    // Route to appropriate handler based on task type
    if (input.type === 'ai_workflow') {
        await (0, ai_workflow_handler_1.handleAIWorkflow)(input, config);
    }
    else {
        await (0, hyperagent_handler_1.handleHyperAgent)(input, config);
    }
}
// 启动
main().catch(err => {
    console.error(JSON.stringify({ type: 'error', message: err.message }));
    process.exit(1);
});
