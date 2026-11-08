const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'src');
const mojibake = /á[»º]|Æ[¡°]|Ã[¡£­ª²³´µ¶·¸¹º»¼½¾¿]|Ä[\u0080-\u009f]|[\u0080-\u009f]/u;

test('Vietnamese interface text is UTF-8, not mojibake', () => {
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(tsx?|css)$/.test(entry.name)) files.push(full);
    }
  };
  visit(root);
  assert.ok(files.length > 0);
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, mojibake, path.relative(root, file));
  }
});
