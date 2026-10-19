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
function renderInWebview(platform: string, yamlContent: string): string {
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

	vm.runInNewContext(webviewScript, context);
	assert.ok(messageHandler, 'webview.js did not register a message handler');
	messageHandler!({ data: { command: 'refreshData', yamlContent } });
	return getElement('content').innerHTML;
}

function readSample(file: string): string {
	return fs.readFileSync(path.join(samplesDir, file), 'utf8');
}

function assertRendered(html: string) {
	assert.ok(html.length > 0, 'Expected rendered content');
	assert.ok(!html.includes('error-container'), `Expected no error, got: ${html.substring(0, 500)}`);
}

suite('Webview rendering', () => {
	test('Bitbucket pipe: and agent: script entries render readable labels (#29)', () => {
		const sampleHtml = renderInWebview('bitbucket', readSample('bitbucket-pipelines.yml'));
		assertRendered(sampleHtml);
		assert.ok(!sampleHtml.includes('[object Object]'), 'Expected no [object Object] in Bitbucket output');

		const html = renderInWebview('bitbucket', [
			'pipelines:',
			'  default:',
			'    - step:',
			'        name: Deploy',
			'        script:',
			'          - pipe: atlassian/aws-s3-deploy:1.1.0',
			'            variables:',
			'              S3_BUCKET: my-bucket',
			'          - agent: readme-docs-updater',
			'        after-script:',
			'          - pipe: atlassian/slack-notify:2.0.0'
		].join('\n'));
		assertRendered(html);
		assert.ok(!html.includes('[object Object]'));
		assert.ok(html.includes('pipe: atlassian/aws-s3-deploy:1.1.0'));
		assert.ok(html.includes('agent: readme-docs-updater'));
		assert.ok(html.includes('pipe: atlassian/slack-notify:2.0.0'));
	});

	test('GitLab .pre/.post and undeclared stages are rendered (#30)', () => {
		const html = renderInWebview('gitlab', [
			'stages: [build]',
			'lint:',
			'  stage: .pre',
			'  script: [echo lint]',
			'build:',
			'  stage: build',
			'  script: [echo build]',
			'notify:',
			'  stage: .post',
			'  script: [echo notify]',
			'smoke:',
			'  stage: verify',
			'  script: [echo smoke]'
		].join('\n'));
		assertRendered(html);
		for (const job of ['lint', 'build', 'notify', 'smoke']) {
			assert.ok(html.includes(`<h3>${job}</h3>`), `Expected job "${job}" to be rendered`);
		}
		assert.ok(html.indexOf('🦊 .pre') < html.indexOf('🦊 build'), 'Expected .pre before build');
		assert.ok(html.indexOf('🦊 verify') < html.indexOf('🦊 .post'), 'Expected .post last');
		assert.ok(html.includes('is not declared in <code>stages:</code>'), 'Expected undeclared stage warning');
	});

	test('GitLab defaults to .pre, build, test, deploy, .post without stages: (#30)', () => {
		const html = renderInWebview('gitlab', [
			'first:',
			'  stage: .pre',
			'  script: [echo first]',
			'unit:',
			'  script: [echo unit]'
		].join('\n'));
		assertRendered(html);
		assert.ok(html.includes('<h3>first</h3>'));
		assert.ok(html.includes('<h3>unit</h3>'));
		assert.ok(!html.includes('is not declared'), 'Default stages should not be flagged as undeclared');
	});

	test('GitLab component with spec: header parses and shows inputs (#31)', () => {
		const html = renderInWebview('gitlab', readSample('gitlab-component.yml'));
		assertRendered(html);
		assert.ok(html.includes('📥 Inputs'), 'Expected inputs section');
		assert.ok(html.includes('<code>environment</code>'));
		assert.ok(html.includes('dev, staging, production'));
		assert.ok(html.includes('<h3>prepare</h3>'), 'Expected .pre job');
		assert.ok(html.includes('<h3>cleanup</h3>'), 'Expected .post job');
	});

	test('AWS CodeBuild secondary artifacts are rendered (#32)', () => {
		const html = renderInWebview('aws-codebuild', readSample('awsbuildspec-sample.yml'));
		assertRendered(html);
		assert.ok(html.includes('+ 2 secondary'), 'Expected secondary artifacts in the info card');
		assert.ok(html.includes('Secondary: <code>coverage</code>'));
		assert.ok(html.includes('Secondary: <code>sourcemaps</code>'));
		assert.ok(html.includes('coverage-report'));
	});

	test('Azure jobs-only pipeline renders its jobs (#33)', () => {
		const html = renderInWebview('azure', readSample('azure-jobs-only.yaml'));
		assertRendered(html);
		assert.ok(html.includes('Build application'));
		assert.ok(html.includes('Run tests'));
		assert.ok(html.includes('ubuntu-latest'), 'Expected vmImage in the Pool card');
	});

	test('Azure steps-only pipeline renders its steps (#33)', () => {
		const html = renderInWebview('azure', readSample('azure-steps-only.yaml'));
		assertRendered(html);
		assert.ok(html.includes('Build solution'));
		assert.ok(html.includes('Run tests'));
		assert.ok(html.includes('windows-latest'), 'Expected vmImage in the Pool card');
	});
});
