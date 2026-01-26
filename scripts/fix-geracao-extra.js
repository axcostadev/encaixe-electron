const fs = require('fs');
const p = 'src/renderer/src/components/encaixe/GeracaoArquivosTab.tsx';
let s = fs.readFileSync(p, 'utf8');
const before = '`r`n\t\t\t\t\t\t\textra: ""';
if (s.indexOf(before) !== -1) {
  s = s.replace(/`r`n\t\t\t\t\t\t\textra: ""/g, '\n\t\t\t\t\t\t\textra: ""');
  fs.writeFileSync(p, s, 'utf8');
  console.log('fixed');
} else {
  console.log('pattern not found');
}
