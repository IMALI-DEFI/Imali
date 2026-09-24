'use strict';
const crypto=require('node:crypto');
const BRANDS=new Set(['imali','sports_jedi','founder']);const PLATFORMS=new Set(['x','facebook','instagram','threads','tiktok','linkedin','youtube']);
function validate(brand,platform){if(!BRANDS.has(brand)||!PLATFORMS.has(platform))throw Error('INVALID_DESTINATION');}
function hash(s){return crypto.createHash('sha256').update(s).digest('hex');}
function nonce(){return crypto.randomBytes(32).toString('base64url');}
function seal(key,value,aad){const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from(aad));return Buffer.concat([iv,c.update(JSON.stringify(value)),c.final(),c.getAuthTag()]).toString('base64');}
function open(key,value,aad){const b=Buffer.from(value,'base64');const d=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAAD(Buffer.from(aad));d.setAuthTag(b.subarray(-16));return JSON.parse(Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString());}
function publicConnection(c){const {brand,platform,account_id,account_name,connection_status,granted_scopes,token_expiration,last_success,last_error,generation}=c;return {brand,platform,account_id,account_name,connection_status:connection_status==='CONNECTED'&&token_expiration&&Date.parse(token_expiration)<=Date.now()?'EXPIRED':connection_status,granted_scopes,token_expiration,last_success,last_error,generation};}
function assertDestination(c,b,p,id){validate(b,p);if(c.brand!==b||c.platform!==p||c.account_id!==id)throw Error('DESTINATION_MISMATCH');}
module.exports={BRANDS,PLATFORMS,validate,hash,nonce,seal,open,publicConnection,assertDestination};
