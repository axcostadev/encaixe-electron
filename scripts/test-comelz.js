(async () => {
  const mod = await import('../src/main/modules/conversorComelz.js');
  const rule = mod.criarQtyRuleParts({ part_name: 'REFORCO', part_size: '40', mirror: false, parts: 22 });
  const pedido = mod.gerarArquivoComelz({ id: 'test', date: '20260126', note: 'OF: test', customer: 'VULCABRAS', qty: [rule], model: 'O:\\Lectra\\Calcado\\Modelos\\COMELZ\\test.cmz' });
  console.log(JSON.stringify(pedido, null, 2));
})();