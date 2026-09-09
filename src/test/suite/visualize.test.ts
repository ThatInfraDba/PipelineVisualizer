import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const extensionRoot = path.resolve(__dirname, '../../../');
const samplesDir = path.join(extensionRoot, 'samples');

// Reach into the compiled extension module directly so tests can inspect
// PipelineVisualizerPanel.currentPanel — the extension host resolves this
// same absolute path when activating, so both share Node's module cache
// and therefore the same singleton.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PipelineVisualizerPanel } = require(path.join(extensionRoot, 'out', 'visualizerPanel.js'));

interface SampleCase {
	file: string;
	expectedBadge: string;
}

const SAMPLES: SampleCase[] = [
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

			const html: string = PipelineVisualizerPanel.currentPanel._panel.webview.html;
			assert.ok(html.includes('<!DOCTYPE html>'), 'Expected a full HTML document to be rendered');
			assert.ok(html.includes(expectedBadge), `Expected webview HTML to include platform badge "${expectedBadge}"`);

			const yamlContent: string = PipelineVisualizerPanel.currentPanel._yamlContent;
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
		} finally {
			fs.unlinkSync(tmpFile);
		}
	});
});
