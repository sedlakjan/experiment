const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
let html = read('src/index.template.html');
const asset = name => {
  const mime = { '.png': 'image/png', '.woff2': 'font/woff2', '.otf': 'font/otf' }[path.extname(name)];
  if (!mime) throw new Error(`Unsupported embedded asset: ${name}`);
  return `data:${mime};base64,${fs.readFileSync(path.join(root, name)).toString('base64')}`;
};
const css = ['styles.css', 'brand.css', 'mobile.css'].map(read).join('\n').replace(/url\(["']?(assets\/[^)"']+)["']?\)/g, (_, name) => `url("${asset(name)}")`);
html = html.replace('  <link rel="stylesheet" href="styles.css">', () => `<style>\n${css}\n</style>`);
html = html.replace(/src="(assets\/[^"\s]+)"/g, (_, name) => `src="${asset(name)}"`);
html = html.replace(/^\s*<script src="(?:engine|app)\.js" defer><\/script>\r?\n/gm, '');
const scripts = ['engine.js', 'app.js'].map(name => `<script>\n${read(name).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');
html = html.replace('</body>', () => `${scripts}\n</body>`);
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('Standalone offline index.html created. No external assets or data requests.');
