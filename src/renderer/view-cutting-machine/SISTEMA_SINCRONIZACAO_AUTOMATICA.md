# Sistema de Sincronização Automática - Documentação

## 🎯 Objetivo Alcançado

Implementação completa de sincronização automática para as configurações de máquinas laser (Emma, Lectra, Comelz). Agora **todas as mudanças feitas no Setup são automaticamente aplicadas em todo o sistema** sem necessidade de edição manual de arquivos.

## ✅ Problemas Resolvidos

1. **RANKING DE MÁQUINAS (Hora Atual)** - Emma, Comelz, Lectra não apareciam
2. **OCUPAÇÃO TEMPO REAL - Lectra** - 12ª máquina não aparecia
3. **Sincronização Manual** - Necessidade de editar múltiplos arquivos manualmente

## 🔧 Implementação Técnica

### Sistema Centralizado (`settingsManager.js`)
- **Local**: `src/main/service/settingsManager.js`
- **Função**: Gerenciamento centralizado de todas as configurações
- **Recursos**:
  - Cache em memória para performance
  - Notificação automática de mudanças
  - Backup automático de configurações
  - Compatibilidade Electron + Node.js

### Arquivos Atualizados para Sincronização Automática
1. `getMachineAmountOcuppation.js` - Rankings de máquinas
2. `getOccupationData.js` - Ocupação em tempo real
3. `getMachineSpeeds.js` - Velocidades das máquinas
4. `getTurnoReportData.js` - Dados de relatórios de turno
5. `server.js` - Handlers IPC para frontend

## 🚀 Como Usar

### Para o Usuário Final
1. Abra a tela de **Setup** no aplicativo
2. Adicione, remova ou modifique configurações de máquinas
3. Salve as alterações
4. **Todas as telas são atualizadas automaticamente!**

### Para Adicionar Nova Máquina (Exemplo: 13ª máquina Lectra)
1. No Setup, vá para configurações do grupo Lectra
2. Adicione: `"13": "Lectra 13"`
3. Salve
4. A máquina aparecerá automaticamente em:
   - Rankings de máquinas
   - Ocupação em tempo real
   - Relatórios de turno
   - Banco de dados

### Para Adicionar Novo Grupo de Máquinas
1. No Setup, adicione novo grupo:
   ```json
   "NovoGrupo": {
     "machineMap": {
       "1": "Nova Máquina 1",
       "2": "Nova Máquina 2"
     },
     "activeDir": "NovoGrupo"
   }
   ```
2. Salve
3. O grupo aparecerá automaticamente em todas as funcionalidades

## 📊 Estado Atual do Sistema

### Grupos de Máquinas Configurados
- **Laser**: 13 máquinas (02-2421, 02-2422, etc.)
- **Emma**: 4 máquinas (02-2617, 02-2457, etc.)
- **Comelz**: 4 máquinas (02-2536, 02-1680, etc.)
- **Lectra**: 12 máquinas (02-2540, 02-1681, etc.)

**Total**: 33 máquinas ativas

### Funcionalidades Automáticas
✅ Rankings em tempo real
✅ Ocupação por grupo
✅ Relatórios de turno
✅ Integração com banco de dados
✅ Notificação automática de mudanças

## 🔍 Validação e Testes

Execute os scripts de teste para verificar o sistema:

```bash
# Teste de sincronização automática
node scripts/test_automatic_sync.js

# Validação completa do sistema
node scripts/validate_complete_system.js

# Verificação de contagens de máquinas
node scripts/check_turno_counts.js
```

## 🎖️ Benefícios Implementados

1. **Zero Configuração Manual**: Nunca mais editar arquivos .js manualmente
2. **Atualizações Instantâneas**: Mudanças no Setup refletem imediatamente
3. **Consistência Total**: Todas as telas sempre sincronizadas
4. **Escalabilidade**: Fácil adição de novos grupos e máquinas
5. **Manutenibilidade**: Código centralizado e organizado
6. **Backup Automático**: Configurações são salvas com backup automático

## 🚨 Importante

- **Não edite mais arquivos .js manualmente** para adicionar máquinas
- **Use sempre o Setup** para mudanças de configuração
- **O sistema mantém backup automático** das configurações anteriores
- **Todas as mudanças são aplicadas em tempo real** sem reinicialização

---

**Sistema implementado com sucesso! 🎉**

Agora você tem controle total sobre as configurações de máquinas através do Setup, com sincronização automática garantida em todo o sistema.