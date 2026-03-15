/**
 * Utilitário para verificar e usar o IPC Renderer de forma segura
 */

export const ipcHelper = {
  /**
   * Verifica se o IPC Renderer está disponível
   */
  isAvailable(): boolean {
    try {
      return !!(window.electron && window.electron.ipcRenderer);
    } catch (error) {
      console.error('[IPC Helper] Erro ao verificar disponibilidade:', error);
      return false;
    }
  },

  /**
   * Diagnóstico completo do IPC
   */
  diagnose(): void {
    console.group('🔍 IPC Helper - Diagnóstico Completo');
    console.log('1. window existe?', typeof window !== 'undefined');
    console.log('2. window.electron existe?', typeof window.electron);
    console.log('3. window.electron:', window.electron);
    console.log('4. window.electron?.ipcRenderer:', window.electron?.ipcRenderer);
    console.log('5. isAvailable():', this.isAvailable());
    console.log('6. window.electronTest:', (window as any).electronTest);
    console.log('7. Todas as propriedades de window:', Object.keys(window).filter(k => k.includes('electron') || k.includes('ipc')));
    console.groupEnd();
  },

  /**
   * Invoca um canal IPC de forma segura
   */
  async invoke(channel: string, ...args: any[]): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error(`IPC Renderer não está disponível para canal: ${channel}`);
    }

    try {
      console.log(`[IPC Helper] Invocando ${channel} com args:`, args);
      const result = await window.electron.ipcRenderer.invoke(channel, ...args);
      console.log(`[IPC Helper] Resultado de ${channel}:`, result);
      return result;
    } catch (error) {
      console.error(`[IPC Helper] Erro ao invocar ${channel}:`, error);
      throw error;
    }
  },

  /**
   * Registra um listener para um canal IPC
   */
  on(channel: string, callback: (...args: any[]) => void): (() => void) | null {
    if (!this.isAvailable()) {
      console.error(`[IPC Helper] IPC não disponível para listener no canal: ${channel}`);
      return null;
    }

    try {
      console.log(`[IPC Helper] Registrando listener para ${channel}`);
      return window.electron.ipcRenderer.on(channel, callback);
    } catch (error) {
      console.error(`[IPC Helper] Erro ao registrar listener para ${channel}:`, error);
      return null;
    }
  },

  /**
   * Remove todos os listeners de um canal
   */
  removeAllListeners(channel: string): void {
    if (!this.isAvailable()) {
      console.error(`[IPC Helper] IPC não disponível para remover listeners do canal: ${channel}`);
      return;
    }

    try {
      console.log(`[IPC Helper] Removendo listeners de ${channel}`);
      window.electron.ipcRenderer.removeAllListeners(channel);
    } catch (error) {
      console.error(`[IPC Helper] Erro ao remover listeners de ${channel}:`, error);
    }
  }
};

/**
 * Hook React para verificar se o IPC está disponível
 */
export const useIpcAvailable = () => {
  return ipcHelper.isAvailable();
};

export default ipcHelper;