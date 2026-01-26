const fs = require('fs');
const p = 'src/renderer/src/components/encaixe/GeracaoArquivosTab.tsx';
let s = fs.readFileSync(p, 'utf8');
s = s.split('\n\t\t\t\t\t\textra: ""').join('\n\t\t\t\t\t\t\textra: ""');
fs.writeFileSync(p, s, 'utf8');
console.log('fixed indent');
