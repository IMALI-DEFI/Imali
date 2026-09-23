import React,{useCallback,useEffect,useState} from 'react';
import {apiFetch} from '../../context/AuthContext';

const API='/api/admin/social/automation';

const title=x=>({
  imali:'IMALI',
  sportsjedi:'Sports Jedi',
  stock:'Stock',
  crypto:'Crypto',
  nfl:'NFL',
  cfb:'College Football',
  instagram:'Instagram',
  facebook:'Facebook'
}[x]||x);

export default function SocialAutomationPanel(){
  const [data,setData]=useState(null);
  const [drafts,setDrafts]=useState({});
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const load=useCallback(async()=>{
    try{
      const r=await apiFetch(API);
      setData(r);
      const next={};
      for(const row of r.settings||[]){
        const key=`${row.brand}:${row.content_type}:${row.platform}`;
        next[key]={
          ...row,
          posting_windows:Array.isArray(row.posting_windows)
            ? row.posting_windows.join(', ')
            : ''
        };
      }
      setDrafts(next);
      setError('');
    }catch(e){
      setError(e.message||'Unable to load automation settings.');
    }
  },[]);

  useEffect(()=>{load();},[load]);

  const change=(key,field,value)=>{
    setDrafts(old=>({
      ...old,
      [key]:{...old[key],[field]:value}
    }));
  };

  const save=async(key)=>{
    const row=drafts[key];
    if(!row)return;

    const windows=String(row.posting_windows||'')
      .split(',')
      .map(x=>x.trim())
      .filter(Boolean);

    setBusy(key);
    setError('');
    setNotice('');

    try{
      await apiFetch(`${API}/settings`,{
        method:'PUT',
        body:JSON.stringify({
          brand:row.brand,
          content_type:row.content_type,
          platform:row.platform,
          enabled:Boolean(row.enabled),
          posts_per_day:Number(row.posts_per_day),
          timezone:'America/New_York',
          posting_windows:windows,
          require_qualified_signal:Boolean(row.require_qualified_signal)
        })
      });

      setNotice(
        `${title(row.brand)} ${title(row.content_type)} settings saved. `+
        'This does not start the scheduler or publish anything.'
      );
      await load();
    }catch(e){
      setError(e.message||'Unable to save automation settings.');
    }finally{
      setBusy('');
    }
  };

  const settings=Object.entries(drafts);

  return (
    <section className="sm-automation">
      <div className="sm-section-title">
        <div>
          <h2>Social Automation</h2>
          <p className="sm-muted">
            Configure planned posting frequency. Scheduler and automatic
            publishing remain disabled until separately activated.
          </p>
        </div>
        <button onClick={load}>Refresh automation</button>
      </div>

      <div className="sm-automation-state">
        <span>
          Scheduler: <b>{data?.scheduler_active?'ACTIVE':'OFF'}</b>
        </span>
        <span>
          Automatic publishing:{' '}
          <b>{data?.automatic_publishing?'ACTIVE':'OFF'}</b>
        </span>
      </div>

      {error&&<p className="sm-error" role="alert">{error}</p>}
      {notice&&<p className="sm-callout" role="status">{notice}</p>}

      {!data&&!error
        ? <p>Loading automation settings…</p>
        : !settings.length
          ? <div className="sm-empty">No automation settings configured.</div>
          : <div className="sm-automation-grid">
              {settings.map(([key,row])=>(
                <article className="sm-automation-card" key={key}>
                  <div className="sm-card-top">
                    <span>{title(row.brand)}</span>
                    <b>{title(row.platform)}</b>
                  </div>

                  <h3>{title(row.content_type)}</h3>

                  <label className="sm-automation-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(row.enabled)}
                      onChange={e=>change(key,'enabled',e.target.checked)}
                    />
                    Configuration enabled
                  </label>

                  <label>
                    Posts per day
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={row.posts_per_day}
                      onChange={e=>change(key,'posts_per_day',e.target.value)}
                    />
                  </label>

                  <label>
                    Posting windows — Eastern Time
                    <input
                      value={row.posting_windows}
                      onChange={e=>change(key,'posting_windows',e.target.value)}
                      placeholder="08:00, 10:00, 12:00"
                    />
                  </label>

                  <label className="sm-automation-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(row.require_qualified_signal)}
                      onChange={e=>change(
                        key,
                        'require_qualified_signal',
                        e.target.checked
                      )}
                    />
                    Require qualified signal
                  </label>

                  <button
                    className="sm-primary"
                    disabled={busy===key}
                    onClick={()=>save(key)}
                  >
                    {busy===key?'Saving…':'Save settings'}
                  </button>
                </article>
              ))}
            </div>
      }

      {data?.runs?.length>0&&(
        <details>
          <summary>Recent automation activity</summary>
          <div className="sm-automation-runs">
            {data.runs.slice(0,20).map(run=>(
              <p key={run.id}>
                <b>{title(run.brand)} · {title(run.content_type)}</b>
                {' — '}{run.status}
                {run.scheduled_for
                  ? ` · ${new Date(run.scheduled_for).toLocaleString()}`
                  : ''}
                {run.public_url&&(
                  <> · <a href={run.public_url}
                    target="_blank"
                    rel="noreferrer">View post ↗</a></>
                )}
              </p>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
