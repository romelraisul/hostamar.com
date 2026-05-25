const { execSync } = require('child_process');

const npmPath = 'C:\\Program Files\\nodejs\\npm';
const projectDir = 'C:\\Users\\romel\\hostamar-local';

try {
  console.log('Installing opencode...');
  execSync(`"${npmPath}" install -g opencode-ai@latest`, { 
    encoding: 'utf8', 
    stdio: 'inherit',
    cwd: projectDir
  });
  console.log('Opencode installed!');
} catch (err) {
  console.error(err.message);
}