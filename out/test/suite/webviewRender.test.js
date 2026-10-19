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
suite('Webview rendering', () => {
    test('Bitbucket pipe: and agent: script entries render readable labels (#29)', () => {
        const sampleHtml = (0, webviewHarness_1.renderInWebview)('bitbucket', (0, webviewHarness_1.readSample)('bitbucket-pipelines.yml'));
        (0, webviewHarness_1.assertRendered)(sampleHtml);
        assert.ok(!sampleHtml.includes('[object Object]'), 'Expected no [object Object] in Bitbucket output');
        const html = (0, webviewHarness_1.renderInWebview)('bitbucket', [
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
        (0, webviewHarness_1.assertRendered)(html);
        assert.ok(!html.includes('[object Object]'));
        assert.ok(html.includes('pipe: atlassian/aws-s3-deploy:1.1.0'));
        assert.ok(html.includes('agent: readme-docs-updater'));
        assert.ok(html.includes('pipe: atlassian/slack-notify:2.0.0'));
    });
    test('GitLab .pre/.post and undeclared stages are rendered (#30)', () => {
        const html = (0, webviewHarness_1.renderInWebview)('gitlab', [
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
        (0, webviewHarness_1.assertRendered)(html);
        for (const job of ['lint', 'build', 'notify', 'smoke']) {
            assert.ok(html.includes(`<h3>${job}</h3>`), `Expected job "${job}" to be rendered`);
        }
        assert.ok(html.indexOf('🦊 .pre') < html.indexOf('🦊 build'), 'Expected .pre before build');
        assert.ok(html.indexOf('🦊 verify') < html.indexOf('🦊 .post'), 'Expected .post last');
        assert.ok(html.includes('is not declared in <code>stages:</code>'), 'Expected undeclared stage warning');
    });
    test('GitLab defaults to .pre, build, test, deploy, .post without stages: (#30)', () => {
        const html = (0, webviewHarness_1.renderInWebview)('gitlab', [
            'first:',
            '  stage: .pre',
            '  script: [echo first]',
            'unit:',
            '  script: [echo unit]'
        ].join('\n'));
        (0, webviewHarness_1.assertRendered)(html);
        assert.ok(html.includes('<h3>first</h3>'));
        assert.ok(html.includes('<h3>unit</h3>'));
        assert.ok(!html.includes('is not declared'), 'Default stages should not be flagged as undeclared');
    });
    test('GitLab component with spec: header parses and shows inputs (#31)', () => {
        const html = (0, webviewHarness_1.renderInWebview)('gitlab', (0, webviewHarness_1.readSample)('gitlab-component.yml'));
        (0, webviewHarness_1.assertRendered)(html);
        assert.ok(html.includes('📥 Inputs'), 'Expected inputs section');
        assert.ok(html.includes('<code>environment</code>'));
        assert.ok(html.includes('dev, staging, production'));
        assert.ok(html.includes('<h3>prepare</h3>'), 'Expected .pre job');
        assert.ok(html.includes('<h3>cleanup</h3>'), 'Expected .post job');
    });
    test('AWS CodeBuild secondary artifacts are rendered (#32)', () => {
        const html = (0, webviewHarness_1.renderInWebview)('aws-codebuild', (0, webviewHarness_1.readSample)('awsbuildspec-sample.yml'));
        (0, webviewHarness_1.assertRendered)(html);
        assert.ok(html.includes('+ 2 secondary'), 'Expected secondary artifacts in the info card');
        assert.ok(html.includes('Secondary: <code>coverage</code>'));
        assert.ok(html.includes('Secondary: <code>sourcemaps</code>'));
        assert.ok(html.includes('coverage-report'));
    });
    test('Azure jobs-only pipeline renders its jobs (#33)', () => {
        const html = (0, webviewHarness_1.renderInWebview)('azure', (0, webviewHarness_1.readSample)('azure-jobs-only.yaml'));
        (0, webviewHarness_1.assertRendered)(html);
        assert.ok(html.includes('Build application'));
        assert.ok(html.includes('Run tests'));
        assert.ok(html.includes('ubuntu-latest'), 'Expected vmImage in the Pool card');
    });
    test('Azure steps-only pipeline renders its steps (#33)', () => {
        const html = (0, webviewHarness_1.renderInWebview)('azure', (0, webviewHarness_1.readSample)('azure-steps-only.yaml'));
        (0, webviewHarness_1.assertRendered)(html);
        assert.ok(html.includes('Build solution'));
        assert.ok(html.includes('Run tests'));
        assert.ok(html.includes('windows-latest'), 'Expected vmImage in the Pool card');
    });
});
//# sourceMappingURL=webviewRender.test.js.map