# Change Log

All notable changes to the "Pipeline Visualizer" extension will be documented in this file.

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
