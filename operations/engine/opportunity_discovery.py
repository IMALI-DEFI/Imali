"""Slow-lane discovery adapter: one existing source, bounded fetches and new records only."""
import os,sys,time
import requests
from opportunity_store import db,snapshot
from opportunity_research_engine import public_url
original=requests.get;calls=[0]
def bounded(url,**kwargs):
    public_url(url);calls[0]+=1
    if calls[0]>6:raise RuntimeError('Discovery network budget reached')
    kwargs.update(timeout=8,stream=True,allow_redirects=False)
    r=original(url,**kwargs)
    if 300<=r.status_code<400:r.close();raise RuntimeError('Discovery redirect requires source review')
    chunks=[];size=0
    for part in r.iter_content(65536):
        size+=len(part)
        if size>5_000_000:r.close();raise RuntimeError('Discovery response exceeds byte budget')
        chunks.append(part)
    r._content=b''.join(chunks);r._content_consumed=True;r.close();return r
requests.get=bounded
from sources.business_opportunities import fetch_remotive
from sources.remoteok import fetch_remoteok_jobs
from sources.sam_gov import fetch_sam_gov
from work_agent import process_opportunity,save_opportunity
from discovery_quality import reject_reason,choose_source
from opportunity_funnel import identity,evaluate
from collections import Counter
import json
sources={'business_remotive':fetch_remotive,'sam_gov':fetch_sam_gov,'remoteok':fetch_remoteok_jobs}
conn=db();cur=conn.cursor();saved=0
rows,contexts=snapshot(conn);seen={identity(d) for d in rows};source_name=choose_source(int(sys.argv[1]),rows,contexts,list(sources));source=sources[source_name]
skipped=Counter();candidates=[]
for row in source():
    if not row.get('source_id') or not row.get('source') or not row.get('title'):skipped['missing_identity']+=1;continue
    cur.execute('SELECT 1 FROM developer_opportunities WHERE source=%s AND source_id=%s',(row['source'],str(row['source_id'])))
    if cur.fetchone():skipped['duplicate']+=1;continue
    processed=process_opportunity(row);reason=reject_reason(row,processed,seen)
    if reason:skipped[reason]+=1;continue
    seen.add(identity(row));candidates.append(processed)
# Prioritize usable, verified evidence before saving within the existing 25-record budget.
candidates.sort(key=lambda d:evaluate(d)['rank'],reverse=True)
for processed in candidates[:25]:
    save_opportunity(processed);saved+=1
conn.close();print(json.dumps({'source':source_name,'new_records':saved,'requests':calls[0],'skipped':dict(skipped),'qualified_candidates':len(candidates),'external_actions':0}))
