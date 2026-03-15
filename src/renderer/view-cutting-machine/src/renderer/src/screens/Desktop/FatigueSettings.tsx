import React, { useState } from "react"
import { ipcHelper } from "../../lib/ipcHelper"

type Period = { inicio: string; fim: string }

type GroupConfig = {
	name: string
	baseDir: string
	machineMap: { [key: string]: string }
	fatigue?: { phrases?: string[] }
}

type Props = {
	machineGroups: Record<string, GroupConfig>
	activeGroup: string
	ensureIpc: () => Promise<boolean>
	setStatus: (s: string | null) => void
	onClose: () => void
}

export default function FatigueSettings({
	machineGroups,
	activeGroup,
	ensureIpc,
	setStatus,
	onClose,
}: Props): React.ReactElement {
	const [fatigueEnabled, setFatigueEnabled] = useState<boolean>(true)
	const [fatiguePhrases, setFatiguePhrases] = useState<string[]>([
		"# Atenção! Pausa programada — descanse por 10 minutos.",
		"**Segurança em primeiro lugar** — beba água e alongue-se.",
	])
	const [fatiguePeriods, setFatiguePeriods] = useState<Period[]>([
		{ inicio: "08:00", fim: "08:10" },
		{ inicio: "10:00", fim: "10:10" },
		{ inicio: "16:00", fim: "16:10" },
		{ inicio: "20:00", fim: "20:10" },
		{ inicio: "00:00", fim: "00:10" },
		{ inicio: "03:00", fim: "03:10" },
	])
	const [shiftPeriods, setShiftPeriods] = useState<Period[]>([
		{ inicio: "05:00", fim: "05:10" },
		{ inicio: "13:20", fim: "13:30" },
		{ inicio: "21:40", fim: "21:50" },
	])

	const [showGroupPhrasesModal, setShowGroupPhrasesModal] = useState(false)
	const [groupPhrases, setGroupPhrases] = useState<string[]>([])

	// Autosave debounce timers (limpeza no unmount)
	const globalSaveTimer = React.useRef<any>(null)
	const groupSaveTimer = React.useRef<any>(null)

	const scheduleSaveGlobalPhrase = (phrases: string[], index: number, phrase: string) => {
		if (globalSaveTimer.current) clearTimeout(globalSaveTimer.current)
		globalSaveTimer.current = setTimeout(async () => {
			setStatus('⏳ Salvando frase...')
			if (!(await ensureIpc())) { setStatus('❌ Erro: IPC não disponível'); return }
			try {
				const res = await ipcHelper.invoke('get-settings')
				const settings = (res && res.success && res.settings) ? res.settings : {}
				settings.fatigue = {
					...(settings.fatigue || {}),
					phrases: phrases,
				}
				const saveRes = await ipcHelper.invoke('save-settings', settings)
				if (saveRes && saveRes.success) {
					setStatus('✅ Frase salva')
					try { window.dispatchEvent(new CustomEvent('settings-saved')) } catch { void 0 }
					try { window.dispatchEvent(new CustomEvent('fatigue-phrase-updated', { detail: { type: 'global', index, phrase } })) } catch { void 0 }
				} else {
					setStatus(`❌ Erro ao salvar: ${saveRes?.error ?? 'desconhecido'}`)
				}
			} catch (err) {
				setStatus(`❌ Erro: ${String(err)}`)
			}
		}, 1000)
	}

	const scheduleSaveGroupPhrase = (phrases: string[], index: number, phrase: string) => {
		if (groupSaveTimer.current) clearTimeout(groupSaveTimer.current)
		groupSaveTimer.current = setTimeout(async () => {
			setStatus('⏳ Salvando frase do grupo...')
			if (!(await ensureIpc())) { setStatus('❌ Erro: IPC não disponível'); return }
			try {
				const res = await ipcHelper.invoke('get-settings')
				const settings = (res && res.success && res.settings) ? res.settings : {}
				settings.machineGroups = settings.machineGroups || {}
				settings.machineGroups[activeGroup] = settings.machineGroups[activeGroup] || {}
				settings.machineGroups[activeGroup].fatigue = {
					...(settings.machineGroups[activeGroup].fatigue || {}),
					phrases: phrases,
				}
				const saveRes = await ipcHelper.invoke('save-settings', settings)
				if (saveRes && saveRes.success) {
					setStatus('✅ Frases do grupo salvas')
					try { window.dispatchEvent(new CustomEvent('settings-saved')) } catch { void 0 }
					try { window.dispatchEvent(new CustomEvent('fatigue-phrase-updated', { detail: { type: 'group', index, phrase } })) } catch { void 0 }
				} else {
					setStatus(`❌ Erro ao salvar: ${saveRes?.error ?? 'desconhecido'}`)
				}
			} catch (err) {
				setStatus(`❌ Erro: ${String(err)}`)
			}
		}, 1000)
	}

	// Limpa timers quando o componente desmonta
	React.useEffect(() => {
		return () => {
			if (globalSaveTimer.current) clearTimeout(globalSaveTimer.current)
			if (groupSaveTimer.current) clearTimeout(groupSaveTimer.current)
		}
	}, [])

	// Indica que o modal de fadiga abriu/fechou — Desktop pode usar para evitar recarregar enquanto editando
	React.useEffect(() => {
		try { window.dispatchEvent(new CustomEvent('fatigue-modal-open', { detail: { open: true } })) } catch { void 0 }
		return () => { try { window.dispatchEvent(new CustomEvent('fatigue-modal-open', { detail: { open: false } })) } catch { void 0 } }
	}, [])

	// Load current settings on mount / activeGroup change
	React.useEffect(() => {
		;(async () => {
			if (!(await ensureIpc())) return
			try {
				const res = await ipcHelper.invoke('get-settings')
				if (res && res.success && res.settings) {
					const s = res.settings
					const f = s.fatigue ?? {}
					setFatigueEnabled(Boolean(f.enabled ?? true))
					if (Array.isArray(f.phrases)) setFatiguePhrases(f.phrases)
					if (Array.isArray(f.periods)) setFatiguePeriods(f.periods)
					if (Array.isArray(f.shiftPeriods)) setShiftPeriods(f.shiftPeriods)
					setGroupPhrases((s.machineGroups ?? {})[activeGroup]?.fatigue?.phrases || [])
				}
			} catch (e) { console.warn('[FatigueSettings] load error:', e) }
		})()
	}, [activeGroup, ensureIpc])

	const saveFatigue = async () => {
		setStatus('⏳ Salvando configurações de fadiga...')
		if (!(await ensureIpc())) { setStatus('❌ Erro: IPC não disponível'); return }
		try {
			const res = await ipcHelper.invoke('get-settings')
			const settings = (res && res.success && res.settings) ? res.settings : {}
			settings.fatigue = {
				enabled: Boolean(fatigueEnabled),
				phrases: fatiguePhrases,
				periods: fatiguePeriods,
				shiftPeriods: shiftPeriods,
			}
			const saveRes = await ipcHelper.invoke('save-settings', settings)
			if (saveRes && saveRes.success) {
				setStatus('✅ Configurações de fadiga salvas com sucesso')
				try { window.dispatchEvent(new CustomEvent('settings-saved')) } catch { void 0 }
				return true
			} else {
				setStatus(`❌ Erro ao salvar: ${saveRes?.error ?? 'desconhecido'}`)
				return false
			}
		} catch (err) {
			setStatus(`❌ Erro: ${String(err)}`)
			return false
		}
	}

	return (
		<div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[9999] pt-8">
			<div className="bg-white rounded p-6 w-[920px] max-w-full max-h-[90vh] overflow-auto">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-xl font-bold">😴 Horários e Mensagens de Fadiga</h3>
					<button className="px-3 py-1 bg-gray-200 rounded" onClick={() => onClose()}>Fechar</button>
				</div>

				<div className="flex items-center gap-3 mb-3">
					<label className="flex items-center gap-2">
						<input type="checkbox" checked={fatigueEnabled} onChange={(e) => setFatigueEnabled(e.target.checked)} />
						<span className="text-sm">Ativar deteção de horário de fadiga</span>
					</label>
				</div>

				<div className="mb-3 text-xs text-gray-600">
					<strong>Nota:</strong> As configurações de fadiga são salvas em <code className="font-mono">settings.json</code>. Você pode clicar em <em>Salvar</em> aqui para salvar localmente; para publicar na rede use <em>📄 Criar Config Padrão na Rede</em> ou <em>Definir como novo padrão</em> na tela de <em>Setup</em>.
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 mb-2">Início de cada turno (3 janelas de 10 minutos)</label>
					<div className="space-y-2">
						{shiftPeriods.map((sp, idx) => (
							<div key={idx} className="flex gap-2 items-center">
								<input type="time" value={sp.inicio} onChange={(e) => {
									const copy = [...shiftPeriods]
									copy[idx] = { ...copy[idx], inicio: e.target.value }
									setShiftPeriods(copy)
								}} className="px-2 py-1 border rounded" />
								<span className="text-sm">→</span>
								<input type="time" value={sp.fim} onChange={(e) => {
									const copy = [...shiftPeriods]
									copy[idx] = { ...copy[idx], fim: e.target.value }
									setShiftPeriods(copy)
								}} className="px-2 py-1 border rounded" />
							</div>
						))}
					</div>
				</div>

				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 mb-2">Períodos de fadiga (início / fim)</label>
					<div className="space-y-2">
						{fatiguePeriods.map((p, idx) => (
							<div key={idx} className="flex gap-2 items-center">
								<input type="time" value={p.inicio} onChange={(e) => {
									const copy = [...fatiguePeriods]
									copy[idx] = { ...copy[idx], inicio: e.target.value }
									setFatiguePeriods(copy)
								}} className="px-2 py-1 border rounded" />
								<span className="text-sm">→</span>
								<input type="time" value={p.fim} onChange={(e) => {
									const copy = [...fatiguePeriods]
									copy[idx] = { ...copy[idx], fim: e.target.value }
									setFatiguePeriods(copy)
								}} className="px-2 py-1 border rounded" />
								<button onClick={() => setFatiguePeriods((prev) => prev.filter((_, i) => i !== idx))} className="px-2 py-1 bg-red-500 text-white rounded ml-2">Remover</button>
							</div>
						))}
					</div>
					<button onClick={() => setFatiguePeriods((prev) => [...prev, { inicio: '00:00', fim: '00:00' }])} className="mt-2 px-3 py-2 bg-green-600 text-white rounded">Adicionar Período</button>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">Frases (Markdown permitido)</label>
					<div className="space-y-2">
						{fatiguePhrases.map((ph, idx) => (
							<div key={idx} className="bg-gray-50 p-2 rounded border">
							<textarea
								value={ph}
								onChange={(e) => {
									const copy = [...fatiguePhrases]
									copy[idx] = e.target.value
									setFatiguePhrases(copy)
									try { window.dispatchEvent(new CustomEvent('fatigue-editing', { detail: { editing: true } })) } catch { void 0 }									
				scheduleSaveGlobalPhrase(copy, idx, e.target.value)								}}
								onFocus={() => { try { window.dispatchEvent(new CustomEvent('fatigue-editing', { detail: { editing: true } })) } catch { void 0 }} }
								onBlur={() => { try { window.dispatchEvent(new CustomEvent('fatigue-editing', { detail: { editing: false } })) } catch { void 0 }} }
							rows={3} className="w-full p-2 border rounded font-mono text-sm" />
								<div className="flex gap-2 justify-end mt-2">
									<button className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => setFatiguePhrases((prev) => prev.filter((_, i) => i !== idx))}>Remover</button>
								</div>
							</div>
						))}
					</div>
					<div className="flex items-center justify-between mt-3">
						<button onClick={() => setFatiguePhrases((prev) => [...prev, 'Nova frase **importante**'])} className="px-3 py-2 bg-green-600 text-white rounded">Adicionar Frase</button>
							<button className="px-3 py-2 bg-purple-600 text-white rounded" onClick={async () => {
								if (!(await ensureIpc())) { setStatus('❌ Erro: IPC não disponível'); return }
								try {
									const res = await ipcHelper.invoke('get-settings')
									const gp = (res && res.success && res.settings && res.settings.machineGroups && res.settings.machineGroups[activeGroup] && res.settings.machineGroups[activeGroup].fatigue && Array.isArray(res.settings.machineGroups[activeGroup].fatigue.phrases)) ? res.settings.machineGroups[activeGroup].fatigue.phrases : (fatiguePhrases || [])
									setGroupPhrases(gp)
									setShowGroupPhrasesModal(true)
								} catch (e) { setStatus('❌ Erro: ' + String(e)) }
						}}>📝 Frases do grupo</button>
					</div>
				</div>

				{/* Modal para frases por grupo (interno) */}
				{showGroupPhrasesModal && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
						<div className="bg-white rounded p-6 w-96 max-w-full">
							<h3 className="text-lg font-semibold mb-2">📝 Frases do grupo: {machineGroups[activeGroup]?.name}</h3>
							<p className="text-sm text-gray-600 mb-3">Edite as frases específicas deste grupo. Se vazio, usará as frases globais.</p>
							<div className="space-y-2 max-h-64 overflow-y-auto">
								{groupPhrases.map((ph, idx) => (
									<div key={idx} className="bg-gray-50 p-2 rounded border">
									<textarea
										value={ph}
										onChange={(e) => {
											const copy = [...groupPhrases]
											copy[idx] = e.target.value
											setGroupPhrases(copy)
											try { window.dispatchEvent(new CustomEvent('fatigue-editing', { detail: { editing: true } })) } catch { void 0 }											
				scheduleSaveGroupPhrase(copy, idx, e.target.value)										}}
										onFocus={() => { try { window.dispatchEvent(new CustomEvent('fatigue-editing', { detail: { editing: true } })) } catch { void 0 }} }
										onBlur={() => { try { window.dispatchEvent(new CustomEvent('fatigue-editing', { detail: { editing: false } })) } catch { void 0 }} }
										rows={3} className="w-full p-2 border rounded font-mono text-sm" />
										<div className="flex gap-2 justify-end mt-2">
											<button className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => setGroupPhrases((prev) => prev.filter((_, i) => i !== idx))}>Remover</button>
										</div>
									</div>
								))}
							</div>
							<div className="mt-3 flex justify-between">
								<button className="px-3 py-2 bg-gray-200 rounded" onClick={() => setGroupPhrases((prev) => [...prev, 'Nova frase **importante**'])}>Adicionar Frase</button>
								<div className="flex gap-2">
									<button className="px-3 py-2 bg-gray-200 rounded" onClick={() => setShowGroupPhrasesModal(false)}>Fechar</button>
									<button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={async () => {
										setStatus('⏳ Salvando frases do grupo...')
										if (!(await ensureIpc())) { setStatus('❌ Erro: IPC não disponível'); return }
										try {
											const res = await ipcHelper.invoke('get-settings')
											if (!(res && res.success && res.settings)) {
												setStatus('❌ Erro ao carregar settings')
												return
											}
											const settings = res.settings
											settings.machineGroups = settings.machineGroups || {}
											settings.machineGroups[activeGroup] = settings.machineGroups[activeGroup] || {}
											settings.machineGroups[activeGroup].fatigue = {
												...(settings.machineGroups[activeGroup].fatigue || {}),
												phrases: groupPhrases,
											}
											const saveRes = await ipcHelper.invoke('save-settings', settings)
											if (saveRes && saveRes.success) {
												setStatus('✅ Frases do grupo salvas com sucesso')
												try { window.dispatchEvent(new CustomEvent('settings-saved')) } catch { void 0 }
												setShowGroupPhrasesModal(false)
											} else {
												setStatus(`❌ Erro ao salvar: ${saveRes?.error ?? 'desconhecido'}`)
											}
										} catch (err) {
											setStatus(`❌ Erro: ${String(err)}`)
										}
									}}>Salvar</button>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Footer actions */}
			<div className="mt-4 flex justify-end gap-2">
				<button className="px-3 py-2 bg-gray-200 rounded" onClick={() => onClose()}>Fechar</button>
				<button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={async () => { await saveFatigue() }}>Salvar</button>
				<button className="px-3 py-2 bg-green-600 text-white rounded" onClick={async () => { const ok = await saveFatigue(); if (ok) onClose() }}>Salvar e Fechar</button>
			</div>
		</div>
	)
}
