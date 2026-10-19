import * as assert from 'assert';
import { assertRendered, readSample, renderInWebview } from './webviewHarness';

function selectBitbucketPipeline(type: string, key: string): string {
	return `bbSelectedPipeline = { type: ${JSON.stringify(type)}, key: ${JSON.stringify(key)} }; renderBitbucket(pipelineData);`;
}

function assertIncludesAll(html: string, expected: string[]) {
	for (const text of expected) {
		assert.ok(html.includes(text), `Expected output to include ${JSON.stringify(text)}`);
	}
}

suite('Bitbucket Pipelines features', () => {
	const sample = readSample('bitbucket-advanced.yml');

	test('shows triggers, agents, clone, options and services', () => {
		const html = renderInWebview('bitbucket', sample);
		assertRendered(html);
		assertIncludesAll(html, [
			'🔔 Triggers',
			'<code>pipeline-completed</code>',
			'BITBUCKET_TRIGGER_PIPELINE_STATUS == "FAILED"',
			'data-bb-select="custom::notify-failure"',
			'🤖 Agents',
			'readme-docs-updater',
			'depth 50, LFS',
			'max-time 30 min, size 2x',
			'postgres'
		]);
	});

	test('shows step and stage options', () => {
		const html = renderInWebview('bitbucket', sample);
		assertIncludesAll(html, [
			'cloud ARM',
			'⛔ Fail fast',
			'changes in src/**',
			'🚀 Deployment: staging',
			'⏸️ Manual Trigger',
			'changes in infra/**',
			'🔐 OIDC:</strong> enabled',
			'20 min',
			'self.hosted, linux'
		]);
	});

	test('agent steps show auth scopes and the agent prompt in the step popup', () => {
		const html = renderInWebview('bitbucket', sample, selectBitbucketPipeline('custom', 'update-readme-docs')
			+ ' showStepDetails(Object.keys(allSteps).find(k => allSteps[k].agent));'
			// Surface the popup body alongside the content for assertions
			+ ' document.getElementById("content").innerHTML += document.getElementById("modalBody").innerHTML;');
		assertIncludesAll(html, ['🤖 agent: readme-docs-updater', 'write:repository:bitbucket', '🤖 Agent Prompt', 'Update README.md when public APIs change.']);
	});

	test('custom pipeline variables are listed', () => {
		const html = renderInWebview('bitbucket', sample, selectBitbucketPipeline('custom', 'notify-failure'));
		assertIncludesAll(html, ['🔧 Run-time Variables', '<code>CHANNEL</code>', '#builds, #alerts', '🔌 pipe: atlassian/slack-notify:2.0.0']);
	});

	test('imported pipelines render as a reference', () => {
		const html = renderInWebview('bitbucket', sample, selectBitbucketPipeline('custom', 'shared-release'));
		assertRendered(html);
		assertIncludesAll(html, ['📥 Imported Pipeline', 'shared-pipelines:main:release']);
		const defaultHtml = renderInWebview('bitbucket', sample);
		assert.ok(defaultHtml.includes('📥 Imported from <code>shared-pipelines:main:release</code>'));
	});
});
