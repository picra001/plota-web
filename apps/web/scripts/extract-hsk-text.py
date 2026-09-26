import json,re,unicodedata,sys
from pathlib import Path
import pdfplumber
root, out = map(Path, sys.argv[1:3])
out.mkdir(parents=True, exist_ok=True)
def norm(s): return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',s.replace('\x00',' '))).strip()
rows=[]
with pdfplumber.open(root/'유수중국어_HSK4급어휘.pdf') as pdf:
    for page_no,page in enumerate(pdf.pages[2:],3):
        for table in page.extract_tables():
            for row in table:
                if len(row)==4 and row[0] and row[0].strip().isdigit():
                    n,hanzi,pinyin,meaning=map(norm,row)
                    rows.append(dict(source='yusu-hsk4',page=page_no,number=int(n),level=4,hanzi=hanzi,pinyin=pinyin,meaning=meaning))
print('yusu rows',len(rows),'numbered',len(set(r['number'] for r in rows)))
level=0;bad=[];counts={}
with pdfplumber.open(root/'가장쉬운독학중국어첫걸음_신HSK1-3급단어.pdf') as pdf:
    for page_no,page in enumerate(pdf.pages[1:],2):
        full=page.extract_text() or ''
        halves=[page] if page.width<500 else [page.crop((0,0,page.width/2,page.height)),page.crop((page.width/2,0,page.width,page.height))]
        for half in halves:
            text=half.extract_text(x_tolerance=2) or ''
            lines=text.splitlines()
            for idx,line in enumerate(lines):
                line=norm(line)
                header=re.search(r'([123])\s*급\s*단어',line)
                if header: level=int(header[1])
                if not re.match(r'^\d{3}\s',line): continue
                match=re.match(r'^(\d{3})\s+(\S+)\s+([^가-힣]+?)\s+([가-힣].*)$',line)
                if not match and idx+1<len(lines):
                    match=re.match(r'^(\d{3})\s+(\S+)\s+([^가-힣]+?)\s+([가-힣].*)$',line+' '+norm(lines[idx+1]))
                if not match: bad.append((page_no,line));continue
                n,hanzi,pinyin,meaning=match.groups()
                rows.append(dict(source='first-step-hsk1-3',page=page_no,number=int(n),level=level,hanzi=hanzi,pinyin=pinyin,meaning=meaning))
                counts[level]=counts.get(level,0)+1
(out/'text-rows.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('first-step counts',counts,'bad',bad)
print('pinyin chars',sorted(set(''.join(r['pinyin'] for r in rows if r['source']=='first-step-hsk1-3'))))
