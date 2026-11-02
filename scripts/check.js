// Valida um artboard .dc.html: tags fechadas, bindings {{ }} existentes e lógica embutida executável
// Uso: node scripts/check.js prototipo/Main.dc.html
const fs = require('fs');
const file = process.argv[2];
const html = fs.readFileSync(file, 'utf8');
const body = html.slice(html.indexOf('<x-dc>'), html.indexOf('</x-dc>') + 7);
const voids = new Set(['input','br','img','meta','link','hr','source','area','col','wbr']);
const stack = []; let errs = 0;
const re = /<\/?([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g; let m;
while ((m = re.exec(body))) {
  const [full, tag, , selfc] = m; const t = tag.toLowerCase();
  if (full.startsWith('</')) { const top = stack.pop(); if (top !== t) { console.log('MISMATCH: expected </' + top + '> got ' + full + ' at ' + body.slice(0, m.index).split('\n').length); errs++; if (errs > 5) break; } }
  else if (!voids.has(t) && !selfc) stack.push(t);
}
console.log('unclosed:', stack.length ? stack : 'none', 'errors:', errs);
const holes = [...body.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map(x => x[1]);
const bad = holes.filter(h => !/^[\w$.]+$/.test(h) && !/^(true|false)$/.test(h));
console.log('holes:', holes.length, 'non-path holes:', bad);
// check each hole path resolves against renderVals (top-level key only)
const script = html.slice(html.indexOf('data-dc-script'), html.lastIndexOf('</script>'));
const src = script.slice(script.indexOf('>') + 1);
const out = require('path').join(require('os').tmpdir(), 'carzen_extracted.js'); fs.writeFileSync(out, src); console.log('script extraído em', out);
global.setTimeout = (fn) => 1;
class DCLogic { constructor(p) { this.props = p || {}; } setState(p) { this.state = Object.assign({}, this.state || {}, p); } }
const C = new Function('DCLogic', src + '\nreturn Component;')(DCLogic);
const v = new C({}).renderVals();
const loopVars = new Set([...body.matchAll(/as="(\w+)"/g)].map(x => x[1]));
const missing = [...new Set(holes.filter(h => /^[\w$.]+$/.test(h)).map(h => h.split('.')[0]).filter(r => !(r in v) && !loopVars.has(r) && r !== 'true' && r !== 'false'))];
console.log('unknown top-level holes:', missing.length ? missing : 'none');
// deep check for non-loop paths
const get = (o, p) => p.split('.').reduce((a, k) => a == null ? undefined : a[k], o);
const und = [...new Set(holes.filter(h => /^[\w$.]+$/.test(h) && !loopVars.has(h.split('.')[0]) && !/^(true|false)$/.test(h)).filter(h => get(v, h) === undefined))];
console.log('undefined paths:', und.length ? und : 'none');
