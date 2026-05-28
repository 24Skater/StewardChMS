#!/usr/bin/env bash
set -euo pipefail

# Detect actual emoji (pictographic) in TypeScript/TSX app source files.
# Excludes:
#   - shadcn UI primitives (components/ui/)
#   - comment lines (JSDoc, // comments)
#   - test files (*.test.ts, *.test.tsx)
#
# Geometric shapes (U+25xx), dingbats (U+27xx), arrows (U+21xx) are allowed as valid UI symbols.
FOUND=$(node -e "
const fs = require('fs');
const path = require('path');

// Emoji regex — pictographic emoji across all major ranges
// U+1F000-1FA9F covers most emoji; U+1F600-1F9FF for emoticons
const emojiRegex = /[\u{1F000}-\u{1FA9F}]/u;

const found = [];
const dirs = ['frontend/src', 'backend/src', 'backend/prisma'];
const exts = ['.ts', '.tsx'];

// Paths to skip (shadcn/ui primitives, generated files)
const skipPaths = [
  path.join('frontend', 'src', 'components', 'ui'),
];

function shouldSkip(filePath) {
  // Skip test files
  if (filePath.includes('.test.ts') || filePath.includes('.test.tsx')) {
    return true;
  }
  // Skip shadcn UI primitives
  return skipPaths.some(skip => filePath.includes(skip));
}

function isCommentLine(line) {
  const trimmed = line.trim();
  // Pure comment lines (entire line is a comment)
  if (trimmed.startsWith('//')) return true;
  if (trimmed.startsWith('*')) return true;
  if (trimmed.startsWith('/*')) return true;
  if (trimmed.startsWith('*/')) return true;
  return false;
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      walkDir(fullPath);
    } else if (exts.some(ext => item.name.endsWith(ext))) {
      if (shouldSkip(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comment lines
        if (isCommentLine(line)) continue;
        if (emojiRegex.test(line)) {
          found.push(fullPath + ':' + (i + 1) + ': ' + line.trim().substring(0, 100));
        }
      }
    }
  }
}

for (const dir of dirs) walkDir(dir);

if (found.length > 0) {
  console.log(found.join('\n'));
  process.exit(1);
}
" 2>&1)

EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 ]] || [[ -n "$FOUND" ]]; then
  echo "FAIL: Emoji found in source files (excluding comments, tests, and shadcn UI):"
  echo "$FOUND"
  exit 1
fi

echo "OK: No emoji found in source files."
