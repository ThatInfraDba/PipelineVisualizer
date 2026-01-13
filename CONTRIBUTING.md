# Contributing to Pipeline Visualizer

Thank you for your interest in contributing! 🎉

## How to Contribute

### Reporting Bugs 🐛

1. Check if the bug has already been reported in [Issues](https://github.com/ThatInfraDba/PipelineVisualizer/issues)
2. If not, create a new issue with:
   - Clear title describing the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Your VS Code version
   - Sample YAML file (if applicable)
   - Screenshots (if relevant)

### Suggesting Features 💡

1. Check [existing issues](https://github.com/ThatInfraDba/PipelineVisualizer/issues) first
2. Create a new issue tagged with "enhancement"
3. Describe:
   - The feature you'd like
   - Why it would be useful
   - How it might work

### Contributing Code 👨‍💻

1. **Fork the repository**
2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/PipelineVisualizer.git
   cd PipelineVisualizer
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Create a branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Make your changes**
   - Follow the existing code style
   - Test your changes thoroughly
   - Update documentation if needed

6. **Test the extension:**
   - Press F5 in VS Code to launch Extension Development Host
   - Test with various YAML files

7. **Commit and push:**
   ```bash
   git add .
   git commit -m "Description of your changes"
   git push origin feature/your-feature-name
   ```

8. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Describe your changes in detail

## Development Setup

### Prerequisites
- Node.js 20.x or higher
- VS Code 1.85.0 or higher
- TypeScript 5.3.0

### Project Structure
```
PipelineVisualizer/
├── src/
│   ├── extension.ts          # Extension entry point
│   └── visualizerPanel.ts    # Webview panel implementation
├── package.json              # Extension manifest
├── tsconfig.json            # TypeScript config
└── README.md
```

### Building
```bash
npm run compile
```

### Watching for changes
```bash
npm run watch
```

## Code Style

- Use TypeScript strict mode
- Follow existing patterns
- Add comments for complex logic
- Keep functions focused and small
- Use descriptive variable names

## Testing

Before submitting a PR:
- ✅ Test with Azure DevOps pipelines
- ✅ Test with GitHub Actions workflows
- ✅ Test with invalid YAML (error handling)
- ✅ Test the refresh button
- ✅ Test clickable diagram nodes
- ✅ Test different layout configurations

## Questions?

Feel free to:
- Open a [Discussion](https://github.com/ThatInfraDba/PipelineVisualizer/discussions)
- Comment on an existing issue
- Create a new issue with the "question" label

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to make great software together!

---

**Thank you for contributing!** 🙏
