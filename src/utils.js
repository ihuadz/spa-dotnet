import { exec, execFile } from 'node:child_process';
import { readFile as fsRead, writeFile as fsWrite } from 'node:fs/promises';

export async function readFile(path) {
  return fsRead(path, 'utf-8');
}

export async function writeFile(path, content) {
  return fsWrite(path, content, 'utf-8');
}

export function execAsync(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { encoding: 'utf-8', ...opts }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function shellQuote(value) {
  const text = String(value);

  if (process.platform === 'win32') {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return `'${text.replace(/'/g, `'\\''`)}'`;
}

export function execCommandAsync(file, args = [], opts = {}) {
  return execAsync([file, ...args].map(shellQuote).join(' '), opts);
}

export function execNpmAsync(args = [], opts = {}) {
  return execCommandAsync('npm', args, opts);
}
