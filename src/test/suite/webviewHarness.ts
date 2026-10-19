import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
import * as yaml from 'js-yaml';

const extensionRoot = path.resolve(__dirname, '../../../');
const samplesDir = path.join(extensionRoot, 'samples');
const webviewScript = fs.readFileSync(path.join(extensionRoot, 'media', 'webview.js'), 'utf8');

// Runs media/webview.js in a Node VM with a minimal DOM stub and returns the
// HTML the renderer writes into #content. The VS Code integration tests can
// only see the webview shell, so rendered output is asserted here.
// `followUp` is extra code run inside the webview context after the first render,
// e.g. to switch the selected Bitbucket pipeline and re-render.
export function renderInWebview(platform: string, yamlContent: string, followUp?: string): string {
	const elements: Record<string, any> = {};
	const getElement = (id: string) => {
		if (!elements[id]) {
			elements[id] = { innerHTML: '', textContent: '', style: {}, addEventListener: () => {} };
		}
		return elements[id];
	};
	let messageHandler: ((event: any) => void) | undefined;

	const context: any = {
		acquireVsCodeApi: () => ({ postMessage: () => {} }),
		jsyaml: yaml,
		mermaid: { initialize: () => {}, run: () => {} },
		console,
		setTimeout: () => 0,
		JSON,
		Object,
		Array,
		String,
		Set,
		document: {
			readyState: 'complete',
			getElementById: getElement,
			getElementsByClassName: () => [{}],
			addEventListener: () => {},
			createElement: () => {
				const el: any = { innerHTML: '' };
				Object.defineProperty(el, 'textContent', {
					set(value: string) {
						el.innerHTML = String(value)
							.replace(/&/g, '&amp;')
							.replace(/</g, '&lt;')
							.replace(/>/g, '&gt;');
					}
				});
				return el;
			}
		}
	};
	context.window = context;
	context.pvConfig = {
		platform,
		layoutPreference: 'automatic',
		palette: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'],
		edgeColor: '#ffffff',
		highlightColor: '#ffffff',
		accent: '#ffffff',
		cardBg: '#000000',
		textColor: '#ffffff'
	};
	context.addEventListener = (type: string, handler: (event: any) => void) => {
		if (type === 'message') { messageHandler = handler; }
	};

	vm.createContext(context);
	vm.runInContext(webviewScript, context);
	assert.ok(messageHandler, 'webview.js did not register a message handler');
	messageHandler!({ data: { command: 'refreshData', yamlContent } });
	if (followUp) {
		vm.runInContext(followUp, context);
	}
	return getElement('content').innerHTML;
}

export function readSample(file: string): string {
	return fs.readFileSync(path.join(samplesDir, file), 'utf8');
}

export function assertRendered(html: string) {
	assert.ok(html.length > 0, 'Expected rendered content');
	assert.ok(!html.includes('error-container'), `Expected no error, got: ${html.substring(0, 500)}`);
}
