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
exports.stripCustomTags = stripCustomTags;
exports.parsePipelineYaml = parsePipelineYaml;
const yaml = __importStar(require("js-yaml"));
// Strip custom YAML tags (e.g. CloudFormation !Sub, !Ref, !GetAtt) that
// js-yaml rejects as unknown. Tag semantics are not needed for visualization.
function stripCustomTags(rawYaml) {
    return rawYaml.replace(/![A-Za-z][A-Za-z0-9]*/g, '');
}
// GitLab components and pipelines using `spec:inputs` are two YAML documents
// separated by `---`: a header containing only `spec:`, then the pipeline.
// Any other multi-document file is visualized from its first non-empty document.
// Keep in sync with parsePipelineYaml in media/webview.js.
function parsePipelineYaml(yamlContent) {
    const docs = yaml.loadAll(yamlContent).filter(d => d !== null && d !== undefined);
    if (docs.length === 0) {
        return { data: undefined };
    }
    const first = docs[0];
    const isSpecHeader = first && typeof first === 'object' && !Array.isArray(first) &&
        Object.keys(first).length === 1 && first.spec !== undefined;
    if (isSpecHeader) {
        return { data: docs.length > 1 ? docs[1] : {}, specHeader: first.spec };
    }
    return { data: first };
}
//# sourceMappingURL=yamlParser.js.map