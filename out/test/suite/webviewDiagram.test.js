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
const webviewHarness_1 = require("./webviewHarness");
function diagramOf(html) {
    const match = html.match(/<div class="mermaid">([\s\S]*?)<\/div>/);
    assert.ok(match, 'Expected a Mermaid diagram');
    return match[1];
}
function assertEdge(diagram, from, to) {
    assert.ok(diagram.split('\n').includes(`${from} --> ${to}`), `Expected edge ${from} --> ${to} in:\n${diagram}`);
}
function assertNoEdge(diagram, from, to) {
    assert.ok(!diagram.split('\n').includes(`${from} --> ${to}`), `Unexpected edge ${from} --> ${to} in:\n${diagram}`);
}
suite('Dependency graph diagrams', () => {
    test('GitHub Actions jobs follow needs: and run in parallel otherwise', () => {
        const diagram = diagramOf((0, webviewHarness_1.renderInWebview)('github', [
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
        const diagram = diagramOf((0, webviewHarness_1.renderInWebview)('azure', [
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
        const html = (0, webviewHarness_1.renderInWebview)('gitlab', [
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
        (0, webviewHarness_1.assertRendered)(html);
        const diagram = diagramOf(html);
        // compile=GLJ0, docs=GLJ1, unit=GLJ2, scan=GLJ3, release=GLJ4
        assertEdge(diagram, 'GLJ0', 'GLJ2');
        assertNoEdge(diagram, 'GLJ1', 'GLJ2');
        assertEdge(diagram, 'START', 'GLJ3');
        assertEdge(diagram, 'GLJ2', 'GLJ4');
        assertEdge(diagram, 'GLJ3', 'GLJ4');
    });
    test('GitLab without needs: keeps the stage chain', () => {
        const diagram = diagramOf((0, webviewHarness_1.renderInWebview)('gitlab', [
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
        const diagram = diagramOf((0, webviewHarness_1.renderInWebview)('bitbucket', [
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
    test('Node labels from the YAML use Mermaid entity codes and no click callbacks are emitted', () => {
        const diagram = diagramOf((0, webviewHarness_1.renderInWebview)('azure', [
            'stages:',
            '  - stage: Build',
            '    displayName: \'<img src=x onerror=alert(1)> "quoted"\'',
            '    jobs: []'
        ].join('\n')));
        assert.ok(!diagram.includes('<img') && !diagram.includes('&lt;img'), `Expected escaped label in:\n${diagram}`);
        assert.ok(diagram.includes('S0["#lt;img src=x onerror=alert(1)#gt; #quot;quoted#quot;"]'), `Expected escaped label in:\n${diagram}`);
        assert.ok(!/^click /m.test(diagram), `Unexpected click callback in:\n${diagram}`);
    });
});
//# sourceMappingURL=webviewDiagram.test.js.map