"use strict";
/**
 * llm_config.ts - LLM 配置解析
 *
 * 负责解析和标准化 LLM 配置参数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLLMConfig = getLLMConfig;
exports.getMaskedApiKey = getMaskedApiKey;
const env_loader_1 = require("./env_loader");
/**
 * 解析 LLM 配置
 * @param input 任务输入对象
 * @returns 标准化的 LLM 配置
 */
function getLLMConfig(input) {
    const llm = input.llm || {};
    const OPENROUTER_API_KEY = (0, env_loader_1.getOpenRouterApiKey)();
    let provider = llm.provider || input.llmProvider || 'openai';
    let apiKey = llm.apiKey || input.llmApiKey || OPENROUTER_API_KEY;
    let model = llm.model || input.llmModel || 'google/gemini-2.0-flash-exp:free';
    let baseURL = llm.baseURL || undefined;
    // TaskMaster 使用 OpenAI 兼容接口
    if (provider === 'TaskMaster') {
        provider = 'openai';
    }
    // 自动设置 OpenRouter baseURL
    if (!baseURL && (apiKey === OPENROUTER_API_KEY || (apiKey && model.includes('gemini')))) {
        baseURL = 'https://openrouter.ai/api/v1';
    }
    // OpenRouter 使用 OpenAI 兼容接口
    if (baseURL && baseURL.includes('openrouter.ai')) {
        provider = 'openai';
    }
    return { provider, model, apiKey, baseURL };
}
/**
 * 获取屏蔽后的 API Key (用于日志)
 */
function getMaskedApiKey(apiKey) {
    if (!apiKey)
        return 'none';
    if (apiKey.length > 8) {
        return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    }
    return '****';
}
