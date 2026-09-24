'use strict';
const P=require('./providers');
const D=require('./destinations');
const origins={imali:'https://api.imali-defi.com',sports_jedi:'https://api.sportsjedi.com',founder:'https://api.imali-defi.com'};
function validate(brand,content){
 if(!origins[brand])throw Error('INVALID_DESTINATION');
 const text=String(content.text||content.caption||'').trim();
 if(!text||text.length>500)throw Error('THREADS_CAPTION_REQUIRES_EDIT_MAX_500');
 let u;try{u=new URL(content.media_url)}catch{throw Error('THREADS_IMAGE_URL_INVALID')}
 if(u.origin!==origins[brand]||u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!u.pathname.startsWith('/api/blog/images/'))throw Error('MEDIA_ORIGIN_NOT_APPROVED');
 if(!/\.(png|jpe?g)$/i.test(u.pathname))throw Error('THREADS_IMAGE_REQUIRED');
 return {type:'image',text,caption:text,media_url:u.href};
}
async function checkMedia(brand,content){const c=validate(brand,content);let r;try{r=await fetch(c.media_url,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(10000)})}catch{throw Error('PUBLIC_IMAGE_UNAVAILABLE')}
 if(!r.ok||!/^image\/(jpeg|png)(;|$)/i.test(r.headers.get('content-type')||''))throw Error('PUBLIC_IMAGE_UNAVAILABLE');return c;}
function id(value){if(!/^\d+$/.test(String(value||'')))throw Error('THREADS_ID_INVALID');return String(value)}
const base='https://graph.threads.net/v1.0/';
async function create(t,x,c){D.assertUsername(x.brand,'threads',x.account_name);const r=await P.request(base+id(x.account_id)+'/threads',{method:'POST',token:t.access_token,form:{media_type:'IMAGE',image_url:c.media_url,text:c.text}});return id(r.data.id)}
async function status(t,container){return (await P.request(base+id(container)+'?fields=status,error_message',{token:t.access_token})).data.status}
async function publish(t,x,container){return id((await P.request(base+id(x.account_id)+'/threads_publish',{method:'POST',token:t.access_token,form:{creation_id:id(container)}})).data.id)}
async function confirm(t,media,x){const r=(await P.request(base+id(media)+'?fields=id,permalink,username,timestamp',{token:t.access_token})).data;if(id(r.id)!==id(media))throw Error('MEDIA_CONFIRMATION_MISMATCH');D.assertUsername(x.brand,'threads',r.username);let u;try{u=new URL(r.permalink)}catch{throw Error('PERMALINK_UNAVAILABLE')};if(u.protocol!=='https:'||!['threads.net','www.threads.net','threads.com','www.threads.com'].includes(u.hostname))throw Error('PERMALINK_INVALID');return {id:id(media),url:u.href}}
module.exports={validate,checkMedia,create,status,publish,confirm};
