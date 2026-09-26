// Render our original vector previews as real downloadable SVG files.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(relative) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', output)(require, exports);
  return exports;
}
const { assets } = load('src/lib/mock-data.ts');
const { AssetArt } = load('src/components/product-art.tsx');
const destination = path.join(__dirname, '../public/downloads');
fs.mkdirSync(destination, { recursive: true });
for (const asset of assets) {
  const svg = renderToStaticMarkup(React.createElement(AssetArt, { asset })).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  fs.writeFileSync(path.join(destination, `${asset.slug}-concept.svg`), svg);
}
console.log(`Wrote ${assets.length} original concept illustrations.`);
