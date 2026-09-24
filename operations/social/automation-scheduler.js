'use strict';

const crypto = require('node:crypto');
const { Pool } = require('../marketing/campaign-runtime').postgres();
const DB = require('../marketing/campaign-db');
const Generator = require('./automation-generate');
const Queue = require('./automation-queue');

const PREVIEW=process.env.SOCIAL_AUTOMATION_PREVIEW==='1';
const DRY_RUN = process.env.SOCIAL_AUTOMATION_LIVE !== '1';

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  return Object.fromEntries(
    parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value])
  );
}

function slotKey(setting, day, window) {
  return [
    setting.brand,
    setting.platform,
    setting.content_type,
    day,
    window.replace(':', '')
  ].join('_');
}

function safeError(e) {
  const m = String(e?.message || '');
  return /^[A-Z][A-Z0-9_]+$/.test(m)
    ? m
    : 'AUTOMATION_SLOT_FAILED';
}

async function claimSlot(db, slot) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='5s'");

    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      [slot.slot_key]
    );

    const prior = (await client.query(
      `SELECT id,status,queue_id
         FROM social_automation_runs
        WHERE brand=$1
          AND content_type=$2
          AND platform=$3
          AND slot_key=$4
        LIMIT 1`,
      [
        slot.brand,
        slot.content_type,
        slot.platform,
        slot.slot_key
      ]
    )).rows[0];

    if (prior) {
      await client.query('COMMIT');
      return { claimed:false, prior };
    }

    const runId = crypto.randomUUID();

    await client.query(
      `INSERT INTO social_automation_runs
        (id,brand,content_type,platform,slot_key,
         scheduled_for,status,details)
       VALUES
        ($1,$2,$3,$4,$5,now(),'GENERATING',$6)`,
      [
        runId,
        slot.brand,
        slot.content_type,
        slot.platform,
        slot.slot_key,
        {
          local_window: slot.local_window,
          claimed_at: new Date().toISOString()
        }
      ]
    );

    await client.query('COMMIT');

    return { claimed:true, runId };

  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

async function finishRun(db, runId, status, {
  queueId = null,
  details = {}
} = {}) {
  await db.query(
    `UPDATE social_automation_runs
        SET status=$2,
            queue_id=$3,
            details=COALESCE(details,'{}'::jsonb) || $4::jsonb
      WHERE id=$1`,
    [
      runId,
      status,
      queueId,
      JSON.stringify(details)
    ]
  );
}

async function usedSymbolsToday(db, contentType, day) {
  const result = await db.query(
    `SELECT details
       FROM social_automation_runs
      WHERE brand='imali'
        AND platform='instagram'
        AND content_type=$1
        AND slot_key LIKE $2
        AND status IN ('QUEUED','POSTED')`,
    [contentType, `imali_instagram_${contentType}_${day}_%`]
  );

  return new Set(
    result.rows
      .map(row => row.details && row.details.symbol)
      .filter(Boolean)
      .map(symbol => String(symbol).trim().toUpperCase())
  );
}

async function qualifiedStockSymbols() {
  const output = Generator.stockOpportunities();

  return output
    .filter(x => x && x.qualified === true && x.symbol)
    .map(x => String(x.symbol).trim().toUpperCase());
}

async function main() {
  const db = new Pool(DB.options());

  try {
    const now = new Date();
    const p = localParts(now);
    const day = `${p.year}-${p.month}-${p.day}`;
    const hhmm = `${p.hour}:${p.minute}`;

    const settings = (await db.query(`
      SELECT
        brand,
        content_type,
        platform,
        enabled,
        posts_per_day,
        timezone,
        posting_windows,
        require_qualified_signal
      FROM social_automation_settings
      WHERE (enabled = true OR ${PREVIEW ? 'true' : 'false'})
        AND posts_per_day > 0
      ORDER BY brand,content_type,platform
    `)).rows;

    const due = [];

    for (const s of settings) {
      const windows = Array.isArray(s.posting_windows)
        ? s.posting_windows.slice(0, s.posts_per_day)
        : [];

      for (const window of windows) {
        const key = slotKey(s, day, window);
        const forceSlot = String(process.env.SOCIAL_AUTOMATION_FORCE_SLOT || '').trim();

        if (window > hhmm && forceSlot !== key) continue;
        if (forceSlot && forceSlot !== key) continue;

        const prior = (await db.query(
          `SELECT id,status,queue_id
             FROM social_automation_runs
            WHERE brand=$1
              AND content_type=$2
              AND platform=$3
              AND slot_key=$4
            LIMIT 1`,
          [s.brand, s.content_type, s.platform, key]
        )).rows[0];

        if (prior) continue;

        due.push({
          brand: s.brand,
          content_type: s.content_type,
          platform: s.platform,
          slot_key: key,
          local_window: window,
          require_qualified_signal: s.require_qualified_signal
        });
      }
    }

    const weekday=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',weekday:'short'}).format(now);
    const weight=s=>s.brand==='sportsjedi'&&((s.content_type==='nfl'&&['Mon','Thu','Sun'].includes(weekday))||(s.content_type==='cfb'&&weekday==='Sat'))?1:0;
    due.sort((a,b)=>weight(b)-weight(a)||a.local_window.localeCompare(b.local_window));
    console.log(JSON.stringify({
      ok:true,
      dry_run:DRY_RUN,
      local_day:day,
      local_time:hhmm,
      enabled_settings:settings.length,
      due_slots:due.length,
      slots:due
    }, null, 2));

    if (DRY_RUN) return;

    const results = [];

    for (const slot of due) {
      let claim;

      try {
        claim = await claimSlot(db, slot);
      } catch (e) {
        results.push({
          slot_key:slot.slot_key,
          status:'CLAIM_FAILED',
          error:safeError(e)
        });
        continue;
      }

      if (!claim.claimed) {
        results.push({
          slot_key:slot.slot_key,
          status:'DUPLICATE',
          queue_id:claim.prior.queue_id
        });
        continue;
      }

      const runId = claim.runId;

      try {
        if (!['instagram','facebook','threads'].includes(slot.platform))
          throw Error('AUTOMATION_PLATFORM_NOT_ENABLED');

        if (slot.platform === 'facebook' && slot.brand !== 'imali')
          throw Error('AUTOMATION_FACEBOOK_BRAND_NOT_ENABLED');

        if (!['sportsjedi','imali'].includes(slot.brand))
          throw Error('AUTOMATION_BRAND_GENERATOR_NOT_ENABLED');

        /*
         * Generation intentionally happens AFTER the durable slot claim.
         * If generation fails, this slot becomes FAILED and will not
         * regenerate on the next scheduler invocation.
         */
        if(slot.platform==='threads'&&!PREVIEW)await require('./threads-readiness').assertReady(db,Queue.queueBrand(slot.brand));
        let generated;

        if (slot.brand === 'sportsjedi') {
          generated = Generator.sportsJedi(slot.content_type);

        } else if (slot.content_type === 'stock') {
          const used = await usedSymbolsToday(db, 'stock', day);
          const candidates = await qualifiedStockSymbols();

          const symbol = candidates.find(x => !used.has(x));

          if (!symbol) {
            generated = {
              brand:'imali',
              content_type:'stock',
              qualified:false,
              qualification_reason:'NO_UNUSED_QUALIFIED_STOCK'
            };
          } else {
            generated = Generator.imali('stock', {symbol});
          }

        } else if (slot.content_type === 'crypto') {
          const used = await usedSymbolsToday(db, 'crypto', day);

          const candidates = Generator.cryptoOpportunities()
            .map(x => String(x.symbol || '').trim().toUpperCase())
            .filter(Boolean);

          const symbol = candidates.find(x => !used.has(x));

          if (!symbol) {
            generated = {
              brand:'imali',
              content_type:'crypto',
              qualified:false,
              qualification_reason:'NO_UNUSED_QUALIFIED_CRYPTO'
            };
          } else {
            generated = Generator.imali('crypto', {symbol});
          }

        } else {
          throw Error('AUTOMATION_IMALI_CONTENT_TYPE_NOT_ENABLED');
        }

        if (
          generated.qualified !== true
        ) {
          await finishRun(db, runId, 'SKIPPED', {
            details:{
              reason:generated.qualification_reason||'QUALIFIED_SIGNAL_REQUIRED',
              campaign_id:generated.campaign_id
            }
          });

          results.push({
            slot_key:slot.slot_key,
            status:'SKIPPED',
            reason:'QUALIFIED_SIGNAL_REQUIRED'
          });

          continue;
        }

        /*
         * Keep queue insertion transactional. The durable automation
         * run already exists, so a queue failure cannot cause generation
         * to repeat automatically.
         */
        const client = await db.connect();

        let queued;

        try {
          const enqueue = PREVIEW ? require('./automation-preview').enqueue :
            slot.platform === 'facebook'
              ? Queue.enqueueFacebook
              : slot.platform === 'threads' ? Queue.enqueueThreads : Queue.enqueueInstagram;

          if (typeof enqueue !== 'function')
            throw Error('AUTOMATION_QUEUE_ADAPTER_MISSING');

          if (PREVIEW || slot.platform !== 'facebook')
            await client.query('BEGIN');

          queued = await enqueue(client, {
            brand:slot.brand,
            platform:slot.platform,
            contentType:slot.content_type,
            slotKey:slot.slot_key,
            scheduledFor:new Date(),
            mediaUrl:generated.media_url,
            caption:generated.caption
          });

          if (PREVIEW || slot.platform !== 'facebook')
            await client.query('COMMIT');

        } catch (e) {
          if (PREVIEW || slot.platform !== 'facebook') {
            try { await client.query('ROLLBACK'); } catch {}
          }
          throw e;
        } finally {
          client.release();
        }

        const queueId =
          queued.id || (queued.job && queued.job.id) || null;

        if (!queueId)
          throw Error('AUTOMATION_QUEUE_ID_MISSING');

        await finishRun(db, runId, 'QUEUED', {
          queueId,
          details:{
            campaign_id:generated.campaign_id,
            media_url:generated.media_url,
            symbol:generated.symbol || null,
            duplicate_queue:queued.duplicate === true
          }
        });

        results.push({
          slot_key:slot.slot_key,
          status:'QUEUED',
          queue_id:queueId,
          campaign_id:generated.campaign_id
        });

      } catch (e) {
        const error = safeError(e);

        try {
          await finishRun(db, runId, 'FAILED', {
            details:{error}
          });
        } catch (recordError) {
          results.push({
            slot_key:slot.slot_key,
            status:'FAILURE_RECORD_FAILED',
            error:safeError(recordError)
          });
          continue;
        }

        results.push({
          slot_key:slot.slot_key,
          status:'FAILED',
          error
        });
      }
    }

    console.log(JSON.stringify({
      ok:true,
      live:true,
      processed:results.length,
      results
    }, null, 2));

  } finally {
    await db.end();
  }
}

main().catch(e => {
  console.error(
    'SOCIAL_AUTOMATION_SCHEDULER_FAILED:',
    safeError(e)
  );
  process.exit(1);
});
