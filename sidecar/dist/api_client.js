"use strict";
// Node.js 18+ has native fetch, no import needed
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveMaterial = saveMaterial;
exports.saveWorkflowAsMaterial = saveWorkflowAsMaterial;
exports.saveTaskResultAsMaterial = saveTaskResultAsMaterial;
/**
 * API Client for communicating with the Go backend server
 */
const DEFAULT_SERVER_URL = 'http://localhost:8080';
function log(message) {
    console.error(JSON.stringify({ type: 'log', message, timestamp: new Date().toISOString() }));
}
/**
 * Creates a material in the material center via API
 *
 * @param material - The material data to save
 * @param config - API client configuration including auth token
 * @returns The created material or null on failure
 */
async function saveMaterial(material, config) {
    const serverUrl = config.serverUrl || DEFAULT_SERVER_URL;
    const url = `${serverUrl}/api/v1/materials`;
    log(`[APIClient] Saving material to ${url}: ${material.name}`);
    if (!config.authToken) {
        log(`[APIClient] Error: No auth token provided`);
        return null;
    }
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.authToken}`
            },
            body: JSON.stringify(material)
        });
        if (!response.ok) {
            const errorText = await response.text();
            log(`[APIClient] Failed to save material: ${response.status} - ${errorText}`);
            return null;
        }
        const savedMaterial = await response.json();
        log(`[APIClient] Material saved successfully: ${savedMaterial.id}`);
        return savedMaterial;
    }
    catch (e) {
        log(`[APIClient] Error saving material: ${e.message}`);
        return null;
    }
}
/**
 * Saves AI workflow result to material center
 *
 * @param workflowName - Name of the workflow
 * @param workflowContent - Generated workflow content/prompt
 * @param projectId - Optional project ID to associate
 * @param imageUrls - Optional image URLs (JSON array string)
 * @param config - API client configuration
 * @returns The created material or null
 */
async function saveWorkflowAsMaterial(workflowName, workflowContent, projectId, imageUrls, config) {
    const material = {
        name: workflowName,
        type: 'workflow',
        content: workflowContent,
        projectId: projectId,
        imageUrls: imageUrls
    };
    return saveMaterial(material, config);
}
/**
 * Saves task execution result to material center
 *
 * @param taskId - The task ID
 * @param output - The task output content
 * @param projectId - Optional project ID
 * @param name - Optional name (defaults to "Result: {taskId}")
 * @param imageUrls - Optional screenshot URLs
 * @param config - API client configuration
 * @returns The created material or null
 */
async function saveTaskResultAsMaterial(taskId, output, projectId, name, imageUrls, config) {
    const materialName = name || `Result: ${taskId} - ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
    const material = {
        name: materialName,
        type: 'text',
        content: output,
        projectId: projectId,
        imageUrls: imageUrls
    };
    return saveMaterial(material, config);
}
