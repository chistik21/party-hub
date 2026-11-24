"""Build the offline illustrated deck from original vector drawings."""
from pathlib import Path
from math import sin,cos,pi
root=Path(__file__).resolve().parents[1]/'web/public'
def path(d,fill='none',stroke='currentColor',sw=5):
 return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"/>'
def circle(x,y,r,c):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>'
def rect(x,y,w,h,r,c):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}"/>'
ink='#26332E';cream='#FFF6DE';coral='#FF775C';gold='#FFD154';blue='#6778E9';mint='#A6E3BA'
def eye(x,y):return circle(x,y,10,cream)+circle(x+2,y+1,4,ink)
def note(x,y,c):return f'<g transform="translate({x} {y})">'+path('M0 0v-31l22-6v30',stroke=c)+circle(-4,0,7,c)+circle(18,-7,7,c)+'</g>'
def star(x,y,r,c):
 pts=[(x+cos((i/5-.5)*pi)*r*(.45 if i%2 else 1),y+sin((i/5-.5)*pi)*r*(.45 if i%2 else 1)) for i in range(10)]
 return path('M'+' L'.join(f'{a:.1f} {b:.1f}' for a,b in pts)+'Z',c,ink,2)
spy=circle(160,97,36,cream)+path('M105 85h110l-22-8-10-36-31 9-15-6-12 31z',ink,ink)+path('M125 91l32 2 4 10 6-11 29-1-7 16-19 4-11-9-10 9-17-4z',blue,ink,3)+path('M126 122l37 16 33-18 22 32H108z',coral,ink)
mafia=rect(110,43,83,111,10,ink)+f'<g transform="rotate(15 167 98)">{rect(132,41,79,109,8,cream)}'+path('M168 68q-40 34-11 43l9-3-7 12h23l-9-12 10 3q28-10-15-43Z',ink,ink,1)+'</g>'
reaction=circle(147,98,49,cream)+circle(147,98,36,ink)+path('M155 61l-27 40h17l-7 30 30-47h-18z',gold,gold,2)+rect(136,31,22,13,3,coral)+path('M200 66l23-12m-18 36 28-2m-29 21 22 9',stroke=ink)
meme=path('M107 141l9-44-8-43 37 19q17-5 33 0l33-25-4 51 7 42z',gold,ink)+eye(140,98)+eye(176,98)+path('M151 114l8 6 8-6',ink,ink,3)+path('M112 113l-24-4m26 12-25 7m107-15 23-8m-21 17 24 4',stroke=ink,sw=3)
quiz=rect(102,76,117,51,14,ink)+path('M116 76q4-36 45-36t44 36z',coral,ink)+rect(127,131,64,10,3,blue)+star(204,47,11,gold)
truth=path('M109 54l45 7-5 74-49-6z',mint,ink)+path('M105 92l13 16 29-32',stroke=ink)+path('M168 64l46-8 8 76-49 6z',coral,ink)+path('M180 84l19 22m-1-26-16 28',stroke=ink)
dice=path('M106 73l50-33 58 26-1 55-51 31-57-27z',cream,ink)+path('M107 73l55 26 51-32m-51 32v51',stroke=ink)+''.join(circle(x,y,5,c) for x,y,c in [(144,66,ink),(173,73,ink),(120,94,coral),(145,121,coral),(183,105,blue),(198,98,blue)])
assoc=path('M97 81q0-30 41-30t39 27q0 25-44 26l-20 11 2-15q-18-4-18-19z',cream,ink)+path('M147 104q0-27 39-26t40 29q-2 23-18 24l1 14-20-10q-39 0-42-31z',mint,ink)+note(182,110,ink)
who=''.join(circle(x,y,r,c)+eye(x-7,y)+path(f'M{x} {y+10}q5 4 10 0',stroke=ink,sw=3) for x,y,r,c in [(126,112,26,coral),(190,109,28,blue),(158,78,28,gold)])+star(162,38,16,cream)
words=rect(99,74,53,64,7,ink)+rect(151,55,60,67,7,cream)+path('M111 124l13-35 16 35m-23-11h17',stroke=cream)+path('M164 70h30m-30 0v40h13q19 0 17-11t-29-9',stroke=ink)
memory=rect(104,52,54,46,8,blue)+rect(163,52,54,46,8,gold)+rect(104,103,54,46,8,coral)+rect(163,103,54,46,8,ink)+star(131,75,14,cream)+circle(189,75,10,ink)+path('M117 135l13-22 14 22z',cream,cream,1)+path('M180 127l8 8 14-19',stroke=mint)
find=''.join(circle(125+29*i,62+30*j,10,cream if (i,j)!=(2,1) else coral) for i in range(3) for j in range(3))+circle(184,92,19,ink)+circle(184,92,13,coral)+path('M198 108l22 27',stroke=ink,sw=9)
chaos=path('M119 67l14-26 26 13-39 78-24 15 2-26z',coral,ink)+path('M154 77l15-30 26 13-39 80-25 14 1-27z',gold,ink)+path('M185 83l17-23 22 16-42 65-24 11 4-25z',blue,ink)
snake=path('M99 127h37V96h33v29h29V74h-22',stroke=ink,sw=24)+path('M99 127h37V96h33v29h29V74h-22',stroke=mint,sw=15)+circle(174,74,12,mint)+circle(170,70,3,ink)+star(127,65,14,gold)
finish=path('M110 148l22-104m-16 80 91 2',stroke=ink)+path('M131 48q25-14 47 1t41 2l-10 52q-20 8-42-6t-47 0z',cream,ink)+path('M133 52l20-6-5 21-19 4m38-24 23 10-4 23-23-11m-18-1 19 3-5 21-20-3',ink,ink,1)
pictures=[spy,mafia,reaction,meme,quiz,truth,dice,assoc,who,words,memory,find,chaos,snake,finish]
def make(pic,i):
 bg=['#c3dfae','#c9c6f0','#ffd99a','#a8d9dd','#f2c4b6','#e7dfb3','#c6d5e7'][i%7]
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 192" color="{ink}">'+rect(0,0,320,192,0,bg)+path('M-5 157q78-32 151-6t179-12v65H-5z',cream,'none')+star(56+i%4*4,56,8,cream)+circle(254,126,5,ink)+pic+'</svg>'
for d in ['cards','memes']:(root/d).mkdir(exist_ok=True)
for i,p in enumerate(pictures):(root/'cards'/f'{i}.svg').write_text(make(p,i))
# Unexpected pairings for caption prompts, with independent figures on one stage.
for i,(a,b,prop) in enumerate([(3,0,5),(13,7,6),(2,8,4),(6,3,10),(0,13,7),(14,1,11),(8,9,2),(3,1,12)]):
 scene=f'<g transform="translate(-40 23) scale(.86)">{pictures[a]}</g><g transform="translate(101 24) scale(.83)">{pictures[b]}</g><g transform="translate(115 -8) scale(.32)">{pictures[prop]}</g>'
 (root/'memes'/f'{i}.svg').write_text(make(scene,i+2))
