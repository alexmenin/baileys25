"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.makeLIDSocket = void 0;

const LIDManager = require("../Utils/lid-manager").LIDManager;
const lidSend = require("./messages-send-lid");
const lidRecv = require("./messages-recv-lid");
const logger_1 = require("../Utils/logger");

/**
 * Integração principal do protocolo LID com o Socket
 * Combina todas as funcionalidades LID em uma interface unificada
 */
const makeLIDSocket = (config) => {
    const { logger, authState } = config;
    const lidLogger = logger.child({ module: 'LID' });
    
    return {
        /**
         * Inicializa o sistema LID completo
         */
        initializeLID: async function() {
            try {
                // Criar instância do LIDManager
                this.lidManager = new LIDManager(this, authState, lidLogger);
                
                // Inicializar o gerenciador
                const isSupported = await this.lidManager.initialize();
                
                if (isSupported) {
                    // Adicionar extensões de envio
                    const sendConfig = lidSend.makeLIDSendSocketConfig(config);
                    Object.assign(this, sendConfig);
                    
                    // Adicionar extensões de recebimento
                    const recvConfig = lidRecv.makeLIDRecvSocketConfig(config);
                    Object.assign(this, recvConfig);
                    
                    // Sobrescrever handlers de mensagem para suportar LID
                    this.overrideMessageHandlers();
                    
                    // Registrar eventos LID
                    this.registerLIDEvents();
                    
                    lidLogger.info('Sistema LID inicializado com sucesso');
                } else {
                    lidLogger.info('LID não suportado, usando modo compatibilidade');
                }
                
                return isSupported;
                
            } catch (error) {
                lidLogger.error('Erro ao inicializar sistema LID:', error);
                return false;
            }
        },
        
        /**
         * Sobrescreve handlers de mensagem para suportar LID
         */
        overrideMessageHandlers: function() {
            // Salvar métodos originais
            this._originalSendMessage = this.sendMessage;
            this._originalHandleMessage = this.handleMessage;
            
            // Sobrescrever sendMessage para usar LID
            this.sendMessage = async function(jid, message, options = {}) {
                if (this.lidManager?.isInitialized && this.lidManager.isLIDSupported) {
                    // Usar implementação LID
                    return await this.sendMessage(jid, message, options);
                } else {
                    // Fallback para implementação original
                    return await this._originalSendMessage(jid, message, options);
                }
            }.bind(this);
            
            // Sobrescrever handleMessage para processar LID
            this.handleMessage = async function(node) {
                if (this.lidManager?.isInitialized && this.isLIDMessage?.(node)) {
                    // Processar mensagem LID
                    return await this.processLIDMessage(node);
                } else {
                    // Processar mensagem PN normal
                    return await this._originalHandleMessage(node);
                }
            }.bind(this);
            
            lidLogger.debug('Handlers de mensagem sobrescritos para LID');
        },
        
        /**
         * Registra eventos específicos do LID
         */
        registerLIDEvents: function() {
            // Evento de migração LID completa
            this.on('lid.migration.complete', (data) => {
                lidLogger.info('Migração LID completa', data);
                this.emit('connection.update', {
                    lidMigration: {
                        status: 'complete',
                        mappingsCount: data.mappingsCount,
                        totalMappings: data.totalMappings
                    }
                });
            });
            
            // Evento de sincronização de mensagens LID
            this.on('messages.sync.lid', (data) => {
                lidLogger.debug('Mensagens LID sincronizadas', {
                    count: data.messages.length
                });
                
                // Emitir mensagens individualmente para compatibilidade
                data.messages.forEach(message => {
                    this.emit('messages.upsert', {
                        messages: [message],
                        type: 'notify'
                    });
                });
            });
            
            // Evento de atualização de recibos LID
            this.on('message.receipt.update', (receipt) => {
                if (receipt.receipt?.isLidMessage) {
                    lidLogger.debug('Recibo LID processado', receipt);
                }
            });
            
            lidLogger.debug('Eventos LID registrados');
        },
        
        /**
         * Força sincronização completa do LID
         */
        forceLIDSync: async function() {
            if (!this.lidManager?.isInitialized) {
                throw new Error('LID não inicializado');
            }
            
            lidLogger.info('Forçando sincronização LID');
            return await this.lidManager.forceSync();
        },
        
        /**
         * Obtém estatísticas completas do LID
         */
        getLIDStats: function() {
            const baseStats = this.lidManager?.getStats() || {
                isSupported: false,
                isInitialized: false,
                mappingsCount: 0,
                migrationTimestamp: null,
                lastSyncTimestamp: 0,
                cacheSize: 0
            };
            
            const sendStats = this.getLIDSendStats?.() || {
                lidSupported: false,
                lidInitialized: false,
                mappingsCount: 0,
                cacheSize: 0
            };
            
            const recvStats = this.getLIDRecvStats?.() || {
                lidSupported: false,
                lidInitialized: false,
                mappingsCount: 0,
                lastSyncTimestamp: 0
            };
            
            return {
                manager: baseStats,
                send: sendStats,
                receive: recvStats,
                combined: {
                    isSupported: baseStats.isSupported,
                    isInitialized: baseStats.isInitialized,
                    totalMappings: baseStats.mappingsCount,
                    migrationTimestamp: baseStats.migrationTimestamp,
                    lastSyncTimestamp: baseStats.lastSyncTimestamp
                }
            };
        },
        
        /**
         * Limpa todos os dados LID
         */
        clearLIDData: function() {
            if (this.lidManager?.isInitialized) {
                this.lidManager.clearAllData();
                lidLogger.info('Dados LID limpos');
            }
        },
        
        /**
         * Obtém mapeamento específico PN -> LID
         */
        getLIDForNumber: function(phoneNumber) {
            return this.lidManager?.getLIDForPN(phoneNumber);
        },
        
        /**
         * Obtém mapeamento específico LID -> PN
         */
        getNumberForLID: function(lid) {
            return this.lidManager?.getPNForLID(lid);
        },
        
        /**
         * Adiciona mapeamento manual PN -> LID
         */
        addLIDMapping: function(phoneNumber, lid) {
            if (!this.lidManager?.isInitialized) {
                throw new Error('LID não inicializado');
            }
            
            return this.lidManager.addMapping(phoneNumber, lid);
        },
        
        /**
         * Remove mapeamento PN -> LID
         */
        removeLIDMapping: function(phoneNumber) {
            if (!this.lidManager?.isInitialized) {
                throw new Error('LID não inicializado');
            }
            
            return this.lidManager.removeMapping(phoneNumber);
        },
        
        /**
         * Converte JID para formato LID se disponível
         */
        convertToLID: function(jid) {
            if (!this.lidManager?.isInitialized) {
                return jid;
            }
            
            return this.lidManager.convertJIDForLID(jid);
        },
        
        /**
         * Converte JID LID para formato PN
         */
        convertFromLID: function(lidJid) {
            if (!this.lidManager?.isInitialized) {
                return lidJid;
            }
            
            return this.lidManager.convertLIDJIDToPN(lidJid);
        },
        
        /**
         * Verifica se um JID é LID
         */
        isLIDJid: function(jid) {
            return jid?.includes('@lid.whatsapp.net') || false;
        },
        
        /**
         * Obtém todos os mapeamentos (para debug)
         */
        getAllLIDMappings: function() {
            return this.lidManager?.getAllMappings() || {
                pnToLid: {},
                lidToPn: {}
            };
        },
        
        /**
         * Configura callbacks para eventos LID
         */
        onLIDEvent: function(event, callback) {
            const validEvents = [
                'lid.migration.complete',
                'messages.sync.lid',
                'message.receipt.update'
            ];
            
            if (validEvents.includes(event)) {
                this.on(event, callback);
            } else {
                throw new Error(`Evento LID inválido: ${event}`);
            }
        },
        
        /**
         * Força envio via LID (se disponível)
         */
        sendViaLID: async function(jid, message, options = {}) {
            if (!this.sendMessageForceLID) {
                throw new Error('Extensões de envio LID não disponíveis');
            }
            
            return await this.sendMessageForceLID(jid, message, options);
        },
        
        /**
         * Força envio via PN (bypass LID)
         */
        sendViaPN: async function(jid, message, options = {}) {
            if (!this.sendMessageForcePN) {
                throw new Error('Extensões de envio LID não disponíveis');
            }
            
            return await this.sendMessageForcePN(jid, message, options);
        }
    };
};

exports.makeLIDSocket = makeLIDSocket; 