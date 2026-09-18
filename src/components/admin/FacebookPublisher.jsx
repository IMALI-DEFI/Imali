import React, {useEffect, useState} from 'react';
export const INSTAGRAM_DESTINATIONS={sports_jedi:'sportsjedi',imali:'imali_defi',founder:'whoisblackgriff',personal:'whoisblackgriff'};
const unwrap=r=>r?.data?.success!==undefined?r.data:r;
export default function FacebookPublisher({api,connections=[],onChanged}) {
 const [config,setConfig]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[connection,setConnection]=useState(null);
 const [target,setTarget]=useState('facebook'),[type,setType]=useState('text'),[message,setMessage]=useState(''),[media,setMedia]=useState(''),[approved,setApproved]=useState(false),[results,setResults]=useState([]),[key,setKey]=useState(()=>crypto.randomUUID());
 useEffect(()=>{let active=true;api.get('/api/admin/social/facebook/status').then(r=>{if(active)setConfig(unwrap(r));}).catch(()=>{if(active)setError('Facebook status could not be loaded.');});return()=>{active=false;};},[api]);
 const instagram=connections.find(r=>r.brand==='imali'&&r.platform==='instagram');
 const needsInstagram=target!=='facebook';
 const instagramReady=instagram?.connection_status==='CONNECTED'&&String(instagram.account_name||'').replace(/^@/,'').toLowerCase()===INSTAGRAM_DESTINATIONS.imali;
 const change=fn=>{fn();setApproved(false);setKey(crypto.randomUUID());setResults([]);};
 async function check(){setBusy(true);setError('');try{const r=unwrap(await api.post('/api/admin/social/facebook/connection-test',{}));setConnection(r.data);}catch(e){setError(e.response?.data?.error||'Facebook connection test failed.');}finally{setBusy(false);}}
 async function submit(){
  setBusy(true);setError('');const out=[];
  try{
   if(needsInstagram&&!instagramReady)throw Error('Connect and verify IMALI → imali_defi before targeting Instagram.');
   const content={brand:'imali',type,message,text:message,caption:message,media_url:media,idempotency_key:key,approve:approved};
   if(target!=='instagram'){
    try{const r=unwrap(await api.post('/api/admin/social/imali/facebook/posts',content));out.push({platform:'Facebook',...r.data});}
    catch(e){out.push({platform:'Facebook',status:'failed',error:e.response?.data?.error||'Request failed. Check the queue before retrying.'});}
   }
   if(needsInstagram){
    try{const r=unwrap(await api.post('/api/admin/social/imali/instagram/media-tests',{...content,account_id:instagram.account_id}));out.push({platform:'Instagram',status:'pending',...r.data});}
    catch(e){out.push({platform:'Instagram',status:'failed',error:e.response?.data?.error||'Instagram approval could not be queued.'});}
   }
   setResults(out);await onChanged();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const input='block w-full rounded-lg bg-gray-800 border border-gray-600 p-3 my-2 text-white';
 const button='rounded-lg bg-indigo-600 px-3 py-2 mr-2 disabled:opacity-40';
 return <section aria-label="IMALI Facebook publishing" className="rounded-xl bg-gray-900 p-6 space-y-3">
  <h2 className="text-xl font-semibold">IMALI Page publishing</h2>
  <p>Facebook: Imali-Defi.com {config?.page_id&&`(${config.page_id})`}</p>
  <p role="status">{!config?'Loading Facebook status…':config.publishing_enabled?'Facebook publishing is enabled.':'Facebook publishing is disabled. Submissions are recorded as dry runs; no Facebook post is sent.'}</p>
  <button className={button} disabled={busy||!config?.configured} onClick={check}>Check Facebook connection (read-only)</button>
  {connection&&<p>Verified Page: {connection.page_name} ({connection.page_id}). Credentials accepted. No post created.</p>}
  {error&&<p role="alert" className="text-amber-300">{error}</p>}
  <label>Destination<select className={input} value={target} onChange={e=>change(()=>{setTarget(e.target.value);if(e.target.value!=='facebook')setType('image');})}><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="both">Instagram and Facebook</option></select></label>
  <label>Content type<select className={input} value={type} onChange={e=>change(()=>setType(e.target.value))}>{!needsInstagram&&<option value="text">Text</option>}<option value="image">Image</option></select></label>
  <label>Message / caption<textarea className={input} value={message} maxLength={needsInstagram?2200:5000} onChange={e=>change(()=>setMessage(e.target.value))}/></label>
  {type==='image'&&<label>Public HTTPS image URL<input className={input} type="url" value={media} onChange={e=>change(()=>setMedia(e.target.value))}/><small>Use an approved public brand image, without authentication or URL query parameters.</small></label>}
  {needsInstagram&&<p>Instagram destination: imali_defi. This queues the existing manual approval workflow; it does not bypass Instagram’s publish confirmation.{!instagramReady&&' This account is not currently connected and verified.'}</p>}
  <label className="block"><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/> I approve this content and the selected destinations.</label>
  <button className={button} disabled={busy||!config||!approved||!message.trim()||(type==='image'&&!media)||(needsInstagram&&!instagramReady)} onClick={submit}>{target==='facebook'&&!config?.publishing_enabled?'Record Facebook dry run':'Submit approved content'}</button>
  {results.map(r=><p key={r.platform}>{r.platform}: {r.status}{r.duplicate?' (existing request)':''}{r.error?` — ${r.error}`:''}{r.platform_post_id?` — Post ID ${r.platform_post_id}`:''}</p>)}
  <p className="text-sm text-white/70">Instagram routing stays SportsJedi → sportsjedi; IMALI → imali_defi; founder/personal → whoisblackgriff.</p>
 </section>;
}
