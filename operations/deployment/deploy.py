"""Backed-up, hash-guarded additive deployment. Never invokes a social publisher."""
from pathlib import Path
import hashlib,json,shutil,subprocess,datetime,os
stage=Path(__file__).resolve().parents[1]
manifest=json.loads((stage/'deployment/manifest.json').read_text())
backup=Path('/var/backups/imali-threads-funnel-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'));backup.mkdir(mode=0o700)
for row in manifest:
 target=Path(row['target']);expected=row['before']
 actual=hashlib.sha256(target.read_bytes()).hexdigest() if target.exists() else None
 if actual!=expected:raise RuntimeError('PRODUCTION_CHANGED: '+str(target))
for row in manifest:
 target=Path(row['target'])
 if target.exists():
  dest=backup/target.relative_to('/');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,dest)
(backup/'manifest.json').write_text(json.dumps(manifest,indent=2))
protected={}
modified={row['target'] for row in manifest}
for p in list(Path('/home/opc/imali-work-agent').glob('*.py'))+[Path('/home/opc/imali-sniper/user-api.js'),Path('/home/opc/imali-sniper/marketing/instagram-worker.js'),Path('/home/opc/imali-sniper/social/facebook-jobs.js'),Path('/home/opc/imali-sniper/social/facebook-service.js')]:
 if str(p) not in modified:protected[str(p)]=hashlib.sha256(p.read_bytes()).hexdigest()
(backup/'protected.json').write_text(json.dumps(protected,indent=2))
# Transactional additive migration before new code loads.
subprocess.run(['sudo','-u','postgres','psql','-X','-v','ON_ERROR_STOP=1','-d','imali','-f',str(stage/'deployment/destinations.sql')],check=True,stdout=subprocess.DEVNULL)
for row in manifest:
 target=Path(row['target']);src=stage/row['source'];target.parent.mkdir(parents=True,exist_ok=True)
 if target.exists():
  stat=target.stat();target.write_bytes(src.read_bytes());os.chown(target,stat.st_uid,stat.st_gid)
 else:
  shutil.copy2(src,target);os.chown(target,0 if str(target).startswith('/etc/') else 1000,0 if str(target).startswith('/etc/') else 1000)
# Only the Threads-specific controlled-test gate is added; existing flags are preserved.
config=Path('/etc/imali-social/config.json');dest=backup/'etc/imali-social/config.json';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(config,dest)
c=json.loads(config.read_text());c['threads_manual_test_enabled']=True;config.write_text(json.dumps(c,indent=2)+'\n')
subprocess.run(['restorecon']+[row['target'] for row in manifest],check=True)
subprocess.run(['systemctl','daemon-reload'],check=True)
# Timer is installed but deliberately not enabled before destination OAuth/test evidence.
subprocess.run(['systemctl','restart','user-api.service'],check=True)
print(json.dumps({'backup':str(backup),'files':len(manifest),'threads_timer_enabled':False,'external_publish_calls':0}))
