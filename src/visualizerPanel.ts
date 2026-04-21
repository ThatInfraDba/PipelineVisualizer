import * as vscode from 'vscode';

interface ThemeDef {
    mermaidTheme: string;
    mermaidThemeVariables: Record<string, string>;
    edgeColor: string;
    palette: string[];
    primary: string;
    secondary: string;
    accent: string;
    bodyGradientStart: string;
    bodyGradientEnd: string;
    platformSpecific: boolean;
}

const THEMES: Record<string, ThemeDef> = {
    dark: {
        mermaidTheme: 'dark',
        mermaidThemeVariables: { lineColor: '#ffffff', primaryTextColor: '#ffffff', tertiaryColor: '#ffffff' },
        edgeColor: '#ffffff',
        palette: ['#4A90E2', '#7ED321', '#F5A623', '#9013FE', '#50E3C2', '#FF6B6B'],
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#667eea',
        bodyGradientStart: '#667eea',
        bodyGradientEnd: '#764ba2',
        platformSpecific: true,
    },
    light: {
        mermaidTheme: 'default',
        mermaidThemeVariables: { lineColor: '#444444', primaryTextColor: '#111111' },
        edgeColor: '#555555',
        palette: ['#1565C0', '#2E7D32', '#E65100', '#6A1B9A', '#00695C', '#B71C1C'],
        primary: '#1565C0',
        secondary: '#0D47A1',
        accent: '#1565C0',
        bodyGradientStart: '#c5cae9',
        bodyGradientEnd: '#bbdefb',
        platformSpecific: false,
    },
    ocean: {
        mermaidTheme: 'base',
        mermaidThemeVariables: {
            background: '#0a1628',
            primaryColor: '#1565C0',
            primaryTextColor: '#E3F2FD',
            primaryBorderColor: '#90CAF9',
            lineColor: '#90CAF9',
            secondaryColor: '#0097A7',
            tertiaryColor: '#0a1f30',
        },
        edgeColor: '#90CAF9',
        palette: ['#0D47A1', '#1565C0', '#0288D1', '#0097A7', '#006064', '#01579B'],
        primary: '#1565C0',
        secondary: '#0D47A1',
        accent: '#42A5F5',
        bodyGradientStart: '#0a1628',
        bodyGradientEnd: '#0d2137',
        platformSpecific: false,
    },
    forest: {
        mermaidTheme: 'forest',
        mermaidThemeVariables: { lineColor: '#A5D6A7', primaryTextColor: '#E8F5E9' },
        edgeColor: '#A5D6A7',
        palette: ['#1B5E20', '#2E7D32', '#388E3C', '#558B2F', '#33691E', '#827717'],
        primary: '#2E7D32',
        secondary: '#1B5E20',
        accent: '#66BB6A',
        bodyGradientStart: '#0a1f0a',
        bodyGradientEnd: '#1a2e1a',
        platformSpecific: false,
    },
    sunset: {
        mermaidTheme: 'base',
        mermaidThemeVariables: {
            background: '#1a0a00',
            primaryColor: '#E64A19',
            primaryTextColor: '#FBE9E7',
            primaryBorderColor: '#FFCCBC',
            lineColor: '#FFAB91',
            secondaryColor: '#FF6F00',
            tertiaryColor: '#2d1200',
        },
        edgeColor: '#FFAB91',
        palette: ['#BF360C', '#E64A19', '#F4511E', '#D84315', '#FF6F00', '#E65100'],
        primary: '#E64A19',
        secondary: '#BF360C',
        accent: '#FF7043',
        bodyGradientStart: '#1a0a00',
        bodyGradientEnd: '#2d1200',
        platformSpecific: false,
    },
    monochrome: {
        mermaidTheme: 'neutral',
        mermaidThemeVariables: { lineColor: '#aaaaaa', primaryTextColor: '#cccccc' },
        edgeColor: '#aaaaaa',
        palette: ['#37474F', '#455A64', '#546E7A', '#607D8B', '#78909C', '#455A64'],
        primary: '#607D8B',
        secondary: '#37474F',
        accent: '#90A4AE',
        bodyGradientStart: '#1a1a1a',
        bodyGradientEnd: '#2a2a2a',
        platformSpecific: false,
    },
};

export class PipelineVisualizerPanel {
	public static currentPanel: PipelineVisualizerPanel | undefined;
	public static readonly viewType = 'pipelineVisualizer';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _documentUri: vscode.Uri | undefined;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri, yamlContent: string, pipelineData: any, layoutPreference: string, colorTheme: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		const documentUri = vscode.window.activeTextEditor?.document.uri;

		if (PipelineVisualizerPanel.currentPanel) {
			PipelineVisualizerPanel.currentPanel._panel.reveal(column);
			PipelineVisualizerPanel.currentPanel._documentUri = documentUri;
			PipelineVisualizerPanel.currentPanel._update(yamlContent, pipelineData, layoutPreference, colorTheme);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			PipelineVisualizerPanel.viewType,
			'Pipeline Visualization',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [extensionUri]
			}
		);

		PipelineVisualizerPanel.currentPanel = new PipelineVisualizerPanel(panel, extensionUri);		PipelineVisualizerPanel.currentPanel._documentUri = documentUri;		PipelineVisualizerPanel.currentPanel._update(yamlContent, pipelineData, layoutPreference, colorTheme);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, state: any) {
		PipelineVisualizerPanel.currentPanel = new PipelineVisualizerPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'refresh':
						if (this._documentUri) {
							vscode.workspace.openTextDocument(this._documentUri).then(document => {
								const yamlContent = document.getText();
								try {
									const pipelineData = require('js-yaml').load(yamlContent);
									this._panel.webview.postMessage({
										command: 'refreshData',
										yamlContent: yamlContent
									});
								} catch (error: any) {
									vscode.window.showErrorMessage(`Error parsing YAML: ${error.message}`);
								}
							}, error => {
								vscode.window.showErrorMessage(`Error reading file: ${error.message}`);
							});
						} else {
							vscode.window.showErrorMessage('No document URI stored for refresh.');
						}
						return;
					case 'alert':
						vscode.window.showInformationMessage(message.text);
						return;
					case 'error':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	private _update(yamlContent: string, pipelineData: any, layoutPreference: string, colorTheme: string) {
		const webview = this._panel.webview;
		this._panel.webview.html = this._getHtmlForWebview(webview, yamlContent, pipelineData, layoutPreference, colorTheme);
	}

	public dispose() {
		PipelineVisualizerPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	private _hexToRgba(hex: string, alpha: number): string {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	private _generateStageCSS(palette: string[]): string {
		const rules: string[] = [];
		for (let i = 0; i < 6; i++) {
			const color = palette[i];
			const rgba20 = this._hexToRgba(color, 0.2);
			const rgba08 = this._hexToRgba(color, 0.08);
			const nth = i < 5 ? `:nth-child(${i + 1})` : `:nth-child(n+6)`;
			rules.push(`.stage${nth} { border-color: ${color}; background: linear-gradient(135deg, ${rgba20} 0%, ${rgba08} 100%); }`);
			rules.push(`.stage${nth} h2 { background: ${color}; }`);
		}
		const namedClasses = ['build', 'test', 'prod'];
		namedClasses.forEach((name, i) => {
			const color = palette[i];
			const rgba20 = this._hexToRgba(color, 0.2);
			const rgba08 = this._hexToRgba(color, 0.08);
			rules.push(`.stage.${name} { border-color: ${color}; background: linear-gradient(135deg, ${rgba20} 0%, ${rgba08} 100%); }`);
			rules.push(`.stage.${name} h2 { background: ${color}; }`);
		});
		return rules.join('\n        ');
	}

	private _getHtmlForWebview(webview: vscode.Webview, yamlContent: string, pipelineData: any, layoutPreference: string, colorTheme: string): string {
		const platform = this._detectPlatform(pipelineData);
		const platformClass = platform === 'github' ? 'github-mode' : '';
		const platformBadge = platform === 'github'
			? '<span class="platform-badge github">🐙 GitHub Actions</span>'
			: '<span class="platform-badge azure">☁️ Azure DevOps</span>';

		const escapedYaml = yamlContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		const escapedLayoutPref = layoutPreference.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

		// Resolve theme, applying platform-specific overrides for the dark theme
		const themeDef = THEMES[colorTheme] || THEMES['dark'];
		let { mermaidTheme, mermaidThemeVariables, edgeColor, palette, primary, secondary, accent, bodyGradientStart, bodyGradientEnd } = themeDef;
		if (themeDef.platformSpecific) {
			primary = platform === 'github' ? '#2188ff' : '#667eea';
			secondary = platform === 'github' ? '#6f42c1' : '#764ba2';
			accent = platform === 'github' ? '#2188ff' : '#0078d4';
			bodyGradientStart = primary;
			bodyGradientEnd = secondary;
		}

		const stageCSS = this._generateStageCSS(palette);
		const highlightColor = this._hexToRgba(palette[0], 0.6);

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline'; font-src https://cdn.jsdelivr.net;">
    <title>Pipeline Visualization</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
    <style>
        :root {
            --primary-color: ${primary};
            --secondary-color: ${secondary};
            --accent-color: ${accent};
        }
        body { font-family: var(--vscode-font-family); margin: 0; padding: 20px; background: linear-gradient(135deg, ${bodyGradientStart} 0%, ${bodyGradientEnd} 100%); min-height: 100vh; }
        .container { max-width: 1400px; margin: 0 auto; background: var(--vscode-editor-background); border-radius: 12px; padding: 30px; }
        h1 { color: var(--vscode-foreground); border-bottom: 3px solid var(--accent-color); padding-bottom: 15px; }
        .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .refresh-btn { background: var(--accent-color); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; transition: opacity 0.2s; }
        .refresh-btn:hover { opacity: 0.8; }
        .refresh-btn:active { opacity: 0.6; }
        .platform-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-left: 15px; background: var(--accent-color); color: white; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
        .info-card { background: var(--vscode-textBlockQuote-background); padding: 20px; border-radius: 8px; border-left: 4px solid var(--accent-color); }
        .info-card h3 { margin-top: 0; color: var(--accent-color); font-size: 14px; }
        .mermaid-container { background: var(--vscode-textBlockQuote-background); padding: 30px; border-radius: 8px; margin: 30px 0; overflow-x: auto; }
        .stage, .job-container { margin: 30px 0; padding: 25px; border-radius: 8px; border: 3px solid var(--vscode-panel-border); transition: box-shadow 0.3s ease; scroll-margin-top: 20px; }
        ${stageCSS}
        .stage h2 { margin-top: 0; font-size: 22px; font-weight: 600; padding: 10px; border-radius: 6px; color: white; }
        .job-container { border-color: ${palette[0]}; background: linear-gradient(135deg, ${this._hexToRgba(palette[0], 0.12)} 0%, ${this._hexToRgba(palette[0], 0.05)} 100%); }
        .job-container h2 { margin-top: 0; font-size: 20px; font-weight: 600; }
        .job { background: var(--vscode-editor-background); padding: 15px; margin: 15px 0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .steps { list-style: none; padding-left: 0; }
        .steps li { padding: 10px 15px; margin: 10px 0; background: linear-gradient(135deg, ${this._hexToRgba(accent, 0.12)} 0%, ${this._hexToRgba(accent, 0.05)} 100%); border-left: 4px solid ${accent}; border-radius: 6px; cursor: pointer; transition: all 0.2s ease; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .steps li:hover { transform: translateX(5px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); background: linear-gradient(135deg, ${this._hexToRgba(accent, 0.2)} 0%, ${this._hexToRgba(accent, 0.1)} 100%); }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); }
        .modal-content { background: var(--vscode-editor-background); margin: 5% auto; padding: 0; border-radius: 12px; width: 80%; max-width: 900px; max-height: 80vh; overflow: hidden; }
        .modal-header { padding: 20px 30px; background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); color: white; }
        .modal-body { padding: 30px; max-height: calc(80vh - 100px); overflow-y: auto; }
        .close { color: white; float: right; font-size: 28px; cursor: pointer; }
        .code-block { background: var(--vscode-textCodeBlock-background); color: var(--vscode-editor-foreground); padding: 15px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; font-family: var(--vscode-editor-font-family); font-size: 13px; max-height: 400px; overflow-y: auto; }
        .modal-body dl { display: grid; grid-template-columns: auto 1fr; gap: 15px 20px; }
        .modal-body dt { font-weight: bold; color: var(--accent-color); }
        .modal-body dd { margin: 0; padding: 8px; background: var(--vscode-textBlockQuote-background); border-radius: 4px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin-left: 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
        .approval { background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 6px; }
        .approval h4 { margin-top: 0; color: #856404; font-size: 16px; font-weight: 600; }
        .approval p { margin: 8px 0; color: #333; font-size: 14px; }
        .approval strong { color: #664d03; font-weight: 600; }
        .approval-badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; margin: 10px 0; background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%); color: white; }
        .approval-info { padding: 8px 12px; margin: 8px 0; background: rgba(255, 165, 0, 0.15); border-left: 4px solid #FFA500; border-radius: 4px; font-size: 13px; color: var(--vscode-foreground); }
    </style>
</head>
<body class="${platformClass}">
    <div class="container">
        <div class="header-container">
            <h1>🚀 Pipeline Visualization${platformBadge}</h1>
            <button class="refresh-btn" onclick="refreshVisualization()">
                <span>🔄</span>
                <span>Refresh</span>
            </button>
        </div>
        <div id="content"></div>
    </div>
    <div id="stepModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <span class="close">&times;</span>
                <h2 id="modalTitle">Step Details</h2>
            </div>
            <div class="modal-body" id="modalBody"></div>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        let pipelineData = null;
        let allSteps = {};
        let stepCounter = 0;
        const detectedPlatform = '${platform}';
        const layoutPreference = '${escapedLayoutPref}';
        const themePalette = ${JSON.stringify(palette)};
        const themeEdgeColor = '${edgeColor}';
        const themeHighlightColor = '${highlightColor}';

        function refreshVisualization() {
            vscode.postMessage({ command: 'refresh' });
        }

        function showError(title, message, details) {
            const errorHtml = \`
                <div class="error-container">
                    <h2>
                        <span class="error-icon">⚠️</span>
                        <span>\${title}</span>
                    </h2>
                    <div class="error-message">\${escapeHtml(message)}</div>
                    \${details ? \`<div class="error-help">\${details}</div>\` : ''}
                </div>
            \`;
            document.getElementById('content').innerHTML = errorHtml;
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'refreshData') {
                try {
                    pipelineData = jsyaml.load(message.yamlContent);

                    if (!pipelineData || typeof pipelineData !== 'object') {
                        showError(
                            'Invalid Pipeline Data',
                            'The YAML file does not contain valid pipeline data.',
                            '<strong>Tip:</strong> Make sure your YAML file is a valid Azure DevOps pipeline or GitHub Actions workflow.'
                        );
                        return;
                    }

                    if (detectedPlatform === 'github') {
                        renderGitHub(pipelineData);
                    } else {
                        renderAzure(pipelineData);
                    }
                    mermaid.init(undefined, document.querySelectorAll('.mermaid'));
                } catch (error) {
                    let errorMessage = error.message || 'Unknown error occurred';
                    let errorDetails = '';

                    if (errorMessage.includes('bad indentation')) {
                        errorDetails = '<strong>Indentation Error:</strong> YAML is sensitive to indentation. Make sure you use consistent spaces (not tabs) for indentation.';
                    } else if (errorMessage.includes('unexpected')) {
                        errorDetails = '<strong>Syntax Error:</strong> There may be a missing colon, quote, or bracket in your YAML file.';
                    } else if (errorMessage.includes('duplicate')) {
                        errorDetails = '<strong>Duplicate Key:</strong> You have duplicate keys in your YAML file. Each key must be unique within its scope.';
                    } else {
                        errorDetails = '<strong>Parsing Error:</strong> Unable to parse the YAML file. Please check your syntax and try again.';
                    }

                    showError('YAML Parsing Error', errorMessage, errorDetails);
                }
            }
        });

        function scrollToStage(stageId) {
            const element = document.getElementById(stageId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                element.style.boxShadow = \`0 0 20px \${themeHighlightColor}\`;
                setTimeout(() => { element.style.boxShadow = ''; }, 2000);
            }
        }

        const modal = document.getElementById('stepModal');
        const closeBtn = document.getElementsByClassName('close')[0];
        closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.style.display = 'none'; });

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showStepDetails(stepId) {
            const step = allSteps[stepId];
            if (!step) return;

            document.getElementById('modalTitle').textContent = step.displayName || step.name || step.uses || 'Step Details';
            let html = '<dl>';

            if (detectedPlatform === 'github') {
                if (step.name) html += \`<dt>📝 Name</dt><dd>\${step.name}</dd>\`;
                if (step.uses) html += \`<dt>🔧 Uses</dt><dd><code>\${step.uses}</code></dd>\`;
                if (step.run) html += \`<dt>💻 Script</dt><dd><div class="code-block">\${escapeHtml(step.run)}</div></dd>\`;
            } else {
                const script = step.script || step.pwsh || step.bash || step.powershell || (step.inputs && step.inputs.script);
                if (script) html += \`<dt>💻 Script</dt><dd><div class="code-block">\${escapeHtml(script)}</div></dd>\`;
                if (step.task) html += \`<dt>📦 Task</dt><dd>\${step.task}</dd>\`;
                if (step.displayName) html += \`<dt>📝 Name</dt><dd>\${step.displayName}</dd>\`;
            }

            html += \`<dt>🔍 Raw Data</dt><dd><div class="code-block">\${escapeHtml(JSON.stringify(step, null, 2))}</div></dd>\`;
            html += '</dl>';

            document.getElementById('modalBody').innerHTML = html;
            modal.style.display = 'block';
        }

        window.addEventListener('load', () => {
            mermaid.initialize({
                startOnLoad: false,
                theme: '${mermaidTheme}',
                themeVariables: ${JSON.stringify(mermaidThemeVariables)},
                securityLevel: 'loose',
                flowchart: { useMaxWidth: true }
            });

            try {
                const yamlContent = \`${escapedYaml}\`;
                pipelineData = jsyaml.load(yamlContent);

                if (!pipelineData || typeof pipelineData !== 'object') {
                    showError(
                        'Invalid Pipeline Data',
                        'The YAML file does not contain valid pipeline data.',
                        '<strong>Tip:</strong> Make sure your YAML file is a valid Azure DevOps pipeline or GitHub Actions workflow.'
                    );
                    return;
                }

                if (detectedPlatform === 'github') {
                    renderGitHub(pipelineData);
                } else {
                    renderAzure(pipelineData);
                }
            } catch (error) {
                let errorMessage = error.message || 'Unknown error occurred';
                let errorDetails = '';

                if (errorMessage.includes('bad indentation')) {
                    errorDetails = '<strong>Indentation Error:</strong> YAML is sensitive to indentation. Make sure you use consistent spaces (not tabs) for indentation.';
                } else if (errorMessage.includes('unexpected')) {
                    errorDetails = '<strong>Syntax Error:</strong> There may be a missing colon, quote, or bracket in your YAML file.';
                } else if (errorMessage.includes('duplicate')) {
                    errorDetails = '<strong>Duplicate Key:</strong> You have duplicate keys in your YAML file. Each key must be unique within its scope.';
                } else {
                    errorDetails = '<strong>Parsing Error:</strong> Unable to parse the YAML file. Please check your syntax and try again.';
                }

                showError('YAML Parsing Error', errorMessage, errorDetails);
            }
        });

        function renderAzure(data) {
            try {
                if (!data) {
                    showError('No Data', 'Pipeline data is empty or undefined.', '<strong>Tip:</strong> Make sure your YAML file contains valid Azure DevOps pipeline configuration.');
                    return;
                }

                let html = \`<p><strong>Pipeline:</strong> \${data.name || 'Unnamed'}</p>\`;
            html += '<div class="info-grid">';
            if (data.trigger) html += '<div class="info-card"><h3>📋 Trigger</h3><p>Configured</p></div>';
            if (data.pool) html += '<div class="info-card"><h3>🖥️ Pool</h3><p>' + (data.pool.name || 'Default') + '</p></div>';
            if (data.stages) html += \`<div class="info-card"><h3>📊 Stages</h3><p>\${data.stages.length}</p></div>\`;
            html += '</div>';

            let diagramDirection = 'TD';
            if (layoutPreference === 'horizontal') {
                diagramDirection = 'LR';
            } else if (layoutPreference === 'vertical') {
                diagramDirection = 'TD';
            } else {
                diagramDirection = (data.stages && data.stages.length <= 6) ? 'LR' : 'TD';
            }
            let diagram = \`graph \${diagramDirection}\\nSTART([Start])\`;
            const stageColors = themePalette;
            if (data.stages) {
                data.stages.forEach((stage, idx) => {
                    const id = \`S\${idx}\`;
                    const stageLabel = (stage.displayName || stage.stage || 'Stage').replace(/"/g, "'");
                    diagram += \` --> \${id}["\${stageLabel}"]\`;
                });
            }
            diagram += ' --> END([End])';
            if (data.stages) {
                data.stages.forEach((stage, idx) => {
                    const id = \`S\${idx}\`;
                    const color = stageColors[idx % stageColors.length];
                    diagram += \`\\nstyle \${id} fill:\${color},stroke:\${color},color:#fff\`;
                    diagram += \`\\nclick \${id} scrollToStage_\${idx}\`;
                    window[\`scrollToStage_\${idx}\`] = function() { scrollToStage(\`S\${idx}\`); };
                });
            }
            const edgeCount = (data.stages ? data.stages.length : 0) + 1;
            for (let i = 0; i < edgeCount; i++) {
                diagram += \`\\nlinkStyle \${i} stroke:\${themeEdgeColor},stroke-width:2px,fill:none\`;
            }
            html += \`<div class="mermaid-container"><div class="mermaid">\${diagram}</div></div>\`;

            if (data.stages) {
                data.stages.forEach((stage, idx) => {
                    const color = stageColors[idx % stageColors.length];
                    html += \`<div id="S\${idx}" class="stage" style="border-color: \${color}; background: linear-gradient(135deg, \${color}33 0%, \${color}14 100%);"><h2 style="background: \${color}; color: white;">🔨 \${stage.displayName || stage.stage}</h2>\`;
                    if (stage.jobs) {
                        stage.jobs.forEach((job, jidx) => {
                            try {
                                const isManualValidation = job.steps && job.steps.some(step =>
                                    step.task && (step.task.includes('ManualValidation') || step.task.includes('ManualIntervention'))
                                );
                                const isServerPool = job.pool === 'server';

                                if (isManualValidation || isServerPool) {
                                    const step = job.steps?.[0];
                                    const timeout = job.timeoutInMinutes || 'Not specified';

                                    html += '<div class="approval">';
                                    html += '<h4>⏸️ Manual Approval Gate</h4>';
                                    html += \`<p><strong>Job:</strong> \${job.displayName || job.job}</p>\`;

                                    if (step?.inputs?.approvers) {
                                        const approvers = String(step.inputs.approvers).trim().split(/[\\n,]/).filter(a => a.trim()).join(', ');
                                        html += \`<p><strong>Approvers:</strong> \${approvers}</p>\`;
                                    }

                                    if (step?.inputs?.notifyUsers) {
                                        const notifyUsers = String(step.inputs.notifyUsers).trim().split(/[\\n,]/).filter(n => n.trim()).join(', ');
                                        html += \`<p><strong>Notify:</strong> \${notifyUsers}</p>\`;
                                    }

                                    html += \`<p><strong>Timeout:</strong> \${timeout} minutes\`;

                                    if (step?.inputs?.onTimeout) {
                                        html += \` | <strong>On Timeout:</strong> \${step.inputs.onTimeout}\`;
                                    }

                                    html += '</p>';

                                    if (step?.inputs?.instructions) {
                                        html += \`<p><strong>Instructions:</strong> \${step.inputs.instructions}</p>\`;
                                    }

                                    html += '</div>';
                                } else {
                                    html += \`<div class="job"><h3>\${job.displayName || job.job}</h3>\`;

                                    if (job.deployment) {
                                        html += \`<div class="approval-badge">🔒 Deployment Job</div>\`;
                                        if (job.environment) {
                                            const envName = typeof job.environment === 'string' ? job.environment : job.environment.name;
                                            html += \`<p><strong>📦 Environment:</strong> \${envName}</p>\`;
                                            html += \`<p class="approval-info">⚠️ May require approval gates</p>\`;
                                        }
                                    }

                                    if (job.steps) {
                                        html += '<ul class="steps">';
                                        job.steps.forEach(step => {
                                            const sid = \`step_\${stepCounter++}\`;
                                            allSteps[sid] = step;
                                            html += \`<li onclick="showStepDetails('\${sid}')">▶️ \${step.displayName || step.script?.substring(0, 50) || step.task || 'Step'}</li>\`;
                                        });
                                        html += '</ul>';
                                    }
                                    html += '</div>';
                                }
                            } catch (jobError) {
                                console.error('Error rendering job:', jobError, job);
                                html += \`<div class="job"><h3>\${job.displayName || job.job}</h3><p style="color: red;">Error rendering job</p></div>\`;
                            }
                        });
                    }
                    html += '</div>';
                });
            }

            document.getElementById('content').innerHTML = html;
            setTimeout(() => mermaid.run(), 100);
            } catch (error) {
                showError('Rendering Error', error.message || 'Failed to render Azure pipeline visualization.', '<strong>Tip:</strong> There may be an issue with the pipeline structure. Please check your YAML file.');
            }
        }

        function renderGitHub(data) {
            try {
                if (!data) {
                    showError('No Data', 'Workflow data is empty or undefined.', '<strong>Tip:</strong> Make sure your YAML file contains valid GitHub Actions workflow configuration.');
                    return;
                }

                let html = \`<p><strong>Workflow:</strong> \${data.name || 'Unnamed'}</p>\`;
            html += '<div class="info-grid">';
            if (data.on) {
                const triggers = typeof data.on === 'string' ? [data.on] : Object.keys(data.on);
                html += \`<div class="info-card"><h3>🔔 Triggers</h3><p>\${triggers.join(', ')}</p></div>\`;
            }
            if (data.jobs) html += \`<div class="info-card"><h3>💼 Jobs</h3><p>\${Object.keys(data.jobs).length}</p></div>\`;
            html += '</div>';

            let diagramDirection = 'TD';
            if (layoutPreference === 'horizontal') {
                diagramDirection = 'LR';
            } else if (layoutPreference === 'vertical') {
                diagramDirection = 'TD';
            } else {
                diagramDirection = (data.jobs && Object.keys(data.jobs).length <= 6) ? 'LR' : 'TD';
            }
            let diagram = \`graph \${diagramDirection}\\nSTART([Start])\`;
            const jobColors = themePalette;
            if (data.jobs) {
                Object.keys(data.jobs).forEach((key, idx) => {
                    const id = \`J\${idx}\`;
                    const jobLabel = (data.jobs[key].name || key).replace(/"/g, "'");
                    diagram += \` --> \${id}["\${jobLabel}"]\`;
                });
            }
            diagram += ' --> END([End])';
            if (data.jobs) {
                Object.keys(data.jobs).forEach((key, idx) => {
                    const id = \`J\${idx}\`;
                    const color = jobColors[idx % jobColors.length];
                    diagram += \`\\nstyle \${id} fill:\${color},stroke:\${color},color:#fff\`;
                    diagram += \`\\nclick \${id} scrollToJob_\${idx}\`;
                    window[\`scrollToJob_\${idx}\`] = function() { scrollToStage(\`J\${idx}\`); };
                });
            }
            const edgeCount = (data.jobs ? Object.keys(data.jobs).length : 0) + 1;
            for (let i = 0; i < edgeCount; i++) {
                diagram += \`\\nlinkStyle \${i} stroke:\${themeEdgeColor},stroke-width:2px,fill:none\`;
            }
            html += \`<div class="mermaid-container"><div class="mermaid">\${diagram}</div></div>\`;

            if (data.jobs) {
                Object.entries(data.jobs).forEach(([key, job], idx) => {
                    const color = jobColors[idx % jobColors.length];
                    html += \`<div id="J\${idx}" class="job-container" style="border-color: \${color}; background: linear-gradient(135deg, \${color}33 0%, \${color}14 100%);"><h2 style="color: \${color};">💼 \${job.name || key}</h2>\`;
                    html += '<div class="job">';
                    if (job['runs-on']) html += \`<p><strong>🖥️ Runs on:</strong> \${job['runs-on']}</p>\`;

                    if (job.environment) {
                        const envName = typeof job.environment === 'string' ? job.environment : job.environment.name;
                        html += \`<div class="approval-badge">🔒 Protected Environment</div>\`;
                        html += \`<p><strong>📦 Environment:</strong> \${envName}</p>\`;
                        if (typeof job.environment === 'object' && job.environment.url) {
                            html += \`<p><strong>🔗 URL:</strong> <code>\${job.environment.url}</code></p>\`;
                        }
                        html += \`<p class="approval-info">⚠️ This environment may require approval before deployment</p>\`;
                    }

                    if (job.steps) {
                        html += '<h3>Steps</h3><ul class="steps">';
                        job.steps.forEach(step => {
                            const sid = \`step_\${stepCounter++}\`;
                            allSteps[sid] = step;
                            const name = step.name || step.uses || step.run?.substring(0, 50) || 'Step';
                            html += \`<li onclick="showStepDetails('\${sid}')">📝 \${name}</li>\`;
                        });
                        html += '</ul>';
                    }
                    html += '</div></div>';
                });
            }

            document.getElementById('content').innerHTML = html;
            setTimeout(() => mermaid.run(), 100);
            } catch (error) {
                showError('Rendering Error', error.message || 'Failed to render GitHub Actions visualization.', '<strong>Tip:</strong> There may be an issue with the workflow structure. Please check your YAML file.');
            }
        }
    </script>
</body>
</html>`;
	}

	private _detectPlatform(data: any): string {
		if (data.on || data['runs-on'] || (data.jobs && Object.values(data.jobs).some((j: any) => j['runs-on'] || j.uses))) {
			return 'github';
		}
		if (data.stages || data.pool || (data.jobs && Array.isArray(data.jobs)) || data.trigger || data.pr) {
			return 'azure';
		}
		return 'azure';
	}
}
