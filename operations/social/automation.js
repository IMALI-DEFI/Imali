'use strict';

const ALLOWED_BRANDS = new Set(['imali', 'sportsjedi']);
const ALLOWED_PLATFORMS = new Set(['instagram', 'facebook', 'threads']);
const ALLOWED_TYPES = new Set([
  'stock',
  'crypto',
  'nfl',
  'cfb',
  'player_parlay'
]);

function validateSetting(x = {}) {
  const brand = String(x.brand || '').toLowerCase();
  const platform = String(x.platform || '').toLowerCase();
  const contentType = String(x.content_type || '').toLowerCase();

  if (!ALLOWED_BRANDS.has(brand)) throw Error('AUTOMATION_BRAND_INVALID');
  if (!ALLOWED_PLATFORMS.has(platform)) throw Error('AUTOMATION_PLATFORM_INVALID');
  if (!ALLOWED_TYPES.has(contentType)) throw Error('AUTOMATION_CONTENT_TYPE_INVALID');

  const postsPerDay = Number(x.posts_per_day ?? 0);
  if (!Number.isInteger(postsPerDay) || postsPerDay < 0 || postsPerDay > 24) {
    throw Error('AUTOMATION_POST_COUNT_INVALID');
  }

  const windows = Array.isArray(x.posting_windows) ? x.posting_windows : [];

  for (const time of windows) {
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(time))) {
      throw Error('AUTOMATION_WINDOW_INVALID');
    }
  }

  if (windows.length > 24) throw Error('AUTOMATION_TOO_MANY_WINDOWS');

  return {
    brand,
    platform,
    content_type: contentType,
    enabled: x.enabled === true,
    posts_per_day: postsPerDay,
    timezone: 'America/New_York',
    posting_windows: windows,
    require_qualified_signal: x.require_qualified_signal !== false
  };
}

let runtimeCache;
function runtimeStatus(){
 if(runtimeCache&&Date.now()-runtimeCache.at<5000)return runtimeCache.value;
 const {execFileSync}=require('node:child_process');
 function active(unit){try{return execFileSync('/usr/bin/systemctl',['is-active',unit],{encoding:'utf8',timeout:1500,stdio:['ignore','pipe','ignore']}).trim()==='active'}catch{return false}}
 const scheduler_active=active('imali-social-automation.timer');
 let scheduler_live=false;try{scheduler_live=execFileSync('/usr/bin/systemctl',['show','imali-social-automation.service','--property=Environment','--value'],{encoding:'utf8',timeout:1500,stdio:['ignore','pipe','ignore']}).includes('SOCIAL_AUTOMATION_LIVE=1')}catch{}
 const workers={instagram:active('imali-instagram-worker.timer'),threads:active('imali-threads-worker.timer')};
 const value={scheduler_active,automatic_publishing:scheduler_active&&scheduler_live&&Object.values(workers).some(Boolean),scheduler_live,workers};runtimeCache={at:Date.now(),value};return value;
}
function mount(router, { db, wrap }) {
 require('./automation-actions').mount(router,{db,wrap});

  router.get('/automation', wrap(async (req, res) => {
    const settings = await db.query(`
      SELECT
        brand,
        content_type,
        platform,
        enabled,
        posts_per_day,
        timezone,
        posting_windows,
        require_qualified_signal,
        updated_at
      FROM social_automation_settings
      ORDER BY brand, content_type, platform
    `);

    const runs = await db.query(`
      SELECT
        id,
        brand,
        content_type,
        platform,
        slot_key,
        scheduled_for,
        status,
        queue_id,
        error,
        details,
        created_at,
        updated_at,
        (SELECT public_url FROM social_queue_v1 q WHERE q.id=social_automation_runs.queue_id) public_url,
        (SELECT state FROM social_queue_v1 q WHERE q.id=social_automation_runs.queue_id) queue_state
      FROM social_automation_runs
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      ...runtimeStatus(),
      settings: settings.rows,
      recent_runs: runs.rows,
      stats:(await db.query(`SELECT count(*) FILTER(WHERE created_at AT TIME ZONE 'America/New_York'>=date_trunc('day',now() AT TIME ZONE 'America/New_York'))::int generated_today,count(*) FILTER(WHERE state IN ('APPROVED','SCHEDULED'))::int queued,count(*) FILTER(WHERE state='POSTED')::int posted,count(*) FILTER(WHERE state='FAILED' OR error IS NOT NULL OR provider_state->>'step'='REVIEW')::int failed_review FROM social_queue_v1 WHERE provider_state->>'automation'='true' OR provider_state->>'automation_preview'='true'`)).rows[0]
    });
  }));

  router.put('/automation/settings', wrap(async (req, res) => {
    const x = validateSetting(req.body);
    if(!x.require_qualified_signal)throw Error('QUALIFIED_SIGNAL_REQUIRED');
    if(x.platform==='facebook'&&x.brand!=='imali'&&x.enabled)throw Error('SPORTS_JEDI_FACEBOOK_AUTHORIZATION_REQUIRED');
    if(x.platform==='threads'&&x.enabled){
      await require('./threads-readiness').assertReady(db,x.brand==='sportsjedi'?'sports_jedi':x.brand);
      await new Promise((resolve,reject)=>require('node:child_process').execFile('/usr/bin/sudo',['-n','/usr/bin/systemctl','enable','--now','imali-threads-worker.timer'],{timeout:10000},e=>e?reject(Error('THREADS_WORKER_ACTIVATION_FAILED')):resolve()));
      runtimeCache=null;
    }

    const result = await db.query(`
      INSERT INTO social_automation_settings (
        brand,
        content_type,
        platform,
        enabled,
        posts_per_day,
        timezone,
        posting_windows,
        require_qualified_signal,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,now())

      ON CONFLICT (brand,content_type,platform)
      DO UPDATE SET
        enabled = EXCLUDED.enabled,
        posts_per_day = EXCLUDED.posts_per_day,
        timezone = EXCLUDED.timezone,
        posting_windows = EXCLUDED.posting_windows,
        require_qualified_signal = EXCLUDED.require_qualified_signal,
        updated_at = now()

      RETURNING *
    `, [
      x.brand,
      x.content_type,
      x.platform,
      x.enabled,
      x.posts_per_day,
      x.timezone,
      JSON.stringify(x.posting_windows),
      x.require_qualified_signal
    ]);

    res.json({
      success: true,
      ...runtimeStatus(),
      setting: result.rows[0]
    });
  }));
}

module.exports = { mount, runtimeStatus, validateSetting };
