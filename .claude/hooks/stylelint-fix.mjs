// PostToolUse hook: enforce design-token discipline on CSS files Claude just edited.
//
// Mirrors the pattern of eslint-fix.mjs. Claude Code passes PostToolUse context as JSON
// on stdin; the edited path is at `tool_input.file_path`. We lint only that file via
// stylelint's Node API, write any auto-fixes, and exit 2 with remaining errors so they
// feed back to Claude.
//
// Primary rule enforced: color-no-hex — all colors must be CSS custom properties (var(--…)).
// See stylelint.config.mjs for full rationale and exceptions.

import stylelint from 'stylelint';
import { readFileSync, writeFileSync } from 'fs';

const LINTABLE_EXTENSION = /\.css$/;
const EXIT_OK = 0;
const EXIT_FEED_BACK_TO_CLAUDE = 2;

const readStdin = () =>
  new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });

const main = async () => {
  const raw = await readStdin();
  if (!raw.trim()) return EXIT_OK;

  const filePath = JSON.parse(raw)?.tool_input?.file_path;
  if (!filePath || !LINTABLE_EXTENSION.test(filePath)) return EXIT_OK;

  // stylelint v16 Node API: lint with fix enabled
  const result = await stylelint.lint({
    files: [filePath],
    fix: true,
    config: {
      // Resolve config relative to the project directory so stylelint.config.mjs is found
      configFile: `${process.env.CLAUDE_PROJECT_DIR || process.cwd()}/stylelint.config.mjs`,
    },
  });

  const hasRemainingErrors = result.results.some(
    (r) => r.warnings.some((w) => w.severity === 'error')
  );

  if (!hasRemainingErrors) return EXIT_OK;

  // Format and feed remaining errors back to Claude
  for (const fileResult of result.results) {
    const errors = fileResult.warnings.filter((w) => w.severity === 'error');
    if (errors.length > 0) {
      console.error(`stylelint errors in ${fileResult.source}:`);
      for (const err of errors) {
        console.error(`  ${err.line}:${err.column}  error  ${err.text}  (${err.rule})`);
      }
    }
  }

  return EXIT_FEED_BACK_TO_CLAUDE;
};

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    // A hook/tooling failure must never block edits - surface it but exit clean.
    console.error(`stylelint-fix hook failed: ${error.message}`);
    process.exit(EXIT_OK);
  });
