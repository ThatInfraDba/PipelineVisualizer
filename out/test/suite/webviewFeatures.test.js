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
function selectBitbucketPipeline(type, key) {
    return `bbSelectedPipeline = { type: ${JSON.stringify(type)}, key: ${JSON.stringify(key)} }; renderBitbucket(pipelineData);`;
}
function assertIncludesAll(html, expected) {
    for (const text of expected) {
        assert.ok(html.includes(text), `Expected output to include ${JSON.stringify(text)}`);
    }
}
suite('Bitbucket Pipelines features', () => {
    const sample = (0, webviewHarness_1.readSample)('bitbucket-advanced.yml');
    test('shows triggers, agents, clone, options and services', () => {
        const html = (0, webviewHarness_1.renderInWebview)('bitbucket', sample);
        (0, webviewHarness_1.assertRendered)(html);
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
        const html = (0, webviewHarness_1.renderInWebview)('bitbucket', sample);
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
        const html = (0, webviewHarness_1.renderInWebview)('bitbucket', sample, selectBitbucketPipeline('custom', 'update-readme-docs')
            + ' showStepDetails(Object.keys(allSteps).find(k => allSteps[k].agent));'
            // Surface the popup body alongside the content for assertions
            + ' document.getElementById("content").innerHTML += document.getElementById("modalBody").innerHTML;');
        assertIncludesAll(html, ['🤖 agent: readme-docs-updater', 'write:repository:bitbucket', '🤖 Agent Prompt', 'Update README.md when public APIs change.']);
    });
    test('custom pipeline variables are listed', () => {
        const html = (0, webviewHarness_1.renderInWebview)('bitbucket', sample, selectBitbucketPipeline('custom', 'notify-failure'));
        assertIncludesAll(html, ['🔧 Run-time Variables', '<code>CHANNEL</code>', '#builds, #alerts', '🔌 pipe: atlassian/slack-notify:2.0.0']);
    });
    test('imported pipelines render as a reference', () => {
        const html = (0, webviewHarness_1.renderInWebview)('bitbucket', sample, selectBitbucketPipeline('custom', 'shared-release'));
        (0, webviewHarness_1.assertRendered)(html);
        assertIncludesAll(html, ['📥 Imported Pipeline', 'shared-pipelines:main:release']);
        const defaultHtml = (0, webviewHarness_1.renderInWebview)('bitbucket', sample);
        assert.ok(defaultHtml.includes('📥 Imported from <code>shared-pipelines:main:release</code>'));
    });
});
//# sourceMappingURL=webviewFeatures.test.js.map