const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');

const originScript = path.join(__dirname, '..', 'scripts', 'sync-web.mjs');

test('Tailwind does not scan the generated web folder back into itself', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.css'), 'utf8');
  assert.match(css, /@source not "\.\.\/web"/);
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'huelegend-web-sync-'));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(root, 'dist', 'assets'), { recursive: true });
  fs.copyFileSync(originScript, path.join(root, 'scripts', 'sync-web.mjs'));
  fs.writeFileSync(path.join(root, 'dist', 'index.html'), '<html lang="vi">Quản trị</html>');
  fs.writeFileSync(path.join(root, 'dist', 'assets', 'old.js'), 'console.log("first")');
  return { root, run: () => execFileSync(process.execPath, [path.join(root, 'scripts', 'sync-web.mjs')], { encoding: 'utf8' }),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

test('build artifacts restore the missing web folder with Vietnamese UTF-8', () => {
  const f = fixture();
  try {
    f.run();
    assert.equal(fs.readFileSync(path.join(f.root, 'web', 'index.html'), 'utf8'), '<html lang="vi">Quản trị</html>');
    assert.equal(fs.readFileSync(path.join(f.root, 'web', 'assets', 'old.js'), 'utf8'), 'console.log("first")');
  } finally { f.cleanup(); }
});

test('rebuild updates generated assets without removing unrelated web files', () => {
  const f = fixture();
  try {
    f.run();
    fs.writeFileSync(path.join(f.root, 'web', 'notes.txt'), 'keep me');
    fs.unlinkSync(path.join(f.root, 'dist', 'assets', 'old.js'));
    fs.writeFileSync(path.join(f.root, 'dist', 'assets', 'new.js'), 'console.log("next")');
    f.run();
    assert.equal(fs.existsSync(path.join(f.root, 'web', 'assets', 'old.js')), false);
    assert.equal(fs.readFileSync(path.join(f.root, 'web', 'assets', 'new.js'), 'utf8'), 'console.log("next")');
    assert.equal(fs.readFileSync(path.join(f.root, 'web', 'notes.txt'), 'utf8'), 'keep me');
  } finally { f.cleanup(); }
});

test('user-edited files are backed up before replacing with current build', () => {
  const f = fixture();
  try {
    f.run();
    fs.writeFileSync(path.join(f.root, 'web', 'index.html'), 'user custom code');
    f.run();
    const backups = fs.readdirSync(path.join(f.root, 'web-backups'));
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(f.root, 'web-backups', backups[0], 'index.html'), 'utf8'), 'user custom code');
    assert.match(fs.readFileSync(path.join(f.root, 'web', 'index.html'), 'utf8'), /Quản trị/);
  } finally { f.cleanup(); }
});

test('path redirection using a symlink cannot overwrite files outside web', { skip: process.platform === 'win32' }, () => {
  const f = fixture();
  try {
    fs.mkdirSync(path.join(f.root, 'web'));
    const outside = path.join(f.root, 'other');
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, path.join(f.root, 'web', 'assets'));
    const result = spawnSync(process.execPath, [path.join(f.root, 'scripts', 'sync-web.mjs')], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Phat hien lien ket/);
    assert.equal(fs.existsSync(path.join(outside, 'old.js')), false);
  } finally { f.cleanup(); }
});
