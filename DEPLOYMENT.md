# Bot Hosting Options for 24/7 Operation

## Option 1: Railway (Easiest - Recommended)
**Cost:** $5 free trial, then ~$5/month
**Setup time:** 5 minutes

### Steps:
1. Go to https://railway.app and sign in with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub repo (upload code to GitHub first)
4. Add environment variables in Railway dashboard:
   - `DISCORD_TOKEN` = your bot token
   - `CLIENT_ID` = your bot client ID
   - `CLIENT_SECRET` = your client secret
   - `GEMINI_API_KEY` = your Gemini API key
   - `SESSION_SECRET` = random string
   - `DASHBOARD_URL` = your Railway app URL (after deploy)
   - `DASHBOARD_PORT` = 3000
5. Railway auto-detects Dockerfile and deploys
6. Bot runs 24/7!

---

## Option 2: Render.com
**Cost:** Free (spins down after 15min inactivity) or $7/month
**Setup time:** 10 minutes

### Steps:
1. Go to https://render.com and sign up
2. Click "New +" → "Background Worker"
3. Connect your GitHub repo
4. Build Command: `npm install`
5. Start Command: `node src/index.js`
6. Add environment variables (same as Railway)
7. Deploy!

---

## Option 3: Oracle Cloud Free Tier (Free Forever)
**Cost:** FREE forever (ARM instances)
**Setup time:** 30 minutes

### Steps:
1. Go to https://cloud.oracle.com and create free account
2. Create a VM instance (Ampere ARM, always free tier)
3. SSH into the server
4. Install Node.js 20:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
5. Upload your code:
   ```bash
   # From your local machine:
   scp -r void/ opc@YOUR_SERVER_IP:~/void-bot/
   ```
6. On the server:
   ```bash
   cd ~/void-bot
   npm install
   # Create .env file with your secrets
   nano .env
   # Run with PM2 for 24/7 operation
   npm install -g pm2
   pm2 start src/index.js --name void-bot
   pm2 save
   pm2 startup  # Follow the command it outputs
   ```

---

## Option 4: DigitalOcean / Hetzner VPS
**Cost:** $4-6/month
**Setup time:** 15 minutes

Same steps as Oracle Cloud but:
- **DigitalOcean:** https://digitalocean.com ($4/mo basic droplet)
- **Hetzner:** https://hetzner.com (€3.29/mo, best value)

---

## Option 5: WispByte (Free Game Server Hosting)
**Cost:** Free
**Setup time:** 10 minutes

### Steps:
1. Go to https://wispbyte.com and sign up
2. Create a new server → select "Node.js"
3. Upload your code via the file manager
4. Set environment variables in the panel
5. Run `npm install` via the console
6. Start with `node src/index.js`

---

## Quick Deploy: Create a ZIP for Manual Upload

Run this in PowerShell to create a deployable zip:
```powershell
cd C:\Users\Lenovo\OneDrive\Desktop\void
Compress-Archive -Path src,package.json,package-lock.json,Dockerfile,.dockerignore -DestinationPath void-bot-deploy.zip
```

Then upload `void-bot-deploy.zip` to any host above.

---

## Environment Variables Needed
| Variable | Value |
|----------|-------|
| `DISCORD_TOKEN` | Your bot token from Discord Developer Portal |
| `CLIENT_ID` | Your bot's application ID |
| `CLIENT_SECRET` | Your OAuth2 client secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SESSION_SECRET` | Any random string (e.g., `mysecretkey123`) |
| `DASHBOARD_PORT` | `3000` (or whatever your host assigns) |
| `DASHBOARD_URL` | Your deployed app URL |

---

## Recommended: Use PM2 for Process Management
If using a VPS (Oracle, DigitalOcean, Hetzner):
```bash
npm install -g pm2
pm2 start src/index.js --name void-bot
pm2 save
pm2 startup  # Auto-start on reboot
pm2 logs void-bot  # View logs
pm2 restart void-bot  # Restart bot
```
