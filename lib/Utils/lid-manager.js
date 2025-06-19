"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.LIDManager = void 0;

const WAProto_1 = require("../../WAProto");
const Defaults_1 = require("../Defaults");
const generics_1 = require("./generics");
const logger_1 = require("./logger");

/**
 * Gerenciador do protocolo LID (Locally Identifiable Device)
 * Responsável por:
 * - Gerenciar mapeamentos PN -> LID
 * - Processar migrações
 * - Manter retrocompatibilidade
 * - Otimizar roteamento de mensagens
 */
class LIDManager {
    constructor(socket, authState, logger) {
        this.socket = socket;
        this.authState = authState;
        
        // Logger com fallback seguro
        if (logger && typeof logger.child === 'function') {
            this.logger = logger.child({ class: 'LIDManager' });
        } else if (logger) {
            this.logger = logger;
        } else {
            // Fallback para console se não houver logger
            this.logger = {
                debug: (...args) => console.log('[LID-DEBUG]', ...args),
                info: (...args) => console.log('[LID-INFO]', ...args),
                warn: (...args) => console.warn('[LID-WARN]', ...args),
                error: (...args) => console.error('[LID-ERROR]', ...args)
            };
        }
        
        // Mapeamentos PN <-> LID
        this.pnToLidMappings = new Map();
        this.lidToPnMappings = new Map();
        
        // Estado interno
        this.isLIDSupported = false;
        this.migrationTimestamp = null;
        this.isInitialized = false;
        
        // Cache para otimização
        this.jidCache = new Map();
        this.lastSyncTimestamp = 0;
        
        this.logger.debug('LIDManager inicializado');
    }

    /**
     * Inicializa o suporte LID
     */
    async initialize() {
        if (this.isInitialized) {
            return this.isLIDSupported;
        }

        try {
            // Verificar capacidades do dispositivo
            await this.checkLIDCapabilities();
            
            // Carregar mapeamentos salvos
            this.loadSavedMappings();
            
            // Registrar handlers de eventos
            this.registerEventHandlers();
            
            // Sincronizar com servidor se necessário
            if (this.isLIDSupported) {
                await this.performInitialSync();
            }
            
            this.isInitialized = true;
            this.logger.info(`LID inicializado - Suporte: ${this.isLIDSupported}`);
            
            return this.isLIDSupported;
        } catch (error) {
            this.logger.error('Erro ao inicializar LID:', error);
            this.isInitialized = true;
            return false;
        }
    }

    /**
     * Verifica se o dispositivo suporta LID
     */
    async checkLIDCapabilities() {
        try {
            // Verificar múltiplas fontes para detectar suporte LID
            const creds = this.authState.creds;
            const deviceCapabilities = creds?.deviceCapabilities;
            
            // Verificar se há info de LID nas credenciais
            if (deviceCapabilities?.lidMigration) {
                this.isLIDSupported = true;
                this.migrationTimestamp = deviceCapabilities.lidMigration.chatDbMigrationTimestamp;
                this.logger.debug('Capacidades LID detectadas via deviceCapabilities', { 
                    timestamp: this.migrationTimestamp 
                });
            }
            // Verificar se há mapeamentos LID existentes
            else if (this.authState.keys?.lidMappings && Object.keys(this.authState.keys.lidMappings).length > 0) {
                this.isLIDSupported = true;
                this.migrationTimestamp = this.authState.keys.lidTimestamp || Date.now();
                this.logger.debug('Capacidades LID detectadas via mapeamentos existentes');
            }
            // Para dispositivos modernos, assumir suporte LID (modo experimental)
            else if (creds?.platform === 'web' || creds?.me?.id) {
                this.isLIDSupported = true;
                this.migrationTimestamp = Date.now();
                this.logger.debug('Assumindo suporte LID para dispositivo moderno (experimental)');
            }
            else {
                this.isLIDSupported = false;
                this.logger.debug('LID não suportado - dispositivo incompatível');
            }
            
        } catch (error) {
            this.logger.warn('Erro ao verificar capacidades LID:', error);
            // Modo experimental: tentar suportar LID mesmo com erro
            this.isLIDSupported = true;
            this.migrationTimestamp = Date.now();
            this.logger.debug('Tentando suporte LID experimental após erro');
        }
    }

    /**
     * Carrega mapeamentos salvos do authState
     */
    loadSavedMappings() {
        try {
            const savedMappings = this.authState.keys?.lidMappings;
            if (savedMappings) {
                Object.entries(savedMappings).forEach(([pn, lid]) => {
                    this.addMapping(pn, lid, false);
                });
                this.logger.debug(`${this.pnToLidMappings.size} mapeamentos LID carregados`);
            }
        } catch (error) {
            this.logger.warn('Erro ao carregar mapeamentos LID:', error);
        }
    }

    /**
     * Salva mapeamentos no authState
     */
    saveMappings() {
        try {
            if (!this.authState.keys) {
                this.authState.keys = {};
            }
            
            this.authState.keys.lidMappings = Object.fromEntries(this.pnToLidMappings);
            this.authState.keys.lidTimestamp = this.migrationTimestamp;
            
            this.logger.debug('Mapeamentos LID salvos');
        } catch (error) {
            this.logger.warn('Erro ao salvar mapeamentos LID:', error);
        }
    }

    /**
     * Registra handlers de eventos
     */
    registerEventHandlers() {
        // Handler para migração LID
        this.socket.on('CB:lid_migration', this.handleLIDMigration.bind(this));
        
        // Handler para sincronização LID
        this.socket.on('CB:lid_sync', this.handleLIDSync.bind(this));
        
        // Handler para mensagens com LID
        this.socket.on('CB:message,type:lid', this.handleLIDMessage.bind(this));
        
        this.logger.debug('Handlers LID registrados');
    }

    /**
     * Processa migração LID recebida do servidor
     */
    async handleLIDMigration(node) {
        try {
            this.logger.debug('Processando migração LID', { node });
            
            const migrationPayload = node.content;
            if (!migrationPayload) {
                this.logger.warn('Payload de migração LID vazio');
                return;
            }

            // Decodificar payload
            const decoded = WAProto_1.proto.LidMigrationSyncPayload.LIDMigrationMappingSyncPayload
                .decode(migrationPayload);
            
            // Processar mapeamentos
            let updatedCount = 0;
            decoded.pnToLidMappings?.forEach(mapping => {
                if (this.addMapping(mapping.pn.toString(), mapping.assignedLid.toString())) {
                    updatedCount++;
                }
            });

            // Atualizar timestamp
            if (decoded.chatDbMigrationTimestamp) {
                this.migrationTimestamp = decoded.chatDbMigrationTimestamp.toString();
            }

            // Salvar alterações
            this.saveMappings();
            
            this.logger.info(`Migração LID processada: ${updatedCount} novos mapeamentos`);
            
            // Emitir evento para a aplicação
            this.socket.emit('lid.migration.complete', {
                mappingsCount: updatedCount,
                totalMappings: this.pnToLidMappings.size,
                timestamp: this.migrationTimestamp
            });
            
        } catch (error) {
            this.logger.error('Erro ao processar migração LID:', error);
        }
    }

    /**
     * Processa sincronização LID
     */
    async handleLIDSync(node) {
        try {
            this.logger.debug('Processando sincronização LID', { node });
            
            // Atualizar timestamp da última sincronização
            this.lastSyncTimestamp = Date.now();
            
            // Processar dados de sincronização se houver
            if (node.content) {
                await this.handleLIDMigration(node);
            }
            
        } catch (error) {
            this.logger.error('Erro ao processar sincronização LID:', error);
        }
    }

    /**
     * Processa mensagens LID específicas
     */
    async handleLIDMessage(node) {
        try {
            this.logger.debug('Processando mensagem LID', { node });
            
            // Implementar processamento específico de mensagens LID
            // Por enquanto, apenas logar
            
        } catch (error) {
            this.logger.error('Erro ao processar mensagem LID:', error);
        }
    }

    /**
     * Adiciona um mapeamento PN -> LID
     */
    addMapping(phoneNumber, lid, save = true) {
        try {
            const existingLid = this.pnToLidMappings.get(phoneNumber);
            if (existingLid === lid) {
                return false; // Já existe
            }

            // Remover mapeamento antigo se existir
            if (existingLid) {
                this.lidToPnMappings.delete(existingLid);
            }

            // Adicionar novo mapeamento
            this.pnToLidMappings.set(phoneNumber, lid);
            this.lidToPnMappings.set(lid, phoneNumber);
            
            // Limpar cache do JID
            this.jidCache.clear();
            
            if (save) {
                this.saveMappings();
            }
            
            this.logger.debug(`Mapeamento adicionado: ${phoneNumber} -> ${lid}`);
            return true;
            
        } catch (error) {
            this.logger.error('Erro ao adicionar mapeamento LID:', error);
            return false;
        }
    }

    /**
     * Remove um mapeamento
     */
    removeMapping(phoneNumber, save = true) {
        try {
            const lid = this.pnToLidMappings.get(phoneNumber);
            if (!lid) {
                return false;
            }

            this.pnToLidMappings.delete(phoneNumber);
            this.lidToPnMappings.delete(lid);
            this.jidCache.clear();
            
            if (save) {
                this.saveMappings();
            }
            
            this.logger.debug(`Mapeamento removido: ${phoneNumber}`);
            return true;
            
        } catch (error) {
            this.logger.error('Erro ao remover mapeamento LID:', error);
            return false;
        }
    }

    /**
     * Obtém LID para um número de telefone
     */
    getLIDForPN(phoneNumber) {
        return this.pnToLidMappings.get(phoneNumber);
    }

    /**
     * Obtém número de telefone para um LID
     */
    getPNForLID(lid) {
        return this.lidToPnMappings.get(lid);
    }

    /**
     * Verifica se existe mapeamento LID para um JID/número
     */
    hasLidMapping(jid) {
        if (!jid || !this.isLIDSupported) {
            return false;
        }

        try {
            // Se já é um LID JID, verificar no mapeamento reverso
            if (jid.includes('@lid.whatsapp.net')) {
                const lid = jid.split('@')[0];
                return this.lidToPnMappings.has(lid);
            }
            
            // Se é JID normal, extrair número e verificar
            const phoneNumber = jid.split('@')[0];
            return this.pnToLidMappings.has(phoneNumber);
            
        } catch (error) {
            this.logger.warn('Erro ao verificar mapeamento LID:', error);
            return false;
        }
    }

    /**
     * Converte JID considerando LID
     */
    convertJIDForLID(jid) {
        if (!this.isLIDSupported || !jid) {
            return jid;
        }

        // Cache para otimização
        const cached = this.jidCache.get(jid);
        if (cached) {
            return cached;
        }

        try {
            // Extrair número do JID
            const phoneNumber = jid.split('@')[0];
            const domain = jid.split('@')[1];
            
            // Buscar LID correspondente
            const lid = this.getLIDForPN(phoneNumber);
            
            let result;
            if (lid && domain === 's.whatsapp.net') {
                // Usar LID se disponível
                result = `${lid}@lid.whatsapp.net`;
            } else {
                // Manter JID original
                result = jid;
            }
            
            // Cache do resultado
            this.jidCache.set(jid, result);
            
            return result;
            
        } catch (error) {
            this.logger.warn('Erro ao converter JID para LID:', error);
            return jid;
        }
    }

    /**
     * Converte JID LID de volta para JID normal
     */
    convertLIDJIDToPN(lidJid) {
        if (!this.isLIDSupported || !lidJid || !lidJid.includes('@lid.whatsapp.net')) {
            return lidJid;
        }

        try {
            const lid = lidJid.split('@')[0];
            const phoneNumber = this.getPNForLID(lid);
            
            if (phoneNumber) {
                return `${phoneNumber}@s.whatsapp.net`;
            }
            
            return lidJid;
            
        } catch (error) {
            this.logger.warn('Erro ao converter LID JID para PN:', error);
            return lidJid;
        }
    }

    /**
     * Realiza sincronização inicial com servidor
     */
    async performInitialSync() {
        try {
            if (!this.isLIDSupported) {
                return;
            }

            this.logger.debug('Iniciando sincronização LID inicial');

            // Registrar protocolo LID no USync
            if (this.socket.usync) {
                this.socket.usync.withLIDProtocol();
            }

            // Solicitar sincronização se necessário
            const query = {
                tag: 'iq',
                attrs: {
                    id: generics_1.generateMessageTag(),
                    type: 'get',
                    xmlns: 'usync'
                },
                content: [
                    {
                        tag: 'usync',
                        attrs: {},
                        content: [
                            {
                                tag: 'query',
                                attrs: {},
                                content: [
                                    {
                                        tag: 'lid',
                                        attrs: {}
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };

            // Enviar query
            const response = await this.socket.query(query);
            this.logger.debug('Resposta da sincronização LID inicial:', response);
            
        } catch (error) {
            this.logger.warn('Erro na sincronização LID inicial:', error);
        }
    }

    /**
     * Força sincronização LID
     */
    async forceSync() {
        try {
            this.logger.debug('Forçando sincronização LID');
            await this.performInitialSync();
        } catch (error) {
            this.logger.error('Erro ao forçar sincronização LID:', error);
        }
    }

    /**
     * Limpa todos os dados LID
     */
    clearAllData() {
        this.pnToLidMappings.clear();
        this.lidToPnMappings.clear();
        this.jidCache.clear();
        this.migrationTimestamp = null;
        this.lastSyncTimestamp = 0;
        
        // Limpar do authState
        if (this.authState.keys) {
            delete this.authState.keys.lidMappings;
            delete this.authState.keys.lidTimestamp;
        }
        
        this.logger.info('Dados LID limpos');
    }

    /**
     * Obtém estatísticas LID
     */
    getStats() {
        return {
            isSupported: this.isLIDSupported,
            isInitialized: this.isInitialized,
            mappingsCount: this.pnToLidMappings.size,
            migrationTimestamp: this.migrationTimestamp,
            lastSyncTimestamp: this.lastSyncTimestamp,
            cacheSize: this.jidCache.size
        };
    }

    /**
     * Obtém todos os mapeamentos (para debug)
     */
    getAllMappings() {
        return {
            pnToLid: Object.fromEntries(this.pnToLidMappings),
            lidToPn: Object.fromEntries(this.lidToPnMappings)
        };
    }

    /**
     * Converte automaticamente uma MessageKey para o formato apropriado
     * Suporte bidirecional: LID -> JID ou JID -> LID
     */
    convertMessageKey(messageKey, preferLid = null) {
        if (!messageKey) return messageKey;

        // Determinar preferência automaticamente se não especificada
        if (preferLid === null) {
            preferLid = this.isLIDSupported && this.shouldUseLid(messageKey);
        }

        // Se já está no formato desejado, retornar como está
        if (preferLid && messageKey.isLidMessage) {
            return messageKey;
        }
        if (!preferLid && !messageKey.isLidMessage) {
            return messageKey;
        }

        // Conversão bidirecional
        if (preferLid) {
            return this.convertJidToLidMessageKey(messageKey);
        } else {
            return this.convertLidToJidMessageKey(messageKey);
        }
    }

    /**
     * Converte JID MessageKey para LID MessageKey
     */
    convertJidToLidMessageKey(jidKey) {
        if (!jidKey || jidKey.isLidMessage) return jidKey;

        const convertedKey = { ...jidKey };

        // Converter remoteJid para remoteLid
        if (jidKey.remoteJid) {
            const remoteLid = this.jidToLid(jidKey.remoteJid);
            if (remoteLid) {
                convertedKey.remoteLid = remoteLid;
                convertedKey.isLidMessage = true;
            }
        }

        // Converter participant para participantLid
        if (jidKey.participant) {
            const participantLid = this.jidToLid(jidKey.participant);
            if (participantLid) {
                convertedKey.participantLid = participantLid;
            }
        }

        return convertedKey;
    }

    /**
     * Converte LID MessageKey para JID MessageKey
     */
    convertLidToJidMessageKey(lidKey) {
        if (!lidKey || !lidKey.isLidMessage) return lidKey;

        const convertedKey = { ...lidKey };

        // Converter remoteLid para remoteJid
        if (lidKey.remoteLid) {
            const remoteJid = this.lidToJid(lidKey.remoteLid);
            if (remoteJid) {
                convertedKey.remoteJid = remoteJid;
                convertedKey.isLidMessage = false;
            }
        }

        // Converter participantLid para participant
        if (lidKey.participantLid) {
            const participant = this.lidToJid(lidKey.participantLid);
            if (participant) {
                convertedKey.participant = participant;
            }
        }

        // Remover campos LID se conversão foi bem-sucedida
        if (convertedKey.remoteJid) {
            delete convertedKey.remoteLid;
            delete convertedKey.participantLid;
        }

        return convertedKey;
    }

    /**
     * Processa mensagem recebida (bidirecional)
     * Detecta automaticamente se é LID ou JID e converte conforme necessário
     */
    processIncomingMessage(message) {
        if (!message || !message.key) return message;

        const processedMessage = { ...message };
        
        // Detectar tipo da mensagem
        const isLidMessage = this.isLidMessage(message.key);
        
        // Converter key conforme necessário
        if (isLidMessage) {
            // Mensagem LID: manter LID mas adicionar JID para compatibilidade
            processedMessage.key = this.enrichLidMessageKey(message.key);
        } else {
            // Mensagem JID: manter JID mas adicionar LID se disponível
            processedMessage.key = this.enrichJidMessageKey(message.key);
        }

        // Processar participants se for mensagem de grupo
        if (message.participant) {
            const participantLid = this.jidToLid(message.participant);
            if (participantLid) {
                processedMessage.participantLid = participantLid;
            }
        }

        // Adicionar metadata de roteamento
        processedMessage._lidMetadata = {
            originalFormat: isLidMessage ? 'lid' : 'jid',
            processedAt: Date.now(),
            hasLidMapping: this.hasLidMapping(message.key.remoteJid || message.key.remoteLid),
            routingInfo: this.getRoutingInfo(message.key)
        };

        return processedMessage;
    }

    /**
     * Prepara mensagem para envio (bidirecional)
     * Escolhe automaticamente o melhor formato (LID ou JID)
     */
    prepareOutgoingMessage(message, options = {}) {
        if (!message || !message.key) return message;

        const { 
            forceLid = false, 
            forceJid = false, 
            recipientSupportsLid = null 
        } = options;

        const preparedMessage = { ...message };
        
        // Determinar formato ideal
        let useLid = false;
        
        if (forceLid) {
            useLid = true;
        } else if (forceJid) {
            useLid = false;
        } else {
            // Decisão automática inteligente
            useLid = this.shouldUseLidForMessage(message, recipientSupportsLid);
        }

        // Converter key para formato apropriado
        if (useLid) {
            preparedMessage.key = this.convertJidToLidMessageKey(message.key);
        } else {
            preparedMessage.key = this.convertLidToJidMessageKey(message.key);
        }

        // Adicionar metadata de envio
        preparedMessage._lidMetadata = {
            sentFormat: useLid ? 'lid' : 'jid',
            preparedAt: Date.now(),
            decision: {
                forceLid,
                forceJid,
                recipientSupportsLid,
                autoDecision: !forceLid && !forceJid
            }
        };

        return preparedMessage;
    }

    /**
     * Enriquece MessageKey LID com informações JID para compatibilidade
     */
    enrichLidMessageKey(lidKey) {
        const enrichedKey = { ...lidKey };

        // Adicionar JID equivalente se disponível
        if (lidKey.remoteLid && !lidKey.remoteJid) {
            const remoteJid = this.lidToJid(lidKey.remoteLid);
            if (remoteJid) {
                enrichedKey.remoteJid = remoteJid;
            }
        }

        if (lidKey.participantLid && !lidKey.participant) {
            const participant = this.lidToJid(lidKey.participantLid);
            if (participant) {
                enrichedKey.participant = participant;
            }
        }

        return enrichedKey;
    }

    /**
     * Enriquece MessageKey JID com informações LID se disponíveis
     */
    enrichJidMessageKey(jidKey) {
        const enrichedKey = { ...jidKey };

        // Adicionar LID equivalente se disponível
        if (jidKey.remoteJid && !jidKey.remoteLid) {
            const remoteLid = this.jidToLid(jidKey.remoteJid);
            if (remoteLid) {
                enrichedKey.remoteLid = remoteLid;
            }
        }

        if (jidKey.participant && !jidKey.participantLid) {
            const participantLid = this.jidToLid(jidKey.participant);
            if (participantLid) {
                enrichedKey.participantLid = participantLid;
            }
        }

        return enrichedKey;
    }

    /**
     * Detecta se uma MessageKey é do tipo LID
     */
    isLidMessage(messageKey) {
        return !!(messageKey && (
            messageKey.isLidMessage ||
            messageKey.remoteLid ||
            messageKey.participantLid
        ));
    }

    /**
     * Determina se deve usar LID para uma mensagem específica
     */
    shouldUseLidForMessage(message, recipientSupportsLid = null) {
        if (!this.isLIDSupported) return false;

        // Verificar suporte do destinatário
        if (recipientSupportsLid === false) return false;
        if (recipientSupportsLid === true) return true;

        // Verificar se temos mapeamento LID para o destinatário
        const remoteJid = message.key?.remoteJid;
        if (remoteJid && this.hasLidMapping(remoteJid)) {
            return true;
        }

        // Verificar se é mensagem de grupo com suporte LID
        if (this.isGroupJid(remoteJid)) {
            return this.groupSupportsLid(remoteJid);
        }

        // Padrão: usar LID se disponível
        return this.isLIDSupported;
    }

    /**
     * Obtém informações de roteamento para uma MessageKey
     */
    getRoutingInfo(messageKey) {
        const info = {
            hasRemoteLidMapping: false,
            hasParticipantLidMapping: false,
            isGroupMessage: false,
            routingStrategy: 'jid' // padrão
        };

        if (messageKey.remoteJid) {
            info.hasRemoteLidMapping = this.hasLidMapping(messageKey.remoteJid);
            info.isGroupMessage = this.isGroupJid(messageKey.remoteJid);
        }

        if (messageKey.participant) {
            info.hasParticipantLidMapping = this.hasLidMapping(messageKey.participant);
        }

        // Determinar estratégia de roteamento
        if (info.hasRemoteLidMapping && this.isLIDSupported) {
            info.routingStrategy = 'lid';
        } else if (info.isGroupMessage && info.hasParticipantLidMapping) {
            info.routingStrategy = 'hybrid'; // grupo JID com participant LID
        }

        return info;
    }

    /**
     * Verifica se um JID é de grupo
     */
    isGroupJid(jid) {
        return jid && jid.includes('@g.us');
    }

    /**
     * Verifica se um grupo suporta LID
     */
    groupSupportsLid(groupJid) {
        // Implementar lógica específica de verificação de suporte LID em grupos
        // Por enquanto, assumir que grupos com mapeamentos LID suportam
        return this.hasLidMapping(groupJid);
    }

    /**
     * Determina se deve usar LID para um JID específico
     */
    shouldUseLid(messageKey) {
        if (!this.isLIDSupported) return false;
        
        const jid = messageKey.remoteJid;
        if (!jid) return false;

        // Verificar se temos mapeamento LID
        return this.hasLidMapping(jid);
    }
}

exports.LIDManager = LIDManager; 