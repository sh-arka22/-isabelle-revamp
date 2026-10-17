import re,sys,os,collections
kw = r'(lemma|theorem|corollary|proposition|definition|fun|function|primrec|abbreviation|inductive|datatype|locale|class)'
cmd_re = re.compile(r'^\s*'+kw+r'\b', re.M)
tot=0; pre_text=0; inline_comment=0; ex=[]
for root in sys.argv[1:]:
  for dp,_,fs in os.walk(root):
    for f in fs:
      if not f.endswith('.thy'): continue
      s=open(os.path.join(dp,f),encoding='utf-8',errors='replace').read()
      for m in cmd_re.finditer(s):
        tot+=1
        before=s[:m.start()].rstrip()
        # preceded directly by text block ending with \<close>
        tail=before[-3000:]
        if tail.endswith('\\<close>'):
          # find last command keyword in tail
          lm=list(re.finditer(r'(^|\n)\s*(text|txt|section|subsection|subsubsection|paragraph)\s*(%\w+\s*)?\\<open>',tail))
          if lm and lm[-1].group(2) in ('text','txt'):
            # ensure no other command between
            pre_text+=1
            if len(ex)<3: ex.append((f, s[m.start():m.start()+80].strip().splitlines()[0]))
        line_end=s.find('\n',m.start())
        if '\\<comment>' in s[m.start():line_end]: inline_comment+=1
print('theorem/def-like commands:',tot)
print('immediately preceded by text/txt block:',pre_text, '(%.1f%%)'%(100*pre_text/max(tot,1)))
print('with \\<comment> on same line:',inline_comment)
print(ex)
