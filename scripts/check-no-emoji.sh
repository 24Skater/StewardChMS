#!/usr/bin/env bash
set -euo pipefail

# Use Node.js for cross-platform emoji detection
FOUND=$(node -e "
const fs = require('fs');
const path = require('path');

// Emoji regex that covers most common emoji ranges
const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1FA00}-\u{1FA9F}]|[\u{2700}-\u{27BF}]|[\u{24C2}-\u{1F251}]/gu;

const found = [];
const dirs = ['frontend/src', 'backend/src', 'backend/prisma'];
const exts = ['.ts', '.tsx'];

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      walkDir(fullPath);
    } else if (exts.some(ext => item.name.endsWith(ext))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (emojiRegex.test(lines[i])) {
          found.push(\`\${fullPath}:\${i + 1}: \${lines[i].trim()}\`);
        }
      }
    }
  }
}

for (const dir of dirs) {
  walkDir(dir);
}

if (found.length > 0) {
  console.log(found.join('\n'));
  process.exit(1);
}
" 2>&1)

EXIT_CODE=$?

if [[ $EXIT_CODE -ne 0 ]] || [[ -n "$FOUND" ]]; then
  echo "FAIL: Emoji found in source files:"
  echo "$FOUND"
  exit 1
fi

echo "OK: No emoji found in source files."
