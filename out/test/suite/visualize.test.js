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
const assert = __importStar(require("assert"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const extensionRoot = path.resolve(__dirname, '../../../');
const samplesDir = path.join(extensionRoot, 'samples');
// Reach into the compiled extension module directly so tests can inspect
// PipelineVisualizerPanel.currentPanel — the extension host resolves this
// same absolute path when activating, so both share Node's module cache
// and therefore the same singleton.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PipelineVisualizerPanel } = require(path.join(extensionRoot, 'out', 'visualizerPanel.js'));
const SAMPLES = [
    { file: 'azure-pipeline.yaml', expectedBadge: 'Azure DevOps' },
    { file: 'github-workflow.yaml', expectedBadge: 'GitHub Actions' },
    { file: 'gitlab-pipeline.yaml', expectedBadge: 'GitLab CI' },
    { file: 'awsbuildspec-sample.yml', expectedBadge: 'AWS CodeBuild' },
    { file: 'awscodebuild-pipeline.yaml', expectedBadge: 'AWS CloudFormation' },
    { file: 'bitbucket-pipeline.yaml', expectedBadge: 'Bitbucket Pipelines' },
    { file: 'bitbucket-pipelines.yml', expectedBadge: 'Bitbucket Pipelines' }
];
suite('Pipeline Visualizer — sample pipelines', () => {
    setup(() => {
        if (PipelineVisualizerPanel.currentPanel) {
            PipelineVisualizerPanel.currentPanel.dispose();
        }
    });
    teardown(() => {
        if (PipelineVisualizerPanel.currentPanel) {
            PipelineVisualizerPanel.currentPanel.dispose();
        }
    });
    for (const { file, expectedBadge } of SAMPLES) {
        test(`renders ${file} and detects "${expectedBadge}"`, async () => {
            const uri = vscode.Uri.file(path.join(samplesDir, file));
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            await vscode.commands.executeCommand('pipelineVisualizer.visualize');
            assert.ok(PipelineVisualizerPanel.currentPanel, 'Expected a visualization panel to be created');
            const html = PipelineVisualizerPanel.currentPanel._panel.webview.html;
            assert.ok(html.includes('<!DOCTYPE html>'), 'Expected a full HTML document to be rendered');
            assert.ok(html.includes(expectedBadge), `Expected webview HTML to include platform badge "${expectedBadge}"`);
            const yamlContent = PipelineVisualizerPanel.currentPanel._yamlContent;
            assert.ok(yamlContent && yamlContent.length > 0, 'Expected YAML content to be captured for the webview');
        });
    }
    test('shows an error for invalid YAML instead of throwing', async () => {
        const tmpFile = path.join(os.tmpdir(), `pv-invalid-${Date.now()}.yml`);
        fs.writeFileSync(tmpFile, 'foo: [1, 2\nbar: unterminated');
        try {
            const uri = vscode.Uri.file(tmpFile);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            await vscode.commands.executeCommand('pipelineVisualizer.visualize');
        }
        finally {
            fs.unlinkSync(tmpFile);
        }
    });
});
//# sourceMappingURL=visualize.test.js.map