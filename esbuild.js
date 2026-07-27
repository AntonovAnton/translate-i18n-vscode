const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});

	// The ai-l10n MCP server is shipped inside the VSIX so it runs offline and stays
	// pinned to this extension release. It is a standalone stdio process launched by
	// VS Code, so it is bundled separately from the extension host code.
	const mcpCtx = await esbuild.context({
		entryPoints: [
			'node_modules/ai-l10n-mcp/dist/index.js'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		target: 'node18',
		outfile: 'dist/mcp-server.js',
		logLevel: 'silent',
	});

	if (watch) {
		await Promise.all([ctx.watch(), mcpCtx.watch()]);
	} else {
		await Promise.all([ctx.rebuild(), mcpCtx.rebuild()]);
		await Promise.all([ctx.dispose(), mcpCtx.dispose()]);
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
