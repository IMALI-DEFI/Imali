import hashlib,json,os,shutil,subprocess,time
from pathlib import Path
stage=Path('/tmp/imali-admin-center-20260920'); app=Path('/home/opc/imali-sniper'); target=app/'social'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def protected():
 files=list(Path('/home/opc/imali-work-agent').glob('*.py'))+list(Path('/home/opc/imali-work-agent').glob('*.sh'))+list(Path('/etc/systemd/system').glob('imali-opportunity-*'))
 files += [app/'routes/opportunity-engine.js',app/'routes/admin-work-agent.js',app/'trading-executor-service.js',app/'user-api.js',target/'facebook-jobs.js',target/'instagram-jobs.js',target/'facebook-service.js',target/'campaign-review.js']
 return {str(p):sha(p) for p in files if p.is_file()}
expected=json.loads((stage/'deployment/manifest.json').read_text())
assert sha(target/'connections.js')==expected['connections_baseline'],'Production social router changed; review before installation.'
for name in ['center.js','connections.js']: subprocess.run(['node','--check',str(stage/'backend'/name)],check=True)
before=protected();backup=Path('/var/backups')/('imali-admin-center-'+time.strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
for name in ['center.js','connections.js']:
 if (target/name).exists():shutil.copy2(target/name,backup/name)
(backup/'protected.json').write_text(json.dumps(before,indent=2))
subprocess.run(['sudo','-n','-u','postgres','psql','-X','-v','ON_ERROR_STOP=1','-d','imali','-f',str(stage/'migrations/001-manual-platforms.sql')],check=True)
for name in ['center.js','connections.js']:
 tmp=target/(name+'.admin-center-new');shutil.copy2(stage/'backend'/name,tmp);os.chown(tmp,1000,1000);os.chmod(tmp,0o644);os.replace(tmp,target/name)
assert before==protected(),'Protected source changed during installation.'
subprocess.run(['systemctl','restart','user-api.service'],check=True)
assert before==protected()
print(json.dumps({'backup':str(backup),'protected_files':len(before),'protected_files_unchanged':True,'installed':['social/center.js','social/connections.js'],'restarted':['user-api.service'],'schema':'manual platform names added to existing social connections constraint','opportunity_timers':'unchanged','trading_services':'not restarted'}))
