import React,{useEffect,useState}from"react";
import{Link}from"react-router-dom";
import{FaArrowLeft,FaArrowRight,FaUsers}from"react-icons/fa";
const API=process.env.REACT_APP_API_BASE_URL||"https://api.imali-defi.com";
const fallback=[
{id:"imali-1",title:"Latest from IMALI",caption:"Fresh market grades, product updates, and trading education.",media_url:"/og-image.png"},
{id:"imali-2",title:"See IMALI in action",caption:"Explore automation, market activity, and risk controls.",media_url:"/logo512.png"}
];
export default function RecentSocialShowcase(){
const[posts,setPosts]=useState(fallback),[i,setI]=useState(0);
useEffect(()=>{let on=true;fetch(`${API}/api/public/social/recent?product=imali&limit=8`).then(r=>r.ok?r.json():Promise.reject()).then(j=>{const p=j?.data?.posts||j?.posts||j?.data;if(on&&Array.isArray(p)&&p.length)setPosts(p)}).catch(()=>{});return()=>{on=false}},[]);
useEffect(()=>{if(posts.length<2)return;const t=setInterval(()=>setI(x=>(x+1)%posts.length),6500);return()=>clearInterval(t)},[posts.length]);
const p=posts[i%posts.length]||fallback[0],media=p.media_url||p.image_url||p.thumbnail_url,isVideo=/video/i.test(p.media_type||p.type||"")||/\.mp4(?:$|\?)/i.test(media||"");
return <section className="border-y border-white/5 bg-white/[0.02] py-14 sm:py-20"><div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
<div className="mb-8"><p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">Latest from IMALI</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">Recent social posts</h2><p className="mt-2 text-white/50">Fresh content from our social channels.</p></div>
<div className="grid overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 md:grid-cols-[1.1fr_.9fr]"><div className="min-h-[320px] bg-black/30">{media&&(isVideo?<video className="h-full w-full object-cover" src={media} controls playsInline/>:<img className="h-full w-full object-cover" src={media} alt={p.title||"IMALI social post"}/>)}</div>
<div className="flex min-h-[320px] flex-col justify-between p-7 sm:p-9"><div><span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">{p.platform||"IMALI SOCIAL"}</span><h3 className="mt-3 text-2xl font-black">{p.title||p.topic||"Latest IMALI update"}</h3><p className="mt-4 leading-relaxed text-white/60">{p.caption||p.text||"Follow IMALI for the latest updates."}</p></div>
<div className="mt-7 flex items-center gap-3"><button aria-label="Previous post" onClick={()=>setI(x=>(x-1+posts.length)%posts.length)} className="rounded-xl border border-white/10 px-4 py-2"><FaArrowLeft/></button><button aria-label="Next post" onClick={()=>setI(x=>(x+1)%posts.length)} className="rounded-xl border border-white/10 px-4 py-2"><FaArrowRight/></button><span className="ml-auto text-xs text-white/35">{i%posts.length+1} / {posts.length}</span></div></div></div>
<div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-7 sm:flex sm:items-center sm:justify-between"><div><h3 className="text-2xl font-black">Share IMALI. Earn recurring commission.</h3><p className="mt-2 text-white/55">Join the partner program and earn 25% recurring commission on eligible referred subscriptions.</p></div><Link to="/referrals" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 font-extrabold text-slate-950 sm:ml-8 sm:mt-0"><FaUsers/>Join the Partner Program</Link></div>
</div></section>}
