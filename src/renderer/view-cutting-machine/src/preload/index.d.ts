import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>
        on: (channel: string, cb: (...args: unknown[]) => void) => () => void
        removeAllListeners: (channel: string) => void
      }
    }
    zoom: {
      set: (factor: number) => void
    }
    api: unknown
  }
}
