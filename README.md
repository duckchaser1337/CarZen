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

## Estrutura

```
prototipo/   artboards do canvas de design (.dc.html) e o índice canvas.json
logica/      logic.js: dados de exemplo, base de modelos, métricas e assistente (compartilhado pelos 3 estilos)
scripts/     test.js, check.js e splice.js (testes e utilitários em Node)
```

Os arquivos `.dc.html` são artboards do canvas de Design do Claude e dependem do runtime do canvas (`support.js`), então **não abrem direto no navegador**. Cada artboard tem uma cópia embutida da lógica; só a função `theme()` muda entre eles (o Cockpit também acrescenta valores para o velocímetro).

## Testes

Requer Node 18+.

```bash
node scripts/test.js logica/logic.js          # simula telas, formulários, troca de perfil e o assistente
node scripts/check.js prototipo/Main.dc.html  # tags fechadas, bindings {{ }} válidos, lógica embutida executável
```

## Limitações do protótipo

- Os números da base de modelos são **estimativas** para o protótipo, não dados oficiais. A gasolina de referência é R$ 6,29/L e o uso misto considera 60% cidade.
- O assistente funciona por palavras-chave. A versão real usaria um modelo de linguagem com os mesmos dados.
- A data "de hoje" está fixa em 2 nov 2026 para os dados de exemplo ficarem coerentes.
- Os dados ficam só na memória da tela: não há persistência nem backend.
