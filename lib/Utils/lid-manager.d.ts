import { proto } from '../../WAProto';
import { AuthenticationState } from '../Types';
import { Logger } from 'pino';

export interface LIDMappingData {
    phoneNumber: string;
    lid: string;
    timestamp?: number;
}

export interface LIDStats {
    isSupported: boolean;
    isInitialized: boolean;
    mappingsCount: number;
    migrationTimestamp: string | null;
    lastSyncTimestamp: number;
    cacheSize: number;
}

export interface LIDMigrationEvent {
    mappingsCount: number;
    totalMappings: number;
    timestamp: string | null;
}

export declare class LIDManager {
    private socket: any;
    private authState: AuthenticationState;
    private logger: Logger;
    
    private pnToLidMappings: Map<string, string>;
    private lidToPnMappings: Map<string, string>;
    
    private isLIDSupported: boolean;
    private migrationTimestamp: string | null;
    private isInitialized: boolean;
    
    private jidCache: Map<string, string>;
    private lastSyncTimestamp: number;

    constructor(socket: any, authState: AuthenticationState, logger?: Logger);

    /**
     * Inicializa o suporte LID
     */
    initialize(): Promise<boolean>;

    /**
     * Verifica se o dispositivo suporta LID
     */
    checkLIDCapabilities(): Promise<void>;

    /**
     * Carrega mapeamentos salvos do authState
     */
    loadSavedMappings(): void;

    /**
     * Salva mapeamentos no authState
     */
    saveMappings(): void;

    /**
     * Registra handlers de eventos
     */
    registerEventHandlers(): void;

    /**
     * Processa migração LID recebida do servidor
     */
    handleLIDMigration(node: any): Promise<void>;

    /**
     * Processa sincronização LID
     */
    handleLIDSync(node: any): Promise<void>;

    /**
     * Processa mensagens LID específicas
     */
    handleLIDMessage(node: any): Promise<void>;

    /**
     * Adiciona um mapeamento PN -> LID
     */
    addMapping(phoneNumber: string, lid: string, save?: boolean): boolean;

    /**
     * Remove um mapeamento
     */
    removeMapping(phoneNumber: string, save?: boolean): boolean;

    /**
     * Obtém LID para um número de telefone
     */
    getLIDForPN(phoneNumber: string): string | undefined;

    /**
     * Obtém número de telefone para um LID
     */
    getPNForLID(lid: string): string | undefined;

    /**
     * Converte JID considerando LID
     */
    convertJIDForLID(jid: string): string;

    /**
     * Converte JID LID de volta para JID normal
     */
    convertLIDJIDToPN(lidJid: string): string;

    /**
     * Realiza sincronização inicial com servidor
     */
    performInitialSync(): Promise<void>;

    /**
     * Força sincronização LID
     */
    forceSync(): Promise<void>;

    /**
     * Limpa todos os dados LID
     */
    clearAllData(): void;

    /**
     * Obtém estatísticas LID
     */
    getStats(): LIDStats;

    /**
     * Obtém todos os mapeamentos (para debug)
     */
    getAllMappings(): {
        pnToLid: Record<string, string>;
        lidToPn: Record<string, string>;
    };

    // Métodos bidirecionais
    convertMessageKey(messageKey: any, preferLid?: boolean): any;
    convertJidToLidMessageKey(jidKey: any): any;
    convertLidToJidMessageKey(lidKey: any): any;
    processIncomingMessage(message: any): any;
    prepareOutgoingMessage(message: any, options?: any): any;
    enrichLidMessageKey(lidKey: any): any;
    enrichJidMessageKey(jidKey: any): any;
    isLidMessage(messageKey: any): boolean;
    shouldUseLidForMessage(message: any, recipientSupportsLid?: boolean): boolean;
    getRoutingInfo(messageKey: any): any;
    isGroupJid(jid: string): boolean;
    groupSupportsLid(groupJid: string): boolean;
    shouldUseLid(messageKey: any): boolean;
    jidToLid(jid: string): string | null;
    lidToJid(lid: string | number): string | null;
    hasLidMapping(jid: string): boolean;
} 