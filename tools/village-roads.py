# 從漁村底圖描出大馬路，印出 src/data/villageRoads.ts 的 RAW 字串。
# 用法：python3 tools/village-roads.py > /tmp/roads.txt（要 pillow、numpy、scipy）
from PIL import Image
import numpy as np
from scipy import ndimage
W,H=250,140  # 8 地圖單位一格
src=Image.open('public/img/village/v1-bg.webp').convert('RGB')
im=np.asarray(src.resize((W,H),Image.BOX),dtype=int)
r,g,b=im[...,0],im[...,1],im[...,2]
tan=(r>225)&(g>180)&(g<228)&(b>110)&(b<180)&(r-b>70)
# 只看陸地／山坡（用跟遊戲一樣的多邊形：簡單起見用 beach 多邊形以外 & y<?）
def inpoly(x,y,poly):
  ins=False; j=len(poly)-1
  for i in range(len(poly)):
    ax,ay=poly[i]; bx,by=poly[j]
    if (ay>y)!=(by>y) and x < (bx-ax)*(y-ay)/(by-ay)+ax: ins=not ins
    j=i
  return ins
LAND=[(0,330),(230,300),(1130,290),(1400,250),(1700,180),(2000,100),(2000,560),(1880,560),(1790,610),(1760,690),(1500,760),(1300,780),(1210,740),(1160,690),(1060,670),(960,680),(900,700),(850,690),(700,640),(500,610),(330,560),(150,510),(0,480)]
HILL=[(360,170),(600,90),(620,0),(2000,0),(2000,100),(1700,180),(1400,250),(1130,290),(360,280)]
landm=np.zeros((H,W),bool)
for y in range(H):
  for x in range(W):
    p=(x*8+4,y*8+4)
    landm[y,x]=inpoly(*p,LAND) or inpoly(*p,HILL)
tan&=landm
lab,n=ndimage.label(tan)
sizes=ndimage.sum(tan,lab,range(1,n+1))
keep=np.isin(lab,[i+1 for i in range(n) if sizes[i]>150])
yy,xx=np.mgrid[-4:5,-4:5]; disk=(xx*xx+yy*yy)<=16
wide=ndimage.binary_dilation(ndimage.binary_opening(keep,disk),disk)
road=keep&~wide
road=ndimage.binary_closing(road,np.ones((2,2)))
road=ndimage.binary_opening(road,np.ones((2,2)))
rows=[]
for y in range(H):
  runs=[]; x=0
  while x<W:
    if road[y,x]:
      a=x
      while x<W and road[y,x]: x+=1
      runs.append(f'{a}-{x-1}')
    else: x+=1
  if runs: rows.append(f'{y}:'+','.join(runs))
print(';'.join(rows))
