// Build the single-file, fully offline city page.
//
//   node build.js                 -> writes dist/垂城-VERTICAL_PLANET.html
//   node build.js path/to/out.html
//
// Inputs: src/template.html, src/city.js (from assemble.py), src/vendor/three.min.js
const fs = require('fs');
const path = require('path');

const root = __dirname;
const repo = path.resolve(root, '..');

const templatePath = path.join(root, 'template.html');
const cityPath = path.join(root, 'city.js');
const threePath = process.env.THREE_PATH || path.join(root, 'vendor', 'three.min.js');

for (const [label, file] of [['template', templatePath], ['city', cityPath], ['three.js', threePath]]) {
  if (!fs.existsSync(file)) {
    console.error(`missing ${label}: ${file}`);
    if (label === 'city') console.error('run `python assemble.py` first');
    process.exit(1);
  }
}

const template = fs.readFileSync(templatePath, 'utf8');
// A literal closing script tag inside the inlined source would end the tag early.
const three = fs.readFileSync(threePath, 'utf8').replace(/<\/script/gi, '<\\/script');
const city = fs.readFileSync(cityPath, 'utf8');

const out = template
  .replace('/*__THREE__*/', () => three)
  .replace('/*__CITY__*/', () => city);

const dest = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repo, 'dist', '垂城-VERTICAL_PLANET.html');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out, 'utf8');

const sizeMb = Buffer.byteLength(out, 'utf8') / 1024 / 1024;
console.log(`written ${dest} (${sizeMb.toFixed(2)} MB)`);
