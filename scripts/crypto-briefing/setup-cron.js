#!/usr/bin/env node
/**
 * Sets up a cron job to run the crypto briefing daily at 11am local time.
 * Run once: node scripts/crypto-briefing/setup-cron.js
 */

'use strict';

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

const scriptPath = path.resolve(__dirname, 'index.js');
const logPath = path.join(os.homedir(), 'crypto-briefing.log');

// Build the cron line: every day at 11:00am
// We pass env vars inline so cron has them even without a .env loader
const envVars = [
  'ANTHROPIC_API_KEY',
  'BRIEFING_EMAIL',
  'SMTP_FROM',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
].map((k) => {
  const v = process.env[k];
  if (!v) {
    console.warn(`  ⚠  ${k} is not set in current environment — add it to your crontab manually.`);
    return `${k}=REPLACE_ME`;
  }
  // Escape single quotes in value
  return `${k}='${v.replace(/'/g, "'\\''")}'`;
});

const cronCmd = `node ${scriptPath}`;
const cronLine = `0 11 * * * ${envVars.join(' ')} ${cronCmd} >> ${logPath} 2>&1`;

console.log('\n[setup-cron] Installing cron job...');
console.log(`  Schedule : every day at 11:00am`);
console.log(`  Log file : ${logPath}`);
console.log(`  Command  : ${cronCmd}\n`);

// Read existing crontab
const existing = spawnSync('crontab', ['-l'], { encoding: 'utf8' });
const currentCrontab = existing.status === 0 ? existing.stdout : '';

if (currentCrontab.includes(scriptPath)) {
  console.log('[setup-cron] Cron job already exists. No changes made.');
  console.log('  To update it, run: crontab -e');
  process.exit(0);
}

const newCrontab = currentCrontab.trimEnd() + '\n' + cronLine + '\n';

try {
  execSync(`echo ${JSON.stringify(newCrontab)} | crontab -`);
  console.log('[setup-cron] ✓ Cron job installed successfully!');
  console.log('\nVerify with: crontab -l');
  console.log(`Logs will appear at: ${logPath}`);
} catch (err) {
  console.error('[setup-cron] Failed to install cron job:', err.message);
  console.log('\nManually add this line to your crontab (run: crontab -e):\n');
  console.log(cronLine);
}
