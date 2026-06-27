// PostToolUse hook: auto-fix ESLint on the JS/JSX file Claude just edited.
//
// Claude Code passes PostToolUse context as JSON on stdin; the edited path is at
// `tool_input.file_path`. We lint only that file via ESLint's Node API (which discovers
// the project's flat config), write any fixes, and exit 2 with remaining errors so they
// feed back to Claude.

import { ESLint } from 'eslint';

const LINTABLE_EXTENSION = /\.(js|jsx)$/;
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

  const eslint = new ESLint({
    fix: true,
    cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  });

  if (await eslint.isPathIgnored(filePath)) return EXIT_OK;

  const results = await eslint.lintFiles([filePath]);
  await ESLint.outputFixes(results);

  const hasRemainingErrors = results.some((result) => result.errorCount > 0);
  if (!hasRemainingErrors) return EXIT_OK;

  const formatter = await eslint.loadFormatter('stylish');
  console.error(await formatter.format(results));
  return EXIT_FEED_BACK_TO_CLAUDE;
};

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    // A hook/tooling failure must never block edits - surface it but exit clean.
    console.error(`eslint-fix hook failed: ${error.message}`);
    process.exit(EXIT_OK);
  });
