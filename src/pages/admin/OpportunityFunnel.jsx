import React,{useCallback,useEffect,useState} from 'react';
import {apiFetch} from '../../context/AuthContext';
const label=s=>s.replace(/_/g,' ');
export default function OpportunityFunnel({onOpen}){
 const [data,setData]=useState(null),[error,setError]=useState('');
 const load=useCallback(async()=>{try{setData(await apiFetch('/api/admin/work-agent/engine/funnel'));setError('')}catch(e){setError(e.message)}},[]);
 useEffect(()=>{load()},[load]);
 return <details className="oe-section"><summary>Funnel quality, conversion &amp; source performance</summary><button onClick={load}>Refresh funnel</button>{error&&<p role="alert">{error}</p>}{data&&<>
 <div className="oe-chips">{['discovered','qualified','pursuit','needs_review','ready','approved','sent','reply','interview','proposal','won','lost','actionable','stale','duplicate','missing_contact','ready_unsent','followup_overdue'].map(k=><span key={k} style={{padding:8}}>{label(k)} <b>{data.totals[k]}</b></span>)}</div>
 <p>Realized revenue: ${data.totals.realized_revenue.toLocaleString()} · Estimated pipeline (unverified): ${data.totals.estimated_pipeline.toLocaleString()}</p>
 <p>{data.definitions.qualified}</p><p>{data.definitions.sent}</p><p>{data.definitions.conversion}</p>
 <div className="oe-chips">{Object.entries(data.totals.conversions).map(([k,v])=><span key={k} style={{padding:8}}>{label(k)}: {v===null?'No denominator':`${v}%`}</span>)}</div>
 {['sources','categories'].map(kind=><section key={kind}><h3>{label(kind)}</h3><div style={{overflowX:'auto'}}><table><thead><tr>{['Name','Discovered','Qualified','Actionable','Sent','Replies','Wins','Stale','Missing contact'].map(x=><th key={x} style={{padding:8}}>{x}</th>)}</tr></thead><tbody>{data[kind].map(r=><tr key={r.name}><td>{r.name}</td>{['discovered','qualified','actionable','sent','reply','won','stale','missing_contact'].map(k=><td key={k} style={{padding:8}}>{r[k]}</td>)}</tr>)}</tbody></table></div></section>)}
 <h3>Bottlenecks</h3>{Object.entries(data.bottlenecks).map(([k,v])=><p key={k}>{k}: <b>{v}</b></p>)}
 <h3>Highest ranked next actions</h3>{data.priorities.slice(0,20).map(p=><article className="oe-row" key={p.id}><button onClick={()=>onOpen(p.id)}>#{p.id} · {p.title}</button><p>Rank {p.rank}/100 · {p.category} · {p.source}</p><p>{p.reasons.join(' · ')}</p><p>Next: {p.next_action}</p></article>)}
 <h3>Follow-ups requiring review</h3>{data.followups.length?data.followups.map(p=><button key={p.id} onClick={()=>onOpen(p.id)}>Review overdue follow-up #{p.id}</button>):<p>No overdue follow-up timestamps recorded.</p>}
 <small>Evidence snapshot {new Date(data.as_of).toLocaleString()}. Ranking does not authorize sending or submission.</small>
 </>}</details>
}
