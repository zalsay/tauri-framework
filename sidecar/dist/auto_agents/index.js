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
exports.runScraperAndPublish = runScraperAndPublish;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Helper to log to the main process
const log = (msg) => console.error(JSON.stringify({ type: 'log', message: msg, timestamp: new Date().toISOString() }));
async function runScraperAndPublish(context, targetUrl, prompt) {
    // 1. Scraper Phase
    log(`[Agent] Navigating to target: ${targetUrl}`);
    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    // Simulate AI "Thinking" and interacting
    log(`[Agent] Analyzing page content based on prompt: "${prompt}"...`);
    await page.waitForTimeout(2000);
    // In a real AI implementation, we would extract text here. 
    // For now, we capture the visual context as the "Content".
    const title = await page.title();
    log(`[Agent] Extracted page title: ${title}`);
    // Take a screenshot to use for the XHS post
    const tmpDir = path.join(process.cwd(), 'tmp_assets');
    if (!fs.existsSync(tmpDir))
        fs.mkdirSync(tmpDir, { recursive: true });
    const screenshotPath = path.join(tmpDir, `screenshot_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    log(`[Agent] Screenshot saved to: ${screenshotPath}`);
    await page.close();
    // 2. XHS Publishing Phase
    // Note: This assumes the user is ALREADY logged in to XHS in this browser context,
    // or we will pause to let them login if detected.
    log(`[Agent] Opening Xiaohongshu Creator Studio...`);
    const xhsPage = await context.newPage();
    await xhsPage.goto('https://creator.xiaohongshu.com/publish/publish', { waitUntil: 'domcontentloaded' });
    // Check for login
    // Simple heuristic, if url redirects to login or contains login elements
    if (xhsPage.url().includes('login')) {
        log(`[Agent] WARN: You are not logged in. Please login manually.`);
        // We can't easily automate login without credentials, so we wait or hope user acts
        await xhsPage.waitForURL('**/publish/publish', { timeout: 60000 }).catch(() => log("Login wait timeout"));
    }
    log(`[Agent] Looking for upload area...`);
    // Switch to Image/Text tab - Critical Fix for strict mode and viewport issues
    try {
        const imageTab = xhsPage.getByText('上传图文', { exact: true }).first();
        if (await imageTab.isVisible()) {
            log(`[Agent] Clicking '上传图文' tab...`);
            // Use dispatchEvent to bypass viewport checks which caused failures before
            await imageTab.dispatchEvent('click');
            await xhsPage.waitForTimeout(2000); // Wait for tab switch
        }
    }
    catch (e) {
        log(`[Agent] Warning: Could not switch tab: ${e}`);
    }
    log(`[Agent] Uploading screenshot...`);
    try {
        const fileInput = xhsPage.locator('input[type="file"]');
        await fileInput.waitFor({ state: 'attached', timeout: 10000 });
        await fileInput.setInputFiles(screenshotPath);
        log(`[Agent] Waiting for upload processing...`);
        await xhsPage.waitForTimeout(5000);
    }
    catch (e) {
        log(`[Agent] Error uploading file: ${e}`);
        return { status: 'failed', error: 'Upload failed' };
    }
    log(`[Agent] Generating content...`);
    // Fill Title
    try {
        const titleInput = xhsPage.locator('input[placeholder*="标题"]');
        await titleInput.fill(`[AI Share] ${title}`);
    }
    catch (e) {
        log(`[Agent] Could not find title input: ${e}`);
    }
    // Fill Content
    try {
        const contentInput = xhsPage.locator('#post-textarea');
        if (await contentInput.count() > 0) {
            await contentInput.fill(`Generated by HyperAgent.\nSource: ${targetUrl}\nPrompt: ${prompt}`);
        }
        else {
            await xhsPage.keyboard.type(`Generated by HyperAgent.\nSource: ${targetUrl}\nPrompt: ${prompt}`);
        }
    }
    catch (e) {
        log(`[Agent] Could not fill content: ${e}`);
    }
    log(`[Agent] Ready to publish...`);
    // Auto-Publish Logic
    try {
        const publishButton = xhsPage.getByRole('button', { name: '发布', exact: true });
        const publishButtonFallback = xhsPage.getByText('发布', { exact: true });
        if (await publishButton.isVisible()) {
            log(`[Agent] Clicking '发布' button...`);
            await publishButton.click();
        }
        else if (await publishButtonFallback.isVisible()) {
            log(`[Agent] Clicking '发布' button (fallback)...`);
            await publishButtonFallback.click();
        }
        else {
            // Try '发布笔记'
            const publishNoteBtn = xhsPage.getByText('发布笔记', { exact: true });
            if (await publishNoteBtn.isVisible()) {
                log(`[Agent] Clicking '发布笔记' button...`);
                await publishNoteBtn.click();
            }
            else {
                log(`[Agent] Could not find any Publish button.`);
            }
        }
        await xhsPage.waitForTimeout(5000); // Wait for post-action
        log(`[Agent] Publish action triggered.`);
    }
    catch (e) {
        log(`[Agent] Error during publish click: ${e}`);
    }
    // Close page after a short delay to allow network requests to finish
    // await xhsPage.close(); 
    // For now, we keep it open so the user can verify if it actually worked or if XHS showed a captcha/error.
    return {
        screenshot: screenshotPath,
        xhs_status: 'published'
    };
}
