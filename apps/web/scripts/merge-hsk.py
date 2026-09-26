"""Merge PDF extraction intermediates; usage: python merge-hsk.py extraction-dir pdf-dir.
text-rows.json: pdfplumber table/column extraction. scan-rows.json: numbered OCR index.
The corrections below were checked against rendered source PDF pages, not guessed.
"""
import json, re, sys, hashlib, unicodedata
from pathlib import Path

root, pdfs = map(Path, sys.argv[1:3])
rows = json.loads((root / 'text-rows.json').read_text(encoding='utf8'))
scan = json.loads((root / 'scan-rows.json').read_text(encoding='utf8'))
corrections = {55:'表格',67:'不但…而且…',68:'不得不',74:'擦',91:'尝',213:'饿',217:'耳朵',237:'放暑假',244:'份',276:'胳膊',339:'号码',449:'紧张',499:'可惜',543:'礼貌',591:'猫',647:'爬山',696:'亲戚',734:'入口',736:'伞',782:'是否',795:'瘦',812:'顺便',826:'虽然…但是…',845:'趟',851:'踢足球',923:'洗',933:'咸',941:'香蕉',972:'兴奋',976:'醒',993:'牙膏',1014:'钥匙',1044:'因为…所以…',1085:'原谅',1144:'只有…才…'}
scan.append(dict(source='hankeut-1200', page=4, number=111, hanzi='出生'))
for row in scan:
    row['hanzi'] = corrections.get(row['number'], row['hanzi'])
scan.sort(key=lambda r:r['number'])
assert [r['number'] for r in scan] == list(range(1,1201))
aliases = {'表格(儿)':'表格', '份儿':'份', '号码(儿)':'号码', '顺便(儿)':'顺便', '入又':'入口','不得不...':'不得不','是否...':'是否'}
def canonical(word):
    word = aliases.get(word, word)
    if '...' in word: word = word.replace('...','…').rstrip('…')+'…'
    return word

entries = {}
tones = str.maketrans(dict(zip('ãåçõñâêîôûÚÛ','āīēōūǎěǐǒǔǚǜ')))
for row in rows:
    word = canonical(row['hanzi'])
    entry = entries.setdefault(word, dict(id='hsk-'+ '-'.join(f'{ord(c):x}' for c in word), hanzi=word, aliases=[], levels=[], senses=[], sources=[]))
    if row['hanzi'] != word and row['hanzi'] != '入又': entry['aliases'].append(row['hanzi'])
    if row['level'] not in entry['levels']: entry['levels'].append(row['level'])
    pinyin = row['pinyin'].translate(tones) if row['source']=='first-step-hsk1-3' else row['pinyin']
    entry['senses'].append(dict(pinyin=unicodedata.normalize('NFC',pinyin), meaningKo=row['meaning'], level=row['level']))
    entry['sources'].append({k:row[k] for k in ('source','page','number','level')})
for row in scan:
    assert row['hanzi'] in entries, row
    entries[row['hanzi']]['sources'].append({k:row[k] for k in ('source','page','number')})
assert set(entries) == {r['hanzi'] for r in scan}
words = sorted(entries.values(),key=lambda e:min(s['number'] for s in e['sources'] if s['source']=='hankeut-1200'))
for e in words: e['levels'].sort()
source_info = [('hankeut-1200','HSK_1-4급_단어한끝_필수어휘1200단어장.pdf',35,1200,'Numbered headword index: OCR, cross-source matching and visual correction. Pinyin/glosses come from the two text PDFs.'),('yusu-hsk4','유수중국어_HSK4급어휘.pdf',45,600,'Table extraction; entry 入又 corrected to 入口 using source 1.'),('first-step-hsk1-3','가장쉬운독학중국어첫걸음_신HSK1-3급단어.pdf',15,600,'Column extraction; embedded-font pinyin characters restored. Source level labels retained.')]
data = dict(schemaVersion=1,id='hsk-1-4',title='HSK 1–4급 통합 단어장',description='제공된 세 PDF의 1–4급 누적 어휘. 같은 표제어의 여러 발음과 뜻을 함께 보존합니다.',language='zh-Hans',translationLanguage='ko',version='2026-09-25',wordCount=len(words),sourceEntryCount=1200,levelSystem='Supplied legacy HSK 1–4 PDFs; not a claim of alignment with newer HSK specifications.',sources=[dict(id=i,filename=f,sha256=hashlib.sha256((pdfs/f).read_bytes()).hexdigest(),pages=p,entries=n,method=m) for i,f,p,n,m in source_info],words=words)
target=Path(__file__).resolve().parents[1]/'public/data/chinese/hsk-1-4.json'
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'{len(rows)} source senses, {len(scan)} indexed entries, {len(words)} unique headwords -> {target}')

# Reapply reviewed themes whenever the source vocabulary is regenerated.
import runpy
runpy.run_path(str(Path(__file__).with_name("group-hsk.py")), run_name="__main__")
