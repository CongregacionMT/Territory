const { execSync } = require('child_process');
try {
  const out = execSync('npx firebase login:list', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  console.log('STDOUT:', out);
} catch (e) {
  console.log('ERROR:', e.message);
  console.log('STDERR:', e.stderr);
}
