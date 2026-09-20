"""Slow-lane discovery adapter: one existing source, bounded fetches and new records only."""
import os,sys,time
import requests
from opportunity_store import db
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
sources=[fetch_remotive,fetch_sam_gov,fetch_remoteok_jobs]
source=sources[int(sys.argv[1])%len(sources)]
conn=db();cur=conn.cursor();saved=0
for row in source():
    if saved>=25:break
    if not row.get('source_id') or not row.get('source') or not row.get('title'):continue
    cur.execute('SELECT 1 FROM developer_opportunities WHERE source=%s AND source_id=%s',(row['source'],str(row['source_id'])))
    if cur.fetchone():continue
    save_opportunity(process_opportunity(row));saved+=1
conn.close();print('Bounded discovery:',source.__name__,'new_records=',saved,'requests=',calls[0])
