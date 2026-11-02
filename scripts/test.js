// Testa a lógica do app em Node (simula telas, formulários, troca de perfil e o assistente)
// Uso: node scripts/test.js logica/logic.js
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
global.setTimeout = (fn) => { fn(); return 1; }; // run timers immediately
class DCLogic { constructor(props) { this.props = props || {}; } setState(p) { this.state = Object.assign({}, this.state || {}, typeof p === 'function' ? p(this.state) : p); } }
const Component = new Function('DCLogic', src + '\nreturn Component;')(DCLogic);
const c = new Component({});
let v = c.renderVals();
console.log('screen selector?', v.isSelector, 'cars', v.startCars.map(x => x.apelido + ' ' + x.odo + ' ' + x.custoKm + ' ' + x.gasto30));
v.startCars[0].pick(); v = c.renderVals();
console.log('app?', v.isApp, v.car, v.k, v.cmp);
console.log('chart', v.chart.bars.map(b => [b.label, b.fuelH, b.maintH, b.valH, b.short]), v.chart.sel, v.chart.maxLabel);
console.log('rev', v.rev); console.log('insights', v.insights.map(i => i.tone + ': ' + i.title + ' | ' + i.text));
console.log('cats', v.cats); console.log('lastFuel', v.lastFuel);
v.periods[2].pick(); v = c.renderVals(); console.log('all period', v.periodLabel, v.k);
v.chart.modes[2].pick(); v = c.renderVals(); console.log('custo line', v.chart.line, v.chart.dots.map(d => d.top), v.chart.maxLabel);
console.log('groups', v.groups.map(g => g.label + ' ' + g.total + ' ' + g.count), v.groups[0].items[0]);
for (const q of v.chat.suggestions) { q.ask(); }
['oi', 'quantos km rodei?', 'e os pneus?', 'qual o preço da gasolina que paguei?', 'blabla'].forEach(q => c.send(q));
v = c.renderVals();
console.log('\nCHAT ----'); v.chat.msgs.slice().reverse().forEach(m => console.log((m.isBot ? 'BOT: ' : 'EU:  ') + m.text));
// add log
v.addFuel(); v = c.renderVals(); v.lf.setValor({ target: { value: '230,50' } }); v = c.renderVals(); v.lf.setLitros({ target: { value: '36,5' } }); v = c.renderVals(); console.log('preco calc', v.lf.preco);
v.lf.save(); v = c.renderVals(); console.log('err', v.lf.err);
v.lf.setKm({ target: { value: '49.400' } }); v = c.renderVals(); v.lf.save(); v = c.renderVals(); console.log('sheet closed', !v.anySheet, 'toast', v.toast, 'count', v.logCount);
v.addMaint(); v = c.renderVals(); v.lf.cats[0].pick(); v = c.renderVals(); v.lf.setValor({target:{value:'760'}}); v=c.renderVals(); v.lf.setKm({target:{value:'49400'}}); v=c.renderVals(); v.lf.save(); v=c.renderVals(); console.log('maint saved', v.toast, v.groups[0].items.slice(0,2).map(i=>i.title+' '+i.sub+' '+i.valor));
// switch
v.openSwitch(); v = c.renderVals(); console.log('switch sheet', v.sheetSwitch); v.switchCars[1].pick(); v = c.renderVals(); console.log('active', v.car.apelido, v.k.total, v.k.consumo, v.k.consumoDiff, v.rev.falta);
v.goChat(); v = c.renderVals(); console.log('compass chat first', v.chat.msgs[0].text);
// add car
v.openAddCar(); v = c.renderVals(); v.cf.models[0].pick(); v = c.renderVals(); console.log(v.cf.sel); v.cf.save(); v = c.renderVals(); console.log('err', v.cf.err);
v.cf.setKm({target:{value:'1200'}}); v=c.renderVals(); v.cf.setApelido({target:{value:'Mobi novo'}}); v=c.renderVals(); v.cf.save(); v=c.renderVals();
console.log('new car', v.car, v.noLogs, v.k, v.insights.map(i=>i.title), v.rev, v.chart.empty, v.toast);
c.send('como está meu consumo?'); c.send('qual meu custo por km?'); c.send('quanto gastei?'); c.send('compare com a referencia'); v=c.renderVals(); v.chat.msgs.slice().reverse().forEach(m => console.log((m.isBot ? 'BOT: ' : 'EU:  ') + m.text));
v.newSession(); v=c.renderVals(); console.log('selector again', v.isSelector, v.startCars.length);
// 1-vehicle variant
const c1 = new Component({ veiculosIniciais: '1 veículo' }); let v1 = c1.renderVals(); console.log('1 car: selector?', v1.isSelector, v1.sessionHint);
v1.newSession(); v1 = c1.renderVals(); console.log(v1.toast);
v1.openAddCar(); v1=c1.renderVals(); v1.cf.setKm({target:{value:'5000'}}); v1=c1.renderVals(); v1.cf.save(); v1=c1.renderVals(); console.log('after add', v1.isApp, v1.toast, v1.multi, v1.sessionHint);
v1.newSession(); v1=c1.renderVals(); console.log('selector now', v1.isSelector);
