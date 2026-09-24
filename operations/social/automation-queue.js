'use strict';

const crypto = require('node:crypto');

function queueBrand(brand) {
  if (brand === 'sportsjedi') return 'sports_jedi';
  if (brand === 'imali') return 'imali';
  throw Error('AUTOMATION_QUEUE_BRAND_INVALID');
}

async function enqueueInstagram(client, {
  brand,
  contentType,
  slotKey,
  scheduledFor,
  mediaUrl,
  caption
}) {
  const dbBrand = queueBrand(brand);

  if (!/^https:\/\/[^\s]+$/i.test(String(mediaUrl || '')))
    throw Error('AUTOMATION_MEDIA_URL_INVALID');

  if (!String(caption || '').trim())
    throw Error('AUTOMATION_CAPTION_REQUIRED');

  const idempotency =
    `auto_${brand}_${contentType}_` +
    crypto.createHash('sha256')
      .update(slotKey)
      .digest('hex')
      .slice(0,24);

  const prior = (
    await client.query(
      `SELECT id,state,public_url,error
         FROM social_queue_v1
        WHERE brand=$1
          AND platform='instagram'
          AND idempotency_key=$2
        LIMIT 1`,
      [dbBrand,idempotency]
    )
  ).rows[0];

  if (prior) {
    return {
      duplicate:true,
      idempotency_key:idempotency,
      job:prior
    };
  }

  const connection = (
    await client.query(
      `SELECT account_id,generation,connection_status,token_expiration
         FROM social_connections_v1
        WHERE brand=$1
          AND platform='instagram'
        FOR SHARE`,
      [dbBrand]
    )
  ).rows[0];

  if (!connection)
    throw Error('INSTAGRAM_CONNECTION_NOT_FOUND');

  if (connection.connection_status !== 'CONNECTED')
    throw Error('CONNECTION_NOT_CONFIRMED');

  if (
    connection.token_expiration &&
    new Date(connection.token_expiration) <= new Date()
  )
    throw Error('TOKEN_EXPIRED_REFRESH_OR_RECONNECT');

  const id = crypto.randomUUID();

  const content = {
    type:'image',
    brand:dbBrand,
    media_url:mediaUrl,
    caption:String(caption)
  };

  await client.query(
    `INSERT INTO social_queue_v1
      (id,brand,platform,account_id,generation,state,
       content,approved_by,idempotency_key,provider_state,scheduled_at)
     VALUES
      ($1,$2,'instagram',$3,$4,'APPROVED',
       $5,$6,$7,$8,$9)`,
    [
      id,
      dbBrand,
      connection.account_id,
      connection.generation,
      content,
      'automation_scheduler',
      idempotency,
      {
        step:'NEW',
        automation:true,
        content_type:contentType,
        slot_key:slotKey
      },
      scheduledFor
    ]
  );

  return {
    duplicate:false,
    id,
    state:'APPROVED',
    scheduled_at:scheduledFor,
    idempotency_key:idempotency
  };
}


async function enqueueFacebook(client, {
  brand,
  contentType,
  slotKey,
  mediaUrl,
  caption
}) {
  if (brand !== 'imali')
    throw Error('FACEBOOK_AUTOMATION_IMALI_ONLY');

  if (!/^https:\/\/[^\s]+$/i.test(String(mediaUrl || '')))
    throw Error('AUTOMATION_MEDIA_URL_INVALID');

  if (!String(caption || '').trim())
    throw Error('AUTOMATION_CAPTION_REQUIRED');

  const { createJobs } = require('./facebook-jobs');

  // createJobs expects a Pool-like object. Reuse this transaction's client
  // without allowing facebook-jobs to release the scheduler-owned client.
  const db = {
    connect: async () => ({
      query: (...args) => client.query(...args),
      release: () => {}
    })
  };

  const jobs = createJobs({ db });

  const idempotency =
    `auto_facebook_${brand}_${contentType}_` +
    crypto.createHash('sha256')
      .update(slotKey)
      .digest('hex')
      .slice(0,24);

  const result = await jobs.submit({
    brand:'imali',
    content:{
      type:'image',
      media_url:mediaUrl,
      message:String(caption)
    },
    idempotency_key:idempotency,
    approved_by:'automation_scheduler',
    approve:true
  });

  return {
    duplicate:!!result.duplicate,
    id:result.id || null,
    state:result.state || null,
    public_url:result.public_url || null,
    platform_post_id:result.platform_post_id || null,
    error:result.error || null,
    idempotency_key:idempotency
  };
}



async function enqueueThreads(client, {
  brand,
  contentType,
  slotKey,
  scheduledFor,
  mediaUrl,
  caption
}) {
  const dbBrand = queueBrand(brand);
  await require('./threads-readiness').assertReady(client,dbBrand);
  require('./threads-media').validate(dbBrand,{caption,media_url:mediaUrl});

  const x = (await client.query(
    `SELECT brand,platform,account_id,generation,connection_status
       FROM social_connections_v1
      WHERE brand=$1 AND platform='threads'`,
    [dbBrand]
  )).rows[0];

  if (!x || x.connection_status !== 'CONNECTED')
    throw Error('THREADS_CONNECTION_NOT_CONFIRMED');

  if (!x.account_id)
    throw Error('THREADS_ACCOUNT_ID_MISSING');

  const idempotency =
    `auto_threads_${dbBrand}_${contentType}_` +
    crypto.createHash('sha256')
      .update(slotKey)
      .digest('hex')
      .slice(0,24);

  const prior = (await client.query(
    `SELECT *
       FROM social_queue_v1
      WHERE brand=$1
        AND platform='threads'
        AND idempotency_key=$2`,
    [dbBrand,idempotency]
  )).rows[0];

  if (prior)
    return {
      duplicate:true,
      id:prior.id,
      job:prior
    };

  const id = crypto.randomUUID();

  const content = {
    type:'image',
    media_url:mediaUrl,
    text:String(caption),
    caption:String(caption),
    automation:true,
    content_type:contentType,
    slot_key:slotKey
  };

  const r = await client.query(
    `INSERT INTO social_queue_v1
       (id,brand,platform,account_id,generation,state,
        content,idempotency_key,provider_state,
        approved_by,scheduled_at)
     VALUES
       ($1,$2,'threads',$3,$4,'APPROVED',
        $5,$6,$7,'automation_scheduler',$8)
     RETURNING *`,
    [
      id,
      dbBrand,
      x.account_id,
      x.generation,
      content,
      idempotency,
      {step:'NEW',automation:true},
      scheduledFor || new Date()
    ]
  );

  return {
    duplicate:false,
    id,
    job:r.rows[0]
  };
}

module.exports = {
  queueBrand,
  enqueueInstagram,
  enqueueFacebook,
  enqueueThreads
};
