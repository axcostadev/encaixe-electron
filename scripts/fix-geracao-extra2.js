const fs = require('fs');
const p = 'src/renderer/src/components/encaixe/GeracaoArquivosTab.tsx';
let s = fs.readFileSync(p, 'utf8');
const old = '`r`n\\t\\t\\t\\t\\t\\t\\textra: "",';
console.log('found?', s.indexOf(old) !== -1)
if (s.indexOf(old) !== -1) {
  s = s.split(old).join('\n\t\t\t\t\t\t\textra: "",');
  fs.writeFileSync(p, s, 'utf8');
  console.log('replaced');
} else {
  console.log('old not found');
}
