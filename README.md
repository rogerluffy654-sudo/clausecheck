# ClauseCheck

A micro-SaaS tool that analyzes contracts for hidden risks using AI.

## Environment Variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `KIMI_API_KEY` | Moonshot AI API key | [platform.moonshot.cn](https://platform.moonshot.cn) → API Keys |

## Stripe Payment Link

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Payment Links** → **Create**
2. Product: "ClauseCheck Unlimited" — **$9.00 / month** (recurring)
3. Copy the link, replace `STRIPE_LINK_PLACEHOLDER` in `index.html`
4. Redeploy

## Deploy to Vercel

**Via CLI:**
```bash
npm i -g vercel
vercel login
vercel env add KIMI_API_KEY
vercel --prod
```

**Via Dashboard (Git):**
1. Push to GitHub → Import on [vercel.com](https://vercel.com)
2. Add `KIMI_API_KEY` in project settings → Deploy

## Local Dev
```bash
vercel dev   # Runs at localhost:3000 with API working
```

## Notes
- API key lives **only** in the serverless function (`process.env.KIMI_API_KEY`)
- Free tier: 3 scans via `localStorage`
- Uses `moonshot-v1-8k` model (8K token context)
- Always include disclaimer: "ClauseCheck is an informational tool, not legal advice."
