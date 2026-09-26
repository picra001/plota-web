// Run against `next start -p 3000` after building.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const exportsData = {};
const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/mock-data.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', output)(exportsData);
const origin = 'http://localhost:3000';
async function main() {
  const routes = ['/en', '/ko/lab', ...exportsData.productPaths.map(p => `/${p.startsWith('chinese') ? 'ko' : 'en'}/${p}`)];
  for (const route of routes) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.ok(html.includes('<h1'), `Missing heading: ${route}`);
    assert.ok(html.includes(`href="https://plota.ai${route}"`), `Missing canonical: ${route}`);
  }
  for (const [from, to] of [['/', '/en'], ['/fbx/assets', '/en/fbx/assets'], ['/chinese', '/ko/chinese'], ['/lab', '/ko/lab'], ['/ko/novel', '/en/webtoon'], ['/en/novel/last-train', '/en/webtoon/last-train']]) {
    const response = await fetch(origin + from, { redirect: 'manual' });
    assert.ok([307, 308].includes(response.status), from);
    assert.equal(new URL(response.headers.get('location'), origin).pathname, to);
  }
  for (const asset of exportsData.assets) {
    const response = await fetch(`${origin}/downloads/${asset.slug}-concept.svg`);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes('<svg'));
  }
  const sitemap = await (await fetch(origin + '/sitemap.xml')).text();
  for (const route of routes) assert.ok(sitemap.includes(`https://plota.ai${route}</loc>`), `Missing sitemap route: ${route}`);
  assert.ok(!sitemap.includes('/novel'));
  const llms = await (await fetch(origin + '/llms.txt')).text();
  assert.ok(llms.includes('/ko/chinese') && llms.includes('/en/webtoon') && !llms.includes('/novel'));
  assert.ok((await (await fetch(origin + '/feed.xml')).text()).includes('/en/devlog/'));
  for (const missing of ['/en/fbx/assets/missing', '/en/webtoon/last-train/99', '/fr/fbx']) assert.equal((await fetch(origin + missing)).status, 404, missing);
  console.log(`PASS: ${routes.length} canonical pages, 6 redirects, 6 downloads, sitemap, RSS, llms.txt, and 3 invalid routes.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
