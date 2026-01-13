# Pipeline Visualizer - VS Code Extension

Visualize your Azure DevOps and GitHub Actions YAML pipeline files directly in VS Code with beautiful, interactive diagrams!

🔗 **[GitHub Repository](https://github.com/ThatInfraDba/PipelineVisualizer)** | 📦 **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=DannydeHaan.pipeline-visualizer)** | 💖 **[Sponsor this Project](https://github.com/sponsors/ThatInfraDba)**

## Features

- **🤖 Auto-Detection** - Automatically identifies whether your YAML is an Azure DevOps Pipeline or GitHub Actions Workflow
- **📊 Interactive Diagrams** - Visual flowcharts powered by Mermaid.js showing your pipeline structure
- **🎨 Color-Coded Stages** - Each stage gets a unique color for easy differentiation
- **🖱️ Clickable Nodes** - Click any stage in the diagram to jump to its details
- **🔍 Step Details** - Click any step to view detailed configuration, scripts, and parameters
- **🔄 Refresh Button** - Update visualization without closing the panel when you edit your YAML
- **⚙️ Layout Options** - Choose between automatic, horizontal, or vertical diagram layouts
- **🌈 Platform Theming** - Azure (blue/purple) and GitHub (blue) themed visualizations
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

1. Open any Azure DevOps Pipeline or GitHub Actions Workflow YAML file
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

## Extension Settings

This extension contributes the following settings:

* `pipelineVisualizer.diagramLayout`: Control the orientation of Mermaid diagrams
  - `automatic` (default): Horizontal for ≤6 stages, vertical for more
  - `horizontal`: Always left-to-right layout
  - `vertical`: Always top-to-bottom layout

## Known Issues

- Very large pipeline files (>1000 lines) may take a moment to render
- Complex Mermaid diagrams with many dependencies might need horizontal scrolling

## Support This Project

If you find this extension helpful:
- ⭐ **Star the repository** on [GitHub](https://github.com/ThatInfraDba/PipelineVisualizer)
- 💬 **Share it** with your team and colleagues
- 🐛 **Report bugs** or suggest features via GitHub Issues
- 💖 **Sponsor development** via [GitHub Sponsors](https://github.com/sponsors/ThatInfraDba)

**Using this extension in your company?** Consider supporting its development through GitHub Sponsors to help keep the project actively maintained and ensure compatibility with the latest VS Code versions.

---

## Release Notes

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
- **Created with AI assistance** using GitHub Copilot

---

**Enjoy visualizing your pipelines! 🚀**
