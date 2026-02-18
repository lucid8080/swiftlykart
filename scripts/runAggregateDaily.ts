/**
 * scripts/runAggregateDaily.ts
 *
 * CLI script that calls the internal aggregation endpoint for yesterday's date.
 * Designed to be run via cron or manual invocation.
 *
 * Usage:
 *   npx tsx scripts/runAggregateDaily.ts                  # aggregate yesterday
 *   npx tsx scripts/runAggregateDaily.ts 2026-02-12       # aggregate specific date
 *
 * Cron example (run daily at 3 AM UTC):
 *   0 3 * * * cd /path/to/re-upper && npx tsx scripts/runAggregateDaily.ts
 *
 * Vercel Cron (add to vercel.json):
 *   {
 *     "crons": [{
 *       "path": "/api/internal/reporting/aggregate-daily",
 *       "schedule": "0 3 * * *"
 *     }]
 *   }
 *   Note: Vercel cron sends GET by default; you'd need a wrapper or use a
 *   custom approach. This script is the recommended method.
 *
 * Required env vars:
 *   INTERNAL_JOB_SECRET — must match the server's secret
 *   NEXT_PUBLIC_APP_DOMAIN or APP_URL — base URL of the running app
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load .env.local if it exists
function loadEnvFile() {
  const envPath = join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

// Load env before main runs
loadEnvFile();

/**
 * Daily Aggregation Job Runner
 *
 * This script calls the internal aggregation endpoint to compute daily stats.
 * It aggregates TapEvent, MyList, MyListItem data into snapshot tables:
 * - DailySiteStats
 * - DailyBatchStats
 * - DailyTagStats
 * - DailyItemStats
 * - DailyVisitorStats (with power user scoring)
 *
 * Usage:
 *   npx tsx scripts/runAggregateDaily.ts           # yesterday
 *   npx tsx scripts/runAggregateDaily.ts 2026-02-12 # specific date
 *
 * Power User Scoring:
 * - Computed per visitor per day
 * - Score = taps*1 + tagsTapped*2 + batchesTapped*2 + listsCreated*3 + itemsAdded*1 + itemsPurchased*5
 * - Power user threshold: POWER_USER_SCORE_THRESHOLD env var (default: 50)
 *
 * Backfill: Run for multiple dates by calling with different date arguments.
 * Expected: DailyVisitorStats rows appear for visitors with taps that day.
 */

async function main() {
  const secret = process.env.INTERNAL_JOB_SECRET;
  if (!secret) {
    console.error("❌ INTERNAL_JOB_SECRET env var is not set.");
    process.exit(1);
  }

  // Determine base URL
  let baseUrl = process.env.APP_URL;
  if (!baseUrl) {
    const domain = process.env.NEXT_PUBLIC_APP_DOMAIN;
    if (domain) {
      // Use http:// for localhost, https:// for production domains
      const protocol = domain.startsWith("localhost") ? "http" : "https";
      baseUrl = `${protocol}://${domain}`;
    } else {
      baseUrl = "http://localhost:3001";
    }
  }

  // Determine target date (CLI arg or yesterday)
  const dateArg = process.argv[2];
  let targetDate: string;

  if (dateArg && /^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
    targetDate = dateArg;
  } else {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    targetDate = yesterday.toISOString().slice(0, 10);
  }

  const url = `${baseUrl}/api/internal/reporting/aggregate-daily`;

  console.log(`🔄 Running daily aggregation for ${targetDate}`);
  console.log(`   URL: ${url}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ date: targetDate }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`❌ Aggregation failed (HTTP ${res.status}):`);
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log(`✅ Aggregation complete:`);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Network error calling aggregation endpoint:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
