const { spawn } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function runGit(args) {
  return new Promise((res, rej) => {
    const p = spawn('git', args, { cwd: repoRoot, stdio: 'inherit' });
    p.on('exit', code => (code === 0 ? res() : rej(new Error('git failed'))));
  });
}

let busy = false;
const watcher = chokidar.watch(['*.js', '*.json', '*.md', 'types.d.ts', 'index.d.ts'], {
  cwd: repoRoot,
  ignored: /node_modules/
});

watcher.on('change', async (file) => {
  if (busy) return;
  busy = true;
  console.log('Detected change:', file, '— committing...');
  try {
    await runGit(['add', '-A']);
    await runGit(['commit', '-m', `Auto-update: ${file}`]);
    await runGit(['push']);
    console.log('Auto-commit pushed.');
  } catch (err) {
    console.error('Auto-commit failed:', err.message);
  } finally {
    busy = false;
  }
});

console.log('Auto-commit watcher running. Press Ctrl+C to stop.');
