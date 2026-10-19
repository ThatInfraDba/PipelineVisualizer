        const vscode = acquireVsCodeApi();
        let pipelineData = null;
        let allSteps = {};
        let stepCounter = 0;
        const detectedPlatform = window.pvConfig.platform;
        const layoutPreference = window.pvConfig.layoutPreference;
        const themePalette = window.pvConfig.palette;
        const themeEdgeColor = window.pvConfig.edgeColor;
        const themeHighlightColor = window.pvConfig.highlightColor;
        const themeAccent = window.pvConfig.accent;
        const themeCardBg = window.pvConfig.cardBg;
        const themeTextColor = window.pvConfig.textColor;

        let pipelineSpec = null;

        // GitLab components and pipelines using `spec:inputs` are two YAML documents
        // separated by `---`: a header containing only `spec:`, then the pipeline.
        // Keep in sync with parsePipelineYaml in src/yamlParser.ts.
        function parsePipelineYaml(yamlContent) {
            const docs = jsyaml.loadAll(yamlContent).filter(d => d !== null && d !== undefined);
            if (docs.length === 0) { return { data: undefined, specHeader: null }; }
            const first = docs[0];
            const isSpecHeader = first && typeof first === 'object' && !Array.isArray(first) &&
                Object.keys(first).length === 1 && first.spec !== undefined;
            if (isSpecHeader) {
                return { data: docs.length > 1 ? docs[1] : {}, specHeader: first.spec };
            }
            return { data: first, specHeader: null };
        }

        function refreshVisualization() {
            vscode.postMessage({ command: 'refresh' });
        }

        // Catch any uncaught JS error in the webview and surface it instead of blanking the panel
        window.onerror = function(msg, src, line, col, err) {
            const content = document.getElementById('content');
            if (content && !content.innerHTML.trim()) {
                content.innerHTML = '<div class="error-container"><h2><span class="error-icon">⚠️</span><span>Rendering Error</span></h2>' +
                    '<div class="error-message">' + String(msg) + '</div>' +
                    '<div class="error-help"><strong>Details:</strong> ' + (err ? String(err) : 'line ' + line + ', col ' + col) + '</div></div>';
            }
        };

        function showError(title, message, details) {
            const safeMessage = (message != null) ? String(message) : 'Unknown error';
            const errorHtml = `
                <div class="error-container">
                    <h2>
                        <span class="error-icon">⚠️</span>
                        <span>${title}</span>
                    </h2>
                    <div class="error-message">${escapeHtml(safeMessage)}</div>
                    ${details ? `<div class="error-help">${details}</div>` : ''}
                </div>
            `;
            const contentEl = document.getElementById('content');
            if (contentEl) { contentEl.innerHTML = errorHtml; }
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'refreshData') {
                try {
                    const parsed = parsePipelineYaml(message.yamlContent);
                    pipelineData = parsed.data;
                    pipelineSpec = parsed.specHeader;

                    if (!pipelineData || typeof pipelineData !== 'object') {
                        showError(
                            'Invalid Pipeline Data',
                            'The YAML file does not contain valid pipeline data.',
                            '<strong>Tip:</strong> Make sure your YAML file is a valid Azure DevOps pipeline or GitHub Actions workflow.'
                        );
                        return;
                    }

                    if (detectedPlatform === 'github') {
                        renderGitHub(pipelineData);
                    } else if (detectedPlatform === 'gitlab') {
                        renderGitLab(pipelineData);
                    } else if (detectedPlatform === 'aws-codebuild') {
                        renderAWSCodeBuild(pipelineData);
                    } else if (detectedPlatform === 'aws-cloudformation') {
                        renderAWSCloudFormation(pipelineData);
                    } else if (detectedPlatform === 'bitbucket') {
                        renderBitbucket(pipelineData);
                    } else {
                        renderAzure(pipelineData);
                    }
                } catch (error) {
                    let errorMessage = error.message || 'Unknown error occurred';
                    let errorDetails = '';

                    if (errorMessage.includes('bad indentation')) {
                        errorDetails = '<strong>Indentation Error:</strong> YAML is sensitive to indentation. Make sure you use consistent spaces (not tabs) for indentation.';
                    } else if (errorMessage.includes('unexpected')) {
                        errorDetails = '<strong>Syntax Error:</strong> There may be a missing colon, quote, or bracket in your YAML file.';
                    } else if (errorMessage.includes('duplicate')) {
                        errorDetails = '<strong>Duplicate Key:</strong> You have duplicate keys in your YAML file. Each key must be unique within its scope.';
                    } else {
                        errorDetails = '<strong>Parsing Error:</strong> Unable to parse the YAML file. Please check your syntax and try again.';
                    }

                    showError('YAML Parsing Error', errorMessage, errorDetails);
                }
            }
        });

        function scrollToStage(stageId) {
            const element = document.getElementById(stageId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                element.style.boxShadow = `0 0 20px ${themeHighlightColor}`;
                setTimeout(() => { element.style.boxShadow = ''; }, 2000);
            }
        }

        const modal = document.getElementById('stepModal');
        const closeBtn = document.getElementsByClassName('close')[0];
        if (closeBtn) { closeBtn.onclick = () => modal.style.display = 'none'; }
        window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.style.display = 'none'; });

        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) { refreshBtn.addEventListener('click', refreshVisualization); }

        // Delegated handler — CSP blocks inline onclick= so we use data-step attributes
        document.getElementById('content').addEventListener('click', function(e) {
            const target = e.target.closest('[data-step]');
            if (target) showStepDetails(target.dataset.step);
        });

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function chooseDirection(depth) {
            if (layoutPreference === 'horizontal') { return 'LR'; }
            if (layoutPreference === 'vertical') { return 'TD'; }
            return depth <= 6 ? 'LR' : 'TD';
        }

        // Builds a Mermaid flowchart from nodes and dependency edges. Nodes without
        // incoming edges start from START and nodes without outgoing edges lead to END,
        // so independent nodes render as parallel branches.
        // nodes: [{ id, label, color, scrollTo }]; edges: [[fromId, toId]]
        function buildFlowchart(nodes, edges) {
            const ids = new Set(nodes.map(n => n.id));
            const seen = new Set();
            const uniqueEdges = edges.filter(([from, to]) => {
                const key = from + '>' + to;
                if (!ids.has(from) || !ids.has(to) || from === to || seen.has(key)) { return false; }
                seen.add(key);
                return true;
            });
            const hasIncoming = new Set(uniqueEdges.map(e => e[1]));
            const hasOutgoing = new Set(uniqueEdges.map(e => e[0]));

            // Longest path picks the layout direction; capped iterations tolerate cycles
            const depth = {};
            nodes.forEach(n => { depth[n.id] = 1; });
            for (let i = 0; i < nodes.length; i++) {
                let changed = false;
                uniqueEdges.forEach(([from, to]) => {
                    if (depth[to] < depth[from] + 1) { depth[to] = depth[from] + 1; changed = true; }
                });
                if (!changed) { break; }
            }
            const maxDepth = nodes.reduce((m, n) => Math.max(m, depth[n.id]), 0);

            let diagram = `graph ${chooseDirection(maxDepth)}\nSTART([Start])`;
            nodes.forEach(n => { diagram += `\n${n.id}["${String(n.label).replace(/"/g, "'")}"]`; });
            diagram += '\nEND([End])';
            if (!nodes.length) { diagram += '\nSTART --> END'; }
            nodes.forEach(n => { if (!hasIncoming.has(n.id)) { diagram += `\nSTART --> ${n.id}`; } });
            uniqueEdges.forEach(([from, to]) => { diagram += `\n${from} --> ${to}`; });
            nodes.forEach(n => { if (!hasOutgoing.has(n.id)) { diagram += `\n${n.id} --> END`; } });
            nodes.forEach(n => {
                diagram += `\nstyle ${n.id} fill:${n.color},stroke:${n.color},color:#fff`;
                if (n.scrollTo) {
                    const handler = 'pvScrollTo_' + n.id;
                    window[handler] = function() { scrollToStage(n.scrollTo); };
                    diagram += `\nclick ${n.id} ${handler}`;
                }
            });
            diagram += `\nlinkStyle default stroke:${themeEdgeColor},stroke-width:2px,fill:none`;
            return `<div class="mermaid-container"><div class="mermaid">${diagram}</div></div>`;
        }

        // Sequential nodes: each one depends on the previous
        function chainEdges(ids) {
            const edges = [];
            for (let i = 1; i < ids.length; i++) { edges.push([ids[i - 1], ids[i]]); }
            return edges;
        }

        function asList(value) {
            if (value === undefined || value === null) { return []; }
            return Array.isArray(value) ? value : [value];
        }

        function showStepDetails(stepId) {
            const step = allSteps[stepId];
            if (!step) return;

            document.getElementById('modalTitle').textContent = step.displayName || step.name || step.uses || 'Step Details';
            let html = '<dl>';

            if (detectedPlatform === 'github') {
                if (step.name) html += `<dt>📝 Name</dt><dd>${step.name}</dd>`;
                if (step.uses) html += `<dt>🔧 Uses</dt><dd><code>${step.uses}</code></dd>`;
                if (step.run) html += `<dt>💻 Script</dt><dd><div class="code-block">${escapeHtml(step.run)}</div></dd>`;
            } else {
                const script = step.script || step.pwsh || step.bash || step.powershell || (step.inputs && step.inputs.script);
                if (script) html += `<dt>💻 Script</dt><dd><div class="code-block">${escapeHtml(script)}</div></dd>`;
                if (step.task) html += `<dt>📦 Task</dt><dd>${step.task}</dd>`;
                if (step.displayName) html += `<dt>📝 Name</dt><dd>${step.displayName}</dd>`;
            }

            html += `<dt>🔍 Raw Data</dt><dd><div class="code-block">${escapeHtml(JSON.stringify(step, null, 2))}</div></dd>`;
            html += '</dl>';

            document.getElementById('modalBody').innerHTML = html;
            modal.style.display = 'block';
        }

        function initAndRender() {
            try {
                if (typeof mermaid === 'undefined' || typeof jsyaml === 'undefined') {
                    showError(
                        'Scripts Failed to Load',
                        'Required scripts could not be loaded from the CDN.',
                        '<strong>Tip:</strong> Check your internet connection and try refreshing. The extension requires access to cdn.jsdelivr.net.'
                    );
                    return;
                }

                mermaid.initialize({
                    startOnLoad: false,
                    theme: window.pvConfig.mermaidTheme,
                    themeVariables: window.pvConfig.mermaidThemeVariables,
                    securityLevel: 'loose',
                    flowchart: { useMaxWidth: true }
                });

                vscode.postMessage({ command: 'ready' });
            } catch (error) {
                showError('Initialization Error', error.message || 'Failed to initialize rendering libraries.', '<strong>Tip:</strong> Try refreshing the panel.');
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initAndRender);
        } else {
            initAndRender();
        }

        function renderAzure(data) {
            try {
                if (!data) {
                    showError('No Data', 'Pipeline data is empty or undefined.', '<strong>Tip:</strong> Make sure your YAML file contains valid Azure DevOps pipeline configuration.');
                    return;
                }

                // Pipelines without `stages:` run as a single implicit stage (and job, for `steps:` only)
                if (!data.stages && Array.isArray(data.jobs)) {
                    data = Object.assign({}, data, { stages: [{ stage: 'Stage', jobs: data.jobs }] });
                } else if (!data.stages && Array.isArray(data.steps)) {
                    data = Object.assign({}, data, { stages: [{ stage: 'Stage', jobs: [{ job: 'Job', steps: data.steps }] }] });
                }

                let html = `<p><strong>Pipeline:</strong> ${data.name || 'Unnamed'}</p>`;
            html += '<div class="info-grid">';
            if (data.trigger) html += '<div class="info-card"><h3>📋 Trigger</h3><p>Configured</p></div>';
            if (data.pool) {
                const poolName = typeof data.pool === 'string' ? data.pool : (data.pool.vmImage || data.pool.name || 'Default');
                html += '<div class="info-card"><h3>🖥️ Pool</h3><p>' + escapeHtml(String(poolName)) + '</p></div>';
            }
            if (data.stages) html += `<div class="info-card"><h3>📊 Stages</h3><p>${data.stages.length}</p></div>`;
            html += '</div>';

            const stageColors = themePalette;
            const stages = Array.isArray(data.stages) ? data.stages : [];
            const stageIdByName = {};
            stages.forEach((stage, idx) => { if (stage.stage) { stageIdByName[stage.stage] = `S${idx}`; } });
            // Stages depend on the previous stage unless `dependsOn` says otherwise (`[]` = no dependencies)
            const stageEdges = [];
            stages.forEach((stage, idx) => {
                if (stage.dependsOn === undefined) {
                    if (idx > 0) { stageEdges.push([`S${idx - 1}`, `S${idx}`]); }
                } else {
                    asList(stage.dependsOn).forEach(dep => {
                        if (stageIdByName[dep]) { stageEdges.push([stageIdByName[dep], `S${idx}`]); }
                    });
                }
            });
            html += buildFlowchart(stages.map((stage, idx) => ({
                id: `S${idx}`,
                label: stage.displayName || stage.stage || (stage.template ? `template: ${stage.template}` : 'Stage'),
                color: stageColors[idx % stageColors.length],
                scrollTo: `S${idx}`
            })), stageEdges);

            if (data.stages) {
                data.stages.forEach((stage, idx) => {
                    const color = stageColors[idx % stageColors.length];
                    html += `<div id="S${idx}" class="stage" style="border-color: ${color}; background: linear-gradient(135deg, ${color}33 0%, ${color}14 100%);"><h2 style="background: ${color}; color: white;">🔨 ${stage.displayName || stage.stage}</h2>`;
                    if (stage.jobs) {
                        stage.jobs.forEach((job, jidx) => {
                            try {
                                const isManualValidation = job.steps && job.steps.some(step =>
                                    step.task && (step.task.includes('ManualValidation') || step.task.includes('ManualIntervention'))
                                );
                                const isServerPool = job.pool === 'server';

                                if (isManualValidation || isServerPool) {
                                    const step = job.steps?.[0];
                                    const timeout = job.timeoutInMinutes || 'Not specified';

                                    html += '<div class="approval">';
                                    html += '<h4>⏸️ Manual Approval Gate</h4>';
                                    html += `<p><strong>Job:</strong> ${job.displayName || job.job}</p>`;

                                    if (step?.inputs?.approvers) {
                                        const approvers = String(step.inputs.approvers).trim().split(/[\n,]/).filter(a => a.trim()).join(', ');
                                        html += `<p><strong>Approvers:</strong> ${approvers}</p>`;
                                    }

                                    if (step?.inputs?.notifyUsers) {
                                        const notifyUsers = String(step.inputs.notifyUsers).trim().split(/[\n,]/).filter(n => n.trim()).join(', ');
                                        html += `<p><strong>Notify:</strong> ${notifyUsers}</p>`;
                                    }

                                    html += `<p><strong>Timeout:</strong> ${timeout} minutes`;

                                    if (step?.inputs?.onTimeout) {
                                        html += ` | <strong>On Timeout:</strong> ${step.inputs.onTimeout}`;
                                    }

                                    html += '</p>';

                                    if (step?.inputs?.instructions) {
                                        html += `<p><strong>Instructions:</strong> ${step.inputs.instructions}</p>`;
                                    }

                                    html += '</div>';
                                } else {
                                    html += `<div class="job"><h3>${job.displayName || job.job}</h3>`;

                                    if (job.deployment) {
                                        html += `<div class="approval-badge">🔒 Deployment Job</div>`;
                                        if (job.environment) {
                                            const envName = typeof job.environment === 'string' ? job.environment : job.environment.name;
                                            html += `<p><strong>📦 Environment:</strong> ${envName}</p>`;
                                            html += `<p class="approval-info">⚠️ May require approval gates</p>`;
                                        }
                                    }

                                    if (job.steps) {
                                        html += '<ul class="steps">';
                                        job.steps.forEach(step => {
                                            const sid = `step_${stepCounter++}`;
                                            allSteps[sid] = step;
                                            html += `<li data-step="${sid}" style="cursor:pointer;">▶️ ${step.displayName || step.script?.substring(0, 50) || step.task || 'Step'}</li>`;
                                        });
                                        html += '</ul>';
                                    }
                                    html += '</div>';
                                }
                            } catch (jobError) {
                                console.error('Error rendering job:', jobError, job);
                                html += `<div class="job"><h3>${job.displayName || job.job}</h3><p style="color: red;">Error rendering job</p></div>`;
                            }
                        });
                    }
                    html += '</div>';
                });
            }

            document.getElementById('content').innerHTML = html;
            setTimeout(() => { try { mermaid.run(); } catch(e) { showError('Diagram Render Error', e.message || String(e), '<strong>Tip:</strong> Try refreshing the panel.'); } }, 100);
            } catch (error) {
                showError('Rendering Error', error.message || 'Failed to render Azure pipeline visualization.', '<strong>Tip:</strong> There may be an issue with the pipeline structure. Please check your YAML file.');
            }
        }

        function renderGitHub(data) {
            try {
                if (!data) {
                    showError('No Data', 'Workflow data is empty or undefined.', '<strong>Tip:</strong> Make sure your YAML file contains valid GitHub Actions workflow configuration.');
                    return;
                }

                let html = `<p><strong>Workflow:</strong> ${data.name || 'Unnamed'}</p>`;
            html += '<div class="info-grid">';
            if (data.on) {
                const triggers = typeof data.on === 'string' ? [data.on] : Object.keys(data.on);
                html += `<div class="info-card"><h3>🔔 Triggers</h3><p>${triggers.join(', ')}</p></div>`;
            }
            if (data.jobs) html += `<div class="info-card"><h3>💼 Jobs</h3><p>${Object.keys(data.jobs).length}</p></div>`;
            html += '</div>';

            const jobColors = themePalette;
            const jobKeys = data.jobs ? Object.keys(data.jobs) : [];
            // Jobs run in parallel unless they declare `needs`
            const jobEdges = [];
            jobKeys.forEach((key, idx) => {
                const job = data.jobs[key] || {};
                asList(job.needs).forEach(dep => {
                    const depIdx = jobKeys.indexOf(dep);
                    if (depIdx >= 0) { jobEdges.push([`J${depIdx}`, `J${idx}`]); }
                });
            });
            html += buildFlowchart(jobKeys.map((key, idx) => ({
                id: `J${idx}`,
                label: (data.jobs[key] && data.jobs[key].name) || key,
                color: jobColors[idx % jobColors.length],
                scrollTo: `J${idx}`
            })), jobEdges);

            if (data.jobs) {
                Object.entries(data.jobs).forEach(([key, job], idx) => {
                    const color = jobColors[idx % jobColors.length];
                    html += `<div id="J${idx}" class="job-container" style="border-color: ${color}; background: linear-gradient(135deg, ${color}33 0%, ${color}14 100%);"><h2 style="color: ${color};">💼 ${job.name || key}</h2>`;
                    html += '<div class="job">';
                    if (job['runs-on']) html += `<p><strong>🖥️ Runs on:</strong> ${job['runs-on']}</p>`;

                    if (job.environment) {
                        const envName = typeof job.environment === 'string' ? job.environment : job.environment.name;
                        html += `<div class="approval-badge">🔒 Protected Environment</div>`;
                        html += `<p><strong>📦 Environment:</strong> ${envName}</p>`;
                        if (typeof job.environment === 'object' && job.environment.url) {
                            html += `<p><strong>🔗 URL:</strong> <code>${job.environment.url}</code></p>`;
                        }
                        html += `<p class="approval-info">⚠️ This environment may require approval before deployment</p>`;
                    }

                    if (job.steps) {
                        html += '<h3>Steps</h3><ul class="steps">';
                        job.steps.forEach(step => {
                            const sid = `step_${stepCounter++}`;
                            allSteps[sid] = step;
                            const name = step.name || step.uses || step.run?.substring(0, 50) || 'Step';
                            html += `<li data-step="${sid}" style="cursor:pointer;">📝 ${name}</li>`;
                        });
                        html += '</ul>';
                    }
                    html += '</div></div>';
                });
            }

            document.getElementById('content').innerHTML = html;
            setTimeout(() => { try { mermaid.run(); } catch(e) { showError('Diagram Render Error', e.message || String(e), '<strong>Tip:</strong> Try refreshing the panel.'); } }, 100);
            } catch (error) {
                showError('Rendering Error', error.message || 'Failed to render GitHub Actions visualization.', '<strong>Tip:</strong> There may be an issue with the workflow structure. Please check your YAML file.');
            }
        }

        function renderGitLab(data) {
            try {
                if (!data) {
                    showError('No Data', 'Pipeline data is empty or undefined.', '<strong>Tip:</strong> Make sure your YAML file contains valid GitLab CI configuration.');
                    return;
                }

                const RESERVED = new Set(['stages', 'variables', 'default', 'include', 'workflow', 'spec', 'image', 'services', 'cache', 'before_script', 'after_script']);
                const jobEntries = Object.entries(data).filter(([key, value]) =>
                    !RESERVED.has(key) && !key.startsWith('.') && typeof value === 'object' && value !== null
                );

                // .pre and .post always run first and last, whether or not they are declared
                const declaredStages = (Array.isArray(data.stages) ? data.stages : ['build', 'test', 'deploy'])
                    .filter(s => s !== '.pre' && s !== '.post');
                const stageOrder = ['.pre', ...declaredStages, '.post'];
                const jobsByStage = {};
                stageOrder.forEach(s => { jobsByStage[s] = []; });
                const undeclaredStages = [];
                jobEntries.forEach(([key, job]) => {
                    const stage = job.stage || 'test';
                    if (!jobsByStage[stage]) {
                        jobsByStage[stage] = [];
                        undeclaredStages.push(stage);
                    }
                    jobsByStage[stage].push({ key, job });
                });

                // Jobs in undeclared stages are invalid in GitLab, but show them rather than drop them
                const activeStages = [...stageOrder.slice(0, -1), ...undeclaredStages, '.post']
                    .filter(s => jobsByStage[s].length > 0);

                let html = `<p><strong>Pipeline:</strong> ${(data.workflow && data.workflow.name) || 'GitLab CI Pipeline'}</p>`;
                if (pipelineSpec && pipelineSpec.description) {
                    html += `<p>${escapeHtml(String(pipelineSpec.description))}</p>`;
                }
                html += '<div class="info-grid">';
                html += `<div class="info-card"><h3>📊 Stages</h3><p>${activeStages.length}</p></div>`;
                html += `<div class="info-card"><h3>💼 Jobs</h3><p>${jobEntries.length}</p></div>`;
                const specInputs = (pipelineSpec && pipelineSpec.inputs && typeof pipelineSpec.inputs === 'object') ? pipelineSpec.inputs : null;
                if (specInputs) html += `<div class="info-card"><h3>📥 Inputs</h3><p>${Object.keys(specInputs).length} declared</p></div>`;
                if (data.variables) html += `<div class="info-card"><h3>🔧 Variables</h3><p>${Object.keys(data.variables).length} defined</p></div>`;
                if (data.workflow) html += '<div class="info-card"><h3>🔀 Workflow</h3><p>Configured</p></div>';
                if (data.default && data.default.image) {
                    const imgName = typeof data.default.image === 'string' ? data.default.image : data.default.image.name;
                    html += `<div class="info-card"><h3>🐳 Default Image</h3><p>${imgName}</p></div>`;
                }
                html += '</div>';

                const stageColors = themePalette;
                const usesNeeds = jobEntries.some(([, job]) => job.needs !== undefined);
                if (usesNeeds) {
                    // Job-level graph: `needs` overrides stage ordering (`needs: []` starts immediately);
                    // jobs without `needs` wait for every job in the previous stage
                    const jobNodes = [];
                    const jobNodeId = {};
                    activeStages.forEach((stage, sIdx) => {
                        jobsByStage[stage].forEach(({ key }) => {
                            const id = `GLJ${jobNodes.length}`;
                            jobNodeId[key] = id;
                            jobNodes.push({ id, label: key, color: stageColors[sIdx % stageColors.length], scrollTo: `GL${sIdx}` });
                        });
                    });
                    const jobEdges = [];
                    activeStages.forEach((stage, sIdx) => {
                        jobsByStage[stage].forEach(({ key, job }) => {
                            if (job.needs !== undefined) {
                                asList(job.needs).forEach(need => {
                                    const needName = typeof need === 'string' ? need : (need && need.job);
                                    if (jobNodeId[needName]) { jobEdges.push([jobNodeId[needName], jobNodeId[key]]); }
                                });
                            } else if (sIdx > 0) {
                                jobsByStage[activeStages[sIdx - 1]].forEach(prev => {
                                    jobEdges.push([jobNodeId[prev.key], jobNodeId[key]]);
                                });
                            }
                        });
                    });
                    html += buildFlowchart(jobNodes, jobEdges);
                } else {
                    const stageIds = activeStages.map((stage, idx) => `GL${idx}`);
                    html += buildFlowchart(activeStages.map((stage, idx) => ({
                        id: `GL${idx}`,
                        label: stage,
                        color: stageColors[idx % stageColors.length],
                        scrollTo: `GL${idx}`
                    })), chainEdges(stageIds));
                }

                if (specInputs) {
                    const inputsColor = stageColors[(activeStages.length) % stageColors.length];
                    html += `<div class="stage" style="border-color: ${inputsColor}; background: linear-gradient(135deg, ${inputsColor}33 0%, ${inputsColor}14 100%);">`;
                    html += `<h2 style="background: ${inputsColor}; color: white;">📥 Inputs</h2>`;
                    Object.entries(specInputs).forEach(([name, input]) => {
                        const def = (input && typeof input === 'object') ? input : {};
                        html += `<div class="job"><h3><code>${escapeHtml(name)}</code></h3>`;
                        html += `<p><strong>Type:</strong> ${escapeHtml(String(def.type || 'string'))}</p>`;
                        if (def.default !== undefined) {
                            const defaultValue = typeof def.default === 'object' ? JSON.stringify(def.default) : String(def.default);
                            html += `<p><strong>Default:</strong> <code>${escapeHtml(defaultValue)}</code></p>`;
                        } else {
                            html += '<p class="approval-info">⚠️ Required (no default)</p>';
                        }
                        if (Array.isArray(def.options)) {
                            html += `<p><strong>Options:</strong> ${def.options.map(o => escapeHtml(String(o))).join(', ')}</p>`;
                        }
                        if (def.description) {
                            html += `<p>${escapeHtml(String(def.description))}</p>`;
                        }
                        html += '</div>';
                    });
                    html += '</div>';
                }

                activeStages.forEach((stage, idx) => {
                    const color = stageColors[idx % stageColors.length];
                    html += `<div id="GL${idx}" class="stage" style="border-color: ${color}; background: linear-gradient(135deg, ${color}33 0%, ${color}14 100%);">`;
                    html += `<h2 style="background: ${color}; color: white;">🦊 ${escapeHtml(stage)}</h2>`;
                    if (undeclaredStages.includes(stage)) {
                        html += `<p class="approval-info">⚠️ Stage "${escapeHtml(stage)}" is not declared in <code>stages:</code> — GitLab will reject this configuration</p>`;
                    }

                    (jobsByStage[stage] || []).forEach(({ key, job }) => {
                        const isManual = job.when === 'manual';
                        const hasEnv = !!job.environment;

                        if (isManual && !hasEnv) {
                            html += '<div class="approval">';
                            html += '<h4>⏸️ Manual Job</h4>';
                            html += `<p><strong>Job:</strong> ${key}</p>`;
                            if (job.rules) html += `<p><strong>Rules:</strong> ${job.rules.length} condition(s)</p>`;
                            html += '</div>';
                        } else {
                            html += `<div class="job"><h3>${key}</h3>`;

                            if (hasEnv) {
                                const envName = typeof job.environment === 'string' ? job.environment : job.environment.name;
                                html += '<div class="approval-badge">🚀 Deployment Job</div>';
                                html += `<p><strong>📦 Environment:</strong> ${envName}</p>`;
                                if (isManual) { html += '<div class="approval-badge" style="background: linear-gradient(135deg, #888 0%, #666 100%);">⏸️ Manual Trigger</div>'; }
                                html += '<p class="approval-info">⚠️ May require approval gates in GitLab</p>';
                            }

                            if (job.image) {
                                const imgName = typeof job.image === 'string' ? job.image : job.image.name;
                                html += `<p><strong>🐳 Image:</strong> <code>${imgName}</code></p>`;
                            }

                            if (job.tags && job.tags.length > 0) {
                                html += `<p><strong>🏷️ Tags:</strong> ${job.tags.join(', ')}</p>`;
                            }

                            if (job.needs !== undefined) {
                                if (Array.isArray(job.needs) && job.needs.length === 0) {
                                    html += '<p><strong>⚡ Needs:</strong> <em>none (starts immediately)</em></p>';
                                } else if (Array.isArray(job.needs) && job.needs.length > 0) {
                                    const needsNames = job.needs.map(n => typeof n === 'string' ? n : n.job).filter(Boolean).join(', ');
                                    html += `<p><strong>⚡ Needs:</strong> ${needsNames}</p>`;
                                }
                            }

                            if (job.rules && job.rules.length > 0) {
                                html += `<p><strong>📋 Rules:</strong> ${job.rules.length} condition(s)</p>`;
                            }

                            if (job.allow_failure === true) {
                                html += '<p class="approval-info">ℹ️ Allowed to fail</p>';
                            }

                            const steps = [];
                            const resolvedBeforeScript = job.before_script || (data.default && data.default.before_script);
                            if (resolvedBeforeScript) {
                                (Array.isArray(resolvedBeforeScript) ? resolvedBeforeScript : [resolvedBeforeScript]).forEach(s => {
                                    steps.push({ label: `⚙️ ${String(s).substring(0, 60)}`, script: String(s), phase: 'before_script' });
                                });
                            }
                            const scripts = Array.isArray(job.script) ? job.script : (job.script ? [job.script] : []);
                            scripts.forEach(s => {
                                steps.push({ label: `▶️ ${String(s).substring(0, 60)}`, script: String(s), phase: 'script' });
                            });
                            if (job.after_script) {
                                (Array.isArray(job.after_script) ? job.after_script : [job.after_script]).forEach(s => {
                                    steps.push({ label: `🔚 ${String(s).substring(0, 60)}`, script: String(s), phase: 'after_script' });
                                });
                            }

                            if (steps.length > 0) {
                                html += '<ul class="steps">';
                                steps.forEach(({ label, script, phase }) => {
                                    const sid = `step_${stepCounter++}`;
                                    allSteps[sid] = { script, phase, displayName: label };
                                    html += `<li data-step="${sid}" style="cursor:pointer;">${label}</li>`;
                                });
                                html += '</ul>';
                            }

                            html += '</div>';
                        }
                    });

                    html += '</div>';
                });

                document.getElementById('content').innerHTML = html;
                setTimeout(() => { try { mermaid.run(); } catch(e) { showError('Diagram Render Error', e.message || String(e), '<strong>Tip:</strong> Try refreshing the panel.'); } }, 100);
            } catch (error) {
                showError('Rendering Error', error.message || 'Failed to render GitLab CI visualization.', '<strong>Tip:</strong> There may be an issue with the pipeline structure. Please check your .gitlab-ci.yml file.');
            }
        }

        // Shared by the primary artifact and each entry of `secondary-artifacts`
        function renderArtifactDetails(artifact) {
            let html = '';
            if (artifact.files) {
                const files = Array.isArray(artifact.files) ? artifact.files : [artifact.files];
                html += `<p><strong>Files:</strong></p><ul class="steps">`;
                files.forEach(f => { html += `<li style="cursor:default;">📄 ${escapeHtml(String(f))}</li>`; });
                html += '</ul>';
            }
            if (artifact['exclude-paths']) {
                const excluded = Array.isArray(artifact['exclude-paths']) ? artifact['exclude-paths'] : [artifact['exclude-paths']];
                html += `<p><strong>Exclude paths:</strong> <code>${excluded.map(p => escapeHtml(String(p))).join(', ')}</code></p>`;
            }
            if (artifact['base-directory']) {
                html += `<p><strong>Base directory:</strong> <code>${escapeHtml(String(artifact['base-directory']))}</code></p>`;
            }
            if (artifact.name) {
                html += `<p><strong>Artifact name:</strong> <code>${escapeHtml(String(artifact.name))}</code></p>`;
            }
            if (artifact['s3-prefix']) {
                html += `<p><strong>S3 prefix:</strong> <code>${escapeHtml(String(artifact['s3-prefix']))}</code></p>`;
            }
            if (artifact['discard-paths'] !== undefined) {
                html += `<p><strong>Discard paths:</strong> ${escapeHtml(String(artifact['discard-paths']))}</p>`;
            }
            if (artifact['enable-symlinks'] !== undefined) {
                html += `<p><strong>Enable symlinks:</strong> ${escapeHtml(String(artifact['enable-symlinks']))}</p>`;
            }
            return html;
        }

        function renderAWSCodeBuild(data) {
            try {
                if (!data) {
                    showError('No Data', 'Buildspec data is empty or undefined.', '<strong>Tip:</strong> Make sure your file contains valid AWS CodeBuild buildspec configuration.');
                    return;
                }

                const PHASE_ORDER = ['install', 'pre_build', 'build', 'post_build'];
                const presentPhases = PHASE_ORDER.filter(p => data.phases && data.phases[p]);

                let html = `<p><strong>Buildspec version:</strong> ${data.version || 'Not specified'}</p>`;
                html += '<div class="info-grid">';
                html += `<div class="info-card"><h3>🔧 Phases</h3><p>${presentPhases.length} defined</p></div>`;

                const secondaryArtifacts = (data.artifacts && data.artifacts['secondary-artifacts'] && typeof data.artifacts['secondary-artifacts'] === 'object')
                    ? Object.entries(data.artifacts['secondary-artifacts'])
                    : [];
                if (data.artifacts) {
                    const artifactFiles = Array.isArray(data.artifacts.files) ? data.artifacts.files.length : (data.artifacts.files ? 1 : 0);
                    let artifactSummary = `${artifactFiles} file pattern(s)`;
                    if (secondaryArtifacts.length) {
                        artifactSummary += ` + ${secondaryArtifacts.length} secondary`;
                    }
                    html += `<div class="info-card"><h3>📦 Artifacts</h3><p>${artifactSummary}</p></div>`;
                }

                if (data.env) {
                    const varCount = (data.env.variables ? Object.keys(data.env.variables).length : 0)
                        + (data.env['exported-variables'] ? data.env['exported-variables'].length : 0);
                    html += `<div class="info-card"><h3>🔒 Env Variables</h3><p>${varCount} defined</p></div>`;
                    if (data.env['secrets-manager'] || data.env['parameter-store']) {
                        html += '<div class="info-card"><h3>🔑 Secrets</h3><p>SSM / Secrets Manager referenced</p></div>';
                    }
                }

                if (data.cache && data.cache.paths) {
                    html += `<div class="info-card"><h3>💾 Cache</h3><p>${data.cache.paths.length} path(s)</p></div>`;
                }

                if (data.reports) {
                    html += `<div class="info-card"><h3>📊 Reports</h3><p>${Object.keys(data.reports).length} report group(s)</p></div>`;
                }

                html += '</div>';

                const phaseColors = themePalette;
                html += buildFlowchart(presentPhases.map((phase, idx) => ({
                    id: `CB${idx}`,
                    label: phase.replace(/_/g, ' '),
                    color: phaseColors[idx % phaseColors.length],
                    scrollTo: `CB${idx}`
                })), chainEdges(presentPhases.map((phase, idx) => `CB${idx}`)));

                presentPhases.forEach((phase, idx) => {
                    const phaseData = data.phases[phase];
                    const color = phaseColors[idx % phaseColors.length];
                    const phaseLabel = phase.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                    html += `<div id="CB${idx}" class="stage" style="border-color: ${color}; background: linear-gradient(135deg, ${color}33 0%, ${color}14 100%);">`;
                    html += `<h2 style="background: ${color}; color: white;">🏗️ ${phaseLabel}</h2>`;

                    if (phaseData['runtime-versions']) {
                        const runtimes = Object.entries(phaseData['runtime-versions']).map(([k, v]) => `${k}: ${v}`).join(', ');
                        html += `<p><strong>⚙️ Runtimes:</strong> <code>${runtimes}</code></p>`;
                    }

                    const renderCommands = (cmds, icon, label) => {
                        if (!cmds || !cmds.length) { return ''; }
                        let out = `<h3>${icon} ${label}</h3><ul class="steps">`;
                        (Array.isArray(cmds) ? cmds : [cmds]).forEach(cmd => {
                            const sid = `step_${stepCounter++}`;
                            allSteps[sid] = { script: String(cmd), displayName: String(cmd).substring(0, 80), phase };
                            out += `<li data-step="${sid}" style="cursor:pointer;">▶️ ${escapeHtml(String(cmd).substring(0, 80))}${String(cmd).length > 80 ? '…' : ''}</li>`;
                        });
                        out += '</ul>';
                        return out;
                    };

                    html += renderCommands(phaseData.commands, '▶️', 'Commands');

                    if (phaseData.finally) {
                        html += renderCommands(phaseData.finally, '🔚', 'Finally');
                    }

                    html += '</div>';
                });

                if (data.artifacts) {
                    html += `<div class="stage" style="border-color: ${phaseColors[4 % phaseColors.length]}; background: linear-gradient(135deg, ${phaseColors[4 % phaseColors.length]}33 0%, ${phaseColors[4 % phaseColors.length]}14 100%);">`;
                    html += `<h2 style="background: ${phaseColors[4 % phaseColors.length]}; color: white;">📦 Artifacts</h2>`;
                    html += renderArtifactDetails(data.artifacts);
                    secondaryArtifacts.forEach(([identifier, artifact]) => {
                        html += `<div class="job"><h3>📦 Secondary: <code>${escapeHtml(identifier)}</code></h3>`;
                        html += renderArtifactDetails(artifact || {});
                        html += '</div>';
                    });
                    html += '</div>';
                }

                document.getElementById('content').innerHTML = html;
                setTimeout(() => { try { mermaid.run(); } catch(e) { showError('Diagram Render Error', e.message || String(e), '<strong>Tip:</strong> Try refreshing the panel.'); } }, 100);
            } catch (error) {
                showError('Rendering Error', error.message || 'Failed to render AWS CodeBuild visualization.', '<strong>Tip:</strong> There may be an issue with the buildspec structure. Please check your buildspec.yml file.');
            }
        }

        function renderAWSCloudFormation(data) {
            try {
                const resources = data.Resources || {};
                const resourceEntries = Object.entries(resources);
                const pipelines = resourceEntries.filter(function(e) { return e[1] && e[1].Type === 'AWS::CodePipeline::Pipeline'; });
                const buildProjects = resourceEntries.filter(function(e) { return e[1] && e[1].Type === 'AWS::CodeBuild::Project'; });
                const paramCount = data.Parameters ? Object.keys(data.Parameters).length : 0;

                let html = '';
                if (data.Description) {
                    html += '<p>' + escapeHtml(data.Description) + '</p>';
                }
                html += '<div class="info-grid">';
                html += '<div class="info-card"><h3>📦 Resources</h3><p>' + resourceEntries.length + ' defined</p></div>';
                if (paramCount) { html += '<div class="info-card"><h3>⚙️ Parameters</h3><p>' + paramCount + ' defined</p></div>'; }
                if (pipelines.length) { html += '<div class="info-card"><h3>🔀 Pipelines</h3><p>' + pipelines.length + '</p></div>'; }
                if (buildProjects.length) { html += '<div class="info-card"><h3>🏗️ CodeBuild Projects</h3><p>' + buildProjects.length + '</p></div>'; }
                html += '</div>';

                pipelines.forEach(function(pipelineEntry, pIdx) {
                    var logicalId = pipelineEntry[0];
                    var pipelineResource = pipelineEntry[1];
                    var props = pipelineResource.Properties || {};
                    var pipelineName = typeof props.Name === 'string' ? props.Name : logicalId;
                    var stages = Array.isArray(props.Stages) ? props.Stages : [];
                    html += '<h3 style="margin-top:24px;font-size:15px;opacity:0.8;">🔀 Pipeline: ' + escapeHtml(pipelineName) + '</h3>';

                    var stageIds = stages.map(function(stage, sIdx) { return 'CFP' + pIdx + '_' + sIdx; });
                    html += buildFlowchart(stages.map(function(stage, sIdx) {
                        return {
                            id: stageIds[sIdx],
                            label: stage.Name || ('Stage ' + (sIdx + 1)),
                            color: themePalette[sIdx % themePalette.length],
                            scrollTo: stageIds[sIdx]
                        };
                    }), chainEdges(stageIds));

                    stages.forEach(function(stage, sIdx) {
                        var sid = 'CFP' + pIdx + '_' + sIdx;
                        var color = themePalette[sIdx % themePalette.length];
                        var stageName = stage.Name || ('Stage ' + (sIdx + 1));
                        var actions = Array.isArray(stage.Actions) ? stage.Actions : [];
                        html += '<div id="' + sid + '" class="stage" style="border-color:' + color + ';background:linear-gradient(135deg,' + color + '33 0%,' + color + '14 100%);">';
                        html += '<h2 style="background:' + color + ';color:white;">🔀 ' + escapeHtml(stageName) + '</h2>';
                        actions.forEach(function(action) {
                            var actionName = action.Name || 'Action';
                            var typeId = action.ActionTypeId || {};
                            var providerLabel = typeId.Provider ? ' (' + escapeHtml(typeId.Provider) + ')' : '';
                            var sid2 = 'step_' + stepCounter++;
                            allSteps[sid2] = { displayName: actionName, category: typeId.Category, provider: typeId.Provider, owner: typeId.Owner, configuration: action.Configuration, runOrder: action.RunOrder, inputArtifacts: action.InputArtifacts, outputArtifacts: action.OutputArtifacts };
                            html += '<div class="job" data-step="' + sid2 + '" style="cursor:pointer;">';
                            html += '<h3>' + escapeHtml(actionName) + providerLabel + '</h3>';
                            if (action.RunOrder) { html += '<p>Run order: ' + action.RunOrder + '</p>'; }
                            html += '</div>';
                        });
                        html += '</div>';
                    });
                });

                if (buildProjects.length) {
                    var cbColor = themePalette[2 % themePalette.length];
                    html += '<div class="stage" style="border-color:' + cbColor + ';background:linear-gradient(135deg,' + cbColor + '33 0%,' + cbColor + '14 100%);">';
                    html += '<h2 style="background:' + cbColor + ';color:white;">🏗️ CodeBuild Projects</h2>';
                    buildProjects.forEach(function(entry) {
                        var logicalId = entry[0];
                        var proj = entry[1];
                        var props = proj.Properties || {};
                        var name = typeof props.Name === 'string' ? props.Name : logicalId;
                        var buildSpec = props.Source && props.Source.BuildSpec ? String(props.Source.BuildSpec) : 'inline';
                        var env = props.Environment || {};
                        html += '<div class="job">';
                        html += '<h3>' + escapeHtml(name) + '</h3>';
                        html += '<p>BuildSpec: <code>' + escapeHtml(buildSpec) + '</code></p>';
                        if (env.ComputeType) { html += '<p>Compute: ' + escapeHtml(String(env.ComputeType)) + '</p>'; }
                        if (props.TimeoutInMinutes) { html += '<p>Timeout: ' + props.TimeoutInMinutes + ' min</p>'; }
                        html += '</div>';
                    });
                    html += '</div>';
                }

                document.getElementById('content').innerHTML = html;
                setTimeout(function() { try { mermaid.run(); } catch(e) { showError('Diagram Render Error', e.message || String(e), '<strong>Tip:</strong> Try refreshing the panel.'); } }, 100);
            } catch (error) {
                showError('Rendering Error', error.message || 'Failed to render CloudFormation visualization.', '<strong>Tip:</strong> Make sure your CloudFormation template has a valid Resources section.');
            }
        }

        let bbSelectedPipeline = null;

        function renderBitbucket(data) {
            try {
                if (!data || !data.pipelines) {
                    showError('No Data', 'Pipeline data is empty or undefined.', '<strong>Tip:</strong> Make sure your file is a valid bitbucket-pipelines.yml configuration.');
                    return;
                }

                const pipelines = data.pipelines;

                const countSteps = function(list) {
                    if (!Array.isArray(list)) { return 0; }
                    let n = 0;
                    list.forEach(function(item) {
                        if (item.step) { n++; }
                        else if (item.parallel) {
                            const ps = Array.isArray(item.parallel) ? item.parallel : (item.parallel.steps || []);
                            ps.forEach(function(p) { if (p.step) { n++; } });
                        } else if (item.stage) {
                            (item.stage.steps || []).forEach(function(s) { if (s.step) { n++; } });
                        }
                    });
                    return n;
                };

                // Build selector options from all pipeline types
                const typeIcons = { 'branches': '🌿', 'pull-requests': '🔀', 'tags': '🏷️', 'custom': '⚙️' };
                const typeDisplayNames = { 'branches': 'Branch', 'pull-requests': 'PR', 'tags': 'Tag', 'custom': 'Custom' };
                const selectorOptions = [{ type: 'default', key: null, label: '🔵 Default' }];
                Object.keys(pipelines).forEach(function(t) {
                    if (t === 'default') { return; }
                    const typeObj = pipelines[t];
                    if (typeObj && typeof typeObj === 'object' && !Array.isArray(typeObj)) {
                        const icon = typeIcons[t] || '📋';
                        const displayName = typeDisplayNames[t] || t;
                        Object.keys(typeObj).forEach(function(k) {
                            selectorOptions.push({ type: t, key: k, label: icon + ' ' + displayName + ': ' + k });
                        });
                    }
                });

                // Initialize or validate selection
                if (!bbSelectedPipeline) {
                    bbSelectedPipeline = { type: 'default', key: null };
                } else {
                    const stillValid = selectorOptions.some(function(o) { return o.type === bbSelectedPipeline.type && o.key === bbSelectedPipeline.key; });
                    if (!stillValid) { bbSelectedPipeline = { type: 'default', key: null }; }
                }

                // Resolve active list based on selection
                let activeList;
                if (bbSelectedPipeline.type === 'default') {
                    activeList = pipelines.default || [];
                } else {
                    const typeObj = pipelines[bbSelectedPipeline.type];
                    activeList = (typeObj && typeObj[bbSelectedPipeline.key]) || [];
                }
                const selectedValue = bbSelectedPipeline.type + '::' + bbSelectedPipeline.key;

                // Info grid
                let html = '<div class="info-grid">';
                html += '<div class="info-card"><h3>📋 Pipeline Types</h3><p>' + Object.keys(pipelines).length + ' configured</p></div>';
                html += '<div class="info-card"><h3>🔧 Steps</h3><p>' + countSteps(activeList) + '</p></div>';
                if (data.image) {
                    const imgName = typeof data.image === 'string' ? data.image : data.image.name;
                    html += '<div class="info-card"><h3>🐳 Default Image</h3><p>' + escapeHtml(imgName) + '</p></div>';
                }
                if (data.definitions && data.definitions.caches) {
                    html += '<div class="info-card"><h3>💾 Caches</h3><p>' + Object.keys(data.definitions.caches).length + ' defined</p></div>';
                }
                html += '</div>';

                // Pipeline selector dropdown
                html += '<div style="margin: 16px 0;">';
                html += '<label style="margin-right: 8px; font-weight: 600; font-size: 13px;">Pipeline:</label>';
                html += '<select id="bb-pipeline-select" style="background: ' + themeCardBg + '; color: ' + themeTextColor + '; border: 1px solid ' + themeAccent + '; border-radius: 6px; padding: 4px 10px; font-size: 13px; cursor: pointer;">';
                selectorOptions.forEach(function(opt) {
                    const val = opt.type + '::' + opt.key;
                    html += '<option value="' + escapeHtml(val) + '"' + (val === selectedValue ? ' selected' : '') + '>' + escapeHtml(opt.label) + '</option>';
                });
                html += '</select>';
                html += '</div>';

                // Build diagram items from active list
                const diagramItems = [];
                activeList.forEach(function(item, origIdx) {
                    if (item.step) {
                        diagramItems.push({ origIdx: origIdx, label: (item.step.name || ('Step ' + (origIdx + 1))).replace(/"/g, "'") });
                    } else if (item.parallel) {
                        const ps = Array.isArray(item.parallel) ? item.parallel : (item.parallel.steps || []);
                        const n = ps.filter(function(p) { return p.step; }).length;
                        diagramItems.push({ origIdx: origIdx, label: '⚡ ' + n + ' parallel steps' });
                    } else if (item.stage) {
                        const stageName = (item.stage.name || ('Stage ' + (origIdx + 1))).replace(/"/g, "'");
                        const n = (item.stage.steps || []).filter(function(s) { return s.step; }).length;
                        diagramItems.push({ origIdx: origIdx, label: '📋 ' + stageName + ' (' + n + ' steps)' });
                    }
                });

                // Each item is one level of the graph; a parallel group fans out into one node
                // per step and every node of a level connects to every node of the next level
                const nodeColors = themePalette;
                const bbNodes = [];
                const levels = diagramItems.map(function(node, dIdx) {
                    const item = activeList[node.origIdx];
                    const color = nodeColors[dIdx % nodeColors.length];
                    const target = 'BB' + node.origIdx;
                    let levelNodes;
                    if (item.parallel) {
                        const ps = Array.isArray(item.parallel) ? item.parallel : (item.parallel.steps || []);
                        levelNodes = ps.filter(function(p) { return p.step; }).map(function(p, pIdx) {
                            return { id: target + '_' + pIdx, label: '⚡ ' + (p.step.name || ('Parallel step ' + (pIdx + 1))), color: color, scrollTo: target };
                        });
                    } else {
                        levelNodes = [{ id: target, label: node.label, color: color, scrollTo: target }];
                    }
                    levelNodes.forEach(function(n) { bbNodes.push(n); });
                    return levelNodes;
                }).filter(function(level) { return level.length > 0; });
                const bbEdges = [];
                for (let i = 1; i < levels.length; i++) {
                    levels[i - 1].forEach(function(from) {
                        levels[i].forEach(function(to) { bbEdges.push([from.id, to.id]); });
                    });
                }
                html += buildFlowchart(bbNodes, bbEdges);

                // Script entries are usually command strings, but can also be objects
                // such as `- pipe: atlassian/...` or `- agent: <name>`
                const renderScriptList = function(entries, icon) {
                    const list = Array.isArray(entries) ? entries : (entries ? [entries] : []);
                    if (!list.length) { return ''; }
                    let out = '<ul class="steps">';
                    list.forEach(function(entry) {
                        const sid = 'step_' + stepCounter++;
                        let label;
                        let itemIcon = icon;
                        if (entry && typeof entry === 'object') {
                            if (entry.pipe) {
                                itemIcon = '🔌';
                                label = 'pipe: ' + String(entry.pipe);
                            } else if (entry.agent) {
                                itemIcon = '🤖';
                                label = 'agent: ' + String(entry.agent);
                            } else {
                                const firstKey = Object.keys(entry)[0];
                                const firstValue = firstKey !== undefined ? entry[firstKey] : '';
                                label = firstKey !== undefined
                                    ? firstKey + ': ' + (typeof firstValue === 'object' ? JSON.stringify(firstValue) : String(firstValue))
                                    : '{}';
                            }
                            allSteps[sid] = Object.assign({ displayName: label }, entry);
                        } else {
                            label = String(entry);
                            allSteps[sid] = { script: label, displayName: label.substring(0, 80) };
                        }
                        out += '<li data-step="' + sid + '" style="cursor:pointer;">' + itemIcon + ' ' + escapeHtml(label.substring(0, 80)) + (label.length > 80 ? '…' : '') + '</li>';
                    });
                    out += '</ul>';
                    return out;
                };

                const renderStep = function(step) {
                    let out = '<div class="job"><h3>' + escapeHtml(step.name || 'Unnamed Step') + '</h3>';
                    if (step.deployment) {
                        out += '<div class="approval-badge">🚀 Deployment: ' + escapeHtml(String(step.deployment)) + '</div>';
                        out += '<p class="approval-info">⚠️ May require approval gates in Bitbucket</p>';
                    }
                    if (step.trigger === 'manual') {
                        out += '<div class="approval-badge" style="background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%);">⏸️ Manual Trigger</div>';
                    }
                    if (step.image) {
                        const imgName = typeof step.image === 'string' ? step.image : step.image.name;
                        out += '<p><strong>🐳 Image:</strong> <code>' + escapeHtml(imgName) + '</code></p>';
                    }
                    if (step.size) {
                        out += '<p><strong>📐 Size:</strong> ' + escapeHtml(String(step.size)) + '</p>';
                    }
                    if (step.caches && step.caches.length) {
                        out += '<p><strong>💾 Caches:</strong> ' + step.caches.join(', ') + '</p>';
                    }
                    if (step.services && step.services.length) {
                        out += '<p><strong>🛠️ Services:</strong> ' + step.services.join(', ') + '</p>';
                    }
                    if (step.artifacts && step.artifacts.paths) {
                        out += '<p><strong>📦 Artifacts:</strong> ' + step.artifacts.paths.join(', ') + '</p>';
                    }
                    out += renderScriptList(step.script, '▶️');
                    out += renderScriptList(step['after-script'], '🔚');
                    out += '</div>';
                    return out;
                };

                diagramItems.forEach(function(node, dIdx) {
                    const item = activeList[node.origIdx];
                    const color = nodeColors[dIdx % nodeColors.length];

                    if (item.step) {
                        html += '<div id="BB' + node.origIdx + '" class="stage" style="border-color: ' + color + '; background: linear-gradient(135deg, ' + color + '33 0%, ' + color + '14 100%);">';
                        html += '<h2 style="background: ' + color + '; color: white;">🪣 ' + escapeHtml(item.step.name || ('Step ' + (node.origIdx + 1))) + '</h2>';
                        html += renderStep(item.step);
                        html += '</div>';
                    } else if (item.parallel) {
                        const ps = Array.isArray(item.parallel) ? item.parallel : (item.parallel.steps || []);
                        const pSteps = ps.filter(function(p) { return p.step; }).map(function(p) { return p.step; });
                        html += '<div id="BB' + node.origIdx + '" class="stage" style="border-color: ' + color + '; background: linear-gradient(135deg, ' + color + '33 0%, ' + color + '14 100%);">';
                        html += '<h2 style="background: ' + color + '; color: white;">⚡ Parallel Steps (' + pSteps.length + ')</h2>';
                        pSteps.forEach(function(step) { html += renderStep(step); });
                        html += '</div>';
                    } else if (item.stage) {
                        const stageSteps = (item.stage.steps || []).filter(function(s) { return s.step; }).map(function(s) { return s.step; });
                        const stageName = item.stage.name || ('Stage ' + (node.origIdx + 1));
                        html += '<div id="BB' + node.origIdx + '" class="stage" style="border-color: ' + color + '; background: linear-gradient(135deg, ' + color + '33 0%, ' + color + '14 100%);">';
                        html += '<h2 style="background: ' + color + '; color: white;">📋 ' + escapeHtml(stageName) + '</h2>';
                        stageSteps.forEach(function(step) { html += renderStep(step); });
                        html += '</div>';
                    }
                });

                // Summary cards for non-default pipeline types
                const typeLabels = { 'branches': '🌿 Branches', 'pull-requests': '🔀 Pull Requests', 'tags': '🏷️ Tags', 'custom': '⚙️ Custom' };
                Object.keys(pipelines).forEach(function(type, typeIdx) {
                    if (type === 'default') { return; }
                    const typeObj = pipelines[type];
                    const label = typeLabels[type] || ('📋 ' + type);
                    const color = nodeColors[typeIdx % nodeColors.length];
                    html += '<div class="stage" style="border-color: ' + color + '; background: linear-gradient(135deg, ' + color + '33 0%, ' + color + '14 100%);">';
                    html += '<h2 style="background: ' + color + '; color: white;">' + label + '</h2>';
                    if (typeObj && typeof typeObj === 'object' && !Array.isArray(typeObj)) {
                        Object.entries(typeObj).forEach(function(entry) {
                            const isSelected = bbSelectedPipeline.type === type && bbSelectedPipeline.key === entry[0];
                            const selectedTag = isSelected ? ' <span style="opacity: 0.7; font-size: 11px;">(viewing)</span>' : '';
                            html += '<div class="job"><h3><code>' + escapeHtml(entry[0]) + '</code>' + selectedTag + '</h3><p>' + countSteps(entry[1]) + ' step(s)</p></div>';
                        });
                    }
                    html += '</div>';
                });

                document.getElementById('content').innerHTML = html;
                const sel = document.getElementById('bb-pipeline-select');
                if (sel) {
                    sel.addEventListener('change', function() {
                        const parts = this.value.split('::');
                        bbSelectedPipeline = { type: parts[0], key: parts[1] === 'null' ? null : parts[1] };
                        renderBitbucket(data);
                    });
                }
                setTimeout(function() { try { mermaid.run(); } catch(e) { showError('Diagram Render Error', e.message || String(e), '<strong>Tip:</strong> Try refreshing the panel.'); } }, 100);
            } catch (error) {
                showError('Rendering Error', error.message || 'Failed to render Bitbucket Pipelines visualization.', '<strong>Tip:</strong> Please check your bitbucket-pipelines.yml file.');
            }
        }