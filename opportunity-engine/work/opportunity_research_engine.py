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
    from sam_notice_reader import read_notice
    is_sam=str(d.get('source','')).startswith('sam_gov')
    api=read_notice(d) if is_sam else None
    sam_rate_limited=False
    if is_sam and not api:
        try:
            from sources.sam_gov import rate_limit_active
            sam_rate_limited=rate_limit_active()
        except Exception:
            pass
    if api:
        final,text,links=api['url'],api['text'],api['links']
    else:
        final,text,links=fetch(url)
    if not official(final):return 'exhausted','Redirect left the official source',{'source_url':url,'redirect':final}
    if len(text)<1800:
        try:
            rendered_url,rendered_text,rendered_links=rendered_public_page(url)
            if official(rendered_url) and len(rendered_text)>len(text):final,text,links=rendered_url,rendered_text,rendered_links
        except PermissionError:return 'exhausted','Official document portal requires human verification',{'source_url':url,'blocker_type':'CAPTCHA'}
        except Exception:pass
    if is_sam and sam_rate_limited and len(text)<1800:
        return 'retry','SAM notice detail temporarily unavailable during API cooldown; retry scheduled',{'source_url':url,'temporary':'sam_api_cooldown'}
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
    # Follow a small, deduplicated set of official solicitation/document links.
    # This stays read-only and bounded while covering SOW/PWS/RFP/RFQ/amendment pages
    # that are not always exposed as a literal PDF URL.
    document_pattern=r'\.pdf|attachment|document|solicitation|statement.of.work|performance.work.statement|\bpws\b|\bsow\b|\brfp\b|\brfq\b|amendment|package'
    document_links=[]
    for candidate in list(official_attachments)+list(links):
        if not candidate or candidate in document_links:continue
        if candidate in official_attachments or (official(candidate) and re.search(document_pattern,candidate,re.I)):
            document_links.append(candidate)
        if len(document_links)>=5:break
    for link in document_links:
        try:
            dest,extra,extra_links=fetch(link)
            same_attachment_host=link in official_attachments and urlparse(dest).hostname==urlparse(link).hostname
            if official(dest) or same_attachment_host:
                text+='\n'+extra
                docs.append({'url':dest,'sha256':hashlib.sha256(extra.encode()).hexdigest(),'characters':len(extra)})
                # One shallow expansion only, still capped by the five-document budget.
                for child in extra_links:
                    if len(document_links)>=5:break
                    if child not in document_links and official(child) and re.search(document_pattern,child,re.I):
                        document_links.append(child)
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
    # Historical HN rows predate source_posted_at persistence. Backfill the
    # authoritative item timestamp before spending repeated target-resolution cycles.
    if d.get('source')=='hackernews' and not d.get('source_posted_at') and str(d.get('source_id') or '').isdigit():
        try:
            _,raw,_=fetch('https://hn.algolia.com/api/v1/items/'+str(d['source_id']))
            match=re.search(r'"created_at":"([^"]+)"',raw)
            created=match.group(1) if match else None
            posted=datetime.fromisoformat(created.replace('Z','+00:00')) if created else None
            if posted:
                age=(datetime.now(timezone.utc)-posted).days
                with conn.cursor() as cur:
                    cur.execute("UPDATE developer_opportunities SET source_posted_at=%s,pursuit_status=CASE WHEN %s>180 THEN 'excluded_stale' ELSE pursuit_status END WHERE id=%s",(posted,age,d['id']))
                conn.commit()
                if age>180:
                    return 'progress','Authoritative Hacker News timestamp marks historical posting stale',{'source_posted_at':posted.isoformat(),'age_days':age}
                d=dict(d);d['source_posted_at']=posted
        except Exception:
            pass
    description=str(d.get('description') or '')
    urls=re.findall(r"https?://[^\s<>\"')]+",description)

    # Contract-job feeds sometimes publish the authoritative application target
    # only inside the source description (for example: "Apply ... https://...").
    # Treat such a URL as evidence only when the source text explicitly labels it
    # as an application destination; never synthesize or infer a URL.
    explicit_apply_urls=[]
    for match in re.finditer(r'https?://[^\s<>"\')]+',description):
        candidate=match.group(0).rstrip('.,);]')
        context=description[max(0,match.start()-140):min(len(description),match.end()+80)]
        if re.search(r'\bapply\b|application|go here|job posting link',context,re.I):
            explicit_apply_urls.append(candidate)

    # Normalize a source-explicit schemeless application URL (for example
    # build.a.team/apply-ai) to HTTPS. The exact host/path must appear in the
    # source evidence next to application language; this is normalization only.
    for match in re.finditer(r"\b(?:[a-z0-9-]+\.)+[a-z]{2,}/[^\s<>\"')]+",description,re.I):
        prefix=description[max(0,match.start()-8):match.start()]
        if prefix.endswith('://'):
            continue
        candidate='https://'+match.group(0).rstrip('.,);]')
        context=description[max(0,match.start()-140):min(len(description),match.end()+80)]
        if re.search(r'\bapply\b|application|go here|job posting link',context,re.I):
            explicit_apply_urls.append(candidate)

    # Contract feeds can provide an exact application destination in the source
    # prose. Resolve that evidence before stale stored URLs so a previously saved
    # homepage/contact page cannot mask the authoritative apply link.
    if str(d.get('source') or '')=='business_contract_remotive' and explicit_apply_urls:
        identity=company_identity(d.get('company'),description)
        def _same_registrable(a,b):
            ah=(urlparse(a).hostname or '').lower().lstrip('www.')
            bh=(urlparse(b).hostname or '').lower().lstrip('www.')
            return bool(ah and bh and '.'.join(ah.split('.')[-2:])=='.'.join(bh.split('.')[-2:]))
        def _application_landing(u):
            parsed=urlparse(u);host=(parsed.hostname or '').lower();path=parsed.path.lower()
            return (not bad_host(host)) and bool(re.search(r'/(?:apply(?:[-/]|$)|join(?:/|$)|register(?:/|$)|registration(?:/|$)|signup(?:/|$)|application(?:/|$))',path,re.I))
        for source_apply in list(dict.fromkeys(explicit_apply_urls))[:3]:
            try:
                final,text,links=fetch(source_apply)
            except Exception:
                continue
            h=host_of(final);source_h=host_of(source_apply)
            if bad_host(h) or bad_host(source_h) or not _same_registrable(source_apply,final):
                continue
            if _application_landing(final):
                reason='Source-explicit public application destination verified after same-company redirect'
                with conn.cursor() as cur:
                    cur.execute("UPDATE developer_opportunities SET application_url=%s,target_quality_status='verified',target_quality_reason=%s,target_quality_checked_at=now() WHERE id=%s",(final,reason,d['id']))
                conn.commit()
                return 'progress','Source-explicit application destination verified; eligibility/package verification follows',{'source_apply':source_apply,'target':final,'target_kind':'source-explicit application page'}
            # Some explicit apply links now redirect to the company homepage.
            # Follow only a same-site application/join/register link exposed by
            # that verified company page.
            if identity_matches(identity,h,text):
                for link in links[:30]:
                    if not _same_registrable(final,link) or not _application_landing(link):
                        continue
                    try:
                        candidate,body,_=fetch(link)
                    except Exception:
                        continue
                    if not _same_registrable(final,candidate) or not _application_landing(candidate):
                        continue
                    if not re.search(r'apply|application|register|create (?:an )?account|join',body,re.I):
                        continue
                    reason='Source-explicit application route verified through same-company application page'
                    with conn.cursor() as cur:
                        cur.execute("UPDATE developer_opportunities SET application_url=%s,target_quality_status='verified',target_quality_reason=%s,target_quality_checked_at=now() WHERE id=%s",(candidate,reason,d['id']))
                    conn.commit()
                    return 'progress','Verified company application route found from source-explicit apply evidence; eligibility/package verification follows',{'source_apply':source_apply,'target':candidate,'target_kind':'verified company application page'}

    urls=[d.get('contact_url'),d.get('application_url')]+explicit_apply_urls+urls+[d.get('url')]
    urls=list(dict.fromkeys(u.rstrip('.,);]') for u in urls if u))[:6]
    seen=[]
    stale_explicit_targets=[]
    persisted_explicit_target=None
    if str(d.get('source') or '')=='business_contract_remotive':
        candidate=str(d.get('application_url') or '')
        source_url=str(d.get('url') or '')
        if candidate and candidate!=source_url and not (urlparse(candidate).hostname or '').lower().endswith('remotive.com'):
            persisted_explicit_target=candidate
    for url in urls:
        try:
            final,text,links=fetch(url);seen.append(final)
            if d.get('revenue_path')=='employment' or str(d.get('source') or '')=='business_contract_remotive':
                # Contract aggregators may inject the employer/apply link client-side.
                # One bounded rendered read can enrich links, but exact-role corroboration
                # below is still required before accepting any destination.
                if str(d.get('source') or '')=='business_contract_remotive' and (urlparse(final).hostname or '').lower().endswith('remotive.com'):
                    try:
                        rendered_url,rendered_text,rendered_links=rendered_public_page(url)
                        if rendered_url:
                            links=list(dict.fromkeys(list(links)+list(rendered_links)))
                    except Exception:
                        pass
                from company_job_resolver import normalize
                def matches_role(body):
                    normalized=normalize(body)
                    company=normalize(d.get('company'));title=normalize(d.get('title'))
                    return bool(company and title) and company in normalized and title in normalized
                ats_hosts=('greenhouse.io','lever.co','ashbyhq.com','workable.com','myworkdayjobs.com','applytojob.com','kula.ai')
                def is_ats(u):
                    parsed=urlparse(u);host=(parsed.hostname or '').lower()
                    return any(host==h or host.endswith('.'+h) for h in ats_hosts) and len(parsed.path.strip('/').split('/'))>=2
                def is_employer_career(u):
                    parsed=urlparse(u);host=(parsed.hostname or '').lower();path=parsed.path.lower()
                    return (not bad_host(host)) and bool(re.search(r'/jobs?(/|$)|/careers?(/|$)|/positions?(/|$)|/apply(/|$)|jobid=|job_id=',path+'?'+parsed.query,re.I))
                def is_application_landing(u):
                    parsed=urlparse(u);host=(parsed.hostname or '').lower();path=parsed.path.lower()
                    return (not bad_host(host)) and bool(re.search(r'/(?:apply(?:[-/]|$)|join(?:/|$)|register(?:/|$)|registration(?:/|$)|signup(?:/|$)|application(?:/|$))',path,re.I))
                def same_site(a,b):
                    ah=(urlparse(a).hostname or '').lower().lstrip('www.')
                    bh=(urlparse(b).hostname or '').lower().lstrip('www.')
                    ar='.'.join(ah.split('.')[-2:]);br='.'.join(bh.split('.')[-2:])
                    return bool(ar and br and ar==br)
                def is_role_specific_external(u):
                    # Aggregator pages can expose a direct external posting that is not on a
                    # conventional ATS. Accept it only when the URL itself is role-specific;
                    # the destination body must still corroborate exact company + title below.
                    parsed=urlparse(u);host=(parsed.hostname or '').lower()
                    if bad_host(host) or host.endswith('remotive.com'):return False
                    path=normalize((parsed.path or '').replace('-',' ').replace('_',' '))
                    title_tokens=[x for x in normalize(d.get('title')).split() if len(x)>=5 and x not in {'senior','software','engineer','developer','independent','remote'}]
                    if not title_tokens:return False
                    hits=sum(1 for token in title_tokens if token in path)
                    return hits>=2 or (len(title_tokens)==1 and hits==1)
                source_role_verified=matches_role(text)
                identity=company_identity(d.get('company'),description)
                company_page_verified=(not bad_host(host_of(final)) and identity_matches(identity,host_of(final),text))
                verified_target=final if (is_ats(final) or is_employer_career(final)) and source_role_verified else None
                target_kind='ATS' if verified_target and is_ats(verified_target) else 'employer career page' if verified_target else None

                # For the contract feed, a source-explicit application URL can be
                # authoritative even when the destination is a generic application
                # landing page rather than an ATS role page. Require all of:
                # 1) the exact URL appeared next to application language in source text,
                # 2) the destination is public/fetchable, and
                # 3) company identity matches the destination host or body.
                if (not verified_target and str(d.get('source') or '')=='business_contract_remotive'
                        and url in explicit_apply_urls):
                    h=host_of(final)
                    source_h=host_of(url)
                    identity_ok=identity_matches(identity,h,text) or identity_matches(identity,source_h,'')
                    # A source-explicit application URL may redirect within the
                    # same registrable company domain (for example build.a.team/apply-ai
                    # -> a.team/join). The original URL is already evidenced verbatim
                    # next to application language, so a same-site public redirect to an
                    # application landing page is sufficient without re-inventing identity.
                    source_redirect_ok=(same_site(url,final) and is_application_landing(final))
                    if not bad_host(h) and not bad_host(source_h) and (identity_ok or source_redirect_ok) and is_application_landing(final):
                        verified_target=final
                        target_kind='source-explicit application page'
                    elif not bad_host(h) and not bad_host(source_h) and identity_ok:
                        # A stale source apply URL may redirect to the company homepage.
                        # Follow only a same-company application link exposed there.
                        for application_link in links[:30]:
                            if not is_application_landing(application_link) or not same_site(final,application_link):
                                continue
                            try:candidate,body,_=fetch(application_link)
                            except Exception:continue
                            ch=host_of(candidate)
                            if (not bad_host(ch) and is_application_landing(candidate)
                                    and same_site(final,candidate)
                                    and identity_matches(identity,ch,body)):
                                verified_target=candidate
                                target_kind='verified company application page'
                                break
                candidate_links=[u for u in links if is_ats(u) or is_employer_career(u)
                                 or (str(d.get('source') or '')=='business_contract_remotive' and source_role_verified and is_role_specific_external(u))
                                 or (str(d.get('source') or '')=='business_contract_remotive' and company_page_verified and same_site(final,u) and is_application_landing(u))][:10]
                for link in candidate_links:
                    if verified_target:break
                    try:candidate,body,_=fetch(link)
                    except Exception:continue
                    role_specific_ok=(is_ats(candidate) or is_employer_career(candidate) or is_role_specific_external(candidate)) and matches_role(body)
                    company_application_ok=(str(d.get('source') or '')=='business_contract_remotive'
                                            and company_page_verified and is_application_landing(candidate)
                                            and same_site(final,candidate))
                    if role_specific_ok or company_application_ok:
                        verified_target=candidate
                        if is_ats(candidate):target_kind='ATS'
                        elif company_application_ok:target_kind='verified company application page'
                        elif is_role_specific_external(candidate):target_kind='verified external role page'
                        else:target_kind='employer career page'
                if verified_target:
                    reason='Public '+target_kind+' corroborates exact company and role'
                    with conn.cursor() as cur:cur.execute("UPDATE developer_opportunities SET application_url=%s,target_quality_status='verified',target_quality_reason=%s,target_quality_checked_at=now() WHERE id=%s",(verified_target,reason,d['id']))
                    conn.commit();return 'progress','Public application page corroborates exact company and role; eligibility/package verification follows',{'source':final,'target':verified_target,'target_kind':target_kind}
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
        except HTTPError as exc:
            seen.append('HTTPError:'+str(exc.code))
            if (url in explicit_apply_urls or url==persisted_explicit_target) and exc.code in (404,410):
                stale_explicit_targets.append({'url':url,'status':exc.code})
        except Exception as exc:seen.append(type(exc).__name__)
    if stale_explicit_targets:
        return 'exhausted','Source-explicit application destination is no longer available',{'sources_checked':seen,'stale_application_targets':stale_explicit_targets}
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
