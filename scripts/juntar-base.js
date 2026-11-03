// Junta os arquivos da pesquisa (um por grupo de marcas) em dados/veiculos.json.
// Uso: node scripts/juntar-base.js <pasta-com-os-json>
// Arquivos que começam com "_" são ignorados (amostras de teste).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pasta = process.argv[2];
if (!pasta) { console.error('Uso: node scripts/juntar-base.js <pasta>'); process.exit(1); }

const modelos = [];
for (const f of fs.readdirSync(pasta).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort()) {
  const lista = JSON.parse(fs.readFileSync(path.join(pasta, f), 'utf8'));
  lista.forEach(m => modelos.push(m));
  console.log(f + ': ' + lista.length + ' modelos');
}
modelos.sort((a, b) => (a.marca + ' ' + a.modelo).localeCompare(b.marca + ' ' + b.modelo, 'pt-BR'));

const saida = {
  atualizadoEm: '2026-11-02',
  descricao: 'Base de referência do CarZen: carros mais vendidos no Brasil (novos 2026 e usados 2025), por marca, modelo, geração, ano e versão.',
  rankings: [
    { nome: 'Emplacamentos de novos, acumulado 2026 até 28/out (Fenabrave)', url: 'https://www.car.blog.br/2026/10/carros-mais-vendidos-brasil-outubro-dia-29.html' },
    { nome: 'Usados mais vendidos em 2025 (Fenauto)', url: 'https://www.vrum.com.br/aceleradas/2026/01/7327529-carros-usados-brasil-bate-recorde-de-vendas-em-2025-veja-top-10.html' },
    { nome: 'Usados e picapes usadas, fevereiro de 2025', url: 'https://verificarauto.com.br/carros-e-picapes-usados-mais-vendidos-no-brasil-em-2025/' }
  ],
  precos: { gasolina: 6.49, etanol: 4.11, diesel: 7.35, eletrico: 1.10 },
  precosFontes: {
    gasolina: 'ANP, média nacional da semana de 18 a 24/10/2026 (https://www.combustiveis-anp.com.br/preco-da-gasolina)',
    etanol: 'ANP, média nacional da semana de 11 a 17/10/2026 (https://safras.com.br/?p=89726)',
    diesel: 'Diesel S10, média nacional ANP de out/2026 (https://www.combustiveis-anp.com.br/)',
    eletrico: 'Tarifa residencial B1 Aneel 2026 (R$ 0,85/kWh sem impostos) + ICMS 17,3% e PIS/Cofins 5,2% médios (https://poder360.com.br/poder-infra/aneel-projeta-alta-de-86-na-conta-de-luz-em-2026)'
  },
  metodologia: {
    consumoMisto: '55% cidade + 45% estrada (ciclo combinado do Inmetro/PBEV)',
    manutencaoAnual: 'Para 12.000 km/ano: revisões do plano (o que vencer primeiro, km ou meses) + jogo de pneus a cada 40.000 km + itens de desgaste proporcionais ao km + reserva por idade de 10% ao ano a partir do 4º ano (limite 80%).',
    custoPorKm: 'preço de referência ÷ consumo misto + manutenção anual ÷ 12.000 km'
  },
  modelos
};
fs.mkdirSync(path.join(root, 'dados'), { recursive: true });
fs.writeFileSync(path.join(root, 'dados', 'veiculos.json'), JSON.stringify(saida, null, 2) + '\n');
console.log('dados/veiculos.json: ' + modelos.length + ' modelos');
