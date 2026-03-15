(async () => {
  try {
    const { getTurnoReportData } = await import('../src/main/service/getTurnoReportData.js')
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

    for (const turno of [0,1,2]) {
      console.log(`\n=== TESTE TURNO ${turno} (Laser) - date=${dateStr} ===`)
      const dateInicial = turno === 2 ? dateStr : null
      let dateFinal = null
      if (turno === 2) {
        const d = new Date(dateStr + 'T00:00:00')
        d.setDate(d.getDate()+1)
        dateFinal = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      }
      try {
        const r = getTurnoReportData(dateStr, turno, dateInicial, dateFinal, 'Laser')
        if (!r || Object.keys(r).length === 0) {
          console.log('Resultado vazio ou nulo para este turno')
          continue
        }
        const machines = Object.keys(r)
        let nonEmpty = 0
        machines.forEach((m) => {
          const periods = r[m]
          const vals = Object.values(periods).filter(v => v !== undefined && v !== null)
          const hasNonZero = vals.some(v => v > 0)
          if (vals.length > 0 && hasNonZero) nonEmpty++
        })
        console.log(`Máquinas encontradas: ${machines.length}, com dados não-zero: ${nonEmpty}`)
        console.log('Exemplo (até 5 máquinas):')
        machines.slice(0,5).forEach(m => console.log(m, r[m]))
      } catch (err) {
        console.error('Erro ao executar getTurnoReportData:', err)
      }
    }
  } catch (err) {
    console.error('Erro ao carregar módulo:', err)
  }
})()
