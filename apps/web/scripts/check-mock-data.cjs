const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  const filename = path.resolve(__dirname, file);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  new Function('require', 'exports', output)((name) => name.startsWith('.') ? load(path.relative(__dirname, path.resolve(path.dirname(filename), `${name}.ts`))) : require(name), exports);
  cache.set(filename, exports);
  return exports;
}
const { findChinesePhrases } = load('../src/lib/chinese-tools.ts');
const { productPaths, assets, stories, phrases } = load('../src/lib/mock-data.ts');
for (const invalid of [null, [], {}, { query: 1 }, { query: '' }, { query: '  ' }, { query: 'x'.repeat(101) }, { query: '你好', private: true }]) {
  assert.equal(findChinesePhrases(invalid).retryable, true);
}
assert.equal(findChinesePhrases({ query: '감사' }).results[0].id, 'thanks');
assert.equal(findChinesePhrases({ query: '你好' }).results[0].id, 'hello');
assert.equal(findChinesePhrases({ query: '  NǏ HǍO  ' }).results[0].id, 'hello');
assert.deepEqual(findChinesePhrases({ query: 'こんにちは' }).results, []);
assert.deepEqual(findChinesePhrases({ query: 'unknown-topic' }).results, []);
assert.equal('choices' in findChinesePhrases({ query: '감사' }).results[0], false);
assert.equal(new Set(productPaths).size, productPaths.length);
for (const phrase of phrases) assert.ok(phrase.choices.includes(phrase.meaning));
for (const asset of assets) {
  assert.ok(productPaths.includes(`fbx/assets/${asset.slug}`));
  const svg = fs.readFileSync(path.join(__dirname, `../public/downloads/${asset.slug}-concept.svg`), 'utf8');
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
}
for (const story of stories) for (const episode of story.episodes) assert.ok(productPaths.includes(`webtoon/${story.slug}/${episode.slug}`));
console.log('PASS: WebMCP validation, Korean/Mandarin/pinyin lookup, safe empty results, unique routes, lesson answers, artwork and episode links.');
