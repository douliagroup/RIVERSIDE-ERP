import { spawn } from 'node:child_process';

// Filtre les arguments pour enlever '--host' qui cause des erreurs avec Next.js
const args = process.argv.slice(2).filter(arg => arg !== '--host');

console.log('Starting Next.js dev server with filtered args:', args);

const nextDev = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0', ...args], {
  stdio: 'inherit',
  shell: true
});

nextDev.on('close', (code) => {
  process.exit(code || 0);
});
