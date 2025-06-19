"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLIDRecvSocketConfig = void 0;

const WAProto_1 = require("../../WAProto");
const WABinary_1 = require("../WABinary");
const decode_wa_message_1 = require("../Utils/decode-wa-message");
const process_message_1 = require("../Utils/process-message");
const generics_1 = require("../Utils/generics");

/**
 * Extensão do Socket para suporte a recebimento de mensagens com LID
 * Processa mensagens LID e converte para formato compatível
 */
const makeLIDRecvSocketConfig = (config) => {
    const { logger, authState } = config;
    
    return {
        /**
         * Processa mensagens recebidas com suporte LID
         */
        processLIDMessage: async function(node) {
            try {
                const { lidManager } = this;
                
                // Verificar se a mensagem é LID
                const isLIDMessage = this.isLIDMessage(node);
                
                if (isLIDMessage && lidManager?.isInitialized) {
                    logger.debug('Processando mensagem LID', { node });
                    
                    // Processar mensagem LID
                    const processedMessage = await this.handleLIDMessage(node);
                    
                    // Converter para formato compatível
                    const compatibleMessage = this.convertLIDMessageToCompatible(processedMessage);
                    
                    return compatibleMessage;
                } else {
                    // Processar mensagem PN normal
                    return await this.processMessageBase(node);
                }
                
            } catch (error) {
                logger.error('Erro ao processar mensagem LID:', error);
                
                // Fallback para processamento normal
                return await this.processMessageBase(node);
            }
        },
        
        /**
         * Verifica se uma mensagem é LID
         */
        isLIDMessage: function(node) {
            try {
                // Verificar pelo domínio do JID
                const fromJid = node.attrs?.from;
                if (fromJid?.includes('@lid.whatsapp.net')) {
                    return true;
                }
                
                // Verificar por metadata LID
                const messageContextInfo = node.content?.messageContextInfo;
                if (messageContextInfo?.deviceListMetadata?.deviceListMetadataVersion === 2) {
                    return true;
                }
                
                // Verificar por atributos específicos LID
                if (node.attrs?.lid || node.attrs?.type === 'lid') {
                    return true;
                }
                
                return false;
                
            } catch (error) {
                logger.warn('Erro ao verificar se mensagem é LID:', error);
                return false;
            }
        },
        
        /**
         * Processa mensagem LID específica com sistema bidirecional
         */
        handleLIDMessage: async function(node) {
            const { lidManager } = this;
            
            try {
                // Extrair dados básicos
                const fromLid = node.attrs?.from;
                const timestamp = node.attrs?.t ? parseInt(node.attrs.t) : Date.now();
                const messageId = node.attrs?.id;
                
                // Decodificar conteúdo da mensagem
                const messageContent = await this.decodeLIDMessageContent(node);
                
                // Construir estrutura de mensagem inicial
                const rawMessage = {
                    key: {
                        remoteJid: fromLid,
                        remoteLid: this.extractLidFromJid(fromLid),
                        fromMe: false,
                        id: messageId,
                        participant: fromLid,
                        isLidMessage: true
                    },
                    message: messageContent,
                    messageTimestamp: timestamp,
                    status: 'RECEIVED'
                };
                
                // Usar sistema bidirecional para processar
                const processedMessage = lidManager.processIncomingMessage(rawMessage);
                
                // Processar mentions LID se houver
                if (messageContent?.extendedTextMessage?.contextInfo?.mentionedJid) {
                    processedMessage.message.extendedTextMessage.contextInfo.mentionedJid = 
                        await this.convertLIDMentionsToPN(
                            messageContent.extendedTextMessage.contextInfo.mentionedJid
                        );
                }
                
                // Atualizar mapeamento automaticamente
                if (processedMessage.key.remoteLid && processedMessage.key.remoteJid) {
                    const lid = processedMessage.key.remoteLid;
                    const pn = processedMessage.key.remoteJid.split('@')[0];
                    lidManager.addMapping(pn, lid);
                }
                
                logger.debug('Mensagem LID processada:', {
                    originalFormat: processedMessage._lidMetadata?.originalFormat,
                    routingStrategy: processedMessage._lidMetadata?.routingInfo?.routingStrategy,
                    hasMapping: processedMessage._lidMetadata?.hasLidMapping
                });
                
                return processedMessage;
                
            } catch (error) {
                logger.error('Erro ao processar mensagem LID:', error);
                throw error;
            }
        },

        /**
         * Extrai LID numérico de um JID LID
         */
        extractLidFromJid: function(lidJid) {
            if (!lidJid || !lidJid.includes('@lid.whatsapp.net')) {
                return null;
            }
            
            try {
                const lidPart = lidJid.split('@')[0];
                return parseInt(lidPart, 10);
            } catch (error) {
                logger.warn('Erro ao extrair LID numérico:', error);
                return null;
            }
        },
        
        /**
         * Decodifica conteúdo da mensagem LID
         */
        decodeLIDMessageContent: async function(node) {
            try {
                // Extrair conteúdo da mensagem
                const messageNode = node.content?.find(n => n.tag === 'message');
                if (!messageNode) {
                    throw new Error('Conteúdo da mensagem não encontrado');
                }
                
                // Decodificar payload
                const messagePayload = messageNode.content;
                if (Buffer.isBuffer(messagePayload)) {
                    const decodedMessage = WAProto_1.proto.Message.decode(messagePayload);
                    return decodedMessage;
                } else {
                    // Mensagem já decodificada
                    return messagePayload;
                }
                
            } catch (error) {
                logger.error('Erro ao decodificar conteúdo da mensagem LID:', error);
                throw error;
            }
        },
        
        /**
         * Extrai metadata LID da mensagem
         */
        extractLIDMetadata: function(node) {
            try {
                const metadata = {};
                
                // Extrair timestamp de dispositivo
                const deviceListMetadata = node.content?.messageContextInfo?.deviceListMetadata;
                if (deviceListMetadata) {
                    metadata.deviceListMetadataVersion = deviceListMetadata.deviceListMetadataVersion;
                    metadata.senderTimestamp = deviceListMetadata.senderTimestamp;
                    metadata.recipientTimestamp = deviceListMetadata.recipientTimestamp;
                }
                
                // Extrair atributos LID
                if (node.attrs?.lid) {
                    metadata.lidAttribute = node.attrs.lid;
                }
                
                // Extrair versão do protocolo
                if (node.attrs?.protocol_version) {
                    metadata.protocolVersion = node.attrs.protocol_version;
                }
                
                return metadata;
                
            } catch (error) {
                logger.warn('Erro ao extrair metadata LID:', error);
                return {};
            }
        },
        
        /**
         * Converte mentions LID para PN
         */
        convertLIDMentionsToPN: async function(mentionedJids) {
            const { lidManager } = this;
            
            if (!mentionedJids || !Array.isArray(mentionedJids)) {
                return mentionedJids;
            }
            
            return mentionedJids.map(jid => {
                if (jid.includes('@lid.whatsapp.net')) {
                    const convertedJid = lidManager.convertLIDJIDToPN(jid);
                    return convertedJid || jid;
                }
                return jid;
            });
        },
        
        /**
         * Converte mensagem LID para formato compatível
         */
        convertLIDMessageToCompatible: function(lidMessage) {
            try {
                // Remover metadata LID interna para compatibilidade
                const compatibleMessage = { ...lidMessage };
                
                // Garantir que o JID seja sempre PN na interface pública
                if (compatibleMessage.key?.remoteJid?.includes('@lid.whatsapp.net')) {
                    const convertedJid = this.lidManager?.convertLIDJIDToPN(compatibleMessage.key.remoteJid);
                    if (convertedJid) {
                        compatibleMessage.key.remoteJid = convertedJid;
                        compatibleMessage.key.participant = convertedJid;
                    }
                }
                
                // Manter metadata LID para debugging/analytics
                if (compatibleMessage.lidMetadata) {
                    // Mover para campo opcional
                    compatibleMessage._lidMetadata = compatibleMessage.lidMetadata;
                    delete compatibleMessage.lidMetadata;
                }
                
                return compatibleMessage;
                
            } catch (error) {
                logger.warn('Erro ao converter mensagem LID para compatível:', error);
                return lidMessage;
            }
        },
        
        /**
         * Processa notificação de entrega LID
         */
        processLIDDeliveryNotification: async function(node) {
            try {
                const { lidManager } = this;
                
                // Extrair dados da notificação
                const fromLid = node.attrs?.from;
                const messageId = node.attrs?.id;
                const status = node.attrs?.status || 'delivered';
                
                // Converter LID para PN
                let fromJid = fromLid;
                if (fromLid?.includes('@lid.whatsapp.net')) {
                    const convertedJid = lidManager.convertLIDJIDToPN(fromLid);
                    if (convertedJid !== fromLid) {
                        fromJid = convertedJid;
                    }
                }
                
                // Emitir evento de entrega
                this.emit('message.receipt.update', {
                    key: {
                        remoteJid: fromJid,
                        id: messageId
                    },
                    receipt: {
                        readTimestamp: Date.now(),
                        deliveryStatus: status,
                        isLidMessage: true
                    }
                });
                
                logger.debug('Notificação de entrega LID processada', {
                    from: fromJid,
                    messageId,
                    status
                });
                
            } catch (error) {
                logger.error('Erro ao processar notificação de entrega LID:', error);
            }
        },
        
        /**
         * Processa sincronização de mensagens LID
         */
        processLIDMessageSync: async function(node) {
            try {
                const { lidManager } = this;
                
                // Verificar se há mensagens para sincronizar
                const messages = node.content?.filter(n => n.tag === 'message') || [];
                
                const processedMessages = [];
                
                for (const messageNode of messages) {
                    try {
                        const processedMessage = await this.handleLIDMessage(messageNode);
                        processedMessages.push(processedMessage);
                    } catch (error) {
                        logger.warn('Erro ao processar mensagem na sincronização LID:', error);
                    }
                }
                
                // Emitir evento de sincronização completa
                if (processedMessages.length > 0) {
                    this.emit('messages.sync.lid', {
                        messages: processedMessages,
                        timestamp: Date.now()
                    });
                }
                
                logger.debug(`Sincronização LID processada: ${processedMessages.length} mensagens`);
                
                return processedMessages;
                
            } catch (error) {
                logger.error('Erro ao processar sincronização de mensagens LID:', error);
                return [];
            }
        },
        
        /**
         * Estatísticas de recebimento LID
         */
        getLIDRecvStats: function() {
            return {
                lidSupported: this.lidManager?.isLIDSupported || false,
                lidInitialized: this.lidManager?.isInitialized || false,
                mappingsCount: this.lidManager?.pnToLidMappings?.size || 0,
                lastSyncTimestamp: this.lidManager?.lastSyncTimestamp || 0
            };
        }
    };
};

exports.makeLIDRecvSocketConfig = makeLIDRecvSocketConfig; 