#!/usr/bin/env node
/**
 * Extracts the text content of docs/Faith_Responders_User_Guide.docx into
 * functions/src/data/user-guide.md so it can be loaded into the Help Chat
 * system prompt at runtime.
 *
 * Run from the functions/ directory:
 *   node scripts/extract-user-guide.js
 *
 * Re-run whenever the .docx is updated; commit the regenerated .md.
 */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const DOCX_PATH = path.resolve(__dirname, '../../docs/Faith_Responders_User_Guide.docx');
const OUT_DIR = path.resolve(__dirname, '../src/data');
const OUT_MD = path.join(OUT_DIR, 'user-guide.md');
const OUT_TS = path.join(OUT_DIR, 'user-guide.ts');

async function main() {
  if (!fs.existsSync(DOCX_PATH)) {
    console.error('User guide docx not found at', DOCX_PATH);
    process.exit(1);
  }

  // Use mammoth's markdown converter for nicer headings/list formatting.
  const result = await mammoth.convertToMarkdown({ path: DOCX_PATH });
  let md = result.value;

  // Normalize whitespace: collapse 3+ blank lines, trim trailing whitespace.
  // Also unescape mammoth's overly aggressive backslash-escapes of normal
  // punctuation (e.g. `\.`, `\-`, `\(`) — these aren't meaningful markdown.
  md = md
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\\([.\-()&!])/g, '$1')
    .trim();

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const header =
    '<!-- AUTO-GENERATED from docs/Faith_Responders_User_Guide.docx by functions/scripts/extract-user-guide.js -->\n' +
    '<!-- Do not edit by hand; regenerate with: node functions/scripts/extract-user-guide.js -->\n\n';

  fs.writeFileSync(OUT_MD, header + md + '\n', 'utf8');

  // Also emit a TS module so the content is compiled into lib/ by tsc and
  // doesn't require runtime fs lookups (which are awkward in deployed Cloud
  // Functions where the working directory and bundled files differ).
  const tsEscaped = md
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\${/g, '\\${');
  const tsContent =
    '// AUTO-GENERATED from user-guide.md by functions/scripts/extract-user-guide.js\n' +
    '// Do not edit by hand; regenerate with: node functions/scripts/extract-user-guide.js\n' +
    '/* eslint-disable */\n' +
    'export const USER_GUIDE_MD = `' + tsEscaped + '`;\n';
  fs.writeFileSync(OUT_TS, tsContent, 'utf8');

  if (result.messages && result.messages.length) {
    console.warn('mammoth messages:');
    for (const m of result.messages) {
      console.warn(' -', m.type, m.message);
    }
  }

  const wordCount = md.split(/\s+/).length;
  console.log(`Wrote ${OUT_MD} (${md.length} chars, ~${wordCount} words)`);
  console.log(`Wrote ${OUT_TS}`);
}

main().catch((err) => {
  console.error('Failed to extract user guide:', err);
  process.exit(1);
});
