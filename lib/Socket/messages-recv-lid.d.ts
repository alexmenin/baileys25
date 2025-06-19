import { proto } from '../WAProto';
import { BinaryNode } from '../WABinary';
import { WAMessage, MessageReceiptType, MessageUserReceipt } from '../Types';

export interface LIDMessage extends WAMessage {
    lidMetadata?: {
        isLidMessage: boolean;
        originalLidJid: string;
        convertedJid: string;
        deviceListMetadataVersion?: number;
        senderTimestamp?: number;
        recipientTimestamp?: number;
        lidAttribute?: string;
        protocolVersion?: string;
    };
    _lidMetadata?: any; // Para compatibilidade
}

export interface LIDRecvStats {
    lidSupported: boolean;
    lidInitialized: boolean;
    mappingsCount: number;
    lastSyncTimestamp: number;
}

export interface LIDMessageSyncEvent {
    messages: LIDMessage[];
    timestamp: number;
}

export interface LIDRecvSocketConfig {
    /**
     * Processa mensagens recebidas com suporte LID
     */
    processLIDMessage(node: BinaryNode): Promise<LIDMessage>;

    /**
     * Verifica se uma mensagem é LID
     */
    isLIDMessage(node: BinaryNode): boolean;

    /**
     * Processa mensagem LID específica
     */
    handleLIDMessage(node: BinaryNode): Promise<LIDMessage>;

    /**
     * Decodifica conteúdo da mensagem LID
     */
    decodeLIDMessageContent(node: BinaryNode): Promise<proto.IMessage>;

    /**
     * Extrai metadata LID da mensagem
     */
    extractLIDMetadata(node: BinaryNode): Record<string, any>;

    /**
     * Converte mentions LID para PN
     */
    convertLIDMentionsToPN(mentionedJids: string[]): Promise<string[]>;

    /**
     * Converte mensagem LID para formato compatível
     */
    convertLIDMessageToCompatible(lidMessage: LIDMessage): LIDMessage;

    /**
     * Processa notificação de entrega LID
     */
    processLIDDeliveryNotification(node: BinaryNode): Promise<void>;

    /**
     * Processa sincronização de mensagens LID
     */
    processLIDMessageSync(node: BinaryNode): Promise<LIDMessage[]>;

    /**
     * Estatísticas de recebimento LID
     */
    getLIDRecvStats(): LIDRecvStats;
}

export declare const makeLIDRecvSocketConfig: (config: any) => LIDRecvSocketConfig; 