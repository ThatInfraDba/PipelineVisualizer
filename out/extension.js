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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const yaml = __importStar(require("js-yaml"));
const path = __importStar(require("path"));
const visualizerPanel_1 = require("./visualizerPanel");
function activate(context) {
    console.log('Pipeline Visualizer extension is now active');
    // Register the visualize command
    const disposable = vscode.commands.registerCommand('pipelineVisualizer.visualize', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found. Please open a YAML file.');
            return;
        }
        const document = editor.document;
        const filePath = document.fileName;
        const fileName = path.basename(filePath);
        // Check if it's a YAML file
        if (!filePath.endsWith('.yml') && !filePath.endsWith('.yaml')) {
            vscode.window.showWarningMessage('Please open a YAML file to visualize.');
            return;
        }
        // Get the YAML content
        const rawYaml = document.getText();
        // Strip custom YAML tags (e.g. CloudFormation !Sub, !Ref, !GetAtt) that
        // js-yaml rejects as unknown. Tag semantics are not needed for visualization.
        const yamlContent = rawYaml.replace(/![A-Za-z][A-Za-z0-9]*/g, '');
        try {
            // Parse YAML to validate it
            const pipelineData = yaml.load(yamlContent);
            if (!pipelineData || typeof pipelineData !== 'object') {
                vscode.window.showErrorMessage('Invalid YAML content.');
                return;
            }
            // Get user preferences
            const config = vscode.workspace.getConfiguration('pipelineVisualizer');
            const layoutPreference = config.get('diagramLayout', 'automatic');
            const colorTheme = config.get('colorTheme', 'dark');
            // Create and show the visualizer panel
            visualizerPanel_1.PipelineVisualizerPanel.createOrShow(context.extensionUri, yamlContent, pipelineData, layoutPreference, colorTheme, fileName);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error parsing YAML: ${error}`);
        }
    });
    context.subscriptions.push(disposable);
    // Register webview serializer for persistence
    if (vscode.window.registerWebviewPanelSerializer) {
        vscode.window.registerWebviewPanelSerializer(visualizerPanel_1.PipelineVisualizerPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel, state) {
                visualizerPanel_1.PipelineVisualizerPanel.revive(webviewPanel, context.extensionUri, state);
            }
        });
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map