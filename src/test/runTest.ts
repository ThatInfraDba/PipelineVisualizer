import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
	try {
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');
		const extensionTestsPath = path.resolve(__dirname, './suite/index');
		const samplesPath = path.resolve(extensionDevelopmentPath, 'samples');

		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [samplesPath, '--disable-extensions']
		});
	} catch (err) {
		console.error('Failed to run tests:', err);
		process.exit(1);
	}
}

main();
