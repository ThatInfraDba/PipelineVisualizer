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
    containerBg?: string;   // overrides var(--vscode-editor-background)
    cardBg?: string;        // overrides var(--vscode-textBlockQuote-background)
    textColor?: string;     // overrides var(--vscode-foreground)
    codeBg?: string;        // overrides var(--vscode-textCodeBlock-background)
}

const THEMES: Record<string, ThemeDef> = {
    dark: {
        mermaidTheme: 'dark',
        mermaidThemeVariables: { lineColor: '#ffffff', primaryTextColor: '#ffffff', tertiaryColor: '#ffffff' },
        edgeColor: '#ffffff',
        palette: ['#4E7FB5', '#5E9E3A', '#C4852A', '#6B3FA0', '#3A8A7A', '#B85555'],
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
        containerBg: '#f5f6fa',
        cardBg: '#e2e8f4',
        textColor: '#1e2432',
        codeBg: '#d8e0ee',
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
        containerBg: '#0f1f3a',
        cardBg: '#0a1628',
        textColor: '#E3F2FD',
        codeBg: '#071020',
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
        containerBg: '#112211',
        cardBg: '#0a1a0a',
        textColor: '#E8F5E9',
        codeBg: '#071007',
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
        containerBg: '#281800',
        cardBg: '#1a0e00',
        textColor: '#FBE9E7',
        codeBg: '#120800',
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
        containerBg: '#1e1e1e',
        cardBg: '#161616',
        textColor: '#d4d4d4',
        codeBg: '#111111',
    },
    // Okabe-Ito palette (with vermillion substitution) — safe for deuteranopia, protanopia, and tritanopia
    colorblind: {
        mermaidTheme: 'base',
        mermaidThemeVariables: {
            background: '#1e1e2e',
            primaryColor: '#0072B2',
            primaryTextColor: '#f0f0f8',
            primaryBorderColor: '#56B4E9',
            lineColor: '#dddddd',
            secondaryColor: '#E69F00',
            tertiaryColor: '#2a2a3e',
        },
        edgeColor: '#dddddd',
        // #009E73 (bluish-green) replaced with #D55E00 (vermillion) — eliminates
        // the tritanopia collapse between bluish-green and blue (#0072B2)
        palette: ['#E69F00', '#56B4E9', '#D55E00', '#F0E442', '#0072B2', '#CC79A7'],
        primary: '#56B4E9',
        secondary: '#0072B2',
        accent: '#E69F00',
        bodyGradientStart: '#1e1e2e',
        bodyGradientEnd: '#2a2a3e',
        platformSpecific: false,
        containerBg: '#232336',
        cardBg: '#1a1a2a',
        textColor: '#f0f0f8',
        codeBg: '#141422',
    },
    // IBM colorblind palette on near-black background — all colors WCAG AA vs black (min 4.6:1)
    highcontrast: {
        mermaidTheme: 'base',
        mermaidThemeVariables: {
            background: '#0a0a0a',
            primaryColor: '#648FFF',
            primaryTextColor: '#ffffff',
            primaryBorderColor: '#cccccc',
            lineColor: '#ffffff',
            secondaryColor: '#DC267F',
            tertiaryColor: '#1a1a1a',
        },
        edgeColor: '#ffffff',
        // #785EF0 (violet) replaced with #B8D4FF (light periwinkle) — violet and #648FFF blue
        // collapse under deuteranopia/protanopia; luminance separation resolves it
        palette: ['#FFB000', '#FE6100', '#DC267F', '#B8D4FF', '#648FFF', '#009E73'],
        primary: '#648FFF',
        secondary: '#DC267F',
        accent: '#FFB000',
        bodyGradientStart: '#000000',
        bodyGradientEnd: '#111111',
        platformSpecific: false,
        containerBg: '#111111',
        cardBg: '#080808',
        textColor: '#ffffff',
        codeBg: '#050505',
    },
};

export class PipelineVisualizerPanel {
	public static currentPanel: PipelineVisualizerPanel | undefined;
	public static readonly viewType = 'pipelineVisualizer';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _documentUri: vscode.Uri | undefined;
	private _yamlContent: string = '';
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri, yamlContent: string, pipelineData: any, layoutPreference: string, colorTheme: string, fileName: string = '') {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		const documentUri = vscode.window.activeTextEditor?.document.uri;

		if (PipelineVisualizerPanel.currentPanel) {
			PipelineVisualizerPanel.currentPanel._panel.reveal(column);
			PipelineVisualizerPanel.currentPanel._documentUri = documentUri;
			PipelineVisualizerPanel.currentPanel._update(yamlContent, pipelineData, layoutPreference, colorTheme, fileName);
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

		PipelineVisualizerPanel.currentPanel = new PipelineVisualizerPanel(panel, extensionUri);		PipelineVisualizerPanel.currentPanel._documentUri = documentUri;		PipelineVisualizerPanel.currentPanel._update(yamlContent, pipelineData, layoutPreference, colorTheme, fileName);
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
					case 'ready':
						this._panel.webview.postMessage({
							command: 'refreshData',
							yamlContent: this._yamlContent
						});
						return;
					case 'refresh':
						if (this._documentUri) {
							vscode.workspace.openTextDocument(this._documentUri).then(document => {
								const rawYaml = document.getText();
								const yamlContent = rawYaml.replace(/![A-Za-z][A-Za-z0-9]*/g, '');
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

	private _update(yamlContent: string, pipelineData: any, layoutPreference: string, colorTheme: string, fileName: string = '') {
		const webview = this._panel.webview;
		this._yamlContent = yamlContent;
		this._panel.webview.html = this._getHtmlForWebview(webview, pipelineData, layoutPreference, colorTheme, fileName);
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

	private _getNonce(): string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
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

	private _getHtmlForWebview(webview: vscode.Webview, pipelineData: any, layoutPreference: string, colorTheme: string, fileName: string = ''): string {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.js'));
		const platform = this._detectPlatform(pipelineData, fileName);
		const platformClass = platform === 'github' ? 'github-mode' : '';
		const platformBadge = platform === 'github'
			? '<span class="platform-badge github">🐙 GitHub Actions</span>'
			: platform === 'gitlab'
			? '<span class="platform-badge gitlab">🦊 GitLab CI</span>'
			: platform === 'aws-codebuild'
			? '<span class="platform-badge aws">🏗️ AWS CodeBuild</span>'
			: platform === 'aws-cloudformation'
			? '<span class="platform-badge aws">☁️ AWS CloudFormation</span>'
			: platform === 'bitbucket'
			? '<span class="platform-badge bitbucket">🪣 Bitbucket Pipelines</span>'
			: '<span class="platform-badge azure">☁️ Azure DevOps</span>';

		const escapedLayoutPref = layoutPreference.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

		// Resolve theme, applying platform-specific overrides for the dark theme
		const themeDef = THEMES[colorTheme] || THEMES['dark'];
		let { mermaidTheme, mermaidThemeVariables, edgeColor, palette, primary, secondary, accent, bodyGradientStart, bodyGradientEnd } = themeDef;
		if (themeDef.platformSpecific) {
			if (platform === 'github') {
				primary = '#2188ff'; secondary = '#6f42c1'; accent = '#2188ff';
			} else if (platform === 'gitlab') {
				primary = '#FC6D26'; secondary = '#E24329'; accent = '#FC6D26';
			} else if (platform === 'aws-codebuild' || platform === 'aws-cloudformation') {
				primary = '#FF9900'; secondary = '#C7511F'; accent = '#FF9900';
			} else if (platform === 'bitbucket') {
				primary = '#0052CC'; secondary = '#0747A6'; accent = '#0052CC';
			} else {
				primary = '#667eea'; secondary = '#764ba2'; accent = '#0078d4';
			}
			bodyGradientStart = primary;
			bodyGradientEnd = secondary;
		}

		const containerBgValue = themeDef.containerBg || 'var(--vscode-editor-background)';
		const cardBgValue = themeDef.cardBg || 'var(--vscode-textBlockQuote-background)';
		const textColorValue = themeDef.textColor || 'var(--vscode-foreground)';
		const codeBgValue = themeDef.codeBg || 'var(--vscode-textCodeBlock-background)';
		const codeTextValue = themeDef.textColor || 'var(--vscode-editor-foreground)';

		const stageCSS = this._generateStageCSS(palette);
		const highlightColor = this._hexToRgba(palette[0], 0.6);
		const nonce = this._getNonce();

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net ${webview.cspSource}; style-src 'unsafe-inline'; font-src https://cdn.jsdelivr.net;">
    <title>Pipeline Visualization</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
    <style>
        :root {
            --primary-color: ${primary};
            --secondary-color: ${secondary};
            --accent-color: ${accent};
        }
        body { font-family: var(--vscode-font-family); margin: 0; padding: 20px; background: linear-gradient(135deg, ${bodyGradientStart} 0%, ${bodyGradientEnd} 100%); min-height: 100vh; color: ${textColorValue}; }
        .container { max-width: 1400px; margin: 0 auto; background: ${containerBgValue}; border-radius: 12px; padding: 30px; }
        h1 { color: ${textColorValue}; border-bottom: 3px solid var(--accent-color); padding-bottom: 15px; }
        .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .refresh-btn { background: var(--accent-color); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; transition: opacity 0.2s; }
        .refresh-btn:hover { opacity: 0.8; }
        .refresh-btn:active { opacity: 0.6; }
        .platform-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-left: 15px; background: var(--accent-color); color: white; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
        .info-card { background: ${cardBgValue}; padding: 20px; border-radius: 8px; border-left: 4px solid var(--accent-color); }
        .info-card h3 { margin-top: 0; color: var(--accent-color); font-size: 14px; }
        .mermaid-container { background: ${cardBgValue}; padding: 30px; border-radius: 8px; margin: 30px 0; overflow-x: auto; }
        .stage, .job-container { margin: 30px 0; padding: 25px; border-radius: 8px; border: 3px solid var(--vscode-panel-border); transition: box-shadow 0.3s ease; scroll-margin-top: 20px; }
        ${stageCSS}
        .stage h2 { margin-top: 0; font-size: 22px; font-weight: 600; padding: 10px; border-radius: 6px; color: white; }
        .job-container { border-color: ${palette[0]}; background: linear-gradient(135deg, ${this._hexToRgba(palette[0], 0.12)} 0%, ${this._hexToRgba(palette[0], 0.05)} 100%); }
        .job-container h2 { margin-top: 0; font-size: 20px; font-weight: 600; }
        .job { background: ${containerBgValue}; padding: 15px; margin: 15px 0; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .steps { list-style: none; padding-left: 0; }
        .steps li { padding: 10px 15px; margin: 10px 0; background: linear-gradient(135deg, ${this._hexToRgba(accent, 0.12)} 0%, ${this._hexToRgba(accent, 0.05)} 100%); border-left: 4px solid ${accent}; border-radius: 6px; cursor: pointer; transition: all 0.2s ease; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .steps li:hover { transform: translateX(5px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); background: linear-gradient(135deg, ${this._hexToRgba(accent, 0.2)} 0%, ${this._hexToRgba(accent, 0.1)} 100%); }
        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); }
        .modal-content { background: ${containerBgValue}; margin: 5% auto; padding: 0; border-radius: 12px; width: 80%; max-width: 900px; max-height: 80vh; overflow: hidden; }
        .modal-header { padding: 20px 30px; background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%); color: white; }
        .modal-body { padding: 30px; max-height: calc(80vh - 100px); overflow-y: auto; }
        .close { color: white; float: right; font-size: 28px; cursor: pointer; }
        .code-block { background: ${codeBgValue}; color: ${codeTextValue}; padding: 15px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; font-family: var(--vscode-editor-font-family); font-size: 13px; max-height: 400px; overflow-y: auto; }
        .modal-body dl { display: grid; grid-template-columns: auto 1fr; gap: 15px 20px; }
        .modal-body dt { font-weight: bold; color: var(--accent-color); }
        .modal-body dd { margin: 0; padding: 8px; background: ${cardBgValue}; border-radius: 4px; }
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
            <button class="refresh-btn" id="refreshBtn">
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
    <script nonce="${nonce}">
        window.pvConfig = ${JSON.stringify({ platform, layoutPreference, palette, edgeColor, highlightColor, accent, cardBg: cardBgValue, textColor: textColorValue, mermaidTheme, mermaidThemeVariables })};
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
	}


	private _detectPlatform(data: any, fileName: string = ''): string {
		// Filename-based signals (strongest)
		if (fileName.toLowerCase().includes('gitlab-ci')) { return 'gitlab'; }
		if (fileName.toLowerCase().includes('buildspec')) { return 'aws-codebuild'; }
		if (fileName.toLowerCase().includes('bitbucket-pipelines')) { return 'bitbucket'; }
		// AWS CloudFormation: AWSTemplateFormatVersion is definitive; also catch templates
		// that omit it but have Resources with AWS:: typed entries
		if (data.AWSTemplateFormatVersion) { return 'aws-cloudformation'; }
		if (data.Resources && typeof data.Resources === 'object' &&
			Object.values(data.Resources as Record<string, any>).some((r: any) => r && r.Type && String(r.Type).startsWith('AWS::'))) {
			return 'aws-cloudformation';
		}
		// GitHub Actions: 'on' is the definitive marker
		if (data.on || (data.jobs && !Array.isArray(data.jobs) && Object.values(data.jobs).some((j: any) => j['runs-on'] || j.uses))) {
			return 'github';
		}
		// AWS CodeBuild: phases with canonical CodeBuild phase keys
		const CB_PHASES = new Set(['install', 'pre_build', 'build', 'post_build']);
		if (data.phases && typeof data.phases === 'object' && Object.keys(data.phases).some(k => CB_PHASES.has(k))) {
			return 'aws-codebuild';
		}
		// Bitbucket Pipelines: 'pipelines' is a unique top-level key
		if (data.pipelines) { return 'bitbucket'; }
		// Azure-definitive markers
		if (data.pool || (data.jobs && Array.isArray(data.jobs)) || data.trigger || data.pr) { return 'azure'; }
		// GitLab: stages is an array of strings (Azure stages are objects with stage/jobs properties)
		if (Array.isArray(data.stages) && data.stages.some((s: any) => typeof s === 'string')) { return 'gitlab'; }
		// GitLab: workflow key is GitLab-specific
		if (data.workflow) { return 'gitlab'; }
		// Azure: stages as objects
		if (data.stages) { return 'azure'; }
		// GitLab fallback: flat top-level job structure with script key
		const RESERVED = new Set(['stages', 'variables', 'default', 'include', 'workflow', 'spec']);
		if (Object.keys(data).some(k => !RESERVED.has(k) && !k.startsWith('.') && typeof data[k] === 'object' && data[k] !== null && 'script' in data[k])) {
			return 'gitlab';
		}
		return 'azure';
	}
}
