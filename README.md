# CarZen

App mobile de gestão veicular para uso diário de pessoa física. Este repositório guarda a **fase de protótipo**: três estilos visuais interativos de uma tela de celular (390 × 844), todos com a mesma lógica.

## O que o protótipo faz

- **Seleção de perfil por veículo**: a partir do 2º carro cadastrado, toda abertura do app pergunta qual carro usar, e todas as métricas passam a refletir o carro escolhido. "Simular nova sessão", na Garagem, mostra o seletor de novo.
- **Painel**: gasto total, combustível vs. manutenção, km rodados, dias de uso, custo por km e por dia, e consumo médio (método do tanque cheio). Tem filtros de 30 dias, 90 dias ou tudo.
- **Gráfico de 6 meses**: mostra gastos, km rodados ou R$ por km; toque num mês para ver o detalhe.
- **Revisão e alertas**: próxima revisão pelo intervalo do modelo e pelo ritmo de uso, além de destaques automáticos (consumo abaixo da referência, mês mais caro…).
- **Base de modelos**: 10 carros conhecidos com consumo cidade/estrada, manutenção anual, intervalo e custo de revisão, e custo de pneus. Serve para comparar "você vs. média do modelo" e estimar gastos de um carro sem registros.
- **Registros**: abastecimentos e manutenções, com validação, preço por litro calculado e lista agrupada por mês.
- **Assistente**: chat que responde sobre consumo, gastos, revisão, custo por km, pneus e dicas, cruzando os registros do carro ativo com a base do modelo.

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

## Estrutura

```
prototipo/   artboards (.dc.html), canvas.json, support.js (runtime local) e index.html (galeria)
logica/      logic.js: dados de exemplo, base de modelos, métricas e assistente (compartilhado pelos 3 estilos)
scripts/     serve.js (servidor local), test.js, check.js e splice.js
```

Os arquivos `.dc.html` são artboards do canvas de Design do Claude. Dentro do canvas, o `support.js` vem do próprio canvas. Fora dele, `prototipo/support.js` faz esse papel: interpreta o formato (`{{ }}`, `<sc-if>`, `<sc-for>`, `class Component extends DCLogic`) e renderiza com React 18. Cada artboard tem uma cópia embutida da lógica; só a função `theme()` muda entre eles (o Cockpit também acrescenta valores para o velocímetro).

## Testes

```bash
node scripts/test.js logica/logic.js          # simula telas, formulários, troca de perfil e o assistente
node scripts/check.js prototipo/Main.dc.html  # tags fechadas, bindings {{ }} válidos, lógica embutida executável
```

## Limitações do protótipo

- Os números da base de modelos são **estimativas** para o protótipo, não dados oficiais. A gasolina de referência é R$ 6,29/L e o uso misto considera 60% cidade.
- O assistente funciona por palavras-chave. A versão real usaria um modelo de linguagem com os mesmos dados.
- A data "de hoje" está fixa em 2 nov 2026 para os dados de exemplo ficarem coerentes.
- Os dados ficam só na memória da tela: não há persistência nem backend.
