// PM2 process definitions for the jphish / PhishGuard production deploy on the
// CloudPanel VPS. Run from the repo root on the server:
//
//   pm2 start deploy/ecosystem.config.js
//   pm2 save
//
// The backend process boots BOTH Nest apps in one Node process:
//   - admin API   on PORT       (3001)  -> proxied by nginx at jphish.infocusit.in
//   - phish-server on PHISH_PORT (3002)  -> proxied by nginx at links.infocusit.in
//
// Paths assume the repo lives at /home/support/htdocs/jphish.infocusit.in.
// Edit the two `cwd` values if you cloned somewhere else.

module.exports = {
  apps: [
    {
      name: 'jphish-backend',
      cwd: '/home/support/htdocs/jphish.infocusit.in/backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      // NODE_ENV here is the real process env (dotenv in .env will NOT override it).
      // DB/Redis/JWT/etc. are read from backend/.env by the app's ConfigModule.
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'jphish-frontend',
      cwd: '/home/support/htdocs/jphish.infocusit.in/frontend',
      script: 'npm',
      // `next start` bound to localhost only; nginx terminates TLS and proxies in.
      args: 'run start -- -H 127.0.0.1 -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
