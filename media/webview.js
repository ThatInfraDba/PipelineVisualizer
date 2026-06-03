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
                    pipelineData = jsyaml.load(message.yamlContent);

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

                let html = `<p><strong>Pipeline:</strong> ${data.name || 'Unnamed'}</p>`;
            html += '<div class="info-grid">';
            if (data.trigger) html += '<div class="info-card"><h3>📋 Trigger</h3><p>Configured</p></div>';
            if (data.pool) html += '<div class="info-card"><h3>🖥️ Pool</h3><p>' + (data.pool.name || 'Default') + '</p></div>';
            if (data.stages) html += `<div class="info-card"><h3>📊 Stages</h3><p>${data.stages.length}</p></div>`;
            html += '</div>';

            let diagramDirection = 'TD';
            if (layoutPreference === 'horizontal') {
                diagramDirection = 'LR';
            } else if (layoutPreference === 'vertical') {
                diagramDirection = 'TD';
            } else {
                diagramDirection = (data.stages && data.stages.length <= 6) ? 'LR' : 'TD';
            }
            let diagram = `graph ${diagramDirection}\nSTART([Start])`;
            const stageColors = themePalette;
            if (data.stages) {
                data.stages.forEach((stage, idx) => {
                    const id = `S${idx}`;
                    const stageLabel = (stage.displayName || stage.stage || 'Stage').replace(/"/g, "'");
                    diagram += ` --> ${id}["${stageLabel}"]`;
                });
            }
            diagram += ' --> END([End])';
            if (data.stages) {
                data.stages.forEach((stage, idx) => {
                    const id = `S${idx}`;
                    const color = stageColors[idx % stageColors.length];
                    diagram += `\nstyle ${id} fill:${color},stroke:${color},color:#fff`;
                    diagram += `\nclick ${id} scrollToStage_${idx}`;
                    window[`scrollToStage_${idx}`] = function() { scrollToStage(`S${idx}`); };
                });
            }
            const edgeCount = (data.stages ? data.stages.length : 0) + 1;
            for (let i = 0; i < edgeCount; i++) {
                diagram += `\nlinkStyle ${i} stroke:${themeEdgeColor},stroke-width:2px,fill:none`;
            }
            html += `<div class="mermaid-container"><div class="mermaid">${diagram}</div></div>`;

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

            let diagramDirection = 'TD';
            if (layoutPreference === 'horizontal') {
                diagramDirection = 'LR';
            } else if (layoutPreference === 'vertical') {
                diagramDirection = 'TD';
            } else {
                diagramDirection = (data.jobs && Object.keys(data.jobs).length <= 6) ? 'LR' : 'TD';
            }
            let diagram = `graph ${diagramDirection}\nSTART([Start])`;
            const jobColors = themePalette;
            if (data.jobs) {
                Object.keys(data.jobs).forEach((key, idx) => {
                    const id = `J${idx}`;
                    const jobLabel = (data.jobs[key].name || key).replace(/"/g, "'");
                    diagram += ` --> ${id}["${jobLabel}"]`;
                });
            }
            diagram += ' --> END([End])';
            if (data.jobs) {
                Object.keys(data.jobs).forEach((key, idx) => {
                    const id = `J${idx}`;
                    const color = jobColors[idx % jobColors.length];
                    diagram += `\nstyle ${id} fill:${color},stroke:${color},color:#fff`;
                    diagram += `\nclick ${id} scrollToJob_${idx}`;
                    window[`scrollToJob_${idx}`] = function() { scrollToStage(`J${idx}`); };
                });
            }
            const edgeCount = (data.jobs ? Object.keys(data.jobs).length : 0) + 1;
            for (let i = 0; i < edgeCount; i++) {
                diagram += `\nlinkStyle ${i} stroke:${themeEdgeColor},stroke-width:2px,fill:none`;
            }
            html += `<div class="mermaid-container"><div class="mermaid">${diagram}</div></div>`;

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

                const stageOrder = data.stages || ['build', 'test', 'deploy'];
                const jobsByStage = {};
                stageOrder.forEach(s => { jobsByStage[s] = []; });
                jobEntries.forEach(([key, job]) => {
                    const stage = job.stage || 'test';
                    if (!jobsByStage[stage]) { jobsByStage[stage] = []; }
                    jobsByStage[stage].push({ key, job });
                });

                const activeStages = stageOrder.filter(s => jobsByStage[s] && jobsByStage[s].length > 0);

                let html = `<p><strong>Pipeline:</strong> ${(data.workflow && data.workflow.name) || 'GitLab CI Pipeline'}</p>`;
                html += '<div class="info-grid">';
                html += `<div class="info-card"><h3>📊 Stages</h3><p>${activeStages.length}</p></div>`;
                html += `<div class="info-card"><h3>💼 Jobs</h3><p>${jobEntries.length}</p></div>`;
                if (data.variables) html += `<div class="info-card"><h3>🔧 Variables</h3><p>${Object.keys(data.variables).length} defined</p></div>`;
                if (data.workflow) html += '<div class="info-card"><h3>🔀 Workflow</h3><p>Configured</p></div>';
                if (data.default && data.default.image) {
                    const imgName = typeof data.default.image === 'string' ? data.default.image : data.default.image.name;
                    html += `<div class="info-card"><h3>🐳 Default Image</h3><p>${imgName}</p></div>`;
                }
                html += '</div>';

                let diagramDirection = 'LR';
                if (layoutPreference === 'vertical') {
                    diagramDirection = 'TD';
                } else if (layoutPreference === 'horizontal') {
                    diagramDirection = 'LR';
                } else {
                    diagramDirection = activeStages.length <= 6 ? 'LR' : 'TD';
                }

                const stageColors = themePalette;
                let diagram = `graph ${diagramDirection}\nSTART([Start])`;
                activeStages.forEach((stage, idx) => {
                    const id = `GL${idx}`;
                    const label = stage.replace(/"/g, "'");
                    diagram += ` --> ${id}["${label}"]`;
                });
                diagram += ' --> END([End])';
                activeStages.forEach((stage, idx) => {
                    const id = `GL${idx}`;
                    const color = stageColors[idx % stageColors.length];
                    diagram += `\nstyle ${id} fill:${color},stroke:${color},color:#fff`;
                    diagram += `\nclick ${id} scrollToGLStage_${idx}`;
                    window[`scrollToGLStage_${idx}`] = function() { scrollToStage(`GL${idx}`); };
                });
                const glEdgeCount = activeStages.length + 1;
                for (let i = 0; i < glEdgeCount; i++) {
                    diagram += `\nlinkStyle ${i} stroke:${themeEdgeColor},stroke-width:2px,fill:none`;
                }
                html += `<div class="mermaid-container"><div class="mermaid">${diagram}</div></div>`;

                activeStages.forEach((stage, idx) => {
                    const color = stageColors[idx % stageColors.length];
                    html += `<div id="GL${idx}" class="stage" style="border-color: ${color}; background: linear-gradient(135deg, ${color}33 0%, ${color}14 100%);">`;
                    html += `<h2 style="background: ${color}; color: white;">🦊 ${stage}</h2>`;

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

                if (data.artifacts) {
                    const artifactFiles = Array.isArray(data.artifacts.files) ? data.artifacts.files.length : (data.artifacts.files ? 1 : 0);
                    html += `<div class="info-card"><h3>📦 Artifacts</h3><p>${artifactFiles} file pattern(s)</p></div>`;
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

                let diagramDirection = 'LR';
                if (layoutPreference === 'vertical') {
                    diagramDirection = 'TD';
                } else if (layoutPreference === 'horizontal') {
                    diagramDirection = 'LR';
                } else {
                    diagramDirection = presentPhases.length <= 6 ? 'LR' : 'TD';
                }

                const phaseColors = themePalette;
                let diagram = `graph ${diagramDirection}\nSTART([Start])`;
                presentPhases.forEach((phase, idx) => {
                    const id = `CB${idx}`;
                    const label = phase.replace(/_/g, ' ');
                    diagram += ` --> ${id}["${label}"]`;
                });
                diagram += ' --> END([End])';
                presentPhases.forEach((phase, idx) => {
                    const id = `CB${idx}`;
                    const color = phaseColors[idx % phaseColors.length];
                    diagram += `\nstyle ${id} fill:${color},stroke:${color},color:#fff`;
                    diagram += `\nclick ${id} scrollToCBPhase_${idx}`;
                    window[`scrollToCBPhase_${idx}`] = function() { scrollToStage(`CB${idx}`); };
                });
                const cbEdgeCount = presentPhases.length + 1;
                for (let i = 0; i < cbEdgeCount; i++) {
                    diagram += `\nlinkStyle ${i} stroke:${themeEdgeColor},stroke-width:2px,fill:none`;
                }
                html += `<div class="mermaid-container"><div class="mermaid">${diagram}</div></div>`;

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
                    if (data.artifacts.files) {
                        const files = Array.isArray(data.artifacts.files) ? data.artifacts.files : [data.artifacts.files];
                        html += `<p><strong>Files:</strong></p><ul class="steps">`;
                        files.forEach(f => { html += `<li style="cursor:default;">📄 ${escapeHtml(String(f))}</li>`; });
                        html += '</ul>';
                    }
                    if (data.artifacts['base-directory']) {
                        html += `<p><strong>Base directory:</strong> <code>${escapeHtml(String(data.artifacts['base-directory']))}</code></p>`;
                    }
                    if (data.artifacts.name) {
                        html += `<p><strong>Artifact name:</strong> <code>${escapeHtml(String(data.artifacts.name))}</code></p>`;
                    }
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
                    var diagramDirection = layoutPreference === 'vertical' ? 'TD' : (stages.length <= 6 ? 'LR' : 'TD');

                    html += '<h3 style="margin-top:24px;font-size:15px;opacity:0.8;">🔀 Pipeline: ' + escapeHtml(pipelineName) + '</h3>';

                    var diagram = 'graph ' + diagramDirection + '\nSTART([Start])';
                    stages.forEach(function(stage, sIdx) {
                        var sid = 'CFP' + pIdx + '_' + sIdx;
                        var label = (stage.Name || ('Stage ' + (sIdx + 1))).replace(/"/g, "'");
                        diagram += ' --> ' + sid + '["' + label + '"]';
                    });
                    diagram += ' --> END([End])';
                    stages.forEach(function(stage, sIdx) {
                        var sid = 'CFP' + pIdx + '_' + sIdx;
                        var color = themePalette[sIdx % themePalette.length];
                        var clickName = 'scrollToCF_' + pIdx + '_' + sIdx;
                        diagram += '\nstyle ' + sid + ' fill:' + color + ',stroke:' + color + ',color:#fff';
                        diagram += '\nclick ' + sid + ' ' + clickName;
                        (function(name, id) { window[name] = function() { scrollToStage(id); }; })(clickName, sid);
                    });
                    var edgeCount = stages.length + 1;
                    for (var i = 0; i < edgeCount; i++) {
                        diagram += '\nlinkStyle ' + i + ' stroke:' + themeEdgeColor + ',stroke-width:2px,fill:none';
                    }
                    html += '<div class="mermaid-container"><div class="mermaid">' + diagram + '</div></div>';

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

                let diagramDirection = 'LR';
                if (layoutPreference === 'vertical') {
                    diagramDirection = 'TD';
                } else if (layoutPreference === 'horizontal') {
                    diagramDirection = 'LR';
                } else {
                    diagramDirection = diagramItems.length <= 6 ? 'LR' : 'TD';
                }

                const nodeColors = themePalette;
                let diagram = 'graph ' + diagramDirection + '\nSTART([Start])';
                diagramItems.forEach(function(node) {
                    diagram += ' --> BB' + node.origIdx + '["' + node.label + '"]';
                });
                diagram += ' --> END([End])';
                diagramItems.forEach(function(node, dIdx) {
                    const color = nodeColors[dIdx % nodeColors.length];
                    diagram += '\nstyle BB' + node.origIdx + ' fill:' + color + ',stroke:' + color + ',color:#fff';
                    diagram += '\nclick BB' + node.origIdx + ' scrollToBBNode_' + node.origIdx;
                    window['scrollToBBNode_' + node.origIdx] = (function(id) { return function() { scrollToStage(id); }; })('BB' + node.origIdx);
                });
                const bbEdgeCount = diagramItems.length + 1;
                for (let i = 0; i < bbEdgeCount; i++) {
                    diagram += '\nlinkStyle ' + i + ' stroke:' + themeEdgeColor + ',stroke-width:2px,fill:none';
                }
                html += '<div class="mermaid-container"><div class="mermaid">' + diagram + '</div></div>';

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
                    const cmds = Array.isArray(step.script) ? step.script : (step.script ? [step.script] : []);
                    if (cmds.length) {
                        out += '<ul class="steps">';
                        cmds.forEach(function(cmd) {
                            const sid = 'step_' + stepCounter++;
                            allSteps[sid] = { script: String(cmd), displayName: String(cmd).substring(0, 80) };
                            out += '<li data-step="' + sid + '" style="cursor:pointer;">▶️ ' + escapeHtml(String(cmd).substring(0, 80)) + (String(cmd).length > 80 ? '…' : '') + '</li>';
                        });
                        out += '</ul>';
                    }
                    if (step['after-script'] && step['after-script'].length) {
                        out += '<ul class="steps">';
                        step['after-script'].forEach(function(cmd) {
                            const sid = 'step_' + stepCounter++;
                            allSteps[sid] = { script: String(cmd), displayName: String(cmd).substring(0, 80) };
                            out += '<li data-step="' + sid + '" style="cursor:pointer;">🔚 ' + escapeHtml(String(cmd).substring(0, 80)) + (String(cmd).length > 80 ? '…' : '') + '</li>';
                        });
                        out += '</ul>';
                    }
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