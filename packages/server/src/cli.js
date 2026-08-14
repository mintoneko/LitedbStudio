#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LiteDBServer } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    port: parseInt(process.env.LITEDB_PORT || '3000', 10),
    host: process.env.LITEDB_HOST || '0.0.0.0',
    dbPath: process.env.LITEDB_PATH || './data/litedb.db',
    adminKey: process.env.LITEDB_ADMIN_KEY || null,
    allowAnonymous: process.env.LITEDB_ALLOW_ANONYMOUS === 'true',
    staticDir: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' || arg === '-p') {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '--host' || arg === '-h') {
      options.host = args[++i];
    } else if (arg === '--db' || arg === '-d') {
      options.dbPath = args[++i];
    } else if (arg === '--admin-key' || arg === '-k') {
      options.adminKey = args[++i];
    } else if (arg === '--allow-anonymous') {
      options.allowAnonymous = true;
    } else if (arg === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  // Look for built studio public dir
  const studioDistPath = path.resolve(__dirname, '../../studio/dist');
  const studioPublicPath = path.resolve(__dirname, '../../studio/public');
  if (fs.existsSync(studioDistPath)) {
    options.staticDir = studioDistPath;
  } else if (fs.existsSync(studioPublicPath)) {
    options.staticDir = studioPublicPath;
  }

  return options;
}

function printHelp() {
  console.log(`
LiteDB Server - Ultra-lightweight Document/SQL Database Server

Usage:
  litedb-server [options]

Options:
  -p, --port <number>       Port to listen on (default: 3000 or $LITEDB_PORT)
  -h, --host <string>       Host to bind (default: 0.0.0.0 or $LITEDB_HOST)
  -d, --db <path>           SQLite database file path (default: ./data/litedb.db)
  -k, --admin-key <string>  Set or override initial admin API key
  --allow-anonymous         Allow read/write requests without API key
  --help                    Show this help message
`);
}

const options = parseArgs();
const server = new LiteDBServer(options);

server.start(() => {
  const adminKeys = server.engine.listApiKeys();
  const primaryAdminKey = adminKeys.find(k => k.role === 'admin')?.key || 'N/A';

  console.log(`
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ⚡ LiteDB Server v1.0.0 is Running!                       │
│                                                             │
│   • Local Endpoint  : http://localhost:${options.port}              │
│   • REST API Root   : http://localhost:${options.port}/api          │
│   • LiteDB Studio   : http://localhost:${options.port}/             │
│   • Database File   : ${options.dbPath}             │
│   • Admin API Key   : ${primaryAdminKey} │
│   • Memory Overhead : ~15 MB                                │
│                                                             │
│   Ready for frontend & desktop connections!                │
└─────────────────────────────────────────────────────────────┘
`);
});

process.on('SIGINT', () => {
  console.log('\nStopping LiteDB Server...');
  server.stop(() => {
    console.log('LiteDB Server gracefully stopped.');
    process.exit(0);
  });
});
