const { execSync } = require('child_process');
const path = require('path');

const projectDir = '/mnt/c/Users/romel/hostamar-local';
const npmPath = '/mnt/c/Program Files/nodejs/npm';

try {
  // First check if dependencies are installed
  console.log('Checking dependencies...');
  const result = execSync(`ls ${projectDir}/node_modules 2>/dev/null | head -5`, { encoding: 'utf8' });
  console.log('Node modules exist:', result.trim());
  
  // Run opencode install
  console.log('\nInstalling opencode...');
  execSync(`${npmPath} install -g opencode-ai@latest`, { 
    encoding: 'utf8', 
    stdio: 'inherit',
    env: { ...process.env, PATH: '/mnt/c/Program Files/nodejs:' + process.env.PATH }
  });
  console.log('Opencode installed successfully!');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}