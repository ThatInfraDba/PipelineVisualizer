import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { PipelineVisualizerPanel } from './visualizerPanel';

export function activate(context: vscode.ExtensionContext) {
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
		const yamlContent = document.getText();

		try {
			// Parse YAML to validate it
			const pipelineData = yaml.load(yamlContent);

			if (!pipelineData || typeof pipelineData !== 'object') {
				vscode.window.showErrorMessage('Invalid YAML content.');
				return;
			}

			// Get user preferences
			const config = vscode.workspace.getConfiguration('pipelineVisualizer');
			const layoutPreference = config.get<string>('diagramLayout', 'automatic');
			const colorTheme = config.get<string>('colorTheme', 'dark');

			// Create and show the visualizer panel
			PipelineVisualizerPanel.createOrShow(context.extensionUri, yamlContent, pipelineData, layoutPreference, colorTheme, fileName);
			
		} catch (error) {
			vscode.window.showErrorMessage(`Error parsing YAML: ${error}`);
		}
	});

	context.subscriptions.push(disposable);

	// Register webview serializer for persistence
	if (vscode.window.registerWebviewPanelSerializer) {
		vscode.window.registerWebviewPanelSerializer(PipelineVisualizerPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				PipelineVisualizerPanel.revive(webviewPanel, context.extensionUri, state);
			}
		});
	}
}

export function deactivate() {}
