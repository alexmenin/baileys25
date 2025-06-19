"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLIDSendSocketConfig = void 0;

const WAProto_1 = require("../../WAProto");
const WABinary_1 = require("../WABinary");
const crypto_1 = require("../Utils/crypto");
const generics_1 = require("../Utils/generics");
const messages_1 = require("../Utils/messages");

/**
 * Extensão do Socket para suporte a envio de mensagens com LID
 * Mantém retrocompatibilidade completa com sistema PN tradicional
 */
const makeLIDSendSocketConfig = (config) => {
    const { logger, authState } = config;
    
    return {
        /** 
         * Envia mensagem com suporte LID automático
         * Se LID disponível, usa LID; senão, usa PN (retrocompatibilidade)
         */
        sendMessage: async function(jid, message, options = {}) {
            const { lidManager } = this;
            
            // Verificar se é necessário usar LID
            let targetJid = jid;
            let useLID = false;
            
            if (lidManager?.isInitialized && lidManager.isLIDSupported) {
                // Converter JID para LID se disponível
                const lidJid = lidManager.convertJIDForLID(jid);
                if (lidJid !== jid) {
                    targetJid = lidJid;
                    useLID = true;
                    
                    logger.debug('Usando LID para envio', { 
                        originalJid: jid, 
                        lidJid: targetJid 
                    });
                }
            }
            
            try {
                // Preparar mensagem com suporte LID
                const preparedMessage = await this.prepareLIDMessage(message, targetJid, useLID, options);
                
                // Enviar mensagem usando o método base
                const result = await this.sendMessageBase(targetJid, preparedMessage, options);
                
                // Pós-processar resultado se necessário
                if (useLID && result.key) {
                    // Converter JID do resultado de volta para PN para consistência
                    result.key.remoteJid = jid; // Manter JID original na resposta
                    
                    // Adicionar metadata LID
                    result.lidMetadata = {
                        usedLID: true,
                        originalJid: jid,
                        lidJid: targetJid,
                        timestamp: Date.now()
                    };
                }
                
                return result;
                
            } catch (error) {
                // Fallback para PN em caso de erro LID
                if (useLID && this.shouldFallbackToPN(error)) {
                    logger.warn('Fallback de LID para PN', { 
                        jid, 
                        error: error.message 
                    });
                    
                    // Tentar novamente com PN
                    const pnMessage = await this.prepareLIDMessage(message, jid, false, options);
                    return await this.sendMessageBase(jid, pnMessage, options);
                }
                
                throw error;
            }
        },
        
        /**
         * Prepara mensagem com metadata LID apropriado
         */
        prepareLIDMessage: async function(message, targetJid, useLID, options) {
            const timestamp = generics_1.unixTimestampSeconds();
            
            // Criar cópia da mensagem para não modificar original
            const preparedMessage = { ...message };
            
            if (useLID) {
                // Adicionar metadata LID à mensagem
                if (!preparedMessage.messageContextInfo) {
                    preparedMessage.messageContextInfo = {};
                }
                
                // Marcar mensagem como enviada via LID
                preparedMessage.messageContextInfo.deviceListMetadata = {
                    senderTimestamp: timestamp,
                    recipientTimestamp: timestamp,
                    deviceListMetadataVersion: 2 // Versão LID
                };
                
                // Adicionar suporte a recursos LID específicos
                if (preparedMessage.extendedTextMessage) {
                    preparedMessage.extendedTextMessage.contextInfo = {
                        ...preparedMessage.extendedTextMessage.contextInfo,
                        isLidMessage: true
                    };
                }
            }
            
            // Processar mentions com LID se necessário
            if (preparedMessage.extendedTextMessage?.contextInfo?.mentionedJid) {
                preparedMessage.extendedTextMessage.contextInfo.mentionedJid = 
                    await this.convertMentionsForLID(
                        preparedMessage.extendedTextMessage.contextInfo.mentionedJid, 
                        useLID
                    );
            }
            
            return preparedMessage;
        },
        
        /**
         * Converte mentions para usar LID quando apropriado
         */
        convertMentionsForLID: async function(mentions, shouldUseLID) {
            if (!shouldUseLID || !this.lidManager?.isInitialized) {
                return mentions;
            }
            
            return mentions.map(mention => {
                const lidJid = this.lidManager.convertJIDForLID(mention);
                return lidJid || mention;
            });
        },
        
        /**
         * Envia mensagem de mídia com suporte LID
         */
        sendMediaMessage: async function(jid, media, options = {}) {
            const { lidManager } = this;
            
            // Preparar mídia com metadata LID se necessário
            if (lidManager?.isInitialized && lidManager.isLIDSupported) {
                const lidJid = lidManager.convertJIDForLID(jid);
                if (lidJid !== jid) {
                    // Adicionar metadata LID à mídia
                    if (media.caption) {
                        media.contextInfo = {
                            ...media.contextInfo,
                            isLidMessage: true
                        };
                    }
                    
                    return await this.sendMessage(jid, media, options);
                }
            }
            
            // Fallback para método normal
            return await this.sendMessage(jid, media, options);
        },
        
        /**
         * Envia mensagem de texto com suporte LID otimizado
         */
        sendTextMessage: async function(jid, text, options = {}) {
            const message = {
                conversation: text
            };
            
            return await this.sendMessage(jid, message, options);
        },
        
        /**
         * Envia mensagem em grupo com suporte LID
         */
        sendGroupMessage: async function(groupJid, message, options = {}) {
            // Grupos ainda usam JID tradicional, mas membros podem usar LID
            const { lidManager } = this;
            
            if (lidManager?.isInitialized && lidManager.isLIDSupported) {
                // Processar mentions em grupo com LID
                if (message.extendedTextMessage?.contextInfo?.mentionedJid) {
                    message.extendedTextMessage.contextInfo.mentionedJid = 
                        await this.convertMentionsForLID(
                            message.extendedTextMessage.contextInfo.mentionedJid, 
                            true
                        );
                }
            }
            
            return await this.sendMessage(groupJid, message, options);
        },
        
        /**
         * Determina se deve fazer fallback para PN
         */
        shouldFallbackToPN: function(error) {
            // Critérios para fallback
            const fallbackErrors = [
                'lid_not_found',
                'lid_expired', 
                'lid_invalid',
                'device_not_supported'
            ];
            
            return fallbackErrors.some(errorType => 
                error.message?.includes(errorType) || 
                error.code?.includes(errorType)
            );
        },
        
        /**
         * Força envio via PN (bypass LID)
         */
        sendMessageForcePN: async function(jid, message, options = {}) {
            // Garantir que usa PN mesmo se LID disponível
            const forcePNOptions = {
                ...options,
                forcePn: true
            };
            
            const preparedMessage = await this.prepareLIDMessage(message, jid, false, forcePNOptions);
            return await this.sendMessageBase(jid, preparedMessage, forcePNOptions);
        },
        
        /**
         * Força envio via LID (se disponível)
         */
        sendMessageForceLID: async function(jid, message, options = {}) {
            const { lidManager } = this;
            
            if (!lidManager?.isInitialized || !lidManager.isLIDSupported) {
                throw new Error('LID não disponível neste dispositivo');
            }
            
            const lidJid = lidManager.convertJIDForLID(jid);
            if (lidJid === jid) {
                throw new Error('LID não encontrado para este contato');
            }
            
            const preparedMessage = await this.prepareLIDMessage(message, lidJid, true, options);
            return await this.sendMessageBase(lidJid, preparedMessage, options);
        },
        
        /**
         * Obtém estatísticas de envio LID
         */
        getLIDSendStats: function() {
            return {
                lidSupported: this.lidManager?.isLIDSupported || false,
                lidInitialized: this.lidManager?.isInitialized || false,
                mappingsCount: this.lidManager?.pnToLidMappings?.size || 0,
                cacheSize: this.lidManager?.jidCache?.size || 0
            };
        }
    };
};

exports.makeLIDSendSocketConfig = makeLIDSendSocketConfig; 