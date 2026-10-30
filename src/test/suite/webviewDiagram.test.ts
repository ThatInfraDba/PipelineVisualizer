import * as assert from 'assert';
import { assertRendered, renderInWebview } from './webviewHarness';

function diagramOf(html: string): string {
	const match = html.match(/<div class="mermaid">([\s\S]*?)<\/div>/);
	assert.ok(match, 'Expected a Mermaid diagram');
	return match![1];
}

function assertEdge(diagram: string, from: string, to: string) {
	assert.ok(diagram.split('\n').includes(`${from} --> ${to}`), `Expected edge ${from} --> ${to} in:\n${diagram}`);
}

function assertNoEdge(diagram: string, from: string, to: string) {
	assert.ok(!diagram.split('\n').includes(`${from} --> ${to}`), `Unexpected edge ${from} --> ${to} in:\n${diagram}`);
}

suite('Dependency graph diagrams', () => {
	test('GitHub Actions jobs follow needs: and run in parallel otherwise', () => {
		const diagram = diagramOf(renderInWebview('github', [
			'on: push',
			'jobs:',
			'  build:',
			'    runs-on: ubuntu-latest',
			'    steps: [{ run: echo build }]',
			'  lint:',
			'    runs-on: ubuntu-latest',
			'    steps: [{ run: echo lint }]',
			'  deploy:',
			'    needs: [build, lint]',
			'    runs-on: ubuntu-latest',
			'    steps: [{ run: echo deploy }]'
		].join('\n')));
		assertEdge(diagram, 'START', 'J0');
		assertEdge(diagram, 'START', 'J1');
		assertEdge(diagram, 'J0', 'J2');
		assertEdge(diagram, 'J1', 'J2');
		assertEdge(diagram, 'J2', 'END');
		assertNoEdge(diagram, 'J0', 'J1');
		assert.ok(diagram.includes('linkStyle default'));
	});

	test('Azure DevOps stages follow dependsOn, defaulting to the previous stage', () => {
		const diagram = diagramOf(renderInWebview('azure', [
			'stages:',
			'  - stage: Build',
			'    jobs: []',
			'  - stage: TestA',
			'    jobs: []',
			'  - stage: TestB',
			'    dependsOn: Build',
			'    jobs: []',
			'  - stage: Audit',
			'    dependsOn: []',
			'    jobs: []',
			'  - stage: Deploy',
			'    dependsOn: [TestA, TestB]',
			'    jobs: []'
		].join('\n')));
		assertEdge(diagram, 'S0', 'S1');
		assertEdge(diagram, 'S0', 'S2');
		assertEdge(diagram, 'START', 'S3');
		assertEdge(diagram, 'S1', 'S4');
		assertEdge(diagram, 'S2', 'S4');
		assertNoEdge(diagram, 'S2', 'S3');
		assertEdge(diagram, 'S3', 'END');
	});

	test('GitLab uses a job-level graph when needs: is present', () => {
		const html = renderInWebview('gitlab', [
			'stages: [build, test, deploy]',
			'compile:',
			'  stage: build',
			'  script: [echo]',
			'docs:',
			'  stage: build',
			'  script: [echo]',
			'unit:',
			'  stage: test',
			'  needs: [compile]',
			'  script: [echo]',
			'scan:',
			'  stage: test',
			'  needs: []',
			'  script: [echo]',
			'release:',
			'  stage: deploy',
			'  script: [echo]'
		].join('\n'));
		assertRendered(html);
		const diagram = diagramOf(html);
		// compile=GLJ0, docs=GLJ1, unit=GLJ2, scan=GLJ3, release=GLJ4
		assertEdge(diagram, 'GLJ0', 'GLJ2');
		assertNoEdge(diagram, 'GLJ1', 'GLJ2');
		assertEdge(diagram, 'START', 'GLJ3');
		assertEdge(diagram, 'GLJ2', 'GLJ4');
		assertEdge(diagram, 'GLJ3', 'GLJ4');
	});

	test('GitLab without needs: keeps the stage chain', () => {
		const diagram = diagramOf(renderInWebview('gitlab', [
			'stages: [build, test]',
			'a:',
			'  stage: build',
			'  script: [echo]',
			'b:',
			'  stage: test',
			'  script: [echo]'
		].join('\n')));
		assertEdge(diagram, 'START', 'GL0');
		assertEdge(diagram, 'GL0', 'GL1');
		assertEdge(diagram, 'GL1', 'END');
	});

	test('Bitbucket parallel groups fan out and back in', () => {
		const diagram = diagramOf(renderInWebview('bitbucket', [
			'pipelines:',
			'  default:',
			'    - step:',
			'        name: Build',
			'        script: [echo]',
			'    - parallel:',
			'        - step:',
			'            name: Unit',
			'            script: [echo]',
			'        - step:',
			'            name: Lint',
			'            script: [echo]',
			'    - step:',
			'        name: Deploy',
			'        script: [echo]'
		].join('\n')));
		assertEdge(diagram, 'BB0', 'BB1_0');
		assertEdge(diagram, 'BB0', 'BB1_1');
		assertEdge(diagram, 'BB1_0', 'BB2');
		assertEdge(diagram, 'BB1_1', 'BB2');
		assertNoEdge(diagram, 'BB1_0', 'BB1_1');
	});

	test('Node labels from the YAML are HTML-escaped and no click callbacks are emitted', () => {
		const diagram = diagramOf(renderInWebview('azure', [
			'stages:',
			'  - stage: Build',
			'    displayName: \'<img src=x onerror=alert(1)> "quoted"\'',
			'    jobs: []'
		].join('\n')));
		assert.ok(!diagram.includes('<img'), `Expected escaped label in:\n${diagram}`);
		assert.ok(diagram.includes('&lt;img src=x onerror=alert(1)&gt; \'quoted\''), `Expected escaped label in:\n${diagram}`);
		assert.ok(!/^click /m.test(diagram), `Unexpected click callback in:\n${diagram}`);
	});
});
