import * as yaml from 'js-yaml';

export interface ParsedPipeline {
	data: any;
	// GitLab CI/CD component / `spec:inputs` header document, when present
	specHeader?: any;
}

// Strip custom YAML tags (e.g. CloudFormation !Sub, !Ref, !GetAtt) that
// js-yaml rejects as unknown. Tag semantics are not needed for visualization.
export function stripCustomTags(rawYaml: string): string {
	return rawYaml.replace(/![A-Za-z][A-Za-z0-9]*/g, '');
}

// GitLab components and pipelines using `spec:inputs` are two YAML documents
// separated by `---`: a header containing only `spec:`, then the pipeline.
// Any other multi-document file is visualized from its first non-empty document.
// Keep in sync with parsePipelineYaml in media/webview.js.
export function parsePipelineYaml(yamlContent: string): ParsedPipeline {
	const docs = yaml.loadAll(yamlContent).filter(d => d !== null && d !== undefined);
	if (docs.length === 0) {
		return { data: undefined };
	}
	const first: any = docs[0];
	const isSpecHeader = first && typeof first === 'object' && !Array.isArray(first) &&
		Object.keys(first).length === 1 && first.spec !== undefined;
	if (isSpecHeader) {
		return { data: docs.length > 1 ? docs[1] : {}, specHeader: first.spec };
	}
	return { data: first };
}
