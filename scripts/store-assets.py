from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
root = Path(__file__).resolve().parents[1]
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
for size in [16,32,48,128]:
    scale=4
    im=Image.new('RGBA',(size*scale,size*scale),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.rounded_rectangle((0,0,size*scale-1,size*scale-1),radius=size*.19*scale,fill='#195f8f')
    f=ImageFont.truetype(font,int(size*.60*scale))
    d.text((size*scale/2,size*scale*.46),'ʁ',font=f,anchor='mm',fill='white')
    d.line((size*.25*scale,size*.78*scale,size*.75*scale,size*.78*scale),fill='#b9d9ed',width=max(1,int(size*.045*scale)))
    im.resize((size,size),Image.Resampling.LANCZOS).save(root/f'extension/icons/icon-{size}.png')
im=Image.new('RGB',(440,280),'#f5f9fc');d=ImageDraw.Draw(im)
d.text((30,24),'French IPA',font=ImageFont.truetype(font,32),fill='#17313f')
d.text((30,80),'Pronunciation as you read',font=ImageFont.truetype(font,18),fill='#506675')
d.rounded_rectangle((30,125,410,226),radius=9,fill='white',outline='#ccdce7')
d.text((220,150),'bɔ̃ʒuʁ',font=ImageFont.truetype(font,20),anchor='mm',fill='#195f8f')
d.text((220,191),'Bonjour',font=ImageFont.truetype(font,34),anchor='mm',fill='#17313f')
d.text((30,245),'IPA above or below • Works offline',font=ImageFont.truetype(font,16),fill='#506675')
im.save(root/'store/promo-440x280.png')
p=root/'extension/manifest.json';m=json.loads(p.read_text());m['version']='0.1.1';m['icons']={str(n):f'icons/icon-{n}.png' for n in [16,32,48,128]};m['action']['default_icon']=m['icons'];m['homepage_url']='https://github.com/krmayn/french-ipa';p.write_text(json.dumps(m,indent=2)+'\n')
