// Valida a base de veículos do CarZen (dados/veiculos.json ou arquivos da pesquisa).
// Uso: node scripts/validar-base.js [dados/veiculos.json ...]
const fs = require('fs');
const CATS = ['hatch', 'sedan', 'suv', 'picape', 'minivan'];
const COMB = ['flex', 'gasolina', 'diesel', 'eletrico', 'hibrido'];
let errors = 0, warnings = 0, models = 0, versions = 0;
const err = (where, msg) => { errors++; console.log('ERRO  ' + where + ': ' + msg); };
const warn = (where, msg) => { warnings++; console.log('aviso ' + where + ': ' + msg); };
const isYearRange = (a) => Array.isArray(a) && a.length === 2 && a.every(Number.isInteger) && a[0] <= a[1] && a[0] >= 2005 && a[1] <= 2027;
const num = (v) => typeof v === 'number' && isFinite(v);

const ids = new Set();
const arquivos = process.argv.slice(2).length ? process.argv.slice(2) : [require('path').join(__dirname, '..', 'dados', 'veiculos.json')];
for (const file of arquivos) {
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { err(file, 'JSON inválido: ' + e.message); continue; }
  if (data && Array.isArray(data.modelos)) data = data.modelos;
  if (!Array.isArray(data)) { err(file, 'o arquivo precisa ser um array de modelos'); continue; }
  for (const m of data) {
    models++;
    const w = (m && m.id) || file + '#?';
    if (!/^[a-z0-9]+(-[a-z0-9]+)+$/.test(m.id || '')) err(w, 'id inválido (use marca-modelo em minúsculas)');
    if (ids.has(m.id)) err(w, 'id repetido'); ids.add(m.id);
    if (!m.marca || !m.modelo) err(w, 'marca/modelo ausentes');
    if (!CATS.includes(m.categoria)) err(w, 'categoria inválida: ' + m.categoria);
    if (!Array.isArray(m.geracoes) || !m.geracoes.length) { err(w, 'sem gerações'); continue; }
    let maxYear = 0;
    m.geracoes.forEach((g, gi) => {
      const gw = w + ' / ' + (g.nome || 'geração ' + gi);
      if (!g.nome) err(gw, 'nome da geração ausente');
      if (!isYearRange(g.anos)) err(gw, 'anos inválidos: ' + JSON.stringify(g.anos));
      else maxYear = Math.max(maxYear, g.anos[1]);
      if (!Array.isArray(g.versoes) || !g.versoes.length) err(gw, 'sem versões');
      (g.versoes || []).forEach((v, vi) => {
        versions++;
        const vw = gw + ' / ' + (v.motor || 'versão ' + vi);
        if (!v.motor) err(vw, 'motor ausente');
        if (!COMB.includes(v.combustivel)) err(vw, 'combustível inválido: ' + v.combustivel);
        if (v.anos !== undefined) {
          if (!isYearRange(v.anos)) err(vw, 'anos da versão inválidos');
          else if (isYearRange(g.anos) && (v.anos[0] < g.anos[0] || v.anos[1] > g.anos[1])) err(vw, 'anos da versão fora da geração');
        }
        const c = v.consumo || {};
        for (const via of ['cidade', 'estrada']) {
          const o = c[via];
          if (!o || typeof o !== 'object') { err(vw, 'consumo.' + via + ' ausente'); continue; }
          if (v.combustivel === 'eletrico') {
            if (!num(o.eletrico) || o.eletrico < 3 || o.eletrico > 12) err(vw, via + '.eletrico fora de 3–12 km/kWh: ' + o.eletrico);
          } else if (v.combustivel === 'diesel') {
            if (!num(o.diesel) || o.diesel < 5 || o.diesel > 20) err(vw, via + '.diesel fora de 5–20 km/l: ' + o.diesel);
          } else {
            if (!num(o.gasolina) || o.gasolina < 5 || o.gasolina > (v.combustivel === 'hibrido' ? 30 : 20)) err(vw, via + '.gasolina fora da faixa: ' + o.gasolina);
            if (v.combustivel === 'flex') {
              if (!num(o.etanol)) err(vw, via + '.etanol ausente (flex)');
              else if (num(o.gasolina) && (o.etanol / o.gasolina < 0.6 || o.etanol / o.gasolina > 0.8)) warn(vw, via + ' etanol/gasolina = ' + (o.etanol / o.gasolina).toFixed(2) + ' (esperado ~0,70)');
            }
          }
        }
        if (num(c.cidade && c.cidade.gasolina) && num(c.estrada && c.estrada.gasolina) && c.estrada.gasolina < c.cidade.gasolina * 0.9 && v.combustivel !== 'hibrido') warn(vw, 'estrada bem menor que cidade');
        if (!v.fonteConsumo) err(vw, 'fonteConsumo ausente');
        if (typeof v.consumoEstimado !== 'boolean') err(vw, 'consumoEstimado precisa ser true/false');
      });
      const r = g.revisao || {};
      if (!num(r.intervaloKm) || r.intervaloKm < 5000 || r.intervaloKm > 40000) err(gw, 'revisao.intervaloKm inválido');
      if (!num(r.intervaloMeses) || r.intervaloMeses < 6 || r.intervaloMeses > 24) err(gw, 'revisao.intervaloMeses inválido');
      if (!num(r.custoMedio) || r.custoMedio < 150 || r.custoMedio > 5000) err(gw, 'revisao.custoMedio fora de R$ 150–5.000');
      if (typeof r.estimado !== 'boolean') err(gw, 'revisao.estimado precisa ser true/false');
      if (!r.fonte) err(gw, 'revisao.fonte ausente');
      const p = g.pneu || {};
      if (!/^\d{3}\/\d{2} ?Z?R\d{2}/.test(p.medida || '')) err(gw, 'pneu.medida inválida: ' + p.medida);
      if (!num(p.precoUnit) || p.precoUnit < 150 || p.precoUnit > 3500) err(gw, 'pneu.precoUnit fora de R$ 150–3.500');
      if (!Array.isArray(g.atencao)) err(gw, 'atencao precisa ser array');
      else g.atencao.forEach((a) => {
        if (!a.item || !num(a.km) || a.km < 5000 || a.km > 300000 || !num(a.custo) || a.custo < 30 || a.custo > 20000) err(gw, 'item de atenção inválido: ' + JSON.stringify(a));
      });
      if (!Array.isArray(g.fontes) || !g.fontes.length || !g.fontes.every((u) => /^https?:\/\//.test(u))) err(gw, 'fontes precisa ter ao menos 1 URL');
    });
    if (maxYear && maxYear < 2012) err(w, 'nenhuma geração chega a 2012');
  }
}
console.log('\n' + models + ' modelos, ' + versions + ' versões · ' + errors + ' erro(s), ' + warnings + ' aviso(s)');
process.exit(errors ? 1 : 0);
