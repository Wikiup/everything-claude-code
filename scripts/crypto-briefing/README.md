# Daily Crypto Briefing

Sends a daily AI-generated crypto market briefing to **marketertribe@gmail.com** every day at 11am.

## Quick Setup (5 minutes)

### 1. Install dependencies

```bash
cd scripts/crypto-briefing
npm install
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in two values:

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `SMTP_PASS` | Gmail App Password (see below) |

### 3. Get a Gmail App Password

> **Why?** Gmail blocks plain passwords for SMTP. App Passwords are the solution.

1. Go to https://myaccount.google.com/security
2. Make sure **2-Step Verification** is ON
3. Go to https://myaccount.google.com/apppasswords
4. Click **Create** → choose "Mail" and "Other (name it "Crypto Briefing")"
5. Copy the 16-character code — paste it as `SMTP_PASS` in your `.env`

### 4. Test it

```bash
node -r dotenv/config index.js
```

> Note: `dotenv` is not a dependency of this script by default. Either install it (`npm install dotenv`) or export your env vars manually:
> ```bash
> export ANTHROPIC_API_KEY=your_key
> export SMTP_PASS=your_app_password
> node index.js
> ```

### 5. Schedule daily at 11am

```bash
node setup-cron.js
```

This installs a cron job that runs every day at 11:00am (your local time).

Verify it was installed:
```bash
crontab -l
```

Logs are written to `~/crypto-briefing.log`.

---

## Manual cron setup

If you prefer to set the cron job yourself:

```bash
crontab -e
```

Add this line (fill in your actual key and password):

```
0 11 * * * ANTHROPIC_API_KEY='YOUR_KEY' SMTP_PASS='YOUR_APP_PASS' node /path/to/scripts/crypto-briefing/index.js >> ~/crypto-briefing.log 2>&1
```

---

## Troubleshooting

**"Missing required env vars"** — Check that `ANTHROPIC_API_KEY` and `SMTP_PASS` are set.

**"Invalid login"** — Make sure you used an App Password, not your regular Gmail password.

**"Less secure app access"** — This is not needed. App Passwords work with 2FA enabled.

**Email goes to spam** — Add the sender address to your contacts once. Gmail learns quickly.

---

## What the briefing covers

Each daily email includes:

- **Section 1**: Macro snapshot (market cap, Bitcoin dominance, Fear & Greed, key macro event)
- **Section 2**: Top 10 coins with price data, news, and sentiment
- **Section 3**: Glossary of all jargon used that day
- **Section 4**: One concept explained in depth for a beginner

All jargon is defined inline using the 📖 format. After 90 days of reading, you'll be genuinely fluent in crypto and macro market language.
