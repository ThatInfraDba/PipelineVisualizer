# Change Log

All notable changes to the "Pipeline Visualizer" extension will be documented in this file.

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
