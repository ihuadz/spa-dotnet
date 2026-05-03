#!/usr/bin/env node

import { run } from '../src/index.js';

run(process.argv.slice(2)).catch((err) => {
  console.error(`\n✖ ${err.message}`);
  if (err.stderr) {
    console.error(err.stderr);
  }
  process.exit(1);
});
