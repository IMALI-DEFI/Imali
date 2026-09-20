"""Bounded evidence-only research and preparation; no outbound writes or generated domains."""
import os,re,json,html,socket,ipaddress,subprocess,tempfile,hashlib
from pathlib import Path
from urllib.parse import urlparse,urljoin
from urllib.request import Request,build_opener,HTTPRedirectHandler
from urllib.error import HTTPError
from datetime import datetime,timezone
from psycopg2.extras import Json,RealDictCursor

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

def public_url(url):
    p=urlparse(url)
    if p.scheme not in ('https','http') or not p.hostname or p.username or p.password or p.port not in (None,80,443):raise ValueError('Not a public HTTP destination')
    addresses=socket.getaddrinfo(p.hostname,p.port or (443 if p.scheme=='https' else 80),type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):raise ValueError('Private or reserved network destination')
    return p

def fetch(url):
    opener=build_opener(NoRedirect)
    for _ in range(4):
        public_url(url)
        try:
            response=opener.open(Request(url,headers={'User-Agent':'IMALI-Opportunity-Research/1.0'}),timeout=7)
        except HTTPError as e:
            if e.code in (301,302,303,307,308):url=urljoin(url,e.headers.get('Location',''));continue
            raise
        with response:
            data=response.read(1_500_001)
            if len(data)>1_500_000:raise ValueError('Document exceeds safe 1.5MB retrieval limit')
            kind=response.headers.get('Content-Type','')
            if 'pdf' in kind or data.startswith(b'%PDF'):
                with tempfile.TemporaryDirectory(prefix='imali-doc-') as tmp:
                    f=Path(tmp)/'source.pdf';f.write_bytes(data)
                    import shutil
                    if shutil.which('pdftotext'):
                        r=subprocess.run(['pdftotext','-layout',str(f),'-'],capture_output=True,text=True,timeout=12,check=True)
                        content=r.stdout
                    else:
                        from pypdf import PdfReader
                        content='\n'.join(p.extract_text() or '' for p in list(PdfReader(str(f)).pages)[:30])
                    return url,content[:250000],[]
            raw=data.decode('utf-8',errors='replace')
            links=[urljoin(url,html.unescape(a)) for a in re.findall(r'href=[\"\']([^\"\']+)',raw,re.I)][:80]
            raw=re.sub(r'<(script|style)\b[^>]*>.*?</\1>',' ',raw,flags=re.I|re.S)
            text=html.unescape(re.sub('<[^>]+>','\n',raw))
            return url,re.sub(r'[ \t]+',' ',text),links
    raise ValueError('Too many redirects')

def rendered_public_page(url):
    """One bounded public browser read for a JavaScript portal; no interactions or challenge bypass."""
    from playwright.sync_api import sync_playwright
    public_url(url)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        page=browser.new_page();requests=[0]
        def guard(route):
            requests[0]+=1
            if requests[0]>25 or route.request.resource_type in ('image','media','font'):route.abort();return
            try:public_url(route.request.url)
            except Exception:route.abort();return
            route.continue_()
        page.route('**/*',guard)
        try:
            page.goto(url,wait_until='domcontentloaded',timeout=12000)
            try:page.wait_for_load_state('networkidle',timeout=4000)
            except Exception:pass
            text=page.locator('body').inner_text(timeout=2000)[:200000]
            links=page.locator('a[href]').evaluate_all('(nodes)=>nodes.slice(0,80).map(a=>a.href)')
            final=page.url
        finally:browser.close()
    if re.search(r'verify you are human|complete the captcha|access denied',text,re.I):raise PermissionError('Official portal requires human verification')
    return final,text,links

def official(url):
    h=(urlparse(url).hostname or '').lower()
    return h.endswith('.gov') or h.endswith('.mil')

def procurement(conn,d):
    url=d.get('url');public_url(url)
    if not official(url):return 'exhausted','Official government source has not been authenticated',{'source_url':url}
    final,text,links=fetch(url)
    if not official(final):return 'exhausted','Redirect left the official source',{'source_url':url,'redirect':final}
    if len(text)<1800:
        try:
            rendered_url,rendered_text,rendered_links=rendered_public_page(url)
            if official(rendered_url) and len(rendered_text)>len(text):final,text,links=rendered_url,rendered_text,rendered_links
        except PermissionError:return 'exhausted','Official document portal requires human verification',{'source_url':url,'blocker_type':'CAPTCHA'}
        except Exception:pass
    docs=[{'url':final,'sha256':hashlib.sha256(text.encode()).hexdigest(),'characters':len(text)}]
    # Reuse official attachment URLs retained by the existing discovery cache.
    official_attachments=[]
    cache=Path('/home/opc/imali-work-agent/sam_opportunities_cache.json')
    if cache.exists() and cache.stat().st_size<20_000_000:
        try:
            cached=json.loads(cache.read_text())
            entries=cached.get('opportunities',cached.get('results',cached.get('data',[]))) if isinstance(cached,dict) else cached
            if isinstance(entries,dict):entries=list(entries.values())
            for item in entries:
                if isinstance(item,dict) and (str(item.get('source_id'))==str(d.get('source_id')) or item.get('url')==url):
                    official_attachments.extend(item.get('resource_links') or [])
                    links.extend(official_attachments)
                    if item.get('additional_info_link'):links.append(item['additional_info_link'])
        except (ValueError,TypeError):pass
    for link in [x for x in links if (official(x) and re.search(r'\.pdf|attachment|document|solicitation',x,re.I)) or x in official_attachments][:2]:
        try:
            dest,extra,_=fetch(link)
            if official(dest) or (link in official_attachments and urlparse(dest).hostname==urlparse(link).hostname):text+='\n'+extra;docs.append({'url':dest,'sha256':hashlib.sha256(extra.encode()).hexdigest(),'characters':len(extra)})
        except Exception:continue
    lines=[x.strip() for x in text.splitlines() if len(x.strip())>20]
    keys={'scope':r'\bscope\b|statement of work|performance work statement', 'eligibility':r'eligible|eligibility|set.aside|citizen|clearance',
          'required_registrations':r'registrat|sam\.gov|unique entity|\buei\b', 'submission_method':r'submit|submission|offers? (?:to|via)|proposals? (?:to|via)',
          'required_documents':r'shall|must|required|attachment', 'evaluation_criteria':r'evaluat|award criteria',
          'delivery_requirements':r'delivery|performance|shall perform', 'deadline':r'deadline|due date|closing date|offers? due',
          'value':r'estimated value|contract value|\$[0-9]', 'set_aside':r'set.aside', 'solicitation_number':r'solicitation (?:number|no\.)'}
    requirements={k:[line[:1800] for line in lines if re.search(pattern,line,re.I)][:30] for k,pattern in keys.items()}
    requirements.update(agency=d.get('company'),title=d.get('title'),solicitation_number_metadata=d.get('solicitation_number'),deadline_metadata=str(d.get('solicitation_due_at') or d.get('procurement_deadline') or ''),source_url=final)
    # A portal shell or announcement blurb cannot become a verified solicitation.
    enough=len(text)>1800 and bool(requirements['scope']) and bool(requirements['required_documents']) and bool(requirements['submission_method'])
    with conn.cursor() as cur:
        cur.execute('''INSERT INTO opportunity_research(opportunity_id,official_url,official_verified,documents,requirements,scope_retrieved,verified_at)
         VALUES(%s,%s,true,%s,%s,%s,now()) ON CONFLICT(opportunity_id) DO UPDATE SET official_url=EXCLUDED.official_url,official_verified=true,documents=EXCLUDED.documents,requirements=EXCLUDED.requirements,scope_retrieved=EXCLUDED.scope_retrieved,verified_at=now(),updated_at=now()''',(d['id'],final,Json(docs),Json(requirements),enough))
        if enough:
            cur.execute("UPDATE developer_opportunities SET scope_text=%s,scope_source=%s,scope_status='verified',scope_verified_at=now() WHERE id=%s",(text[:200000],final,d['id']))
    conn.commit()
    return ('progress' if enough else 'exhausted'),('Official requirements retrieved; eligibility needs confirmation' if enough else 'Public page did not expose complete official scope and submission requirements; documents or authenticated access required'),{'documents':docs}

def target(conn,d,alternative=False):
    # Candidates must already exist verbatim in source evidence. Never synthesize domains/emails.
    from company_domain_discovery import bad_host,host_of,company_identity,identity_matches
    urls=re.findall(r'https?://[^\s<>"\')]+',str(d.get('description') or ''))
    urls=[d.get('contact_url'),d.get('application_url')]+urls+[d.get('url')]
    urls=list(dict.fromkeys(u.rstrip('.,);]') for u in urls if u))[:3]
    seen=[]
    for url in urls:
        try:
            final,text,links=fetch(url);seen.append(final)
            if d.get('revenue_path')=='employment':
                from company_job_resolver import normalize
                def matches_role(body):
                    normalized=normalize(body)
                    company=normalize(d.get('company'));title=normalize(d.get('title'))
                    return bool(company and title) and company in normalized and title in normalized
                ats_hosts=('greenhouse.io','lever.co','ashbyhq.com','workable.com')
                def is_ats(u):
                    parsed=urlparse(u);host=parsed.hostname or ''
                    return any(host==h or host.endswith('.'+h) for h in ats_hosts) and len(parsed.path.strip('/').split('/'))>=2
                verified_target=final if is_ats(final) and matches_role(text) else None
                for link in [u for u in links if is_ats(u)][:2]:
                    if verified_target:break
                    candidate,body,_=fetch(link)
                    if is_ats(candidate) and matches_role(body):verified_target=candidate
                if verified_target:
                    with conn.cursor() as cur:cur.execute("UPDATE developer_opportunities SET application_url=%s,target_quality_status='verified',target_quality_reason='Public ATS page corroborates exact company and role',target_quality_checked_at=now() WHERE id=%s",(verified_target,d['id']))
                    conn.commit();return 'progress','Public application page corroborates company and role; eligibility/package verification follows',{'source':final,'target':verified_target}
                continue
            h=host_of(final)
            if bad_host(h):
                # Follow up to two explicit source links with an identifiable company hostname.
                for link in links:
                    lh=host_of(link)
                    if not bad_host(lh) and lh!=h and len(urls)<5:urls.append(link)
                continue
            identity=company_identity(d.get('company'),d.get('description'))
            if not identity_matches(identity,h,text):continue
            if alternative:
                forms=[u for u in links if host_of(u)==h and re.search(r'contact|sales|inquir',u,re.I)]
                return 'exhausted',('Official contact form found; review and authorize a manual contact separately' if forms else 'Official source research exhausted; no verified email or alternate contact route'),{'official_url':final,'alternative_contact_urls':forms[:3]}
            with conn.cursor() as cur:cur.execute('UPDATE developer_opportunities SET contact_url=%s WHERE id=%s',(final,d['id']))
            conn.commit();return 'progress','Official company source corroborates identity',{'official_url':final,'source_candidates':seen}
        except Exception as exc:seen.append(type(exc).__name__)
    return 'retry','No verified official target in accessible source evidence',{'sources_checked':seen}

def providers(conn,d,verify=False):
    cur=conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('''SELECT oc.*,s.company,s.website,s.email,s.verification_status,s.service_verification_source,s.capacity_status,s.insured,s.license_verified
      FROM opportunity_contractors oc JOIN service_contractors s ON s.id=oc.contractor_id WHERE oc.opportunity_id=%s ORDER BY oc.match_score DESC LIMIT 10''',(d['id'],))
    candidates=cur.fetchall()
    # Reuse provider inventory only with non-placeholder evidence; never assign or hire.
    cur.execute("SELECT * FROM work_providers WHERE status='active' AND availability<>'unavailable' LIMIT 50")
    software=cur.fetchall();found=0
    for p in candidates:
        if 'example.' in str(p.get('website') or '') or '@example.' in str(p.get('email') or ''):continue
        evidence={k:p.get(k) for k in ['service_match','geography_match','insurance_match','license_match','capacity_match','service_verification_source','verification_status']}
        verified=all(p.get(k) is True for k in ['service_match','geography_match','insurance_match','license_match','capacity_match']) and bool(p.get('service_verification_source'))
        if verify:
            try:
                u,t,_=fetch(p['website']);evidence.update(public_website=u,public_text_excerpt=t[:2500])
            except Exception as e:evidence['fetch_error']=type(e).__name__
        cur.execute('''INSERT INTO opportunity_provider_candidates(opportunity_id,source_table,source_id,name,website,evidence,verification_status,economics)
        VALUES(%s,'service_contractors',%s,%s,%s,%s,%s,%s) ON CONFLICT(opportunity_id,source_table,source_id) DO UPDATE SET evidence=EXCLUDED.evidence,verification_status=EXCLUDED.verification_status,updated_at=now()''',
        (d['id'],p['contractor_id'],p['company'],p['website'],Json(evidence),'verified' if verified else 'unverified',Json({'estimated_client_value':str(d.get('estimated_revenue') or ''),'actual_quote':None,'margin_verified':False})))
        found+=1
    for p in software:
        if not p.get('email') or re.search(r'@(example\.|test\.|localhost)',p['email']):continue
        overlap=set(map(str.lower,d.get('matched_skills') or []))&set(map(str.lower,p.get('skills') or []))
        if not overlap:continue
        cur.execute('''INSERT INTO opportunity_provider_candidates(opportunity_id,source_table,source_id,name,evidence,economics) VALUES(%s,'work_providers',%s,%s,%s,%s) ON CONFLICT DO NOTHING''',
        (d['id'],p['id'],p['name'],Json({'matched_skills':list(overlap),'provider_notes':p.get('notes'),'verification_required':True}),Json({'hourly_rate':str(p.get('hourly_rate') or ''),'hours':None,'margin_verified':False})))
        found+=1
    conn.commit()
    if verify:return 'exhausted','Public provider research complete; capacity, quote, insurance or license confirmation needs authorized external evidence',{'candidates':found}
    return ('progress' if found else 'exhausted'),('Existing contractor/provider sources matched' if found else 'No evidenced provider in connected inventories; provider source or credentials required'),{'candidates':found}

def package(conn,d):
    cur=conn.cursor(cursor_factory=RealDictCursor);cur.execute('SELECT * FROM opportunity_research WHERE opportunity_id=%s',(d['id'],));r=cur.fetchone()
    if not r or not r['scope_retrieved'] or not r['eligibility_verified']:return 'exhausted','Verified official scope and eligibility required',{}
    root=Path('/home/opc/imali-work-agent/procurement_packages')/str(d['id']);root.mkdir(parents=True,exist_ok=True)
    path=root/'official-package.json';path.write_text(json.dumps({'opportunity':dict(d),'official_research':dict(r),'status':'DRAFT — human review and explicit submission authorization required'},default=str,indent=2))
    cur.execute('UPDATE opportunity_research SET package_path=%s,updated_at=now() WHERE opportunity_id=%s',(str(path),d['id']));conn.commit()
    return 'progress','Draft evidence package assembled; required business documents and response completeness still need evidence',{'package_path':str(path),'final_readiness':False}
