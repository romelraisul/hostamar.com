
const nextBin = require.resolve('next/dist/bin/next')
const { spawn } = require('child_process')

const args = ['dev']
const child = spawn('node', [nextBin, ...args], { 
  cwd: process.cwd(), 
  stdio: 'inherit',
  env: process.env
})

child.on('exit', (code) => process.exit(code))
child.on('error', (err) => { console.error(err); process.exit(1) })
