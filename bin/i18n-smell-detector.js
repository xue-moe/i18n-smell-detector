#!/usr/bin/env node
import { runCli } from '../dist/cli.js';

runCli(process.argv).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const debug = process.argv.includes('--debug') || process.env.I18N_SMELL_DEBUG === '1';
  console.error(`i18n-smell-detector: ${message}`);
  if (debug && error instanceof Error) {
    if ('code' in error) console.error(`code: ${error.code}`);
    if (error.stack) console.error(error.stack);
  }
  process.exit(2);
});
