// Insere logica/logic.js no lugar do marcador /*__LOGIC__*/ de um artboard .dc.html
// Uso: node scripts/splice.js prototipo/Arquivo.dc.html
const fs = require('fs');
const path = require('path');
const file = process.argv[2];
if (!file) { console.error('Uso: node scripts/splice.js <artboard.dc.html>'); process.exit(1); }
let html = fs.readFileSync(file, 'utf8');
const logic = fs.readFileSync(path.join(__dirname, '..', 'logica', 'logic.js'), 'utf8').trim();
if (!html.includes('/*__LOGIC__*/')) { console.log('Marcador /*__LOGIC__*/ não encontrado; nada a fazer.'); process.exit(0); }
fs.writeFileSync(file, html.replace('/*__LOGIC__*/', () => logic));
console.log('Lógica inserida em', file);
