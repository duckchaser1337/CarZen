// Testa a lógica do app em Node: telas, formulários, troca de perfil, assistente e a base inteira de veículos.
// Uso: node scripts/test.js [logica/logic.js | prototipo/Main.dc.html]
//      CARZEN_BASE=arquivo.json node scripts/test.js   (outra base)
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const alvo = process.argv[2] || path.join(root, 'logica', 'logic.js');
let src = fs.readFileSync(alvo, 'utf8');
if (alvo.endsWith('.html')) {
  const abre = src.search(/<script type="text\/x-dc" data-dc-script[^>]*>/);
  src = src.slice(src.indexOf('>', abre) + 1, src.indexOf('</script>', abre));
}
if (src.includes('/*__BASE__*/null')) {
  const raw = JSON.parse(fs.readFileSync(process.env.CARZEN_BASE || path.join(root, 'dados', 'veiculos.json'), 'utf8'));
  const base = Array.isArray(raw) ? { modelos: raw } : raw;
  src = src.replace('/*__BASE__*/null', () => JSON.stringify(base));
}

global.setTimeout = (fn) => { fn(); return 1; }; // timers rodam na hora
class DCLogic { constructor(props) { this.props = props || {}; } setState(p) { this.state = Object.assign({}, this.state || {}, p); } }
const Component = new Function('DCLogic', src + '\nreturn Component;')(DCLogic);

let falhas = 0, oks = 0;
const ok = (cond, msg) => { if (cond) oks++; else { falhas++; console.log('FALHOU: ' + msg); } };
const ev = (v) => ({ target: { value: v } });
const FALLBACK = 'Ainda não sei responder';

// 1. Seletor e painel
const c = new Component({});
let v = c.renderVals();
ok(v.isSelector && v.startCars.length === 2, 'seletor aparece com 2 carros');
v.startCars[0].pick(); v = c.renderVals();
ok(v.isApp && v.tabHome, 'escolher carro abre o painel');
ok(/R\$/.test(v.k.total) && v.k.consumo !== '—', 'KPIs preenchidos');
ok(/km\/l|km\/kWh/.test(v.k.unidConsumo), 'unidade de consumo');
ok(v.spec.titulo && v.spec.manut && v.spec.custoKm, 'ficha do carro ativo');
console.log('Carro 1:', v.car.modelo, v.car.ano, '| ref', v.ref.misto, v.ref.unidConsumo, '| manut', v.ref.manutAnual, '| custo/km ref', v.ref.custoKm);
console.log('Peças:', v.pecas.map(p => p.item + ' ' + p.falta).join(' · '));
console.log('Destaques:', v.insights.map(i => i.title).join(' · '));

// 2. Assistente
v.goChat(); v = c.renderVals();
for (const q of v.chat.suggestions) q.ask();
['quantos km rodei?', 'e os pneus?', 'qual a ficha do meu carro?', 'correia dentada'].forEach(q => c.send(q));
v = c.renderVals();
const respostas = v.chat.msgs.filter(m => m.isBot);
ok(respostas.length >= v.chat.suggestions.length + 4, 'assistente respondeu tudo');
ok(!respostas.some(m => m.text.startsWith(FALLBACK)), 'nenhuma resposta caiu no "não sei"');

// 3. Registro de abastecimento com validação
v.addFuel(); v = c.renderVals();
v.lf.setValor(ev('230,50')); v = c.renderVals(); v.lf.setLitros(ev('36,5')); v = c.renderVals();
ok(v.lf.hasPreco, 'preço por unidade calculado');
v.lf.save(); v = c.renderVals();
ok(v.lf.hasErr && /odômetro/.test(v.lf.err), 'exige odômetro');
v.lf.setKm(ev('49.400')); v = c.renderVals(); v.lf.save(); v = c.renderVals();
ok(!v.anySheet && v.logCount === '21 registros', 'abastecimento salvo');

// 4. Cadastro: busca, marca → modelo → ano → versão
v.openAddCar(); v = c.renderVals();
ok(v.cf.marcas.length >= 3 && !v.cf.showModelos, 'marcas visíveis e modelos escondidos até filtrar');
v.cf.setBusca(ev('onix')); v = c.renderVals();
ok(v.cf.modelos.some(m => /Onix/.test(m.label)), 'busca acha Onix');
v.cf.setBusca(ev('')); v = c.renderVals();
const marcaEV = v.cf.marcas.find(m => m.label === 'BYD') || v.cf.marcas[0];
marcaEV.pick(); v = c.renderVals();
ok(v.cf.showModelos && v.cf.modelos.length > 0, 'marca filtra modelos');
v.cf.modelos[0].pick(); v = c.renderVals();
ok(v.cf.temModelo && v.cf.anos.length > 0, 'modelo mostra anos');
v.cf.save(); v = c.renderVals();
ok(v.cf.hasErr, 'exige ano');
v.cf.anos[0].pick(); v = c.renderVals();
if (!v.cf.temVersao) { v.cf.versoes[0].pick(); v = c.renderVals(); }
ok(v.cf.temVersao && v.cf.spec.titulo, 'versão mostra a ficha do ano');
console.log('Ficha escolhida:', v.cf.spec.titulo, '·', v.cf.spec.versao, '·', v.cf.spec.consumo, v.cf.spec.unidConsumo, '·', v.cf.spec.manut, '·', v.cf.spec.custoKm);
v.cf.save(); v = c.renderVals();
ok(/quilometragem/.test(v.cf.err), 'exige km');
v.cf.setKm(ev('1.200')); v = c.renderVals(); v.cf.save(); v = c.renderVals();
ok(!v.anySheet && v.noLogs && v.carCount === '3 veículos', 'carro novo salvo e ativo');
if (marcaEV.label === 'BYD') ok(v.lbl.abastecimento === 'Recarga' && v.k.unidConsumo === 'km/kWh', 'carro elétrico usa recarga e km/kWh');
c.send('como está meu consumo?'); c.send('quanto gastei?'); v = c.renderVals();
ok(!v.chat.msgs.some(m => m.isBot && m.text.startsWith(FALLBACK)), 'assistente responde para carro sem registros');

// 5. Base de modelos
v.openModels(); v = c.renderVals();
const total = v.base.lista.length;
ok(total > 0 && v.base.marcas.length > 2, 'base de modelos listada');
v.base.marcas[1].pick(); v = c.renderVals();
ok(v.base.lista.length > 0 && v.base.lista.length < total, 'filtro de marca na base');

// 6. Varre a base inteira: todo modelo × ano × versão precisa gerar números válidos
const cat = c.cat();
let combos = 0;
for (const m of cat.list) {
  for (const ano of c.anosModelo(m)) {
    for (const x of c.versoesAno(m, ano)) {
      combos++;
      const sp = c.resolve(m.id, ano, x.key);
      const okNum = [sp.misto, sp.custoKm, sp.manutAnual, sp.preco].every(n => typeof n === 'number' && isFinite(n) && n > 0);
      if (!okNum) { falhas++; console.log('FALHOU: números inválidos em ' + m.id + ' ' + ano + ' ' + x.v.motor); } else oks++;
      if (sp.custoKm < 0.15 || sp.custoKm > 3) console.log('aviso: custo/km fora do comum em ' + m.id + ' ' + ano + ' ' + x.v.motor + ': ' + sp.custoKm.toFixed(2));
      c.specCard(sp);
    }
    if (!c.versoesAno(m, ano).length) { falhas++; console.log('FALHOU: ' + m.id + ' ' + ano + ' sem versão'); }
  }
}
console.log('Base: ' + cat.list.length + ' modelos, ' + cat.marcas.length + ' marcas, ' + combos + ' combinações ano × versão');

// 7. Variante com 1 veículo
const c1 = new Component({ veiculosIniciais: '1 veículo' });
let v1 = c1.renderVals();
ok(!v1.isSelector, '1 veículo: sem seletor');
v1.newSession(); v1 = c1.renderVals();
ok(!v1.isSelector, '1 veículo: nova sessão não mostra seletor');

console.log('\n' + oks + ' verificações ok, ' + falhas + ' falha(s)');
process.exit(falhas ? 1 : 0);
