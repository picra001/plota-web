const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/chinese-vocabulary.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const api = {}; new Function('exports', output)(api);
const deck = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/chinese/hsk-1-4.json'), 'utf8'));
assert.equal(deck.words.length, 1192);
assert.equal(new Set(deck.words.map(w => w.id)).size, deck.wordCount);
const refs = deck.words.flatMap(w => w.sources);
for (const source of deck.sources) assert.equal(refs.filter(r => r.source === source.id).length, source.entries);
assert.deepEqual(refs.filter(r => r.source === 'hankeut-1200').map(r => r.number).sort((a,b)=>a-b), Array.from({length:1200},(_,i)=>i+1));
assert.equal(deck.words.flatMap(w=>w.senses).length, 1200);
for (const word of deck.words) {
  assert.match(word.hanzi, /\p{Script=Han}/u);
  assert.ok(word.levels.every(l => [1,2,3,4].includes(l)));
  assert.ok(word.sources.some(s => s.source === 'hankeut-1200'));
  for (const sense of word.senses) { assert.match(sense.meaningKo, /[가-힣]/); assert.ok(sense.pinyin.length); assert.doesNotMatch(sense.pinyin, /[ãåçõñâêîôûÚÛ\u0000\ufffd]/); }
  const choices = api.choicesFor(word, deck);
  assert.equal(choices.length, 4); assert.equal(new Set(choices).size, 4); assert.equal(choices.filter(c => c === api.gloss(word)).length, 1);
  assert.equal(api.checkScope(word.hanzi, deck).withinVocabulary, true);
}
for (const hanzi of ['入口','醒','出生','女儿','绿']) assert.ok(deck.words.some(w => w.hanzi === hanzi));
assert.ok(deck.words.find(w => w.hanzi === '女儿').senses[0].pinyin.includes('ǚ'));
assert.equal(api.checkScope('我喜欢学习中文。', deck).withinVocabulary, true);
assert.equal(api.checkScope('量子纠缠', deck).withinVocabulary, false);
const s = api.scopeFromSearch('?deck=evil&level=99&offset=-1&count=100'); assert.deepEqual(s, api.defaultScope);
const scoped = {...s,level:4,offset:20,count:5}; assert.equal(api.focusFor(deck,scoped).length,5); assert.ok(api.focusFor(deck,scoped).every(w=>w.levels.includes(4)));
assert.deepEqual(api.scopeFromSearch('?'+api.scopeQuery(scoped)), scoped);
const run = (name,input) => api.runVocabularyTool(name,input,deck,scoped,'https://example.test');
for (const input of [null,[],{query:1},{query:'x'.repeat(101)},{offset:-1},{limit:0},{limit:51},{query:'你',private:true}]) assert.ok(run('search_vocabulary',input).error);
assert.ok(run('get_learning_scope',{private:true}).error);
assert.ok(run('check_chinese_scope',{text:''}).error);
assert.ok(run('unknown',{}).error);
assert.ok(run('search_vocabulary',{query:'xuexi'}).words.some(w=>w.hanzi==='学习'));
assert.ok(run('search_vocabulary',{query:'공부'}).total>0);
assert.equal(run('search_vocabulary',{query:'nonexistent-vocabulary'}).total,0);
const context=run('get_learning_scope',{}); assert.equal(context.focusWords.length,5); assert.equal(context.supportVocabulary.wordCount,1192); assert.ok(!('progress' in context));
assert.equal(run('list_vocabulary_decks',{}).decks[0].url,'https://example.test/data/chinese/hsk-1-4.json');
console.log('PASS: 1,200 source entries / 1,192 headwords, all source coverage, pinyin normalization, all quiz choices, scope segmentation, selection URLs, WebMCP validation and privacy.');

assert.equal(deck.themes.length,19);
const assigned=deck.themes.flatMap(b=>b.wordIds);
assert.equal(assigned.length,deck.wordCount);
assert.equal(new Set(assigned).size,deck.wordCount);
assert.deepEqual([...assigned].sort(),deck.words.map(w=>w.id).sort());
for(const b of deck.themes){
 assert.equal(api.resolveBook(deck,b.number).id,b.id);
 assert.equal(api.resolveBook(deck,b.name).id,b.id);
 const context=run('get_learning_scope',{book:b.number});
 assert.equal(context.book.name,b.name);
 assert.equal(context.focusWords.length,b.wordIds.length);
 assert.deepEqual(context.focusWords.map(w=>w.id),b.wordIds);
 assert.equal(run('get_learning_scope',{book:b.name}).book.id,b.id);
 const parsed=api.scopeFromSearch(new URL(context.pageUrl).search);
 assert.equal(api.focusFor(deck,parsed).length,b.wordIds.length);
}
assert.equal(run('get_learning_scope',{book:999}).error.code,'BOOK_NOT_FOUND');
assert.ok(run('get_learning_scope',{book:[]}).error);
assert.equal(run('search_vocabulary',{book:3,query:'包子'}).total,1);
assert.equal(run('search_vocabulary',{book:3,query:'学校'}).total,0);
assert.equal(run('check_chinese_scope',{book:3,text:'我喜欢吃包子。'}).withinVocabulary,true);
assert.deepEqual(run('check_chinese_scope',{book:3,text:'我喜欢吃包子。'}).focusWordsUsed,['包子','吃']);
console.log('PASS: 19 themed books cover all 1192 words once; names/numbers/URLs resolve; scoped search and conversation examples.');
