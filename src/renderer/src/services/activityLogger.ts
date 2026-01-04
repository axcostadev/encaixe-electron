// Sistema de Log de Atividades para Auditoria
import { User } from '@renderer/contexts/AuthContext';

export type ActivityAction = 
  | 'create_brand'
  | 'delete_brand'
  | 'create_model'
  | 'update_model'
  | 'delete_model'
  | 'duplicate_model'
  | 'export_model'
  | 'import_model'
  | 'create_component'
  | 'update_component'
  | 'delete_component'
  | 'move_component'
  | 'copy_component';

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: number;
  username: string;
  action: ActivityAction;
  entityType: 'brand' | 'model' | 'component';
  entityId: string;
  entityName: string;
  details?: Record<string, unknown>;
  metadata?: {
    brandId?: string;
    brandName?: string;
    modelId?: string;
    modelName?: string;
  };
}

const STORAGE_KEY = 'handbook_activity_logs';
const MAX_LOGS = 1000; // Manter últimos 1000 logs

class ActivityLogger {
  private logs: ActivityLog[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar logs de atividade:', error);
      this.logs = [];
    }
  }

  private saveToStorage() {
    try {
      // Manter apenas os últimos MAX_LOGS
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(-MAX_LOGS);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error('Erro ao salvar logs de atividade:', error);
    }
  }

  log(
    user: User | null,
    action: ActivityAction,
    entityType: 'brand' | 'model' | 'component',
    entityId: string,
    entityName: string,
    details?: Record<string, unknown>,
    metadata?: ActivityLog['metadata']
  ) {
    const log: ActivityLog = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      userId: user?.id ?? 0,
      username: user?.username ?? 'Sistema',
      action,
      entityType,
      entityId,
      entityName,
      details,
      metadata
    };

    this.logs.push(log);
    this.saveToStorage();

    // Log no console para debug
    console.log(`[ACTIVITY] ${log.username} - ${action} - ${entityType}:${entityName}`);

    return log;
  }

  // Métodos de conveniência
  logCreateBrand(user: User | null, brandId: string, brandName: string) {
    return this.log(user, 'create_brand', 'brand', brandId, brandName);
  }

  logDeleteBrand(user: User | null, brandId: string, brandName: string) {
    return this.log(user, 'delete_brand', 'brand', brandId, brandName);
  }

  logCreateModel(user: User | null, modelId: string, modelName: string, brandId: string, brandName: string) {
    return this.log(user, 'create_model', 'model', modelId, modelName, undefined, { brandId, brandName });
  }

  logUpdateModel(user: User | null, modelId: string, modelName: string, changes: Record<string, unknown>) {
    return this.log(user, 'update_model', 'model', modelId, modelName, { changes });
  }

  logDeleteModel(user: User | null, modelId: string, modelName: string, brandName?: string) {
    return this.log(user, 'delete_model', 'model', modelId, modelName, undefined, { brandName });
  }

  logDuplicateModel(user: User | null, originalId: string, newId: string, modelName: string) {
    return this.log(user, 'duplicate_model', 'model', newId, modelName, { originalId });
  }

  logExportModel(user: User | null, modelId: string, modelName: string) {
    return this.log(user, 'export_model', 'model', modelId, modelName);
  }

  logImportModel(user: User | null, modelId: string, modelName: string) {
    return this.log(user, 'import_model', 'model', modelId, modelName);
  }

  logCreateComponent(user: User | null, componentId: string, componentName: string, modelId: string, modelName: string) {
    return this.log(user, 'create_component', 'component', componentId, componentName, undefined, { modelId, modelName });
  }

  logUpdateComponent(user: User | null, componentId: string, componentName: string, changes: Record<string, unknown>) {
    return this.log(user, 'update_component', 'component', componentId, componentName, { changes });
  }

  logDeleteComponent(user: User | null, componentId: string, componentName: string, modelName?: string) {
    return this.log(user, 'delete_component', 'component', componentId, componentName, undefined, { modelName });
  }

  logMoveComponent(user: User | null, componentId: string, componentName: string, fromPos: string, toPos: string) {
    return this.log(user, 'move_component', 'component', componentId, componentName, { fromPos, toPos });
  }

  logCopyComponent(user: User | null, componentId: string, componentName: string, fromModel: string, toModel: string) {
    return this.log(user, 'copy_component', 'component', componentId, componentName, { fromModel, toModel });
  }

  // Consultas
  getAllLogs(): ActivityLog[] {
    return [...this.logs].reverse(); // Mais recentes primeiro
  }

  getLogsByUser(userId: number): ActivityLog[] {
    return this.logs.filter(l => l.userId === userId).reverse();
  }

  getLogsByEntity(entityType: 'brand' | 'model' | 'component', entityId?: string): ActivityLog[] {
    return this.logs
      .filter(l => l.entityType === entityType && (entityId ? l.entityId === entityId : true))
      .reverse();
  }

  getLogsByAction(action: ActivityAction): ActivityLog[] {
    return this.logs.filter(l => l.action === action).reverse();
  }

  getLogsByDateRange(startDate: Date, endDate: Date): ActivityLog[] {
    return this.logs
      .filter(l => {
        const logDate = new Date(l.timestamp);
        return logDate >= startDate && logDate <= endDate;
      })
      .reverse();
  }

  getRecentLogs(count: number = 50): ActivityLog[] {
    return this.logs.slice(-count).reverse();
  }

  clearLogs() {
    this.logs = [];
    this.saveToStorage();
  }

  // Formatar ação para exibição
  static formatAction(action: ActivityAction): string {
    const labels: Record<ActivityAction, string> = {
      create_brand: 'Criou marca',
      delete_brand: 'Excluiu marca',
      create_model: 'Criou modelo',
      update_model: 'Atualizou modelo',
      delete_model: 'Excluiu modelo',
      duplicate_model: 'Duplicou modelo',
      export_model: 'Exportou modelo',
      import_model: 'Importou modelo',
      create_component: 'Criou componente',
      update_component: 'Atualizou componente',
      delete_component: 'Excluiu componente',
      move_component: 'Moveu componente',
      copy_component: 'Copiou componente',
    };
    return labels[action] || action;
  }

  // Ícone da ação (nome do ícone Lucide)
  static getActionIcon(action: ActivityAction): string {
    const icons: Record<ActivityAction, string> = {
      create_brand: 'Plus',
      delete_brand: 'Trash2',
      create_model: 'FilePlus',
      update_model: 'Edit',
      delete_model: 'Trash2',
      duplicate_model: 'Copy',
      export_model: 'Download',
      import_model: 'Upload',
      create_component: 'Plus',
      update_component: 'Edit',
      delete_component: 'Trash2',
      move_component: 'Move',
      copy_component: 'Copy',
    };
    return icons[action] || 'Activity';
  }

  // Cor da ação
  static getActionColor(action: ActivityAction): string {
    if (action.includes('delete')) return 'text-red-500';
    if (action.includes('create')) return 'text-green-500';
    if (action.includes('update') || action.includes('move')) return 'text-blue-500';
    if (action.includes('duplicate') || action.includes('copy')) return 'text-purple-500';
    if (action.includes('export') || action.includes('import')) return 'text-orange-500';
    return 'text-muted-foreground';
  }

  // Formatar tipo de entidade para exibição
  static formatEntityType(entityType: 'brand' | 'model' | 'component'): string {
    const labels: Record<'brand' | 'model' | 'component', string> = {
      brand: 'Marca',
      model: 'Modelo',
      component: 'Componente',
    };
    return labels[entityType] || entityType;
  }

  // Métodos de instância que delegam para os estáticos (conveniência)
  formatAction(action: ActivityAction): string {
    return ActivityLogger.formatAction(action);
  }

  formatEntityType(entityType: 'brand' | 'model' | 'component'): string {
    return ActivityLogger.formatEntityType(entityType);
  }
}

// Instância única exportada
export const activityLogger = new ActivityLogger();
