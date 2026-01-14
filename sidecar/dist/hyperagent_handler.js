"use strict";
/**
 * hyperagent_handler.ts - HyperAgent 任务处理器
 *
 * 负责处理浏览器自动化任务：
 * - 启动持久化浏览器上下文
 * - 执行 HyperAgent 任务
 * - 处理图片提取和 OSS 上传
 * - 保存结果到素材中心
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
exports.handleHyperAgent = handleHyperAgent;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const playwright_1 = require("playwright");
const agent_1 = require("@hyperbrowser/agent");
const zod_1 = require("zod");
const ali_oss_1 = __importDefault(require("ali-oss"));
const utils_1 = require("./utils");
const page_analyzer_1 = require("./page_analyzer");
const APIClient = __importStar(require("./api_client"));
/**
 * 处理 HyperAgent 任务
 */
async function handleHyperAgent(input, config) {
    (0, utils_1.log)(`[HyperAgent] 正在初始化持久化环境...`);
    let context;
    try {
        context = await playwright_1.chromium.launchPersistentContext(path.join(os.homedir(), '.auto-tauri', 'browser-profile'), {
            headless: false,
            channel: 'chrome',
            viewport: { width: 1280, height: 800 }
        });
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        (0, utils_1.log)(`[HyperAgent] 已锁定主窗口。`);
        const agent = new agent_1.HyperAgent({
            llm: {
                provider: config.provider,
                model: config.model,
                apiKey: config.apiKey,
                baseURL: config.baseURL
            },
            connectorConfig: { driver: "playwright", options: { page, context } }
        });
        if (input.url) {
            (0, utils_1.log)(`[HyperAgent] 正在主窗口导航至: ${input.url}`);
            await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }
        let finalPrompt = input.prompt;
        let pageAnalysis = null;
        if (input.autoOptimizePrompt && input.prompt) {
            (0, utils_1.log)(`[PageAnalyzer] 正在分析页面结构并优化 prompt...`);
            try {
                const analysis = await (0, page_analyzer_1.analyzeAndOptimize)(page, input.prompt);
                pageAnalysis = analysis;
                (0, utils_1.log)(`[PageAnalyzer] 优化结果:`);
                (0, utils_1.log)(`  - Strategy: ${analysis.strategy}`);
                (0, utils_1.log)(`  - 识别元素数: ${analysis.elements.length}`);
                (0, utils_1.log)(`  - 原 prompt: ${input.prompt}`);
                (0, utils_1.log)(`  - 优化后 prompt: ${analysis.optimizedPrompt}`);
                finalPrompt = analysis.optimizedPrompt;
            }
            catch (e) {
                (0, utils_1.log)(`[PageAnalyzer] 分析失败，使用原始 prompt: ${e.message}`);
            }
        }
        (0, utils_1.log)(`[HyperAgent] 正在执行任务: ${finalPrompt}`);
        const materialNameFallback = `Result: ${input.taskId} - ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
        const ossConfig = input.oss || {};
        let ossClient = null;
        const uploadedImageUrls = [];
        const ensureOssClient = async () => {
            if (ossClient)
                return ossClient;
            const client = new ali_oss_1.default({
                region: ossConfig.region || process.env.OSS_REGION,
                accessKeyId: ossConfig.accessKeyId || process.env.OSS_ACCESS_KEY_ID,
                accessKeySecret: ossConfig.accessKeySecret || process.env.OSS_ACCESS_KEY_SECRET,
                bucket: ossConfig.bucket || process.env.OSS_BUCKET,
            });
            ossClient = client;
            return client;
        };
        // Helper function to download image and upload to OSS
        const downloadAndUploadImage = async (imageUrl, index) => {
            try {
                (0, utils_1.log)(`[HyperAgent] 正在下载图片: ${imageUrl}`);
                const response = await fetch(imageUrl);
                if (!response.ok) {
                    (0, utils_1.log)(`[HyperAgent] 图片下载失败: ${response.status}`);
                    return null;
                }
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                // Determine file extension from URL or content-type
                const contentType = response.headers.get('content-type') || '';
                let ext = 'png';
                if (contentType.includes('jpeg') || contentType.includes('jpg'))
                    ext = 'jpg';
                else if (contentType.includes('gif'))
                    ext = 'gif';
                else if (contentType.includes('webp'))
                    ext = 'webp';
                else if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg'))
                    ext = 'jpg';
                else if (imageUrl.includes('.gif'))
                    ext = 'gif';
                else if (imageUrl.includes('.webp'))
                    ext = 'webp';
                const client = await ensureOssClient();
                const objectName = `images/${input.taskId}/image-${index}-${Date.now()}.${ext}`;
                const uploadResult = await client.put(objectName, buffer);
                (0, utils_1.log)(`[HyperAgent] 图片已上传至: ${uploadResult.url}`);
                return uploadResult.url;
            }
            catch (e) {
                (0, utils_1.log)(`[HyperAgent] 图片下载上传失败: ${e.message}`);
                return null;
            }
        };
        const result = await agent.executeTask(input.prompt, {
            outputSchema: zod_1.z.object({
                name: zod_1.z.string().describe("素材标题，适合作为素材中心名称字段"),
                content: zod_1.z.string().describe("素材正文内容，用于素材中心内容字段"),
                imageUrls: zod_1.z.array(zod_1.z.string()).optional().describe("从页面提取的图片URL列表，如果任务涉及获取图片请填写")
            }),
            enableVisualMode: false,
        }, page);
        (0, utils_1.log)(`[HyperAgent] 任务完成。result: ${JSON.stringify(result)}`);
        const structuredOutput = result?.output || {};
        const materialName = structuredOutput.name || materialNameFallback;
        const materialContent = structuredOutput.content || JSON.stringify(structuredOutput || result || '');
        // Process extracted image URLs - download and re-upload to OSS
        if (structuredOutput.imageUrls && Array.isArray(structuredOutput.imageUrls) && structuredOutput.imageUrls.length > 0) {
            (0, utils_1.log)(`[HyperAgent] 检测到 ${structuredOutput.imageUrls.length} 张图片，正在处理...`);
            for (let i = 0; i < structuredOutput.imageUrls.length; i++) {
                const originalUrl = structuredOutput.imageUrls[i];
                const uploadedUrl = await downloadAndUploadImage(originalUrl, i);
                if (uploadedUrl) {
                    uploadedImageUrls.push(uploadedUrl);
                }
            }
            (0, utils_1.log)(`[HyperAgent] 图片处理完成，成功上传 ${uploadedImageUrls.length} 张`);
        }
        const stepsCount = result?.steps?.length || 0;
        let imageUrlsForMaterial;
        if (uploadedImageUrls.length > 0) {
            imageUrlsForMaterial = JSON.stringify(uploadedImageUrls);
        }
        const dataPayload = {
            ...result,
            output: materialContent,
            name: materialName,
            content: materialContent,
            structuredOutput,
            extractedImageUrls: uploadedImageUrls.length > 0 ? uploadedImageUrls : undefined,
            promptOptimization: pageAnalysis ? {
                originalPrompt: input.prompt,
                optimizedPrompt: finalPrompt,
                strategy: pageAnalysis.strategy,
                elementsCount: pageAnalysis.elements.length,
            } : undefined,
        };
        if (imageUrlsForMaterial) {
            dataPayload.imageUrl = imageUrlsForMaterial;
        }
        console.log(JSON.stringify({
            taskId: input.taskId,
            status: 'success',
            data: dataPayload,
            stepsCount: stepsCount
        }));
        // Save to material center if auth token is provided
        if (input.authToken) {
            (0, utils_1.log)(`[HyperAgent] 正在保存素材到素材中心...`);
            const savedMaterial = await APIClient.saveTaskResultAsMaterial(input.taskId, materialContent, input.projectId, materialName, imageUrlsForMaterial, {
                serverUrl: input.serverUrl || 'http://localhost:8080',
                authToken: input.authToken
            });
            if (savedMaterial) {
                (0, utils_1.log)(`[HyperAgent] 素材已保存: ${savedMaterial.id}`);
            }
        }
    }
    catch (e) {
        (0, utils_1.log)(`[HyperAgent] 错误: ${e.message}`);
        console.log(JSON.stringify({
            taskId: input.taskId,
            status: 'failed',
            error: e.message
        }));
    }
    finally {
        if (context) {
            await (0, utils_1.sleep)(3000);
            await context.close();
        }
        (0, utils_1.log)('Sidecar 执行结束。');
    }
}
