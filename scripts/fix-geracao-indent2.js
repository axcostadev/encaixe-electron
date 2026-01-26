const fs = require('fs');
const p = 'src/renderer/src/components/encaixe/GeracaoArquivosTab.tsx';
let s = fs.readFileSync(p, 'utf8');
const re = /\n\t{5}extra: ""/g;
if(re.test(s)){
  s = s.replace(re, '\n\t\t\t\t\t\textra: ""');
  fs.writeFileSync(p, s, 'utf8');
  console.log('indent fixed');
} else {
  console.log('no indent to fix');
}
