import json,re,unicodedata,collections,sys
from pathlib import Path
out=Path(sys.argv[1])
rows=json.loads((out/'text-rows.json').read_text(encoding='utf8'))
known={r['hanzi'] for r in rows}
scan=[];bad=[]
for p in range(1,36):
    data=json.loads((out/f'ocr-full-{p}.json').read_text(encoding='utf8'))
    groups=collections.defaultdict(list)
    for line in data['tsv'].splitlines():
        cells=line.split('\t')
        if len(cells)<12 or cells[0]!='5':continue
        groups[tuple(cells[1:5])].append(dict(x=int(cells[6]),text=cells[11],y=int(cells[7])))
    for group in groups.values():
        num=''.join(g['text'] for g in group if g['x']<100)
        match=re.search(r'\d{4}',num)
        word=''.join(g['text'] for g in group if g['x']>=175)
        word=unicodedata.normalize('NFKC',word).replace(' ','')
        if not match:continue
        n=int(match[0]);scan.append(dict(source='hankeut-1200',page=p,number=n,hanzi=word))
        if word not in known:bad.append((p,n,word))
(out/'scan-rows.json').write_text(json.dumps(scan,ensure_ascii=False,indent=2),encoding='utf8')
print('scan',len(scan),'missing numbers',sorted(set(range(1,1201))-{r['number'] for r in scan}))
print('unmatched',len(bad),bad)
print('text unique',len(known),'not in scan',[x for x in sorted(known) if x not in {r['hanzi'] for r in scan}])
print('duplicate hanzi',[(h,[(r['pinyin'],r['level']) for r in rows if r['hanzi']==h]) for h,c in collections.Counter(r['hanzi'] for r in rows).items() if c>1])
