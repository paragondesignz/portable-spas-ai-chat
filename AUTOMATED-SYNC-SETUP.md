# Automated Product Sync Setup

This project includes a GitHub Action that automatically syncs your Shopify product catalog to Pinecone every day.

## How It Works

- **Schedule**: Runs daily at 2 AM NZ time (1 PM UTC)
- **What it does**: Fetches all published products from Shopify and uploads to Pinecone
- **Manual trigger**: Can also be run manually from GitHub Actions tab

## Setup Instructions

### 1. Add GitHub Secret

The workflow needs your admin password to authenticate with the sync API.

1. Go to your GitHub repository: https://github.com/paragondesignz/portable-spas-ai-chat
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `ADMIN_PASSWORD`
5. Value: [Your admin password - same as ADMIN_PASSWORD in Vercel]
6. Click **Add secret**

### 2. Verify It's Working

After adding the secret:

1. Go to **Actions** tab in your GitHub repo
2. Click on **Sync Product Catalog Daily** workflow
3. Click **Run workflow** → **Run workflow** to test it manually
4. Check the logs to confirm it worked

## What Gets Synced

- All published products from https://portablespas.co.nz/products.json
- Product names, descriptions, prices, SKUs, variants, tags
- Organized by product type (Spa, Accessory, Part, etc.)
- Uploaded as: `product-catalog-YYYY-MM-DD.md`

## Monitoring

- Check the **Actions** tab to see sync history
- Failed syncs will show as ❌ in the Actions tab
- Successful syncs show product count in the logs

## Manual Sync

You can always manually sync products:
1. Via GitHub Actions (as described above)
2. Via Admin UI: https://portable-spas-ai-chat.vercel.app/admin

## Customizing the Schedule

To change when the sync runs, edit `.github/workflows/sync-products.yml`:

```yaml
schedule:
  - cron: '0 13 * * *'  # Change this cron expression
```

Cron format: `minute hour day month weekday`

Examples:
- `0 13 * * *` - Every day at 1 PM UTC (2 AM NZ)
- `0 13 * * 1` - Every Monday at 1 PM UTC
- `0 */6 * * *` - Every 6 hours

Use https://crontab.guru/ to generate cron expressions.
