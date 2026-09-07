"""Derive an audio-only runtime index without editing the source railway."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[3]
source=root/'data/railway/kyiv-fastiv/objects.json'
objects=json.loads(source.read_text())
events=[{k:o[k] for k in ('id','type','position','side')} for o in objects if o['type'] in ('joint','weld')]
stations=[{k:o[k] for k in ('id','name','position')} for o in objects if o['type']=='station']
assert len(events)==5118 and len(stations)==8
assert len({o['id'] for o in events})==len(events)
assert all(a['position']<=b['position'] for a,b in zip(events,events[1:]))
assert stations[0]['position']==0 and stations[-1]['position']==64000
out=Path(__file__).resolve().parents[1]/'public/route.json'
out.write_text(json.dumps({'length':64000,'synthetic':True,'stations':stations,'events':events},separators=(',',':'))+'\n')
print(f'{len(events)} contact events, {len(stations)} stations, {out.stat().st_size:,} bytes')
