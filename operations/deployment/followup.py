from pathlib import Path
import hashlib,json,shutil,subprocess,datetime
stage=Path(__file__).resolve().parents[1];m=json.loads((stage/'deployment/followup-manifest.json').read_text());backup=Path('/var/backups/imali-threads-funnel-followup-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
for r in m:
 p=Path(r['target']);assert hashlib.sha256(p.read_bytes()).hexdigest()==r['before'],'PRODUCTION_CHANGED '+str(p)
for r in m:
 p=Path(r['target']);b=backup/p.relative_to('/');b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,b);p.write_bytes((stage/r['source']).read_bytes())
subprocess.run(['systemctl','restart','user-api.service'],check=True)
print(json.dumps({'backup':str(backup),'files':len(m),'external_posts':0}))
