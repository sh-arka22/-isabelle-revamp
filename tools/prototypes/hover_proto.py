import re,sys
SYM={'\\<forall>':'∀','\\<exists>':'∃','\\<Rightarrow>':'⇒','\\<longrightarrow>':'⟶','\\<in>':'∈','\\<le>':'≤','\\<noteq>':'≠','\\<lambda>':'λ','\\<subseteq>':'⊆','\\<and>':'∧','\\<or>':'∨','\\<not>':'¬','\\<equiv>':'≡','\\<infinity>':'∞','\\<real>':'ℝ','\\<epsilon>':'ε','\\<bar>':'|','\\<Longrightarrow>':'⟹','\\<times>':'×','\\<union>':'∪','\\<inter>':'∩','\\<circ>':'∘','\\<And>':'⋀','\\<sum>':'∑','\\<partial>':'∂','\\<gamma>':'γ','\\<alpha>':'α','\\<beta>':'β'}
def uni(s):
  for k,v in SYM.items(): s=s.replace(k,v)
  return s
def md(t):
  t=re.sub(r'\\<\^(emph)>\\<open>(.*?)\\<close>',r'*\2*',t)
  t=re.sub(r'\\<\^(bold)>\\<open>(.*?)\\<close>',r'**\2**',t)
  t=re.sub(r'\\<\^(term|const|typ|prop|verbatim|theory_text)>\\<open>(.*?)\\<close>',r'`\2`',t)
  t=re.sub(r'@\{(term|thm|const|typ|prop|text)\s+(?:\\<open>(.*?)\\<close>|"(.*?)"|(\S+?))\}',lambda m:'`'+(m.group(2) or m.group(3) or m.group(4))+'`',t)
  t=re.sub(r'\\<\^item>','-',t); t=re.sub(r'\\<\^enum>','1.',t)
  t=t.replace('\\<open>','‹').replace('\\<close>','›')
  return uni(re.sub(r'[ \t]+',' ',t)).strip()
s=open(sys.argv[1],encoding='utf-8').read()
pat=re.compile(r'text\s*\\<open>((?:(?!\\<close>\s*\n\s*(?:lemma|theorem)).)*?)\\<close>\s*\n\s*((?:lemma|theorem|proposition|corollary)[^\n]*\n(?:\s+(?:assumes|shows|fixes|obtains|and)[^\n]*\n)*)',re.S)
for m in list(pat.finditer(s))[:int(sys.argv[2])]:
  stmt=uni(m.group(2).strip()).replace('\\<open>','‹').replace('\\<close>','›')
  line=s[:m.start(2)].count('\n')+1
  print('```isabelle\n'+stmt+'\n```\n---\n'+md(m.group(1))+'\n---\n*'+sys.argv[1].split('src/')[-1]+':'+str(line)+'*\n=========')
