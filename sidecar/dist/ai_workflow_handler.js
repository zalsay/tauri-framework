"use strict";
/**
 * ai_workflow_handler.ts - AI 工作流处理器
 *
 * 负责处理 AI 工作流生成任务：
 * - 生成 (generate): 根据用户需求生成工作流
 * - 继续 (continue): 根据用户反馈修改工作流
 * - 确认 (confirm): 确认并保存工作流
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
exports.handleAIWorkflow = handleAIWorkflow;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const playwright_1 = require("playwright");
const agent_1 = require("@hyperbrowser/agent");
const zod_1 = require("zod");
const utils_1 = require("./utils");
const CacheManager = __importStar(require("./cache_manager"));
/**
 * 处理 AI 工作流任务
 */
async function handleAIWorkflow(input, config) {
    const projectId = input.projectId || input.taskId;
    const action = input.action || 'generate';
    (0, utils_1.log)(`[AIWorkflow] 开始处理: projectId=${projectId}, action=${action}`);
    let cache;
    // Load or create cache based on action
    if (action === 'generate') {
        // Start fresh for new generation
        cache = CacheManager.createNewCache(projectId, input.taskId);
        // Add system message about the task
        CacheManager.addMessage(cache, 'system', `项目需求: ${input.prompt}`);
        if (input.url) {
            CacheManager.addMessage(cache, 'system', `目标URL: ${input.url}`);
        }
    }
    else {
        // Load existing cache for continue/confirm
        const existingCache = await CacheManager.loadCache(projectId);
        if (!existingCache) {
            console.log(JSON.stringify({
                taskId: input.taskId,
                status: 'failed',
                error: '未找到工作流会话缓存，请先生成工作流'
            }));
            return;
        }
        cache = existingCache;
        // Add user's feedback to conversation
        if (input.userMessage) {
            CacheManager.addMessage(cache, 'user', input.userMessage);
        }
    }
    let context;
    try {
        context = await playwright_1.chromium.launchPersistentContext(path.join(os.homedir(), '.auto-tauri', 'browser-profile'), {
            headless: false,
            channel: 'chrome',
            viewport: { width: 1280, height: 800 }
        });
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        (0, utils_1.log)(`[AIWorkflow] 已锁定主窗口。`);
        const agent = new agent_1.HyperAgent({
            llm: {
                provider: config.provider,
                model: config.model,
                apiKey: config.apiKey,
                baseURL: config.baseURL
            },
            connectorConfig: { driver: "playwright", options: { page, context } }
        });
        // Navigate to URL if provided and this is initial generation
        if (input.url && action === 'generate') {
            (0, utils_1.log)(`[AIWorkflow] 正在导航至: ${input.url}`);
            await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }
        // Build the prompt with conversation context
        let aiPrompt;
        if (action === 'generate') {
            aiPrompt = `你是一个工作流生成助手。分析用户的需求并生成详细的工作流步骤。

用户需求: ${input.prompt}
${input.url ? `目标网页: ${input.url}` : ''}

请分析需求，生成一个完整的工作流方案。包括：
1. 工作流名称
2. 详细步骤列表
3. 每个步骤的具体操作说明

生成后，询问用户是否满意这个工作流，或者需要修改。`;
        }
        else if (action === 'continue') {
            // Build context from conversation history
            const historyContext = CacheManager.getConversationSummary(cache);
            aiPrompt = `你是一个工作流生成助手，正在与用户讨论优化工作流。

${historyContext}

用户最新反馈: ${input.userMessage}

请根据用户的反馈，修改并优化工作流。更新后再次询问用户是否满意。`;
        }
        else if (action === 'confirm') {
            cache.status = 'confirmed';
            await CacheManager.saveCache(projectId, cache);
            console.log(JSON.stringify({
                taskId: input.taskId,
                status: 'success',
                action: 'confirmed',
                data: {
                    output: '工作流已确认并保存',
                    workflowSteps: cache.workflowSteps,
                    generatedPrompt: cache.generatedPrompt
                }
            }));
            return;
        }
        else {
            throw new Error(`未知的action类型: ${action}`);
        }
        (0, utils_1.log)(`[AIWorkflow] 正在执行AI任务...`);
        // Execute with HyperAgent
        const result = await agent.executeTask(aiPrompt, {
            outputSchema: zod_1.z.object({
                workflowName: zod_1.z.string().describe("工作流名称"),
                steps: zod_1.z.array(zod_1.z.object({
                    stepNumber: zod_1.z.number().describe("步骤编号"),
                    action: zod_1.z.string().describe("操作类型"),
                    description: zod_1.z.string().describe("详细描述")
                })).describe("工作流步骤列表"),
                summary: zod_1.z.string().describe("工作流总结说明"),
                question: zod_1.z.string().describe("向用户提出的确认问题")
            }),
            enableVisualMode: false
        }, page);
        (0, utils_1.log)(`[AIWorkflow] AI任务完成`);
        // Update cache with results
        const structuredOutput = result?.output || {};
        if (structuredOutput.steps) {
            const workflowSteps = structuredOutput.steps.map((step) => ({
                idx: step.stepNumber,
                action: step.action,
                description: step.description,
                status: 'pending'
            }));
            CacheManager.updateWorkflowSteps(cache, workflowSteps);
        }
        // Generate the consolidated prompt from workflow steps
        if (structuredOutput.steps && structuredOutput.steps.length > 0) {
            const stepsText = structuredOutput.steps
                .map((s) => `${s.stepNumber}. ${s.action}: ${s.description}`)
                .join('\n');
            cache.generatedPrompt = `${structuredOutput.workflowName || '自动工作流'}\n\n步骤:\n${stepsText}`;
        }
        else {
            // Fallback: use the original prompt or a default
            cache.generatedPrompt = input.prompt || '执行自动化任务';
            (0, utils_1.log)(`[AIWorkflow] 未获取到结构化步骤，使用原始 prompt 作为工作流`);
        }
        // Add AI response to conversation
        const summaryText = structuredOutput.summary || (structuredOutput.workflowName ? `已生成工作流「${structuredOutput.workflowName}」` : '工作流生成完成');
        const questionText = structuredOutput.question || '这个工作流是否满足您的需求？如需修改请告诉我。';
        const aiResponse = `${summaryText}\n\n${questionText}`;
        CacheManager.addMessage(cache, 'assistant', aiResponse);
        // Update cache status
        cache.status = 'pending_confirm';
        // Save cache
        await CacheManager.saveCache(projectId, cache);
        (0, utils_1.log)(`[AIWorkflow] 会话缓存已保存`);
        // Return result
        console.log(JSON.stringify({
            taskId: input.taskId,
            status: 'success',
            action: action,
            data: {
                output: aiResponse,
                workflowName: structuredOutput.workflowName,
                workflowSteps: cache.workflowSteps,
                generatedPrompt: cache.generatedPrompt,
                hasStructuredSteps: !!(structuredOutput.steps && structuredOutput.steps.length > 0),
                conversationHistory: cache.conversationHistory,
                needsConfirmation: true
            },
            stepsCount: result?.steps?.length || 0
        }));
    }
    catch (e) {
        (0, utils_1.log)(`[AIWorkflow] 错误: ${e.message}`);
        // Save error state to cache
        CacheManager.addMessage(cache, 'system', `错误: ${e.message}`);
        await CacheManager.saveCache(projectId, cache);
        console.log(JSON.stringify({
            taskId: input.taskId,
            status: 'failed',
            error: e.message
        }));
    }
    finally {
        if (context) {
            await (0, utils_1.sleep)(2000);
            await context.close();
        }
        (0, utils_1.log)('[AIWorkflow] 执行结束。');
    }
}
