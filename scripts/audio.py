"""Original synthesized PARTY HUB cues. No external samples."""
from pathlib import Path
import math,struct,wave
tgt=Path(__file__).resolve().parents[1]/'web/public/sound';tgt.mkdir(exist_ok=True)
cues={'tap':[450],'join':[392,523],'start':[330,392,523],'count':[420],'right':[523,659,784],'timeout':[349,277],'win':[523,659,784,1047],'unlock':[660,880,990],'wheel':[294,330,370,392,440,523],'notice':[589,660],'music':[262,0,330,392,0,330,294,0,247,0,294,370,0,294,247,0]}
for name,notes in cues.items():
 rate=16000;step=.37 if name=='music' else .082
 frames=bytearray()
 for f in notes:
  for i in range(int(rate*step)):
   t=i/rate;e=min(1,t/.008)*max(0,1-t/step)**1.8
   y=0 if not f else (math.sin(2*math.pi*f*t)+.14*math.sin(4*math.pi*f*t))*e
   frames+=struct.pack('<h',int(y*9000))
 with wave.open(str(tgt/(name+'.wav')),'wb') as out:out.setparams((1,2,rate,0,'NONE',''));out.writeframes(frames)
