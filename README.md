# CarZen

App mobile de gestão veicular para uso diário de pessoa física. Este repositório guarda a **fase de protótipo**: três estilos visuais interativos de uma tela de celular (390 × 844), todos com a mesma lógica.

## O que o protótipo faz

- **Seleção de perfil por veículo**: a partir do 2º carro cadastrado, toda abertura do app pergunta qual carro usar, e todas as métricas passam a refletir o carro escolhido. "Simular nova sessão", na Garagem, mostra o seletor de novo.
- **Painel**: gasto total, combustível vs. manutenção, km rodados, dias de uso, custo por km e por dia, e consumo médio (método do tanque cheio). Tem filtros de 30 dias, 90 dias ou tudo.
- **Gráfico de 6 meses**: mostra gastos, km rodados ou R$ por km; toque num mês para ver o detalhe.
- **Revisão e alertas**: próxima revisão pelo intervalo do modelo e pelo ritmo de uso, além de destaques automáticos (consumo abaixo da referência, mês mais caro…).
- **Cadastro por marca → modelo → ano → versão**: busca por nome ou filtro por marca. Ao escolher o ano e a versão (motor), o app mostra as particularidades daquele carro: consumo, revisão, pneus, itens de desgaste, reserva por idade e se o etanol compensa.
- **Base de veículos**: 59 modelos de 14 marcas, os mais vendidos no Brasil entre novos e usados (detalhes abaixo). Alimenta o painel, a comparação "você vs. referência" e a estimativa de gastos de carros sem registros.
- **Peças de desgaste**: próximas trocas do modelo/ano (correia, embreagem, bateria, pastilhas, fluido de câmbio…), contadas a partir da última troca registrada pelo usuário.
- **Registros**: abastecimentos (ou recargas, nos elétricos) e manutenções, com validação, preço por litro/kWh calculado e lista agrupada por mês.
- **Assistente**: chat que responde sobre consumo, gastos, revisão, peças, etanol × gasolina, custo por km e dicas, cruzando os registros do carro ativo com a base do modelo e ano.

## Estilos

| Arquivo | Estilo | Ideia |
| --- | --- | --- |
| `prototipo/Main.dc.html` | **A · Clean** (escolhido) | Claro e minimalista, em azul-cobalto. Formulários de dados no layout do estilo B. |
| `prototipo/Cockpit.dc.html` | B · Cockpit | Escuro, inspirado em painel de carro, com velocímetro de custo por km e números monoespaçados. |
| `prototipo/Pop.dc.html` | C · Pop | Colorido e neo-brutalista: blocos de cor, bordas grossas e sombras chapadas. |

## Rodar localmente

Requer Node 18+.

```bash
npm install
npm start
```

Abra http://localhost:5173 para ver os 3 estilos lado a lado. Cada um também abre sozinho em `/prototipo/Main.dc.html`, `/prototipo/Cockpit.dc.html` e `/prototipo/Pop.dc.html`. No topo da página, "1 veículo" mostra o fluxo de quem só tem um carro.

Para testar no celular pela rede local, rode `HOST=0.0.0.0 npm start` (no PowerShell: `$env:HOST='0.0.0.0'; npm start`) e acesse `http://<ip-do-computador>:5173`. A porta muda com `PORT`.

Os erros `<path> attribute d: Expected moveto…` no console são esperados. Eles vêm do navegador lendo o template cru antes do runtime assumir e não afetam nada.

## Base de veículos (`dados/veiculos.json`)

**Quais carros:** os mais emplacados zero km em 2026 (acumulado até outubro, Fenabrave) somados aos usados mais vendidos em 2025 (Fenauto), incluindo picapes, elétricos e híbridos:

| Marca | Modelos |
| --- | --- |
| BYD | Dolphin, Dolphin Mini, Song Plus, Song Pro |
| Caoa Chery | Tiggo 7 |
| Chevrolet | Celta, Montana, Onix, Onix Plus, Prisma, S10, Spin, Tracker |
| Fiat | Argo, Cronos, Fastback, Mobi, Palio, Pulse, Strada, Toro, Uno |
| Ford | EcoSport, Fiesta, Ka, Ranger |
| GWM | Haval H6 |
| Honda | City, City Hatchback, Civic, Fit, HR-V |
| Hyundai | Creta, HB20, HB20S |
| Jeep | Compass, Renegade |
| Nissan | Kicks, Versa |
| RAM | Rampage |
| Renault | Duster, Kwid, Logan, Sandero |
| Toyota | Corolla, Corolla Cross, Etios, Etios Sedan, Hilux, Yaris Cross |
| Volkswagen | Fox, Gol, Nivus, Polo, Saveiro, T-Cross, Tera, Virtus, Voyage |

São 128 gerações e 359 versões, cobrindo os anos-modelo de 2012 (ou do lançamento) até 2026/2027: 1.470 combinações de ano × versão.

**O que cada versão traz:** consumo cidade/estrada (gasolina e etanol nos flex, diesel, ou km/kWh nos elétricos), intervalo e custo médio de revisão, medida e preço de pneu, e itens de desgaste com km típico e custo. Cada geração tem as URLs das fontes.

**De onde vêm os números:**
- **Consumo:** tabelas do Inmetro/PBEV sempre que possível. Quando o número veio de ficha técnica de terceiros ou foi estimado, a versão é marcada assim, e o app mostra "Consumo de ficha técnica" ou "Consumo estimado" em vez de "Consumo do Inmetro".
- **Revisões:** a maior parte é estimada, marcada com `estimado: true`. As tabelas de preço fixo das montadoras quase nunca são públicas.
- **Pneus e itens de desgaste:** são estimativas de preço de oficina.

**Como o app calcula:** consumo misto = 55% cidade + 45% estrada (ciclo do Inmetro). A manutenção anual (12.000 km/ano) soma revisões, um jogo de pneus a cada 40.000 km, os itens de desgaste proporcionais ao km e uma reserva por idade de +10% ao ano a partir do 4º ano (limite de 80%). O custo/km soma preço de referência ÷ consumo misto e manutenção ÷ 12.000.

**Preços de referência (out/2026):** gasolina R$ 6,49 e etanol R$ 4,11 (médias ANP), diesel S10 R$ 7,35, energia R$ 1,10/kWh (Aneel + impostos médios). As fontes estão em `dados/veiculos.json`.

**Para atualizar:** edite `dados/veiculos.json`, depois rode:

```bash
npm run build
```

```bash
npm test
```

## Estrutura

```
prototipo/   artboards (.dc.html), canvas.json, support.js (runtime local) e index.html (galeria)
logica/      logic.js: lógica do app; a base entra no lugar de /*__BASE__*/ no build
dados/       veiculos.json: base de veículos com fontes
scripts/     serve.js (servidor), build.js (embute lógica + base no Main.dc.html), juntar-base.js,
             validar-base.js, test.js, check.js e splice.js
```

Os arquivos `.dc.html` são artboards do canvas de Design do Claude. Dentro do canvas, o `support.js` vem do próprio canvas. Fora dele, `prototipo/support.js` faz esse papel: interpreta o formato (`{{ }}`, `<sc-if>`, `<sc-for>`, `class Component extends DCLogic`) e renderiza com React 18.

O estilo A (`Main.dc.html`) é gerado pelo `npm run build`. Os estilos B e C ficaram como exploração da fase 1, com a lógica e a base antigas (10 modelos).

## Testes

```bash
npm test
```

Ele roda três verificações:
- **`validar-base.js`:** checa a estrutura e as faixas plausíveis da base.
- **`test.js`:** simula as telas, o cadastro marca → modelo → ano → versão e o assistente, e calcula todas as 1.470 combinações da base.
- **`check.js`:** confere tags fechadas e bindings `{{ }}` válidos no artboard.

## Limitações do protótipo

- A base é uma referência para o protótipo. O consumo vem majoritariamente do Inmetro, mas revisões, pneus e peças são em boa parte estimativas.
- Na Chevrolet, os anos 2013–2015 reaproveitam o consumo do Inmetro de 2016 para o mesmo motor, porque a marca só entrou no programa em 2016.
- Nos híbridos plug-in (Compass 4xe, BYD Song), o consumo oficial pressupõe bateria carregada. Sem recarga, o consumo real é bem menor.
- O assistente funciona por palavras-chave. A versão real usaria um modelo de linguagem com os mesmos dados.
- A data "de hoje" está fixa em 2 nov 2026 para os dados de exemplo ficarem coerentes.
- Os dados ficam só na memória da tela: não há persistência nem backend.
