# Pipeline Visualizer - VS Code Extension

Visualize your CI/CD pipeline YAML files directly in VS Code with beautiful, interactive diagrams! Supports Azure DevOps, GitHub Actions, GitLab CI/CD, AWS CodeBuild, and Bitbucket Pipelines.

🔗 **[GitHub Repository](https://github.com/ThatInfraDba/PipelineVisualizer)** | 📦 **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=DannydeHaan.pipeline-visualizer)** | 💖 **[Sponsor this Project](https://github.com/sponsors/ThatInfraDba)**

> **Note:** GitLab CI/CD, AWS CodeBuild, and Bitbucket Pipelines support is new in v1.2.0 and still undergoing testing. Please report any issues on GitHub.

## Features

- **🤖 Auto-Detection** - Automatically identifies Azure DevOps, GitHub Actions, GitLab CI/CD, AWS CodeBuild, and Bitbucket Pipelines
- **📊 Interactive Diagrams** - Visual flowcharts powered by Mermaid.js showing your pipeline structure
- **🎨 Color-Coded Stages** - Each stage gets a unique color for easy differentiation
- **🖱️ Clickable Nodes** - Click any stage in the diagram to jump to its details
- **🔍 Step Details** - Click any step to view detailed configuration, scripts, and parameters
- **🔄 Refresh Button** - Update visualization without closing the panel when you edit your YAML
- **⚙️ Layout Options** - Choose between automatic, horizontal, or vertical diagram layouts
- **🌈 Color Themes** - Six built-in themes: dark, light, ocean, forest, sunset, and monochrome
- **🗂️ Pipeline Selector** - Switch between named Bitbucket pipelines (default, branches, PRs, tags, custom) without leaving the panel
- **⚡ Instant Visualization** - Works directly from the editor with no external tools needed
- **📁 Context Menu Integration** - Right-click any YAML file to visualize

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Pipeline Visualizer"
4. Click **Install**

**Or install directly:**
- [Open in VS Code](vscode:extension/DannydeHaan.pipeline-visualizer)
- [Marketplace Page](https://marketplace.visualstudio.com/items?itemName=DannydeHaan.pipeline-visualizer)

### From Command Line

```bash
code --install-extension DannydeHaan.pipeline-visualizer
```

## Usage

### From Editor

1. Open any supported CI/CD pipeline YAML file (Azure DevOps, GitHub Actions, GitLab, AWS CodeBuild, or Bitbucket)
2. Click the **graph icon** in the editor title bar, OR
3. Right-click in the editor and select **"Pipeline: Visualize"**, OR
4. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **"Pipeline: Visualize"**

The extension will:
- Automatically detect which platform your pipeline is for
- Generate an interactive visualization
- Open it in a new panel next to your editor

### Exploring the Visualization

- **View Overview** - See all stages/jobs with their relationships
- **Click Steps** - Click any step to see detailed information including:
  - Scripts and commands
  - Task/action configurations
  - Environment variables
  - Conditions and timeouts
  - Raw step data
- **Mermaid Diagram** - Visual flowchart showing pipeline flow

## Requirements

- VS Code version 1.85.0 or higher
- YAML files must be valid syntax

## Supported Formats

### Azure DevOps Pipelines
- Stages, jobs, and steps
- Manual approval gates
- Dependencies and conditions
- Pool configurations
- Triggers and PR builds
- Variables and parameters

### GitHub Actions Workflows
- Workflows with multiple jobs
- Job dependencies (`needs:`)
- Actions (`uses:`) and scripts (`run:`)
- Triggers (`on:`)
- Runners (`runs-on:`)
- Step conditions and parameters

### GitLab CI/CD Pipelines _(new in v1.2.0 — additional testing in progress)_
- Jobs and stages
- Job dependencies (`needs:`, `dependencies:`)
- Artifacts and caches
- Rules and conditions
- Services and environment configuration

### AWS CodeBuild Buildspec _(new in v1.2.0 — additional testing in progress)_
- Build phases (install, pre-build, build, post-build)
- Runtime versions
- Artifacts and secondary artifacts
- Cache configuration
- Environment variables

### Bitbucket Pipelines _(new in v1.2.0 — additional testing in progress)_
- Default, branch, PR, tag, and custom pipeline variants
- Pipeline selector dropdown to switch between named pipelines
- Parallel step groups
- Stages and deployment steps
- Service containers and caches

## Extension Settings

This extension contributes the following settings:

* `pipelineVisualizer.diagramLayout`: Control the orientation of Mermaid diagrams
  - `automatic` (default): Horizontal for ≤6 stages, vertical for more
  - `horizontal`: Always left-to-right layout
  - `vertical`: Always top-to-bottom layout

* `pipelineVisualizer.colorTheme`: Control the color theme of the visualization panel
  - `dark` (default): Dark background with vibrant multi-color palette
  - `light`: Light background with deep, saturated colors
  - `ocean`: Deep navy background with blue spectrum palette
  - `forest`: Dark green background with earthy green palette
  - `sunset`: Dark amber background with warm orange and red palette
  - `monochrome`: Near-black background with blue-grey palette

## Known Issues

- Very large pipeline files (>1000 lines) may take a moment to render
- Complex Mermaid diagrams with many dependencies might need horizontal scrolling
- GitLab CI/CD, AWS CodeBuild, and Bitbucket Pipelines support is new and may not handle all edge cases — please report issues on GitHub
- If the visualization panel shows a "Scripts Failed to Load" error, check that your machine can reach `cdn.jsdelivr.net` (required for Mermaid and js-yaml)

## Support This Project

If you find this extension helpful:
- ⭐ **Star the repository** on [GitHub](https://github.com/ThatInfraDba/PipelineVisualizer)
- 💬 **Share it** with your team and colleagues
- 🐛 **Report bugs** or suggest features via GitHub Issues
- 💖 **Sponsor development** via [GitHub Sponsors](https://github.com/sponsors/ThatInfraDba)

**Using this extension in your company?** Consider supporting its development through GitHub Sponsors to help keep the project actively maintained and ensure compatibility with the latest VS Code versions.

---

## Release Notes

### 1.2.1

Bug Fixes:
- **Fixed: Extension not loading after install** — compiled output was excluded from the VSIX package due to a `.gitignore` conflict, causing `command 'pipelineVisualizer.visualize' not found` on every fresh installation
- **Fixed: Blank visualization panel for AWS files** — initialization errors now show a visible message instead of silently leaving the panel empty
- **Fixed: AWS CloudFormation stage click navigation** — clicking pipeline stage nodes in the diagram now correctly scrolls to the corresponding detail card

### 1.2.0

New Platform Support:
- **GitLab CI/CD** — visualize `.gitlab-ci.yml` files with jobs, stages, dependencies, and artifacts
- **AWS CodeBuild** — visualize `buildspec.yml` files with build phases, runtimes, and artifacts
- **Bitbucket Pipelines** — visualize `bitbucket-pipelines.yml` files with a pipeline selector dropdown for switching between default, branch, PR, tag, and custom pipeline variants

New Features:
- **Color Themes** — six built-in themes (dark, light, ocean, forest, sunset, monochrome) configurable via extension settings

> GitLab CI/CD, AWS CodeBuild, and Bitbucket Pipelines support is new and still undergoing testing. Please report any issues.

### 1.1.0

Bug Fixes:
- Fixed Mermaid syntax error ("Syntax error in text") when pipeline job or stage names contain special characters such as `{`, `}`, `[`, or `]`
- GitHub Actions job names using expression syntax (e.g. `${{ inputs.config_file }}`) no longer break the diagram renderer
- Applies to both GitHub Actions workflows and Azure DevOps pipelines

### 1.0.3

Approval Gates Support:
- Manual approval gates visualization for Azure DevOps pipelines
- Shows approvers, timeout settings, and instructions in dedicated sections
- Protected environment indicators for GitHub Actions workflows
- Improved readability with better color contrast
- Bug fixes for visualization rendering

### 1.0.0

Initial release of Pipeline Visualizer:
- Auto-detection of Azure DevOps and GitHub Actions pipelines
- Interactive Mermaid diagrams with clickable nodes
- Color-coded stages (blue, green, orange, purple, teal, red)
- Detailed step inspection modal
- Platform-specific theming
- Command palette and context menu integration
- Refresh button to update visualizations
- Configurable diagram layout (automatic, horizontal, vertical)
- Smart error handling with helpful tips
- White arrows on dark backgrounds for better visibility

## Contributing

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/ThatInfraDba/PipelineVisualizer).

## License

This extension is released under the **MIT License**.

### What does the MIT License mean?

The MIT License is one of the most permissive and popular open-source licenses. It means:

## Acknowledgments

- Built with modern VS Code Extension APIs
- Powered by [Mermaid.js](https://mermaid.js.org/) for diagrams
- YAML parsing by [js-yaml](https://github.com/nodeca/js-yaml)
- **Created with AI assistance** 

---

**Enjoy visualizing your pipelines! 🚀**
