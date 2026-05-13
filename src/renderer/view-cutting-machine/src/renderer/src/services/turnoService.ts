import ipcHelper from '../lib/ipcHelper'

export async function getDashboardByDate(params: { date: string; turno?: number | 'todos'; grupo?: string | 'todos' }) {
    return ipcHelper.invoke('get-dashboard-by-date', params)
}

export async function getHistoricalMetrics(params: { startDate?: string; endDate?: string; groupBy?: string; rangeMode?: string }) {
    return ipcHelper.invoke('get-historical-metrics', params)
}

export async function importHistoricalData(folderPath: string) {
    return ipcHelper.invoke('import-historical-data', { folderPath })
}

export async function exportDashboardPdf(payload: any) {
    return ipcHelper.invoke('export-dashboard-pdf', payload)
}

export default {
    getDashboardByDate,
    getHistoricalMetrics,
    importHistoricalData,
    exportDashboardPdf,
}
