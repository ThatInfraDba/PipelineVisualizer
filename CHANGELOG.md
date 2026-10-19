# Change Log

All notable changes to the "Pipeline Visualizer" extension will be documented in this file.

## [1.5.0] - Unreleased

Platform syntax roll-up ([#34](https://github.com/ThatInfraDba/PipelineVisualizer/issues/34)).

### Added
- **Dependency-graph diagrams** — diagrams now follow the real dependencies instead of always drawing a straight chain. Independent nodes start from `Start` in parallel and nodes nothing depends on lead to `End`. A shared `buildFlowchart` helper in `media/webview.js` replaces the per-platform diagram code, and the automatic layout direction now uses the longest dependency path instead of the node count
  - **GitHub Actions** — edges from `jobs.<id>.needs`; jobs without `needs` run in parallel, as they do on GitHub
  - **Azure DevOps** — edges from stage `dependsOn`; a stage without `dependsOn` depends on the previous stage and `dependsOn: []` starts immediately
  - **GitLab CI/CD** — when any job uses `needs`, the diagram switches to a job-level graph: `needs` edges, `needs: []` starts immediately, and jobs without `needs` wait for every job in the previous stage. Pipelines without `needs` keep the stage chain
  - **Bitbucket Pipelines** — `parallel` groups fan out into one node per step and join again before the next step (pending since v1.2.0)
- **Bitbucket Pipelines**
  - **Triggers** (top-level `triggers:`) — each event type with its `condition` and the custom pipelines it starts; clicking a pipeline switches the selector to it
  - **Agentic steps** — `definitions.agents` info card, the agent prompt in the `- agent:` step popup, and step `auth.system.scopes`
  - **Imported pipelines** (`import:`) — shown as a reference card with the source instead of "0 steps"
  - **Custom pipeline variables** (`- variables:` with `default` / `allowed-values`) in a Run-time Variables section
  - **Clone and options** — top-level and step `clone` (`depth`, `lfs`, `enabled`, `skip-ssl-verify`), global `options` (`max-time`, `size`, `docker`, `runtime`), and `definitions.services`
  - **Step and stage settings** — step `condition` (`changesets`), `runs-on`, `runtime.cloud.arch`, `max-time`, `oidc`; stage `deployment`, `trigger: manual`, `condition`; `parallel` `fail-fast`
  - Pipeline summary cards are clickable and switch the selector
  - New sample `samples/bitbucket-advanced.yml`
- **GitLab CI/CD**
  - **`extends:` resolution** — jobs inherit from hidden (`.template`) and regular jobs, including chains and multiple parents; hashes merge deeply and other values are replaced, matching GitLab. Inherited `stage`, `image`, `script`, `rules` etc. now show
  - **`!reference [job, key]`** — resolved in `script`, `before_script`, `after_script` and `rules` (previously shown as `.job,script` after the tag was stripped)
  - **Downstream pipelines** (`trigger:`) — child pipeline `include`, multi-project `project` / `branch`, `strategy: depend` and `forward`, instead of an empty job
  - **`parallel` / `parallel:matrix`** — job count and the matrix variables
  - **`include:`** — info card plus a Configuration section listing local / project / remote / template / `component:` sources
  - **Rules in detail** — job `rules` and `workflow:rules` list each rule's `if` / `changes` / `exists` and its outcome (`when`, `allow_failure`, `variables`) instead of a count; Workflow card shows the rule count and `auto_cancel`
  - **Job settings** — `services`, `cache`, `artifacts` (paths, reports, expiry), `retry`, `timeout`, `resource_group`, `release`, `coverage`, `environment:action`, `id_tokens`, `secrets`, and job-level `inputs` (GitLab 18.10)
  - **`spec:inputs`** — `regex` and conditional `rules` (GitLab 18.7) with their `options` / `default`; array defaults (GitLab 19.0) shown as JSON
  - Job names and script lines are now HTML-escaped
  - New sample `samples/advanced.gitlab-ci.yml`
- **Webview test harness** moved to `src/test/suite/webviewHarness.ts` so rendering tests can share it; new `webviewDiagram.test.ts` asserts on the generated Mermaid edges

## [1.4.1] - 2026-10-19

Fixes found while auditing all supported platforms against their current YAML syntax.

### Fixed
- **Bitbucket `pipe:` / `agent:` script entries rendered as `[object Object]`** ([#29](https://github.com/ThatInfraDba/PipelineVisualizer/issues/29)) — script and `after-script` entries were converted with `String(cmd)`, so object entries such as `- pipe: atlassian/aws-s3-deploy:1.1.0` or the new `- agent: <name>` agentic steps lost their content. They now render as `🔌 pipe: …` / `🤖 agent: …` (other object entries fall back to `key: value`), and the full entry (e.g. pipe `variables`) is available in the step detail popup. A single-string `after-script` no longer throws
- **GitLab jobs in `.pre` / `.post` or undeclared stages were silently dropped** ([#30](https://github.com/ThatInfraDba/PipelineVisualizer/issues/30)) — only stages listed in `stages:` were rendered. `.pre` and `.post` now always render first and last, the default stage list when `stages:` is absent matches GitLab (`.pre, build, test, deploy, .post`), and jobs in a stage not declared in `stages:` are shown with a warning instead of being omitted
- **GitLab CI/CD components and `spec:inputs` files failed to parse** ([#31](https://github.com/ThatInfraDba/PipelineVisualizer/issues/31)) — these files are two YAML documents (a `spec:` header, `---`, then the pipeline) and `yaml.load` rejected them with "expected a single document in the stream". Parsing now uses `loadAll` (new `src/yamlParser.ts`, mirrored in the webview): a `spec:`-only first document is treated as the header, otherwise the first non-empty document is visualized. A `spec:` header also marks the file as GitLab CI. Declared inputs (type, default / required, `options`, description) and `spec:description` are shown in a new **📥 Inputs** section
- **AWS CodeBuild secondary artifacts were not rendered** ([#32](https://github.com/ThatInfraDba/PipelineVisualizer/issues/32)) — v1.2.0 listed them as supported but `artifacts.secondary-artifacts` was never read. Each secondary artifact now renders in the Artifacts section, the info card counts them, and `discard-paths`, `exclude-paths`, `s3-prefix` and `enable-symlinks` are shown for primary and secondary artifacts
- **Azure DevOps pipelines without `stages:` rendered empty** ([#33](https://github.com/ThatInfraDba/PipelineVisualizer/issues/33)) — pipelines with only top-level `jobs:` or `steps:` are now wrapped in an implicit stage (and job) before rendering. The Pool card now shows `vmImage` (or a string pool name) instead of "Default"

### Added
- **Webview rendering tests** (`src/test/suite/webviewRender.test.ts`) — run `media/webview.js` in a Node `vm` with a minimal DOM stub and assert on the rendered HTML, covering each fix above. The VS Code integration tests can only see the webview shell, not its rendered content
- **Samples** — `samples/gitlab-component.yml` (`spec:inputs` header, `.pre` / `.post` jobs), `samples/azure-jobs-only.yaml`, `samples/azure-steps-only.yaml`; `samples/awsbuildspec-sample.yml` now includes `secondary-artifacts`. All are covered by the integration tests

## [1.4.0] - 2026-10-19

Rolls up all open Dependabot PRs (#13, #20, #22, #23, #24, #26, #27) into a single release and fixes the CI failure they all shared.

### Security
- Ran `npm audit fix` — updates transitive `brace-expansion` (GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p) and `serialize-javascript` (GHSA-gfhx-hw2g-v5hg). These advisories made the CI `npm audit --audit-level=high` step fail on every open Dependabot PR

### Changed
- Bumped `js-yaml` (4.3.2 → 5.5.0). v5 ships its own type definitions (dropped `@types/js-yaml`) and moved the browser bundle, so the webview now loads `node_modules/js-yaml/dist/browser/js-yaml.umd.min.js`
- Bumped `eslint` (8.57.1 → 10.13.0) and migrated from `.eslintrc.json` to flat config (`eslint.config.mjs`, using `@eslint/js` + `typescript-eslint`); `--ext` flag removed from the lint script
- Bumped `@typescript-eslint/eslint-plugin` / `@typescript-eslint/parser` (8.70.0 → 8.71.2)
- Bumped `typescript` (5.9.3 → 6.0.3) and set `types: ["node", "mocha"]` in `tsconfig.json` (TypeScript 6 no longer includes all `@types/*` by default). TypeScript 7 is not adopted yet — `typescript-eslint` only supports `<6.1.0`
- Bumped `mocha` (12.0.0 → 12.0.3), `@types/node` (20 → 26.6.5)
- `@types/vscode` lockfile updated to 1.140.0 while keeping the declared range at `^1.85.0` — raising the range above `engines.vscode` makes `vsce` refuse to package
- CI and release workflows now run on Node 24 (Node 20 is end-of-life)
- Dependabot: `typescript-eslint` added to the typescript-eslint group; minor/major `@types/vscode` and major `typescript` updates are ignored for the reasons above

### Added
- **VS Code integration test suite** — `@vscode/test-electron` + Mocha now drive the real `pipelineVisualizer.visualize` command against every sample pipeline (Azure DevOps, GitHub Actions, GitLab CI, AWS CodeBuild, AWS CloudFormation, Bitbucket Pipelines x2), asserting the correct platform badge renders and no error is shown. A negative test confirms invalid YAML is handled gracefully. Run via `npm test`; CI runs it headless via `xvfb-run`
- **Sample pipelines for previously-untested platforms** — added `samples/azure-pipeline.yaml` and `samples/github-workflow.yaml`; every supported platform now has test coverage
- **CI workflow** (`.github/workflows/ci.yml`) — runs compile, lint, `npm audit`, and the full integration test suite on every push/PR to `main`
- **Dependabot** (`.github/dependabot.yml`) — weekly npm + GitHub Actions dependency update PRs, plus repo-level vulnerability alerts enabled so security-advisory PRs open automatically; reviewer is requested on each PR to trigger GitHub's email notification

### Fixed
- **Broken lint script** — `npm run lint` had no ESLint config and failed outright, which silently blocked `npm test` (a `pretest` hook runs `compile && lint`). Added a minimal `.eslintrc.json` and fixed the resulting findings: dropped a dead `escapedLayoutPref` computation, replaced a `require()` call with a static `js-yaml` import, and switched a `let` destructure to `const` for values that are never reassigned

## [1.3.3] - 2026-09-09

### Security
- Bumped `js-yaml` (4.1.1 → 4.3.2) — fixes quadratic-complexity DoS in merge-key/`!!omap` handling (GHSA-h67p-54hq-rp68, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj, GHSA-2883-xcg3-v3hh)
- Bumped `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` (6.21.0 → 8.70.0) — resolves transitive ReDoS in `minimatch` (GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj, GHSA-23c5-xmqv-rm74)
- Ran `npm audit fix` to update `brace-expansion` — resolves DoS advisories (GHSA-3jxr-9vmj-r5cp, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895)

## [1.3.2] - 2026-06-03

### Fixed
- **Blank visualization panel — js-yaml CDN dependency** — v1.3.0 reverted from the v1.2.5 bundled js-yaml approach back to CDN loading, breaking rendering in environments without access to `cdn.jsdelivr.net`. Changed to load js-yaml from the bundled `node_modules/js-yaml/dist/js-yaml.min.js` via `webview.asWebviewUri()` — same pattern used for `media/webview.js` — so no CDN access is required for YAML parsing

## [1.3.1] - 2026-06-03

### Fixed
- **v1.3.0 built from stale branch** — v1.3.0 was tagged before merging into main, so it was missing fixes from v1.2.2 through v1.2.5 (VSIX packaging, js-yaml bundling, LF line endings, AWS blank panel). This release is v1.3.0 rebuilt from the correct base (main with all prior fixes included)

## [1.3.0] - 2026-06-03

### Added
- **Colorblind-accessible themes** — two new themes for users with color vision deficiencies:
  - `colorblind`: dark background using the Okabe-Ito palette, which is distinguishable under deuteranopia, protanopia, and tritanopia
  - `highcontrast`: near-black background using the IBM colorblind palette — WCAG AA contrast with broad colorblind safety

### Fixed
- **Blank visualization panel** — switched to nonce-based Content Security Policy for the webview inline script; `'unsafe-inline'` was no longer reliably honoured in newer VS Code versions, causing the rendering script to be silently blocked
- **Persistent SyntaxError causing blank panel** — moved the entire webview rendering script to an external static file (`media/webview.js`) loaded via `<script src="...">`, eliminating a parse-time `SyntaxError: Unexpected string` caused by VS Code webview's Chromium version rejecting the ~1000-line inline script embedded inside a template literal with CRLF line endings. Configuration is now passed via a tiny inline `window.pvConfig` object; pipeline YAML data is delivered via postMessage handshake
- **Step detail popups not opening** — inline `onclick=` event handlers in dynamically-injected HTML are blocked by the nonce-based CSP (which has no `'unsafe-inline'` in `script-src`). Replaced all inline handlers with `data-step` attributes and a single delegated `click` listener on the content container. Also fixed the Refresh button by the same mechanism

## [1.2.5] - 2026-04-22

### Fixed
- **Blank visualization panel for AWS CodeBuild and AWS CodePipeline files** — a `\'` escape sequence inside a TypeScript template literal was consumed by the template literal processor (producing just `'`), resulting in two adjacent string literals (`''`) in the generated webview JavaScript. This caused a `SyntaxError: Unexpected string` that prevented the entire `<script>` block from executing, leaving `#content` empty for all AWS file types. Fixed by using `\\'` in the TypeScript source so the backslash is preserved in the compiled output.

## [1.2.4] - 2026-04-22

### Fixed
- **Critical: Extension not loading after install — root cause** — `node_modules/**` in `.vscodeignore` was preventing `vsce` from bundling the `js-yaml` runtime dependency into the VSIX. At load time, `require("js-yaml")` threw `MODULE_NOT_FOUND`, the extension module failed entirely, and the command was never registered. Removed `node_modules/**` from `.vscodeignore` so `vsce` bundles production dependencies correctly. Also moved `@types/js-yaml` from `dependencies` to `devDependencies` as it is a compile-time type definition only.

## [1.2.3] - 2026-04-22

### Fixed
- **Compiled output perpetually showing as modified in git** — TypeScript compiles with LF line endings but git on Windows (`core.autocrlf=true`) expected CRLF, causing `out/extension.js` and `out/visualizerPanel.js` to always appear dirty. Added `.gitattributes` to enforce LF line endings for all source and compiled files.

## [1.2.2] - 2026-04-22

### Fixed
- **Critical: Extension not loading after install (v1.2.1 fix incomplete)** — the v1.2.1 fix added `!out/**` to `.vscodeignore` to negate the `.gitignore` exclusion of `out/`, but `vsce` enforces git's parent-directory rule: when a directory is excluded in `.gitignore`, its contents cannot be re-included by a negation pattern. Removed `out` from `.gitignore` entirely so compiled output is always included in the VSIX.

## [1.2.1] - 2026-04-22

### Fixed
- **Critical: Extension not loading after install** — `out/` was listed in `.gitignore` (added during v1.2.0 development), causing `vsce` to exclude the compiled JavaScript from the VSIX package. Every fresh installation resulted in `command 'pipelineVisualizer.visualize' not found`. Debug (F5) was unaffected because it reads from disk directly.
- **Blank visualization panel for AWS files** — `mermaid.initialize()` was called outside the try-catch block; any initialization failure silently blanked the page with no error message. Now wrapped with CDN availability checks and proper error reporting.
- **AWS CloudFormation stage click navigation broken** — Mermaid click handler names for CloudFormation pipeline stages were mismatched with their registered `window` functions, so clicking diagram nodes did nothing.

## [1.2.0] - 2026-04-22

### Added
- **GitLab CI/CD support** — auto-detects `.gitlab-ci.yml` files and visualizes jobs, stages, dependencies (`needs:`, `dependencies:`), artifacts, caches, rules, services, and environments
- **AWS CodeBuild support** — auto-detects `buildspec.yml` files and visualizes build phases (install, pre-build, build, post-build), runtime versions, artifacts, secondary artifacts, cache, and environment variables
- **Bitbucket Pipelines support** — auto-detects `bitbucket-pipelines.yml` files and visualizes steps, parallel groups, stages, and deployment steps; includes a pipeline selector dropdown to switch between default, branch, PR, tag, and custom pipeline variants without leaving the panel
- **Color Themes** — six built-in visualization themes configurable via `pipelineVisualizer.colorTheme`: `dark` (default), `light`, `ocean`, `forest`, `sunset`, `monochrome`

> **Note:** GitLab CI/CD, AWS CodeBuild, and Bitbucket Pipelines support is new in this release and may not cover all edge cases. Please report issues at [GitHub](https://github.com/ThatInfraDba/PipelineVisualizer/issues).

## [1.1.0] - 2026-04-21

### Fixed
- **Mermaid syntax error for pipeline/job names containing special characters**
  - Job and stage names with `{`, `}`, `[`, `]` — such as GitHub Actions expression syntax like `${{ inputs.config_file }}` — now render correctly
  - Node labels are now wrapped in double-quoted Mermaid syntax (`["label"]`), treating all special characters as literals
  - Affects both GitHub Actions job names and Azure DevOps stage names

## [1.0.3] - 2026-01-14

### Added
- **Manual Approval Gates** for Azure DevOps pipelines
  - Detects ManualValidation and ManualIntervention tasks
  - Detects agentless jobs (pool: server)
  - Displays approval gate information in dedicated yellow sections
  - Shows approvers, notify users, timeout settings, and instructions
  
### Enhanced
- Improved approval gate visibility with solid yellow background and dark text
- Better contrast for readability in both light and dark themes
- Deployment job indicators for environment-based approvals
- Protected environment badges for GitHub Actions workflows

### Fixed
- TypeScript syntax error in browser JavaScript causing blank visualizations
- Improved error handling for job rendering

## [1.0.2] - 2026-01-14

### Added
- **Approval Gates Visualization** for Azure DevOps pipelines
  - Detects deployment jobs and manual validation tasks
  - Shows approval nodes in Mermaid diagrams with 🔒 icon
  - Highlights manual validation steps with orange accent
  - Displays environment information for deployment jobs
- **Environment Approvals** for GitHub Actions workflows
  - Detects protected environments that may require approval
  - Shows environment approval nodes in diagrams
  - Displays environment details including name and URL
  - Warning indicators for approval requirements

### Enhanced
- Visual distinction for approval gates with orange styling
- Better environment information display
- Improved step highlighting for manual validation tasks

## [1.0.1] - 2026-01-13

### Changed
- Updated README with VS Code Marketplace link and installation instructions
- Added multiple installation methods (Extensions panel, direct link, command line)

## [1.0.0] - 2026-01-13

### Added
- Initial release
- Auto-detection of Azure DevOps Pipelines and GitHub Actions Workflows
- Interactive Mermaid.js diagrams
- Step detail modal with full configuration display
- Platform-specific theming (Azure blue/purple, GitHub blue)
- Command palette integration (`Pipeline: Visualize`)
- Context menu integration for YAML files
- Editor title bar button for quick access

### Features
- Automatic platform detection
- Visual flowchart generation
- Click-to-inspect step details
- Support for stages, jobs, steps, dependencies
- Environment variable and condition display
- Works entirely within VS Code webview
