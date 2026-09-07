"""Prepare field-recording excerpts; no synthetic sound sources are generated.
Inputs are mono filtered PCM recordings in /private/tmp, as documented in AUDIO-LICENSES.md.
"""
import wave,array,math,json
from pathlib import Path
out=Path(__file__).resolve().parents[1]/'public/audio'
def read(path):
 with wave.open(str(path)) as w:
  assert w.getsampwidth()==2 and w.getnchannels()==1
  return [v/32768 for v in array.array('h',w.readframes(w.getnframes()))],w.getframerate()
def write(name,x,rate):
 peak=max(abs(v) for v in x) or 1
 data=array.array('h',(round(max(-1,min(1,v/peak*.5))*32767) for v in x))
 with wave.open(str(out/name),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(data.tobytes())
source='https://commons.wikimedia.org/wiki/File:Стук_колёс_поезда.ogg'
x,rate=read('/private/tmp/train-impacts-filtered.wav')
# Detect isolated energy peaks; each sample is a short real recording excerpt.
block=240
energies=[sum(v*v for v in x[i:i+block])/block for i in range(0,len(x),block)]
peaks=[]
for i in sorted(range(5,len(energies)-40),key=lambda i:energies[i],reverse=True):
 if all(abs(i-j)>100 for j in peaks):peaks.append(i)
 if len(peaks)==8:break
samples=[]
for n,i in enumerate(sorted(peaks)):
 start=max(0,i*block-480);clip=x[start:start+7680]
 for j in range(len(clip)):
  clip[j]*=min(1,j/96,(len(clip)-1-j)/1800)
 name=f'joint-{n+1}.wav';write(name,clip,rate)
 samples.append(dict(id=f'joint-{n+1}',kind='joint',url=name,source=source,license='CC0-1.0',author='Ural-66',onset=.01,gain=.75,sourceOffsetSeconds=60+start/rate,description='160 ms filtered excerpt of real in-wagon wheel impact; includes carriage resonance'))
for kind,filename,source,license,author,offset in [
 ('rolling','train-rolling-filtered.wav','https://commons.wikimedia.org/wiki/File:Complete_train_ride_4_minutes.ogg','Public domain','stephan',98),
 ('traction','train-traction-filtered.wav','https://commons.wikimedia.org/wiki/File:E233-3000Accelerate.ogg','CC0-1.0','E217',9),
 ('brake','train-brake-filtered.wav','https://commons.wikimedia.org/wiki/File:E231Deceleration.ogg','CC0-1.0','E217',10)]:
 x,rate=read('/private/tmp/'+filename);fade=int(.15*rate)
 loop=x[fade:-fade]+[x[-fade+i]*math.cos(i/(fade-1)*math.pi/2)+x[i]*math.sin(i/(fade-1)*math.pi/2) for i in range(fade)]
 name=kind+'.wav';write(name,loop,rate)
 samples.append(dict(id=kind,kind=kind,url=name,source=source,license=license,author=author,onset=0,gain=1,loopStart=0,loopEnd=len(loop)/rate,sourceOffsetSeconds=offset,description='Filtered mono field-recording excerpt with a 150 ms equal-power seam crossfade'))
manifest=dict(name='Field recordings · starter pack',description='Real recorded impacts, rumble and electric traction. Mixed train sources; not a Ukrainian vehicle sound model. One rolling bed, not independently recorded speed bands. Brake layer is recorded electric deceleration; pneumatic brake hiss is not included.',samples=samples)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'{len(samples)} recorded sample assets prepared')
