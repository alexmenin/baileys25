import { proto } from '../WAProto';
import { BinaryNode } from '../WABinary';
import { MessageReceiptType, MessageGenerationOptions, MessageUserReceipt, AnyMessageContent } from '../Types';

export interface LIDSendOptions extends MessageGenerationOptions {
    forcePn?: boolean;
    useLID?: boolean;
}

export interface LIDSendResult {
    key: proto.IMessageKey;
    message?: proto.IMessage;
    messageTimestamp?: number;
    status?: proto.WebMessageInfo.Status;
    lidMetadata?: {
        usedLID: boolean;
        originalJid: string;
        lidJid: string;
        timestamp: number;
    };
}

export interface LIDSendStats {
    lidSupported: boolean;
    lidInitialized: boolean;
    mappingsCount: number;
    cacheSize: number;
}

export interface LIDSendSocketConfig {
    /**
     * Envia mensagem com suporte LID automático
     * Se LID disponível, usa LID; senão, usa PN (retrocompatibilidade)
     */
    sendMessage(jid: string, message: AnyMessageContent, options?: LIDSendOptions): Promise<LIDSendResult>;

    /**
     * Prepara mensagem com metadata LID apropriado
     */
    prepareLIDMessage(message: AnyMessageContent, targetJid: string, useLID: boolean, options: LIDSendOptions): Promise<AnyMessageContent>;

    /**
     * Converte mentions para usar LID quando apropriado
     */
    convertMentionsForLID(mentions: string[], shouldUseLID: boolean): Promise<string[]>;

    /**
     * Envia mensagem de mídia com suporte LID
     */
    sendMediaMessage(jid: string, media: AnyMessageContent, options?: LIDSendOptions): Promise<LIDSendResult>;

    /**
     * Envia mensagem de texto com suporte LID otimizado
     */
    sendTextMessage(jid: string, text: string, options?: LIDSendOptions): Promise<LIDSendResult>;

    /**
     * Envia mensagem em grupo com suporte LID
     */
    sendGroupMessage(groupJid: string, message: AnyMessageContent, options?: LIDSendOptions): Promise<LIDSendResult>;

    /**
     * Determina se deve fazer fallback para PN
     */
    shouldFallbackToPN(error: Error): boolean;

    /**
     * Força envio via PN (bypass LID)
     */
    sendMessageForcePN(jid: string, message: AnyMessageContent, options?: LIDSendOptions): Promise<LIDSendResult>;

    /**
     * Força envio via LID (se disponível)
     */
    sendMessageForceLID(jid: string, message: AnyMessageContent, options?: LIDSendOptions): Promise<LIDSendResult>;

    /**
     * Obtém estatísticas de envio LID
     */
    getLIDSendStats(): LIDSendStats;
}

export declare const makeLIDSendSocketConfig: (config: any) => LIDSendSocketConfig; 