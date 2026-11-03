// Monta o script do artboard a partir de logica/logic.js + dados/veiculos.json.
// Uso: node scripts/build.js            (gera prototipo/Main.dc.html)
//      CARZEN_BASE=outro.json node scripts/build.js
// Os estilos B (Cockpit) e C (Pop) ficaram como exploração da fase 1 e não são reconstruídos.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const alvos = ['prototipo/Main.dc.html'];

// De onde veio o consumo: tabela do Inmetro/PBEV, ficha técnica de terceiros ou estimativa.
function tipoFonte(v) {
  if (v.consumoEstimado) return 'estimado';
  // Vale a fonte principal (1ª oração): "Consumo de etiqueta Inmetro (fichacompleta.com.br...)" é ficha técnica.
  const s = String(v.fonteConsumo || '').split(';')[0];
  if (/fichacompleta|ficha t[eé]cnica|carrosnaweb|autoo\.com/i.test(s)) return 'ficha';
  return /inmetro|pbev|conpet/i.test(s) ? 'inmetro' : 'ficha';
}

function baseEmbutida() {
  const file = process.env.CARZEN_BASE || path.join(root, 'dados', 'veiculos.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const data = Array.isArray(raw) ? { atualizadoEm: null, precos: null, modelos: raw } : raw;
  // O app só precisa dos números; as URLs de fonte ficam no JSON do repositório.
  const modelos = data.modelos.map(m => ({
    id: m.id, marca: m.marca, modelo: m.modelo, categoria: m.categoria,
    geracoes: m.geracoes.map(g => ({
      nome: g.nome, anos: g.anos,
      versoes: g.versoes.map(v => {
        const o = { motor: v.motor, combustivel: v.combustivel, consumo: v.consumo, consumoEstimado: !!v.consumoEstimado, fonte: tipoFonte(v) };
        if (v.anos) o.anos = v.anos;
        return o;
      }),
      revisao: { intervaloKm: g.revisao.intervaloKm, intervaloMeses: g.revisao.intervaloMeses, custoMedio: g.revisao.custoMedio, estimado: !!g.revisao.estimado },
      pneu: { medida: g.pneu.medida, precoUnit: g.pneu.precoUnit },
      atencao: (g.atencao || []).map(a => ({ item: a.item, km: a.km, custo: a.custo }))
    }))
  }));
  return { atualizadoEm: data.atualizadoEm, precos: data.precos, modelos };
}

function montarLogica() {
  const logic = fs.readFileSync(path.join(root, 'logica', 'logic.js'), 'utf8').trim();
  if (!logic.includes('/*__BASE__*/null')) throw new Error('Marcador /*__BASE__*/null não encontrado em logica/logic.js');
  const json = JSON.stringify(baseEmbutida()).replace(/<\//g, '<\\/');
  return logic.replace('/*__BASE__*/null', () => json);
}

const script = montarLogica();
for (const alvo of alvos) {
  const file = path.join(root, alvo);
  const html = fs.readFileSync(file, 'utf8');
  const abre = html.search(/<script type="text\/x-dc" data-dc-script[^>]*>/);
  if (abre < 0) throw new Error('Bloco data-dc-script não encontrado em ' + alvo);
  const inicio = html.indexOf('>', abre) + 1;
  const fim = html.indexOf('</script>', inicio);
  const novo = html.slice(0, inicio) + '\n' + script + '\n' + html.slice(fim);
  fs.writeFileSync(file, novo);
  console.log(alvo + ' atualizado (' + Math.round(novo.length / 1024) + ' KB)');
}
