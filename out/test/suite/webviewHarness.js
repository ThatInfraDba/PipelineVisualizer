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
exports.renderInWebview = renderInWebview;
exports.readSample = readSample;
exports.assertRendered = assertRendered;
const assert = __importStar(require("assert"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vm = __importStar(require("vm"));
const yaml = __importStar(require("js-yaml"));
const extensionRoot = path.resolve(__dirname, '../../../');
const samplesDir = path.join(extensionRoot, 'samples');
const webviewScript = fs.readFileSync(path.join(extensionRoot, 'media', 'webview.js'), 'utf8');
// Runs media/webview.js in a Node VM with a minimal DOM stub and returns the
// HTML the renderer writes into #content. The VS Code integration tests can
// only see the webview shell, so rendered output is asserted here.
// `followUp` is extra code run inside the webview context after the first render,
// e.g. to switch the selected Bitbucket pipeline and re-render.
function renderInWebview(platform, yamlContent, followUp) {
    const elements = {};
    const getElement = (id) => {
        if (!elements[id]) {
            elements[id] = { innerHTML: '', textContent: '', style: {}, addEventListener: () => { } };
        }
        return elements[id];
    };
    let messageHandler;
    const context = {
        acquireVsCodeApi: () => ({ postMessage: () => { } }),
        jsyaml: yaml,
        mermaid: { initialize: () => { }, run: () => { } },
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
            addEventListener: () => { },
            createElement: () => {
                const el = { innerHTML: '' };
                Object.defineProperty(el, 'textContent', {
                    set(value) {
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
    context.addEventListener = (type, handler) => {
        if (type === 'message') {
            messageHandler = handler;
        }
    };
    vm.createContext(context);
    vm.runInContext(webviewScript, context);
    assert.ok(messageHandler, 'webview.js did not register a message handler');
    messageHandler({ data: { command: 'refreshData', yamlContent } });
    if (followUp) {
        vm.runInContext(followUp, context);
    }
    return getElement('content').innerHTML;
}
function readSample(file) {
    return fs.readFileSync(path.join(samplesDir, file), 'utf8');
}
function assertRendered(html) {
    assert.ok(html.length > 0, 'Expected rendered content');
    assert.ok(!html.includes('error-container'), `Expected no error, got: ${html.substring(0, 500)}`);
}
//# sourceMappingURL=webviewHarness.js.map