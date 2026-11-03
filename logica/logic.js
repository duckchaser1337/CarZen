class Component extends DCLogic {
  // ===== Tema visual: o ÚNICO bloco que muda entre os estilos =====
  theme() {
    return {
      chartH: 132,
      fuel: '#2F5BEA', maint: '#E07A1F',
      good: '#13703F', goodSoft: '#E6F4EC',
      bad: '#B4400C', badSoft: '#FCEEE5',
      info: '#2448C8', infoSoft: '#E9EEFD',
      chipOnBg: '#14161B', chipOnFg: '#FFFFFF', chipOnBd: '#14161B',
      chipOffBg: '#FFFFFF', chipOffFg: '#454B57', chipOffBd: '#E1E4EA',
      navOnFg: '#2448C8', navOnBg: '#E9EEFD', navOffFg: '#5F6573', navOffBg: 'transparent',
      rowOnBd: '#2F5BEA', rowOnBg: '#F3F6FE', rowOffBd: '#E6E8EC', rowOffBg: '#FFFFFF',
      cats: ['#2F5BEA', '#E07A1F', '#7C5CFA', '#0E8F7A', '#C93B6E', '#6B7280'],
      dim: 0.32
    };
  }

  // ===== Base de veículos (dados/veiculos.json, embutida pelo scripts/build.js) =====
  base() { return /*__BASE__*/null; }
  hoje() { return '2026-11-02'; }
  anoAtual() { return Number(this.hoje().slice(0, 4)); }
  precos() {
    const b = this.base();
    return (b && b.precos) || { gasolina: 6.49, etanol: 4.11, diesel: 7.35, eletrico: 1.10 };
  }
  cats() { return ['Revisão', 'Óleo', 'Pneus', 'Freios', 'Elétrica', 'Outros']; }
  cat() {
    if (!this._cat) {
      const b = this.base();
      const list = ((b && b.modelos) || []).slice().sort((x, y) => (x.marca + ' ' + x.modelo).localeCompare(y.marca + ' ' + y.modelo, 'pt-BR'));
      const byId = {};
      list.forEach(m => { byId[m.id] = m; });
      const marcas = Array.from(new Set(list.map(m => m.marca))).sort((x, y) => x.localeCompare(y, 'pt-BR'));
      this._cat = { list, byId, marcas };
    }
    return this._cat;
  }
  anosModelo(m) {
    const s = new Set();
    m.geracoes.forEach(g => { for (let y = Math.max(2012, g.anos[0]); y <= g.anos[1]; y++) s.add(y); });
    return Array.from(s).sort((a, b) => b - a);
  }
  versoesAno(m, ano) {
    const out = [];
    m.geracoes.forEach((g, gi) => {
      if (ano < g.anos[0] || ano > g.anos[1]) return;
      g.versoes.forEach((v, vi) => {
        const a = v.anos || g.anos;
        if (ano >= a[0] && ano <= a[1]) out.push({ key: gi + ':' + vi, g, v });
      });
    });
    return out;
  }
  fonteLabel(t) { return t === 'estimado' ? 'Consumo estimado (sem dado oficial)' : t === 'ficha' ? 'Consumo de ficha técnica' : 'Consumo do Inmetro'; }
  combLabel(c) { return { flex: 'Flex', gasolina: 'Gasolina', diesel: 'Diesel', eletrico: 'Elétrico', hibrido: 'Híbrido' }[c] || c; }
  catLabel(c) { return { hatch: 'Hatch', sedan: 'Sedã', suv: 'SUV', picape: 'Picape', minivan: 'Minivan' }[c] || c; }

  // Resolve marca/modelo/ano/versão em números de referência (estimativa CarZen, 12.000 km/ano)
  resolve(modelId, ano, versao) {
    const k = modelId + '|' + ano + '|' + versao;
    this._spec = this._spec || {};
    if (this._spec[k]) return this._spec[k];
    const c = this.cat();
    const m = c.byId[modelId] || c.list[0];
    let vs = this.versoesAno(m, ano);
    if (!vs.length) { ano = this.anosModelo(m)[0]; vs = this.versoesAno(m, ano); }
    const pick = vs.find(x => x.key === versao) || vs[0];
    const g = pick.g, v = pick.v, comb = v.combustivel;
    const ener = comb === 'eletrico' ? 'eletrico' : comb === 'diesel' ? 'diesel' : 'gasolina';
    const P = this.precos();
    const cidade = v.consumo.cidade[ener], estrada = v.consumo.estrada[ener];
    const misto = cidade * 0.55 + estrada * 0.45; // ciclo combinado do Inmetro
    let etanol = null;
    if (v.consumo.cidade.etanol && v.consumo.estrada.etanol) {
      const em = v.consumo.cidade.etanol * 0.55 + v.consumo.estrada.etanol * 0.45;
      etanol = { cidade: v.consumo.cidade.etanol, estrada: v.consumo.estrada.etanol, misto: em, razao: em / misto };
    }
    const idade = Math.max(0, this.anoAtual() - ano);
    const r = g.revisao;
    const revisoes = Math.max(12000 / r.intervaloKm, 12 / r.intervaloMeses) * r.custoMedio;
    const pneus = 4 * g.pneu.precoUnit * 12000 / 40000;
    const atencao = g.atencao || [];
    const itens = atencao.reduce((s, a) => s + a.custo * 12000 / a.km, 0);
    const fIdade = Math.min(0.8, Math.max(0, idade - 3) * 0.1);
    const imprevistos = (revisoes + pneus + itens) * fIdade;
    const sp = {
      id: m.id, marca: m.marca, modelo: m.modelo, categoria: m.categoria, ano, versao: pick.key,
      motor: v.motor, combustivel: comb, geracao: g.nome, anosGeracao: g.anos,
      energia: ener, unid: ener === 'eletrico' ? 'kWh' : 'L', unidConsumo: ener === 'eletrico' ? 'km/kWh' : 'km/l',
      preco: P[ener], cidade, estrada, misto, etanol,
      consumoEstimado: !!v.consumoEstimado, fonteTipo: v.fonte || (v.consumoEstimado ? 'estimado' : 'inmetro'),
      revisaoKm: r.intervaloKm, revisaoMeses: r.intervaloMeses, custoRevisao: r.custoMedio, revisaoEstimada: !!r.estimado,
      pneuMedida: g.pneu.medida, pneuUnit: g.pneu.precoUnit, pneus: g.pneu.precoUnit * 4,
      atencao, idade, fIdade, manutRevisoes: revisoes, manutPneus: pneus, manutItens: itens, manutImprevistos: imprevistos,
      manutAnual: revisoes + pneus + itens + imprevistos
    };
    sp.custoKm = sp.preco / sp.misto + sp.manutAnual / 12000;
    this._spec[k] = sp;
    return sp;
  }
  spec(car) { return this.resolve(car.modelId, car.ano, car.versao); }
  nomeModelo(m) { return m.marca + ' ' + m.modelo + ' ' + m.motor; }
  words(m) {
    const ev = m.energia === 'eletrico';
    return {
      abast: ev ? 'recarga' : 'abastecimento', Abast: ev ? 'Recarga' : 'Abastecimento', abastecer: ev ? 'Recarregar' : 'Abastecer',
      qtd: ev ? 'kWh' : 'litros', Qtd: ev ? 'kWh' : 'Litros', L: m.unid, comb: ev ? 'energia' : 'combustível', Comb: ev ? 'Energia' : 'Combustível',
      energiaNome: ev ? 'energia elétrica' : m.energia === 'diesel' ? 'diesel' : 'gasolina'
    };
  }

  seedCars() {
    const c = this.cat();
    const pickV = (modelId, ano, re) => {
      const m = c.byId[modelId];
      if (!m) return '0:0';
      // prefere a geração mais nova daquele ano (ex.: Onix 2021 = 2ª geração, não o Onix Joy)
      const vs = this.versoesAno(m, ano).sort((a, b) => b.g.anos[0] - a.g.anos[0]);
      const f = vs.find(x => re.test(x.v.motor)) || vs[0];
      return f ? f.key : '0:0';
    };
    const has = (id) => c.byId[id] ? id : (c.list[0] && c.list[0].id);
    const fuel = (p, rows) => rows.map((r, i) => ({ id: p + 'f' + i, tipo: 'fuel', data: r[0], km: r[1], litros: r[2], preco: r[3], valor: Math.round(r[2] * r[3] * 100) / 100 }));
    const maint = (p, rows) => rows.map((r, i) => ({ id: p + 'm' + i, tipo: 'maint', data: r[0], km: r[1], cat: r[2], desc: r[3], valor: r[4] }));
    return [
      {
        id: 'v-onix', modelId: has('chevrolet-onix'), ano: 2021, versao: pickV('chevrolet-onix', 2021, /^1\.0(?!.*turbo)/i),
        apelido: 'Onix do dia a dia', placa: 'RIO2A19', kmInicial: 42150, inicio: '2026-05-04',
        logs: fuel('o', [
          ['2026-05-06', 42180, 34.2, 6.29], ['2026-05-17', 42630, 36.1, 6.29], ['2026-05-29', 43070, 35.4, 6.35],
          ['2026-06-10', 43530, 37.0, 6.35], ['2026-06-22', 43960, 34.8, 6.39], ['2026-07-03', 44420, 37.6, 6.39],
          ['2026-07-15', 44890, 38.1, 6.45], ['2026-07-27', 45330, 35.5, 6.45], ['2026-08-08', 45790, 37.2, 6.42],
          ['2026-08-21', 46240, 36.4, 6.42], ['2026-09-02', 46690, 36.9, 6.49], ['2026-09-15', 47120, 35.0, 6.49],
          ['2026-09-27', 47580, 37.4, 6.55], ['2026-10-09', 48050, 38.6, 6.55], ['2026-10-21', 48510, 37.9, 6.52],
          ['2026-11-01', 48960, 36.8, 6.49]
        ]).concat(maint('o', [
          ['2026-05-20', 42800, 'Óleo', 'Troca de óleo e filtro', 289.9],
          ['2026-07-08', 44600, 'Pneus', 'Alinhamento e balanceamento', 160],
          ['2026-09-18', 47200, 'Freios', 'Pastilhas de freio dianteiras', 420],
          ['2026-10-12', 48100, 'Elétrica', 'Bateria nova', 549]
        ]))
      },
      {
        id: 'v-compass', modelId: has('jeep-compass'), ano: 2023, versao: pickV('jeep-compass', 2023, /1\.3/),
        apelido: 'Compass da família', placa: 'SPO7C42', kmInicial: 17300, inicio: '2026-05-10',
        logs: fuel('c', [
          ['2026-05-11', 17330, 46.0, 6.29], ['2026-05-26', 17760, 47.5, 6.35], ['2026-06-11', 18200, 48.2, 6.35],
          ['2026-06-27', 18640, 47.0, 6.39], ['2026-07-12', 19090, 49.1, 6.45], ['2026-07-29', 19520, 46.8, 6.45],
          ['2026-08-14', 19970, 48.9, 6.42], ['2026-08-31', 20400, 47.3, 6.49], ['2026-09-16', 20850, 49.0, 6.49],
          ['2026-10-02', 21290, 48.1, 6.55], ['2026-10-18', 21740, 49.6, 6.52], ['2026-10-31', 22160, 46.2, 6.49]
        ]).concat(maint('c', [
          ['2026-06-18', 18450, 'Pneus', 'Pneu dianteiro (1 un.)', 890],
          ['2026-08-05', 19800, 'Outros', 'Higienização do ar-condicionado', 180],
          ['2026-10-07', 21400, 'Outros', 'Palhetas do limpador', 140]
        ]))
      }
    ];
  }

  // ===== Estado (padrões + o que o usuário mudou) =====
  S() {
    const s = this.state || {};
    const n = String(this.props.veiculosIniciais ?? '2 veículos').trim().charAt(0) === '1' ? 1 : 2;
    if (!this._seed || this._seedN !== n) { this._seedN = n; this._seed = this.seedCars().slice(0, n); }
    const cars = s.cars || this._seed;
    return {
      cars,
      activeId: s.activeId || cars[0].id,
      screen: s.screen || (cars.length > 1 ? 'selector' : 'app'),
      tab: s.tab || 'home',
      period: s.period || '30d',
      chartMode: s.chartMode || 'gastos',
      selMonth: s.selMonth ?? 5,
      logFilter: s.logFilter || 'all',
      sheet: s.sheet || null,
      lf: s.lf || null,
      cf: s.cf || null,
      bm: s.bm || { marca: '', busca: '' },
      chats: s.chats || {},
      chatText: s.chatText ?? '',
      typing: !!s.typing,
      toast: s.toast || ''
    };
  }
  active(s) { return s.cars.find(c => c.id === s.activeId) || s.cars[0]; }

  // ===== Formatação =====
  num(v, dec) { return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
  brl(v, dec) { return 'R$ ' + this.num(v, dec ?? 2); }
  kmf(v) { return this.num(Math.round(v)) + ' km'; }
  dt(s) { const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
  days(a, b) { return Math.round((this.dt(b) - this.dt(a)) / 86400000); }
  addDays(s, n) { return new Date(this.dt(s) + n * 86400000).toISOString().slice(0, 10); }
  mesesC() { return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; }
  mesesL() { return ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']; }
  dataCurta(s) { const p = s.split('-').map(Number); return p[2] + ' ' + this.mesesC()[p[1] - 1]; }
  norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  pf(v) {
    let t = String(v ?? '').trim().replace(/[^\d.,]/g, '');
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if ((t.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(t)) t = t.replace(/\./g, '');
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }
  diff(real, ref, higherIsBetter) {
    if (real == null || !ref) return { txt: '', good: true, sign: '' };
    const d = (real / ref - 1) * 100;
    const good = higherIsBetter ? d >= -3 : d <= 3;
    const txt = Math.abs(d) < 1 ? 'na média' : this.num(Math.abs(d)) + '% ' + (d > 0 ? 'acima' : 'abaixo');
    return { txt, good, sign: d > 0 ? '+' : '−' };
  }

  // ===== Cálculos =====
  odoAt(car, date) { let o = car.kmInicial; for (const l of car.logs) if (l.data <= date && l.km > o) o = l.km; return o; }
  odoBefore(car, date) { let o = car.kmInicial; for (const l of car.logs) if (l.data < date && l.km > o) o = l.km; return o; }
  metrics(car, period) {
    const hoje = this.hoje();
    const totalDias = Math.max(1, this.days(car.inicio, hoje));
    const span = period === '30d' ? 30 : period === '90d' ? 90 : totalDias;
    let start = this.addDays(hoje, -span);
    if (start < car.inicio) start = car.inicio;
    const dias = Math.max(1, this.days(start, hoje));
    const logs = car.logs.filter(l => l.data >= start && l.data <= hoje);
    const km = Math.max(0, this.odoAt(car, hoje) - this.odoBefore(car, start));
    let fuel = 0, maint = 0, litros = 0;
    for (const l of logs) { if (l.tipo === 'fuel') { fuel += l.valor; litros += l.litros; } else maint += l.valor; }
    const m = this.spec(car);
    const total = fuel + maint;
    // consumo pelo método do tanque cheio: km entre o 1º e o último abastecimento / quantidade após o 1º
    const fills = logs.filter(l => l.tipo === 'fuel').sort((a, b) => a.km - b.km);
    let consumo = null;
    if (fills.length >= 2) {
      const kmF = fills[fills.length - 1].km - fills[0].km;
      const lt = fills.slice(1).reduce((a, l) => a + l.litros, 0);
      if (kmF > 0 && lt > 0) consumo = kmF / lt;
    }
    return {
      start, dias, totalDias, km, fuel, maint, total, litros, logs, model: m,
      consumo,
      ref: m.misto,
      custoKm: km > 0 ? total / km : null,
      refKm: m.custoKm,
      custoDia: total / dias,
      kmDia: km / dias,
      precoMedio: litros > 0 ? fuel / litros : null
    };
  }
  months(car) {
    const p = this.hoje().split('-').map(Number);
    const out = [];
    for (let i = 6; i >= 1; i--) {
      let mm = p[1] - i, yy = p[0];
      while (mm <= 0) { mm += 12; yy--; }
      const first = yy + '-' + String(mm).padStart(2, '0') + '-01';
      const next = mm === 12 ? (yy + 1) + '-01-01' : yy + '-' + String(mm + 1).padStart(2, '0') + '-01';
      let fuel = 0, maint = 0;
      for (const l of car.logs) if (l.data >= first && l.data < next) { if (l.tipo === 'fuel') fuel += l.valor; else maint += l.valor; }
      const km = Math.max(0, this.odoBefore(car, next) - this.odoBefore(car, first));
      out.push({ mm, yy, fuel, maint, total: fuel + maint, km, custoKm: km ? (fuel + maint) / km : 0 });
    }
    return out;
  }
  revisao(car) {
    const m = this.spec(car);
    const odo = this.odoAt(car, '9999-12-31');
    const iv = m.revisaoKm;
    const next = (Math.floor(odo / iv) + 1) * iv;
    const falta = next - odo;
    const kmDia = this.metrics(car, '90d').kmDia || 33;
    const eta = Math.max(1, Math.round(falta / kmDia));
    return { next, falta, iv, pct: Math.round((1 - falta / iv) * 100), eta, etaDate: this.dataCurta(this.addDays(this.hoje(), eta)), custo: m.custoRevisao, odo };
  }
  pecas(car) {
    const m = this.spec(car), odo = this.odoAt(car, '9999-12-31');
    // Se o usuário já registrou a troca (ex.: "Bateria nova"), conta a partir dali; senão, pelos múltiplos do intervalo.
    const stop = ['troca', 'dianteiras', 'traseiras', 'preventiva', 'versoes', 'manual', 'automatico', 'banhada'];
    const feitos = car.logs.filter(l => l.tipo === 'maint').map(l => ({ km: l.km, t: this.norm(l.desc + ' ' + l.cat) }));
    return m.atencao.map((a, i) => {
      const chave = this.norm(a.item).split(/[^a-z0-9]+/).find(w => w.length >= 5 && !stop.includes(w));
      const ultimo = chave ? feitos.filter(x => x.t.includes(chave)).reduce((mx, x) => Math.max(mx, x.km), 0) : 0;
      const next = ultimo ? ultimo + a.km : (Math.floor(odo / a.km) + 1) * a.km;
      return { id: 'p' + i, item: a.item, km: a.km, custo: a.custo, next, falta: next - odo, registrado: !!ultimo };
    }).sort((x, y) => x.falta - y.falta);
  }
  insights(car, th) {
    const m = this.spec(car), all = this.metrics(car, 'all'), rev = this.revisao(car), out = [];
    const W = this.words(m);
    if (!car.logs.length) {
      out.push({ tone: 'info', title: 'Comece pelo primeiro registro de ' + W.abast, text: 'Com dois registros eu já calculo consumo e custo por km reais. Até lá, uso a base do ' + m.modelo + ' ' + m.ano + '.' });
    } else {
      if (rev.falta <= 2000) out.push({ tone: 'warn', title: 'Revisão em ' + this.kmf(rev.falta), text: 'Previsão para ' + rev.etaDate + ' (~' + rev.eta + ' dias). Custo médio de referência: ' + this.brl(rev.custo, 0) + '.' });
      else out.push({ tone: 'info', title: 'Próxima revisão aos ' + this.kmf(rev.next), text: 'Faltam ' + this.kmf(rev.falta) + ', cerca de ' + rev.eta + ' dias no seu ritmo.' });
      if (all.consumo) {
        const d = (all.consumo / all.ref - 1) * 100;
        if (d < -5) out.push({ tone: 'warn', title: 'Consumo ' + this.num(Math.abs(d)) + '% pior que a referência', text: 'Média de ' + this.num(all.consumo, 1) + ' ' + m.unidConsumo + ' contra ' + this.num(all.ref, 1) + ' ' + m.unidConsumo + ' de referência para o ' + m.modelo + ' ' + m.motor + '. Calibragem e filtro de ar ajudam.' });
        else out.push({ tone: 'good', title: 'Consumo dentro do esperado', text: this.num(all.consumo, 1) + ' ' + m.unidConsumo + ', perto dos ' + this.num(all.ref, 1) + ' ' + m.unidConsumo + ' de referência do ' + m.modelo + ' ' + m.motor + '.' });
      }
    }
    const pc = this.pecas(car)[0];
    if (pc && pc.falta <= 5000) out.push({ tone: 'warn', title: pc.item + (pc.falta >= 0 ? ' em ' + this.kmf(pc.falta) : ': troca vencida'), text: 'Troca típica a cada ' + this.kmf(pc.km) + ' neste ' + m.modelo + '. Custo estimado: ' + this.brl(pc.custo, 0) + '.' });
    if (car.logs.length) {
      const ser = this.months(car), a = ser[4], b = ser[5];
      if (a.total > 0 && b.total > 0) {
        const d = (b.total / a.total - 1) * 100;
        const ml = this.mesesL();
        const puxado = d > 0 && (b.maint - a.maint) > (b.fuel - a.fuel);
        out.push({ tone: d > 10 ? 'warn' : d < -5 ? 'good' : 'info', title: ml[b.mm - 1] + ' custou ' + this.num(Math.abs(d)) + '% ' + (d >= 0 ? 'mais' : 'menos') + ' que ' + ml[a.mm - 1].toLowerCase(), text: this.brl(b.total, 0) + ' contra ' + this.brl(a.total, 0) + (puxado ? ', puxado pela manutenção.' : '.') });
      }
    }
    return out.map((o, i) => Object.assign({ id: 'i' + i }, o, o.tone === 'good' ? { color: th.good, soft: th.goodSoft } : o.tone === 'warn' ? { color: th.bad, soft: th.badSoft } : { color: th.info, soft: th.infoSoft }));
  }
  etanolTxt(m) {
    if (!m.etanol) return '';
    const P = this.precos();
    const lim = Math.round(m.etanol.razao * 100), atual = Math.round(P.etanol / P.gasolina * 100);
    return 'Etanol compensa se custar até ' + lim + '% da gasolina neste motor. Hoje está em ' + atual + '%: ' + (atual <= lim ? 'compensa' : 'gasolina compensa mais') + '.';
  }

  // ===== Assistente (respostas a partir dos registros + base do modelo/ano) =====
  greet(car) {
    const m = this.spec(car);
    const n = car.logs.length;
    return { id: 'g-' + car.id, from: 'bot', text: 'Olá! Sou o assistente do ' + car.apelido + ' (' + this.nomeModelo(m) + ', ' + car.ano + ').\n' + (n ? 'Já analisei ' + n + ' registros seus e a base de referência deste modelo e ano.' : 'Ainda não há registros, então vou usar a base de referência deste modelo e ano.') + ' Pergunte sobre consumo, gastos, revisão, peças de desgaste ou custo por km.' };
  }
  answer(car, q) {
    const t = this.norm(q);
    const m = this.spec(car), all = this.metrics(car, 'all'), m30 = this.metrics(car, '30d'), rev = this.revisao(car);
    const W = this.words(m), u = m.unidConsumo;
    const has = car.logs.length > 0, nome = car.apelido, mod = m.modelo + ' ' + m.ano;
    const ser = this.months(car), ult = ser[5], ml = this.mesesL();
    if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|hey)\b/.test(t)) return this.greet(car).text;
    if (/etanol|alcool|compensa/.test(t)) {
      if (!m.etanol) return 'O ' + this.nomeModelo(m) + ' não é flex, então a comparação etanol × gasolina não se aplica.';
      return this.etanolTxt(m) + '\nReferência com etanol: ' + this.num(m.etanol.cidade, 1) + ' km/l na cidade e ' + this.num(m.etanol.estrada, 1) + ' km/l na estrada.';
    }
    if (/por km|custo.{0,12}km|km.{0,12}custo|custo por quilometro/.test(t)) {
      if (!all.custoKm) return 'Ainda não tenho quilometragem suficiente do ' + nome + '. Pela base, um ' + this.nomeModelo(m) + ' ' + m.ano + ' custa cerca de ' + this.brl(m.custoKm) + ' por km (' + W.comb + ' + manutenção).';
      const d = this.diff(all.custoKm, all.refKm, false);
      return 'Desde ' + this.dataCurta(car.inicio) + ', o ' + nome + ' custou ' + this.brl(all.custoKm) + ' por km rodado (' + this.brl(all.total, 0) + ' em ' + this.kmf(all.km) + ').\nA referência do ' + mod + ' é ' + this.brl(all.refKm) + '/km, então você está ' + d.txt + ' da média.\n' + W.Comb + ': ' + this.brl(all.fuel / all.km) + '/km · Manutenção: ' + this.brl(all.maint / all.km) + '/km.';
    }
    if (/consum|km\/l|kml|kwh|eficien|rendimento|autonomia/.test(t)) {
      if (!all.consumo) return 'Preciso de pelo menos dois registros de ' + W.abast + ' para medir o consumo real. A referência de consumo do ' + this.nomeModelo(m) + ' ' + m.ano + ' é ' + this.num(m.cidade, 1) + ' ' + u + ' na cidade e ' + this.num(m.estrada, 1) + ' ' + u + ' na estrada.';
      const d = this.diff(all.consumo, all.ref, true);
      return 'Seu consumo médio é ' + this.num(all.consumo, 1) + ' ' + u + (m30.consumo ? ' (' + this.num(m30.consumo, 1) + ' nos últimos 30 dias)' : '') + '.\nA referência de consumo do ' + mod + ' ' + m.motor + ' é ' + this.num(all.ref, 1) + ' ' + u + ' em uso misto, então você está ' + d.txt + '.' + (d.good ? '' : '\nSe chegasse à referência, economizaria cerca de ' + this.brl(Math.max(0, all.fuel - all.fuel * all.consumo / all.ref) / all.dias * 30, 0) + ' por mês.');
    }
    if (/correia|embreagem|pastilha|bateria|desgaste|peca|pecas|troca de|fluido|vela/.test(t)) {
      const ps = this.pecas(car);
      if (!ps.length) return 'Não tenho itens de desgaste cadastrados para o ' + mod + '.';
      return 'Itens de desgaste do ' + mod + ' ' + m.motor + ' (intervalos típicos):\n' + ps.map(p => '· ' + p.item + ': a cada ' + this.kmf(p.km) + ', próxima aos ' + this.kmf(p.next) + ' (~' + this.brl(p.custo, 0) + ')').join('\n');
    }
    if (/revis|manutenc|oleo|oficina/.test(t)) {
      const ms = car.logs.filter(l => l.tipo === 'maint').sort((a, b) => b.data.localeCompare(a.data)).slice(0, 2);
      return 'A próxima revisão do ' + mod + ' é aos ' + this.kmf(rev.next) + ' (a cada ' + this.kmf(rev.iv) + ' ou ' + m.revisaoMeses + ' meses). Faltam ' + this.kmf(rev.falta) + ', previsão para ' + rev.etaDate + '.\nCusto médio de referência: ' + this.brl(rev.custo, 0) + '.' + (ms.length ? '\nÚltimas manutenções: ' + ms.map(l => l.desc + ' (' + this.dataCurta(l.data) + ', ' + this.brl(l.valor, 0) + ')').join('; ') + '.' : '');
    }
    if (/particular|versao|motor|geracao|ano do carro|ficha|especifica/.test(t)) {
      return this.nomeModelo(m) + ' ' + m.ano + ' (' + m.geracao + ', ' + this.combLabel(m.combustivel).toLowerCase() + '):\n· Consumo de referência: ' + this.num(m.cidade, 1) + ' ' + u + ' cidade, ' + this.num(m.estrada, 1) + ' ' + u + ' estrada\n· Revisão a cada ' + this.kmf(m.revisaoKm) + ' ou ' + m.revisaoMeses + ' meses, ~' + this.brl(m.custoRevisao, 0) + '\n· Pneus ' + m.pneuMedida + ', ~' + this.brl(m.pneuUnit, 0) + ' cada\n· Manutenção estimada: ' + this.brl(m.manutAnual, 0) + ' por ano (' + m.idade + (m.idade === 1 ? ' ano' : ' anos') + ' de uso)';
    }
    if (/compar|referenc|modelo|outros carros|media do|normal/.test(t)) {
      if (!has) return 'Base de referência do ' + this.nomeModelo(m) + ' ' + m.ano + ':\n· Consumo: ' + this.num(m.cidade, 1) + ' ' + u + ' cidade, ' + this.num(m.estrada, 1) + ' ' + u + ' estrada\n· Manutenção: ' + this.brl(m.manutAnual, 0) + ' por ano\n· Revisão a cada ' + this.kmf(m.revisaoKm) + ' (' + this.brl(m.custoRevisao, 0) + ')';
      const anual = all.maint / all.dias * 365;
      return 'Comparando o ' + nome + ' com a base do ' + mod + ':\n· Consumo: ' + (all.consumo ? this.num(all.consumo, 1) : '—') + ' vs ' + this.num(all.ref, 1) + ' ' + u + (all.consumo ? ' (' + this.diff(all.consumo, all.ref, true).txt + ')' : '') + '\n· Custo por km: ' + (all.custoKm ? this.brl(all.custoKm) : '—') + ' vs ' + this.brl(all.refKm) + (all.custoKm ? ' (' + this.diff(all.custoKm, all.refKm, false).txt + ')' : '') + '\n· Manutenção no ritmo anual: ' + this.brl(anual, 0) + ' vs ' + this.brl(m.manutAnual, 0) + ' (' + this.diff(anual, m.manutAnual, false).txt + ')';
    }
    if (/abastec|recarg|gasolin|diesel|combust|litro|posto|preco/.test(t)) {
      const f = car.logs.filter(l => l.tipo === 'fuel').sort((a, b) => b.data.localeCompare(a.data))[0];
      if (!f) return 'Nenhum registro de ' + W.abast + ' ainda. Para o ' + mod + ', a referência é ' + this.brl(m.preco / m.misto) + ' de ' + W.comb + ' por km com ' + W.energiaNome + ' a ' + this.brl(m.preco) + '/' + m.unid + '.';
      return 'Último registro de ' + W.abast + ': ' + this.num(f.litros, 1) + ' ' + m.unid + ' em ' + this.dataCurta(f.data) + ', ' + this.brl(f.valor) + ' (' + this.brl(f.preco) + '/' + m.unid + ').\nNos últimos 30 dias foram ' + this.num(m30.litros, 0) + ' ' + m.unid + ' e ' + this.brl(m30.fuel, 0) + ' em ' + W.comb + '. Preço médio pago desde o início: ' + this.brl(all.precoMedio) + '/' + m.unid + '.';
    }
    if (/rodei|rodado|quilomet|\bkm\b|distanc|dias|tempo de uso|odometro/.test(t)) {
      return 'O odômetro está em ' + this.kmf(rev.odo) + '. Desde ' + this.dataCurta(car.inicio) + ' (' + all.totalDias + ' dias de uso no app) você rodou ' + this.kmf(all.km) + ', média de ' + this.num(all.kmDia, 0) + ' km por dia.' + (m30.km ? '\nNos últimos 30 dias: ' + this.kmf(m30.km) + '.' : '');
    }
    if (/gast|quanto|despesa|paguei|custo|dinheiro|mes/.test(t)) {
      if (!has) return 'Ainda não há gastos registrados no ' + nome + '. Pela base, rodando 1.000 km por mês um ' + mod + ' custaria cerca de ' + this.brl(m.custoKm * 1000, 0) + ' (' + W.comb + ' + manutenção).';
      return 'Nos últimos 30 dias o ' + nome + ' custou ' + this.brl(m30.total) + ': ' + this.brl(m30.fuel) + ' em ' + W.comb + ' e ' + this.brl(m30.maint) + ' em manutenção.\nEm ' + ml[ult.mm - 1].toLowerCase() + ' foram ' + this.brl(ult.total, 0) + '. Desde ' + this.dataCurta(car.inicio) + ', o total é ' + this.brl(all.total, 0) + ' (' + this.brl(all.custoDia) + ' por dia).';
    }
    if (/pneu|calibr/.test(t)) {
      const p = car.logs.filter(l => l.tipo === 'maint' && l.cat === 'Pneus').sort((a, b) => b.data.localeCompare(a.data))[0];
      return 'O ' + mod + ' usa pneus ' + m.pneuMedida + ', cerca de ' + this.brl(m.pneuUnit, 0) + ' cada (' + this.brl(m.pneus, 0) + ' o jogo).' + (p ? '\nÚltimo serviço de pneus: ' + p.desc.toLowerCase() + ' em ' + this.dataCurta(p.data) + '.' : '') + '\nCalibrar a cada 15 dias ajuda no consumo e na durabilidade.';
    }
    if (/econom|dica|reduz|melhor|gastar menos/.test(t)) {
      const extra = all.consumo && all.consumo < all.ref ? Math.max(0, all.fuel - all.fuel * all.consumo / all.ref) / all.dias * 30 : 0;
      return 'Três dicas para o ' + nome + ':\n1. Calibre os pneus a cada 15 dias.\n2. Evite acelerações fortes e mantenha a revisão em dia (faltam ' + this.kmf(rev.falta) + ').\n3. ' + (m.etanol ? this.etanolTxt(m) : 'Compare o preço por ' + (m.unid === 'L' ? 'litro' : 'kWh') + ': você pagou em média ' + (all.precoMedio ? this.brl(all.precoMedio) : this.brl(m.preco)) + '/' + m.unid + '.') + (extra > 0 ? '\nChegando ao consumo de referência, a economia seria de ~' + this.brl(extra, 0) + ' por mês.' : '');
    }
    return 'Ainda não sei responder isso neste protótipo. Tente perguntar sobre consumo, gastos do mês, próxima revisão, peças de desgaste, etanol × gasolina ou custo por km.';
  }
  send(text) {
    const s = this.S();
    const q = (typeof text === 'string' ? text : s.chatText).trim();
    if (!q || s.typing) return;
    const car = this.active(s), id = car.id;
    const msgs = (s.chats[id] || [this.greet(car)]).concat([{ id: 'u' + Date.now(), from: 'me', text: q }]);
    this.setState({ chats: Object.assign({}, s.chats, { [id]: msgs }), chatText: '', typing: true });
    clearTimeout(this._t);
    this._t = setTimeout(() => {
      const s2 = this.S();
      const car2 = s2.cars.find(c => c.id === id) || car;
      const list = (s2.chats[id] || msgs).concat([{ id: 'b' + Date.now(), from: 'bot', text: this.answer(car2, q) }]);
      this.setState({ chats: Object.assign({}, s2.chats, { [id]: list }), typing: false });
    }, 750);
  }
  flash(text) {
    this.setState({ toast: text });
    clearTimeout(this._tt);
    this._tt = setTimeout(() => this.setState({ toast: '' }), 2400);
  }
  componentWillUnmount() { clearTimeout(this._t); clearTimeout(this._tt); }

  // ===== Ações =====
  openAddLog(tipo) {
    this.setState({ sheet: 'addLog', lf: { tipo, valor: '', litros: '', km: '', data: this.hoje(), cat: 'Revisão', desc: '', err: '' } });
  }
  saveLog() {
    const s = this.S(), f = s.lf;
    if (!f) return;
    const car = this.active(s), odo = this.odoAt(car, '9999-12-31'), W = this.words(this.spec(car));
    const valor = this.pf(f.valor), km = this.pf(f.km), litros = this.pf(f.litros);
    const err = (e) => this.setState({ lf: Object.assign({}, f, { err: e }) });
    if (!(valor > 0)) return err('Informe o valor pago.');
    if (f.tipo === 'fuel' && !(litros > 0)) return err('Informe quantos ' + W.qtd + ' foram ' + (W.L === 'kWh' ? 'carregados.' : 'abastecidos.'));
    if (!(km > 0)) return err('Informe a quilometragem do odômetro.');
    if (km < odo) return err('O odômetro não pode ser menor que o último registro (' + this.kmf(odo) + ').');
    const data = f.data && f.data <= this.hoje() ? f.data : this.hoje();
    const log = f.tipo === 'fuel'
      ? { id: 'n' + Date.now(), tipo: 'fuel', data, km, litros, preco: valor / litros, valor }
      : { id: 'n' + Date.now(), tipo: 'maint', data, km, cat: f.cat, desc: f.desc.trim() || f.cat, valor };
    const cars = s.cars.map(c => c.id === car.id ? Object.assign({}, c, { logs: c.logs.concat([log]) }) : c);
    this.setState({ cars, sheet: null, lf: null });
    this.flash(f.tipo === 'fuel' ? W.Abast + (W.L === 'kWh' ? ' registrada' : ' registrado') : 'Manutenção registrada');
  }
  cfVazio() { return { marca: '', busca: '', modelId: '', ano: 0, versao: '', apelido: '', km: '', placa: '', err: '' }; }
  openAddCar() { this.setState({ sheet: 'addCar', cf: this.cfVazio() }); }
  saveCar() {
    const s = this.S(), f = s.cf;
    if (!f) return;
    const err = (e) => this.setState({ cf: Object.assign({}, f, { err: e }) });
    if (!f.modelId) return err('Escolha a marca e o modelo.');
    if (!f.ano) return err('Escolha o ano do modelo.');
    if (!f.versao) return err('Escolha a versão (motor).');
    const km = this.pf(f.km);
    if (String(f.km).trim() === '' || !(km >= 0)) return err('Informe a quilometragem atual do odômetro.');
    const m = this.resolve(f.modelId, f.ano, f.versao);
    const car = { id: 'v' + Date.now(), modelId: m.id, ano: m.ano, versao: m.versao, apelido: f.apelido.trim() || m.modelo + ' ' + m.ano, placa: f.placa.trim().toUpperCase() || 'SEM PLACA', kmInicial: km, inicio: this.hoje(), logs: [] };
    const cars = s.cars.concat([car]);
    this.setState({ cars, activeId: car.id, screen: 'app', tab: 'home', sheet: null, cf: null, selMonth: 5 });
    this.flash(cars.length === 2 ? 'Pronto! Agora o app pergunta qual carro usar ao abrir' : 'Veículo adicionado à garagem');
  }
  newSession() {
    const s = this.S();
    if (s.cars.length < 2) return this.flash('Cadastre um 2º veículo para ativar o seletor');
    this.setState({ screen: 'selector', sheet: null, tab: 'home' });
  }
  specCard(m) {
    return {
      titulo: m.marca + ' ' + m.modelo + ' ' + m.ano,
      versao: m.motor + ' · ' + this.combLabel(m.combustivel),
      geracao: m.geracao + ' (' + m.anosGeracao[0] + '–' + m.anosGeracao[1] + ')',
      consumo: this.num(m.cidade, 1) + ' cidade · ' + this.num(m.estrada, 1) + ' estrada',
      unidConsumo: m.unidConsumo,
      etanol: m.etanol ? 'Etanol: ' + this.num(m.etanol.cidade, 1) + ' cidade · ' + this.num(m.etanol.estrada, 1) + ' estrada (km/l)' : '',
      etanolTxt: this.etanolTxt(m), hasEtanol: !!m.etanol,
      revisao: 'A cada ' + this.kmf(m.revisaoKm) + ' ou ' + m.revisaoMeses + ' meses · ~' + this.brl(m.custoRevisao, 0) + (m.revisaoEstimada ? ' (estimado)' : ''),
      manut: this.brl(m.manutAnual, 0) + '/ano',
      manutDet: 'Revisões ' + this.brl(m.manutRevisoes, 0) + ' · pneus ' + this.brl(m.manutPneus, 0) + ' · desgaste ' + this.brl(m.manutItens, 0) + (m.manutImprevistos > 0 ? ' · reserva por idade ' + this.brl(m.manutImprevistos, 0) : ''),
      custoKm: this.brl(m.custoKm) + '/km',
      mes1000: this.brl(m.custoKm * 1000, 0) + '/mês',
      pneu: m.pneuMedida + ' · ~' + this.brl(m.pneuUnit, 0) + ' cada',
      idade: m.idade <= 3 ? (m.idade === 0 ? 'Ano atual: ' : m.idade + (m.idade === 1 ? ' ano' : ' anos') + ': ') + 'sem reserva por idade' : m.idade + ' anos de uso: +' + Math.round(m.fIdade * 100) + '% de reserva para reparos',
      fonte: this.fonteLabel(m.fonteTipo),
      itens: m.atencao.map((a, i) => ({ id: 'a' + i, item: a.item, km: 'a cada ' + this.kmf(a.km), custo: '~' + this.brl(a.custo, 0) })),
      hasItens: m.atencao.length > 0
    };
  }

  // ===== Valores para o template =====
  renderVals() {
    const s = this.S(), th = this.theme(), hoje = this.hoje();
    const car = this.active(s), m = this.spec(car), W = this.words(m);
    const mt = this.metrics(car, s.period), all = this.metrics(car, 'all');
    const hasLogs = car.logs.length > 0;
    const rev = this.revisao(car);
    const mc = this.mesesC(), ml = this.mesesL();
    const chip = (on) => ({ on, bg: on ? th.chipOnBg : th.chipOffBg, fg: on ? th.chipOnFg : th.chipOffFg, bd: on ? th.chipOnBd : th.chipOffBd });
    const set = (k) => (e) => this.setState({ [k]: e && e.target ? e.target.value : e });
    const close = () => this.setState({ sheet: null });
    const C = this.cat();

    // navegação
    const tab = (key) => {
      const on = s.tab === key;
      return { on, fg: on ? th.navOnFg : th.navOffFg, bg: on ? th.navOnBg : th.navOffBg, go: () => this.setState({ tab: key, sheet: null }) };
    };

    // veículos
    const row = (c, pick) => {
      const cm = this.spec(c), a = this.metrics(c, 'all'), on = c.id === car.id;
      return {
        id: c.id, apelido: c.apelido, modelo: this.nomeModelo(cm), ano: String(c.ano), placa: c.placa,
        odo: this.kmf(this.odoAt(c, '9999-12-31')), initials: cm.modelo.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase(),
        gasto30: this.brl(this.metrics(c, '30d').total, 0), custoKm: a.custoKm ? this.brl(a.custoKm) + '/km' : 'sem dados',
        registros: c.logs.length + (c.logs.length === 1 ? ' registro' : ' registros'),
        on, bd: on ? th.rowOnBd : th.rowOffBd, bg: on ? th.rowOnBg : th.rowOffBg,
        pick: () => pick(c)
      };
    };
    const pickStart = (c) => this.setState({ activeId: c.id, screen: 'app', tab: 'home', selMonth: 5, sheet: null });
    const pickSwitch = (c) => { this.setState({ activeId: c.id, sheet: null, selMonth: 5 }); this.flash('Perfil ativo: ' + c.apelido); };
    const pickGarage = (c) => { this.setState({ activeId: c.id, tab: 'home', selMonth: 5 }); this.flash('Perfil ativo: ' + c.apelido); };

    // período
    const periods = [['30d', '30 dias'], ['90d', '90 dias'], ['all', 'Tudo']].map(p => Object.assign({ key: p[0], label: p[1], pick: () => this.setState({ period: p[0] }) }, chip(s.period === p[0])));
    const periodLabel = s.period === '30d' ? 'nos últimos 30 dias' : s.period === '90d' ? 'nos últimos 90 dias' : 'desde ' + this.dataCurta(car.inicio);

    // KPIs
    const dc = this.diff(mt.consumo, mt.ref, true), dk = this.diff(mt.custoKm, mt.refKm, false);
    const fuelPct = mt.total ? Math.round(mt.fuel / mt.total * 100) : 0;
    const k = {
      total: this.brl(mt.total, 0), fuel: this.brl(mt.fuel, 0), maint: this.brl(mt.maint, 0),
      km: this.num(mt.km), kmFull: this.kmf(mt.km), dias: String(mt.dias), kmDia: this.num(mt.kmDia, 0),
      custoKm: mt.custoKm != null ? this.brl(mt.custoKm) : '—', custoDia: this.brl(mt.custoDia),
      custoKmRef: this.brl(mt.refKm), custoKmDiff: dk.txt, custoKmGood: dk.good, custoKmColor: dk.good ? th.good : th.bad,
      consumo: mt.consumo ? this.num(mt.consumo, 1) : '—', consumoRef: this.num(mt.ref, 1), unidConsumo: m.unidConsumo,
      consumoDiff: dc.txt, consumoGood: dc.good, consumoColor: dc.good ? th.good : th.bad, hasConsumo: !!mt.consumo, hasCustoKm: mt.custoKm != null,
      precoMedio: mt.precoMedio ? this.brl(mt.precoMedio) : '—', litros: this.num(mt.litros, 0),
      fuelPct: fuelPct + '%', maintPct: (mt.total ? 100 - fuelPct : 0) + '%',
      fuelW: (mt.total ? fuelPct : 0) + '%', maintW: (mt.total ? 100 - fuelPct : 0) + '%',
      registros: String(mt.logs.length)
    };
    const w = (a, b) => { const mx = Math.max(a || 0, b || 0) || 1; return [Math.round((a || 0) / mx * 100) + '%', Math.round((b || 0) / mx * 100) + '%']; };
    const wc = w(mt.consumo, mt.ref), wk = w(mt.custoKm, mt.refKm);
    const cmp = { consumoW: wc[0], consumoRefW: wc[1], custoW: wk[0], custoRefW: wk[1] };

    // gráfico mensal
    const series = this.months(car);
    const sel = Math.min(Math.max(s.selMonth, 0), series.length - 1);
    const mode = s.chartMode;
    const vals = series.map(x => mode === 'km' ? x.km : mode === 'custo' ? x.custoKm : x.total);
    const max = Math.max.apply(null, vals) || 1;
    const H = th.chartH, n = series.length;
    const pts = series.map((x, i) => ({ xp: (i + 0.5) / n * 100, yp: 100 - (vals[i] / max) * 86 - 6 }));
    const line = 'M ' + pts.map(p => p.xp.toFixed(2) + ' ' + p.yp.toFixed(2)).join(' L ');
    const sx = series[sel];
    const chart = {
      isGastos: mode === 'gastos', isKm: mode === 'km', isCusto: mode === 'custo', isBars: mode !== 'custo',
      modes: [['gastos', 'Gastos'], ['km', 'Km rodados'], ['custo', 'R$ por km']].map(p => Object.assign({ key: p[0], label: p[1], pick: () => this.setState({ chartMode: p[0] }) }, chip(mode === p[0]))),
      unit: mode === 'km' ? 'km' : mode === 'custo' ? 'R$/km' : 'R$',
      maxLabel: mode === 'km' ? this.num(max) + ' km' : mode === 'custo' ? this.brl(max) : this.brl(max, 0),
      empty: !series.some(x => x.total > 0 || x.km > 0),
      bars: series.map((x, i) => ({
        id: 'b' + i, label: mc[x.mm - 1], selected: i === sel, op: i === sel ? 1 : th.dim,
        fuelH: Math.round(x.fuel / max * H), maintH: Math.round(x.maint / max * H),
        valH: Math.max(3, Math.round(vals[i] / max * H)),
        short: mode === 'km' ? this.num(x.km) : mode === 'custo' ? this.num(x.custoKm, 2) : this.num(x.total),
        pick: () => this.setState({ selMonth: i })
      })),
      line, area: line + ' L ' + pts[n - 1].xp.toFixed(2) + ' 100 L ' + pts[0].xp.toFixed(2) + ' 100 Z',
      dots: pts.map((p, i) => ({ id: 'd' + i, left: p.xp.toFixed(2) + '%', top: p.yp.toFixed(2) + '%', selected: i === sel, op: i === sel ? 1 : th.dim, pick: () => this.setState({ selMonth: i }) })),
      sel: { label: ml[sx.mm - 1] + ' ' + sx.yy, total: this.brl(sx.total, 0), fuel: this.brl(sx.fuel, 0), maint: this.brl(sx.maint, 0), km: this.kmf(sx.km), custoKm: sx.km ? this.brl(sx.custoKm) : '—' }
    };

    // manutenção por categoria (no período)
    const catMap = {};
    for (const l of mt.logs) if (l.tipo === 'maint') catMap[l.cat] = (catMap[l.cat] || 0) + l.valor;
    const catMax = Math.max.apply(null, Object.values(catMap).concat([1]));
    const allCats = this.cats();
    const catsList = Object.keys(catMap).sort((a, b) => catMap[b] - catMap[a]).map(c => ({ id: c, name: c, total: this.brl(catMap[c], 0), w: Math.round(catMap[c] / catMax * 100) + '%', color: th.cats[Math.max(0, allCats.indexOf(c)) % th.cats.length] }));

    const fuels = car.logs.filter(l => l.tipo === 'fuel').sort((a, b) => b.data.localeCompare(a.data));
    const lf0 = fuels[0];

    // peças de desgaste deste modelo/ano
    const pecas = this.pecas(car).slice(0, 3).map(p => ({ id: p.id, item: p.item, proxima: this.kmf(p.next), falta: p.falta >= 0 ? 'em ' + this.kmf(p.falta) : 'vencida', custo: '~' + this.brl(p.custo, 0), soon: p.falta <= 5000 }));

    // registros
    const groups = [];
    const filtered = car.logs.filter(l => s.logFilter === 'all' || l.tipo === s.logFilter).slice().sort((a, b) => b.data.localeCompare(a.data) || b.km - a.km);
    for (const l of filtered) {
      const key = l.data.slice(0, 7);
      let g = groups[groups.length - 1];
      if (!g || g.key !== key) { const p = key.split('-').map(Number); g = { key, id: key, label: ml[p[1] - 1] + ' ' + p[0], sum: 0, items: [] }; groups.push(g); }
      g.sum += l.valor;
      const isFuel = l.tipo === 'fuel';
      g.items.push({
        id: l.id, isFuel, isMaint: !isFuel, title: isFuel ? W.Abast : l.desc,
        sub: isFuel ? this.num(l.litros, 1) + ' ' + m.unid + ' · ' + this.brl(l.preco) + '/' + m.unid : (l.desc === l.cat ? 'Manutenção' : l.cat),
        km: this.kmf(l.km), valor: this.brl(l.valor), data: this.dataCurta(l.data),
        color: isFuel ? th.fuel : th.cats[Math.max(0, allCats.indexOf(l.cat)) % th.cats.length]
      });
    }
    groups.forEach(g => { g.total = this.brl(g.sum, 0); g.count = g.items.length + (g.items.length === 1 ? ' registro' : ' registros'); });
    const logFilters = [['all', 'Todos'], ['fuel', W.Comb], ['maint', 'Manutenção']].map(p => Object.assign({ key: p[0], label: p[1], pick: () => this.setState({ logFilter: p[0] }) }, chip(s.logFilter === p[0])));

    // formulário de registro
    const f = s.lf || { tipo: 'fuel', valor: '', litros: '', km: '', data: hoje, cat: 'Revisão', desc: '', err: '' };
    const setF = (key) => (e) => { const cur = this.S().lf || f; this.setState({ lf: Object.assign({}, cur, { [key]: e && e.target ? e.target.value : e, err: '' }) }); };
    const pv = this.pf(f.valor), pl = this.pf(f.litros);
    const lf = {
      isFuel: f.tipo === 'fuel', isMaint: f.tipo !== 'fuel', title: f.tipo === 'fuel' ? (W.L === 'kWh' ? 'Nova recarga' : 'Novo abastecimento') : 'Nova manutenção',
      tipos: [['fuel', W.Abast], ['maint', 'Manutenção']].map(p => Object.assign({ key: p[0], label: p[1], pick: () => setF('tipo')(p[0]) }, chip(f.tipo === p[0]))),
      cats: allCats.map(c => Object.assign({ key: c, label: c, pick: () => setF('cat')(c) }, chip(f.cat === c))),
      valor: f.valor, litros: f.litros, km: f.km, data: f.data, desc: f.desc, hoje,
      qtdLabel: W.Qtd, precoLabel: W.L === 'kWh' ? 'Preço por kWh' : 'Preço por litro',
      setValor: setF('valor'), setLitros: setF('litros'), setKm: setF('km'), setData: setF('data'), setDesc: setF('desc'),
      preco: pv > 0 && pl > 0 ? this.brl(pv / pl) + '/' + m.unid : '', hasPreco: pv > 0 && pl > 0,
      kmHint: 'Último registro: ' + this.kmf(rev.odo),
      err: f.err, hasErr: !!f.err, save: () => this.saveLog()
    };

    // formulário de veículo: marca → modelo → ano → versão
    const g0 = s.cf || this.cfVazio();
    const setG = (patch) => { const cur = this.S().cf || g0; this.setState({ cf: Object.assign({}, cur, patch, { err: '' }) }); };
    const setGF = (key) => (e) => setG({ [key]: e && e.target ? e.target.value : e });
    const q = this.norm(g0.busca).trim();
    const temFiltro = !!g0.marca || q.length > 0;
    const modelosF = temFiltro ? C.list.filter(x => (!g0.marca || x.marca === g0.marca) && (!q || this.norm(x.marca + ' ' + x.modelo).includes(q))) : [];
    const anosTxt = (x) => { const a = this.anosModelo(x); return a.length ? (a[a.length - 1] === a[0] ? String(a[0]) : a[a.length - 1] + '–' + a[0]) : ''; };
    const mSel = g0.modelId ? C.byId[g0.modelId] : null;
    const anosSel = mSel ? this.anosModelo(mSel) : [];
    const versSel = mSel && g0.ano ? this.versoesAno(mSel, g0.ano) : [];
    const pickModelo = (x) => {
      const anos = this.anosModelo(x);
      setG({ modelId: x.id, marca: x.marca, ano: anos.length === 1 ? anos[0] : 0, versao: '' });
    };
    const pickAno = (y) => {
      const vs = mSel ? this.versoesAno(mSel, y) : [];
      setG({ ano: y, versao: vs.length === 1 ? vs[0].key : '' });
    };
    const multiGen = versSel.length > 1 && new Set(versSel.map(x => x.g.nome)).size > 1;
    const spSel = mSel && g0.ano && g0.versao ? this.resolve(mSel.id, g0.ano, g0.versao) : null;
    const cf = {
      busca: g0.busca, setBusca: (e) => setG({ busca: e && e.target ? e.target.value : e, modelId: '', ano: 0, versao: '' }),
      marcas: C.marcas.map(x => Object.assign({ id: x, label: x, pick: () => setG({ marca: g0.marca === x ? '' : x, modelId: '', ano: 0, versao: '' }) }, chip(g0.marca === x))),
      showModelos: temFiltro, semModelos: temFiltro && modelosF.length === 0,
      modelos: modelosF.slice(0, 24).map(x => Object.assign({ id: x.id, label: (g0.marca ? '' : x.marca + ' ') + x.modelo, sub: this.catLabel(x.categoria) + ' · ' + anosTxt(x), pick: () => pickModelo(x) }, chip(g0.modelId === x.id))),
      modeloNome: mSel ? mSel.marca + ' ' + mSel.modelo : '',
      temModelo: !!mSel,
      anos: anosSel.map(y => Object.assign({ id: 'y' + y, label: String(y), pick: () => pickAno(y) }, chip(g0.ano === y))),
      temAno: !!(mSel && g0.ano),
      versoes: versSel.map(x => Object.assign({ id: x.key, label: x.v.motor + ' · ' + this.combLabel(x.v.combustivel), sub: (multiGen ? x.g.nome + ' · ' : '') + this.fonteLabel(x.v.fonte || (x.v.consumoEstimado ? 'estimado' : 'inmetro')).toLowerCase(), pick: () => setG({ versao: x.key }) }, chip(g0.versao === x.key))),
      temVersao: !!spSel,
      spec: spSel ? this.specCard(spSel) : this.specCard(m),
      apelido: g0.apelido, km: g0.km, placa: g0.placa,
      setApelido: setGF('apelido'), setKm: setGF('km'), setPlaca: setGF('placa'),
      passo: !mSel ? 'Escolha a marca ou busque o modelo' : !g0.ano ? 'Agora o ano do modelo' : !spSel ? 'Agora a versão (motor)' : 'Confira os custos de referência deste ano',
      err: g0.err, hasErr: !!g0.err, save: () => this.saveCar(),
      enablesSelector: s.cars.length === 1
    };

    // base de modelos (folha de consulta)
    const bm = s.bm;
    const bq = this.norm(bm.busca).trim();
    const setBm = (patch) => this.setState({ bm: Object.assign({}, this.S().bm, patch) });
    const baseList = C.list.filter(x => (!bm.marca || x.marca === bm.marca) && (!bq || this.norm(x.marca + ' ' + x.modelo).includes(bq)));
    const baseRows = baseList.map(x => {
      const anos = this.anosModelo(x);
      const sp = this.resolve(x.id, anos[0], '');
      let lo = Infinity, hi = 0, nv = 0;
      x.geracoes.forEach(gg => gg.versoes.forEach(vv => {
        nv++;
        const e = vv.combustivel === 'eletrico' ? 'eletrico' : vv.combustivel === 'diesel' ? 'diesel' : 'gasolina';
        const mx = vv.consumo.cidade[e] * 0.55 + vv.consumo.estrada[e] * 0.45;
        lo = Math.min(lo, mx); hi = Math.max(hi, mx);
      }));
      return {
        id: x.id, nome: x.marca + ' ' + x.modelo, sub: this.catLabel(x.categoria) + ' · ' + anosTxt(x) + ' · ' + nv + (nv === 1 ? ' versão' : ' versões'),
        consumo: (Math.abs(hi - lo) < 0.05 ? this.num(lo, 1) : this.num(lo, 1) + '–' + this.num(hi, 1)) + ' ' + sp.unidConsumo,
        custoKm: this.brl(sp.custoKm) + '/km', manut: this.brl(sp.manutAnual, 0) + '/ano', anoRef: String(anos[0]),
        mine: s.cars.some(c => c.modelId === x.id)
      };
    });
    const base = {
      busca: bm.busca, setBusca: (e) => setBm({ busca: e && e.target ? e.target.value : e }),
      marcas: [''].concat(C.marcas).map(x => Object.assign({ id: x || 'todas', label: x || 'Todas', pick: () => setBm({ marca: x }) }, chip(bm.marca === x))),
      lista: baseRows, vazio: baseRows.length === 0,
      resumo: baseRows.length + (baseRows.length === 1 ? ' modelo' : ' modelos') + ' · ' + C.marcas.length + ' marcas na base'
    };
    const P = this.precos();
    const precosTxt = 'Preços de referência: gasolina ' + this.brl(P.gasolina) + '/L, etanol ' + this.brl(P.etanol) + '/L, diesel ' + this.brl(P.diesel) + '/L e energia ' + this.brl(P.eletrico) + '/kWh. Consumo misto: 55% cidade e 45% estrada (Inmetro). Manutenção para 12.000 km/ano. Números do ano mais recente de cada modelo.';

    // chat
    const msgs = (s.chats[car.id] || [this.greet(car)]).map(x => ({ id: x.id, isBot: x.from === 'bot', isMe: x.from === 'me', text: x.text }));
    const chat = {
      msgs: msgs.slice().reverse(), typing: s.typing, text: s.chatText,
      setText: set('chatText'), send: () => this.send(),
      onKey: (e) => { if (e && e.key === 'Enter') { e.preventDefault(); this.send(); } },
      suggestions: ['Como está meu consumo?', 'Quanto gastei este mês?', 'Quando é a próxima revisão?', 'Quais peças trocar logo?', 'Etanol compensa?', 'Qual meu custo por km?', 'Compare com a referência', 'Dicas para economizar'].filter(x => m.etanol || x !== 'Etanol compensa?').map((x, i) => ({ id: 'q' + i, label: x, ask: () => this.send(x) }))
    };

    const multi = s.cars.length > 1;
    return {
      th,
      isSelector: s.screen === 'selector', isApp: s.screen !== 'selector',
      nav: { home: tab('home'), logs: tab('logs'), chat: tab('chat'), garage: tab('garage') },
      tabHome: s.tab === 'home', tabLogs: s.tab === 'logs', tabChat: s.tab === 'chat', tabGarage: s.tab === 'garage',
      multi, carCount: s.cars.length + (s.cars.length === 1 ? ' veículo' : ' veículos'),
      car: { apelido: car.apelido, modelo: this.nomeModelo(m), marca: m.marca, ano: String(car.ano), placa: car.placa, odo: this.kmf(rev.odo), dias: String(all.totalDias), inicio: this.dataCurta(car.inicio), initials: m.modelo.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() },
      lbl: { fuel: W.Comb, abastecer: W.abastecer, abastecimento: W.Abast, ultimo: (W.L === 'kWh' ? 'Última ' : 'Último ') + W.abast, primeiro: 'Registrar ' + (W.L === 'kWh' ? 'primeira recarga' : 'primeiro abastecimento') },
      cars: s.cars.map(c => row(c, pickGarage)),
      startCars: s.cars.map(c => row(c, pickStart)),
      switchCars: s.cars.map(c => row(c, pickSwitch)),
      hasLogs, noLogs: !hasLogs,
      periods, periodLabel, k, cmp, chart,
      cats: catsList, hasCats: catsList.length > 0,
      pecas, hasPecas: pecas.length > 0,
      lastFuel: lf0 ? { data: this.dataCurta(lf0.data), litros: this.num(lf0.litros, 1) + ' ' + m.unid, valor: this.brl(lf0.valor), preco: this.brl(lf0.preco) + '/' + m.unid } : { data: '', litros: '', valor: '', preco: '' },
      hasLastFuel: !!lf0,
      rev: { next: this.kmf(rev.next), falta: this.kmf(rev.falta), pct: rev.pct, pctW: rev.pct + '%', eta: rev.eta + ' dias', etaDate: rev.etaDate, custo: this.brl(rev.custo, 0), iv: this.kmf(rev.iv), soon: rev.falta <= 2000 },
      insights: this.insights(car, th),
      ref: { nome: this.nomeModelo(m) + ' ' + m.ano, modelo: m.modelo + ' ' + m.ano, cidade: this.num(m.cidade, 1), estrada: this.num(m.estrada, 1), misto: this.num(m.misto, 1), unidConsumo: m.unidConsumo, manutAnual: this.brl(m.manutAnual, 0), custoRevisao: this.brl(m.custoRevisao, 0), revisaoKm: this.kmf(m.revisaoKm), custoKm: this.brl(m.custoKm), mes1000: this.brl(m.custoKm * 1000, 0), fuelMes: this.brl(m.preco / m.misto * 1000, 0), maintMes: this.brl(m.manutAnual / 12, 0), pneus: this.brl(m.pneus, 0), preco: this.brl(m.preco) + '/' + m.unid, energiaNome: W.energiaNome },
      spec: this.specCard(m),
      base, precosTxt,
      groups, logFilters, noGroups: groups.length === 0, logCount: car.logs.length + ' registros',
      lf, cf, chat,
      sheetAddLog: s.sheet === 'addLog', sheetAddCar: s.sheet === 'addCar', sheetSwitch: s.sheet === 'switch', sheetModels: s.sheet === 'models', sheetSpec: s.sheet === 'spec', anySheet: !!s.sheet,
      closeSheet: close,
      openSwitch: () => multi ? this.setState({ sheet: 'switch' }) : this.setState({ tab: 'garage', sheet: null }),
      openModels: () => this.setState({ sheet: 'models' }),
      openSpec: () => this.setState({ sheet: 'spec' }),
      openAddCar: () => this.openAddCar(),
      addFuel: () => this.openAddLog('fuel'),
      addMaint: () => this.openAddLog('maint'),
      goChat: () => this.setState({ tab: 'chat', sheet: null }),
      goLogs: () => this.setState({ tab: 'logs', sheet: null }),
      goGarage: () => this.setState({ tab: 'garage', sheet: null }),
      newSession: () => this.newSession(),
      sessionHint: multi ? 'Com ' + s.cars.length + ' veículos, o app pergunta qual carro usar sempre que é aberto.' : 'Ao cadastrar o 2º veículo, o app passa a perguntar qual carro usar ao abrir.',
      toast: { show: !!s.toast, text: s.toast },
      hoje: this.dataCurta(hoje)
    };
  }
}
