# Deploying jphish / PhishGuard to CloudPanel (Hostinger VPS)

Target: **Native + PM2**, PostgreSQL + Redis via apt, CloudPanel nginx + Let's Encrypt in front.

| Thing | Value |
|---|---|
| VPS IP | `187.77.186.176` |
| Admin domain | `jphish.infocusit.in` (frontend + admin API) |
| Phish domain | `links.infocusit.in` (public tracking + landing — **create this**) |
| Site user | `support` |
| Repo path on server | `/home/support/htdocs/jphish.infocusit.in` |
| Ports (localhost only) | frontend `3100`, admin API `3101`, phish-server `3102`, Postgres `5432`, Redis `6379` |

Final request flow:
```
Browser ──HTTPS──> CloudPanel nginx ──┬─ /api,/swagger,/bull ─> 127.0.0.1:3101 (admin API)
  jphish.infocusit.in                 └─ /                    ─> 127.0.0.1:3100 (Next.js)
Target  ──HTTPS──> CloudPanel nginx ──── /                   ─> 127.0.0.1:3102 (phish-server)
  links.infocusit.in
PM2 runs: jphish-backend (boots :3101 AND :3102) + jphish-frontend (:3100)
```

---

## 0. Prerequisite: DNS
At your DNS provider for `infocusit.in`, ensure two **A records** point at the VPS:
- `jphish` → `187.77.186.176` (already done — the site exists)
- `links`  → `187.77.186.176`  ← **add this now** (needed for SSL on the phish domain)

Verify before issuing SSL: `nslookup links.infocusit.in` should return the VPS IP.

---

## 1. SSH key (Windows → VPS)

On your Windows box (PowerShell):
```powershell
# Generate a key (press Enter for default path; set a passphrase if you want)
ssh-keygen -t ed25519 -C "jags1500@gmail.com"
# -> creates C:\Users\anura\.ssh\id_ed25519 (private) and id_ed25519.pub (public)

# Print the PUBLIC key to copy
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

Install the **public** key on the VPS two ways:
- **Root (for system installs):** Hostinger panel → your VPS → *SSH Keys* → paste the public key.
  Or, if you already have root password access:
  `ssh root@187.77.186.176` then append the key to `/root/.ssh/authorized_keys`.
- **`support` user (to run the app):** CloudPanel → Sites → jphish.infocusit.in → **SSH/FTP** tab →
  enable SSH access for the site user and add the same public key.

Test both:
```powershell
ssh root@187.77.186.176        # for installs (steps 2,4,8)
ssh support@187.77.186.176     # for app build/run (steps 3,5,6,7)
```
> If Hostinger/CloudPanel uses a non-22 SSH port, add `-p <port>`.

---

## 2. Install system dependencies (as **root**)
CloudPanel runs on Debian/Ubuntu. Its built-in DB is MySQL, so install Postgres + Redis yourself.
```bash
# Node 20 (NodeSource) — matches .nvmrc
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# PostgreSQL 15 + Redis
apt-get install -y postgresql postgresql-contrib redis-server

# PM2 globally
npm install -g pm2

node -v   # expect v20.x
```

**Lock Redis down** — edit `/etc/redis/redis.conf`:
```
bind 127.0.0.1 -::1
requirepass <STRONG_REDIS_PASSWORD>      # use the same value you put in backend/.env
```
```bash
systemctl restart redis-server
systemctl enable redis-server postgresql
```
Postgres already listens on `127.0.0.1` by default — leave it that way.

---

## 3. Create the database (as **root**)
```bash
sudo -u postgres psql <<'SQL'
CREATE USER jphish WITH PASSWORD '<STRONG_DB_PASSWORD>';
CREATE DATABASE jphish OWNER jphish;
\connect jphish
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- entities use uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
GRANT ALL ON SCHEMA public TO jphish;
SQL
```

---

## 4. Get the code onto the VPS
The repo is git-less locally, so the simplest path is to push a zip/rsync from Windows. Pick one.

**Option A — rsync from Windows (Git Bash / WSL):**
```bash
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude dist --exclude 'backend/tmp' \
  /d/Infocus/jphish/ support@187.77.186.176:/home/support/htdocs/jphish.infocusit.in/
```

**Option B — zip + scp (PowerShell):**
```powershell
# Exclude heavy/build dirs from the archive
$src = "D:\Infocus\jphish"
Compress-Archive -Path "$src\*" -DestinationPath "$env:TEMP\jphish.zip" -Force
scp $env:TEMP\jphish.zip support@187.77.186.176:/home/support/
# then on the server (as support):
#   cd /home/support/htdocs/jphish.infocusit.in && unzip -o /home/support/jphish.zip
```
> If `node_modules` got zipped, delete it on the server before `npm ci`.

**Option C — git (cleanest for future updates):** `git init` + push to a private GitHub repo, then
`git clone` on the server. Recommended once you're past the first deploy.

---

## 5. Configure env files (as **support**, on the server)
```bash
cd /home/support/htdocs/jphish.infocusit.in

# Backend
cp deploy/backend.env.production.example backend/.env
nano backend/.env        # fill EVERY <PLACEHOLDER>; keep DB_SYNCHRONIZE=true for now

# Frontend (NEXT_PUBLIC_* are baked at build time!)
cp deploy/frontend.env.production.example frontend/.env.production
nano frontend/.env.production
```
Generate secrets quickly: `openssl rand -base64 48` (run once per secret).

---

## 6. Install & build (as **support**)
```bash
cd /home/support/htdocs/jphish.infocusit.in
npm ci                  # installs both workspaces (dev deps needed to build)
npm run build           # builds backend (dist/) then frontend (.next/)
```
Frontend build must run **after** `frontend/.env.production` exists, or the wrong API URL gets baked in.

---

## 7. First boot — create the schema, then start under PM2
```bash
cd /home/support/htdocs/jphish.infocusit.in

# Start both processes (DB_SYNCHRONIZE=true makes the backend build the schema)
pm2 start deploy/ecosystem.config.js
pm2 logs jphish-backend --lines 50     # watch for "API Server running" + "Phish-server ... on"
```
Confirm tables + the bootstrap admin were created:
```bash
sudo -u postgres psql -d jphish -c "\dt"      # expect users, refresh_tokens, audit_logs, campaigns, ...
sudo -u postgres psql -d jphish -c "select email, role from users;"
```
Then **turn synchronize off** (important):
```bash
nano backend/.env        # set DB_SYNCHRONIZE=false  (or delete the line)
pm2 restart jphish-backend
```
Make PM2 survive reboots (run the printed command as root if prompted):
```bash
pm2 save
pm2 startup systemd -u support --hp /home/support   # copy/paste the sudo line it outputs
```

---

## 8. CloudPanel nginx + SSL

### 8a. Admin site (jphish.infocusit.in)
1. CloudPanel → Sites → **jphish.infocusit.in** → **Vhost** tab.
2. Replace the default `location /` block with the contents of
   [`deploy/nginx-admin-locations.conf`](nginx-admin-locations.conf). Leave the CloudPanel-generated
   `server_name` / SSL / redirect parts intact. Save.
3. **SSL/TLS** tab → **Let's Encrypt** → issue/activate the certificate.

### 8b. Phish site (links.infocusit.in)
1. CloudPanel → **+ Add Site** → **Create a Reverse Proxy** →
   domain `links.infocusit.in`, reverse proxy URL `http://127.0.0.1:3102`, same site user `support`.
2. (Optional) **Vhost** tab → match [`deploy/nginx-phish-locations.conf`](nginx-phish-locations.conf).
3. **SSL/TLS** tab → **Let's Encrypt** (requires the `links` A record from step 0).

CloudPanel reloads nginx on save.

---

## 9. Smoke tests
```bash
curl https://jphish.infocusit.in/api/v1/health        # {"status":"ok",...}
curl -I https://links.infocusit.in/                    # 200/404 from phish-server, NOT 502
```
In a browser:
- `https://jphish.infocusit.in` → redirected to `/login`.
- Log in with `BOOTSTRAP_SUPERADMIN_EMAIL` / password → forced to change password.
- DevTools → the refresh cookie is `Secure` + `HttpOnly` and scoped to the admin host only.

---

## 10. Post-deploy hardening
- [ ] `DB_SYNCHRONIZE=false` in `backend/.env` (done in step 7).
- [ ] `COOKIE_SECURE=true`, `COOKIE_DOMAIN=jphish.infocusit.in` (no leading dot).
- [ ] Postgres/Redis bound to `127.0.0.1`; Redis `requirepass` set.
- [ ] Firewall (if you enable UFW, keep yourself in): allow `22`, `80`, `443`, CloudPanel `8443`;
      do **not** expose `3100/3101/3102/5432/6379`.
- [ ] Rotate the bootstrap admin password on first login.
- [ ] Set real `MAIL_*` creds; `PUBLIC_LANDING_URL=https://links.infocusit.in` so tracking pixels load.
- [ ] Nightly `pg_dump` backup (cron).

## 11. Deploying updates later
```bash
# push new code (rsync/git), then on the server as support:
cd /home/support/htdocs/jphish.infocusit.in
npm ci
npm run build
pm2 restart jphish-backend jphish-frontend
```
> Schema changes won't apply automatically (synchronize is off, migrations are incomplete). For now,
> apply schema deltas manually or briefly re-enable `DB_SYNCHRONIZE=true` on a backed-up DB. Generating
> a complete, committed migration is the proper long-term fix.
