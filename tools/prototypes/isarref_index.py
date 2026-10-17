import re,sys,os,json
root=sys.argv[1]
ent=re.compile(r'\\<\^descr>\s*@\{(command|method|attribute)\s+"?([A-Za-z_0-9\'.!]+)"?\}')
out={}
for f in sorted(os.listdir(root)):
  if not f.endswith('.thy'): continue
  s=open(os.path.join(root,f),encoding='utf-8').read()
  ms=list(ent.finditer(s))
  for i,m in enumerate(ms):
    end = ms[i+1].start() if i+1<len(ms) else len(s)
    body=s[m.start():end]
    cut=body.find('\\<close>\n\n')
    if cut>0: body=body[:cut]
    key=m.group(1)+':'+m.group(2)
    out.setdefault(key,{'file':f,'text':body[:600]})
print(len(out),'entries'); print(json.dumps(out.get('method:simp'),indent=1)[:700]); print(sorted(k for k in out if k.startswith('command:'))[:25])
