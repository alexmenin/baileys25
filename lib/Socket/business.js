"use strict"

Object.defineProperty(exports, "__esModule", { value: true })

const business_1 = require("../Utils/business")
const WABinary_1 = require("../WABinary")
const generic_utils_1 = require("../WABinary/generic-utils")
const messages_recv_1 = require("./messages-recv")
const lid_manager_1 = require("../Utils/lid-manager")

const makeBusinessSocket = (config) => {
    const suki = messages_recv_1.makeMessagesRecvSocket(config)
    const { authState, query, waUploadToServer, logger } = suki
    
    // Inicializar LID Manager se disponível
    let lidManager = null
    let lidInitialized = false
    try {
        lidManager = new lid_manager_1.LIDManager(suki, authState, logger || config.logger)
        
        // Inicializar automaticamente em background
        lidManager.initialize().then(isSupported => {
            lidInitialized = true
            if (isSupported) {
                logger?.info('🎯 LID inicializado automaticamente e suportado')
            } else {
                logger?.info('ℹ️ LID inicializado mas não suportado neste dispositivo')
            }
        }).catch(error => {
            lidInitialized = true
            logger?.warn('⚠️ Erro na inicialização automática do LID:', error)
        })
        
    } catch (error) {
        logger?.warn('Erro ao criar LID Manager:', error)
    }
    const getCatalog = async ({ jid, limit, cursor }) => {
        jid = jid || authState.creds.me?.id
        jid = WABinary_1.jidNormalizedUser(jid)
        const queryParamNodes = [
            {
                tag: 'limit',
                attrs: {},
                content: Buffer.from((limit || 10).toString())
            },
            {
                tag: 'width',
                attrs: {},
                content: Buffer.from('100')
            },
            {
                tag: 'height',
                attrs: {},
                content: Buffer.from('100')
            },
        ]
        if (cursor) {
            queryParamNodes.push({
                tag: 'after',
                attrs: {},
                content: cursor
            })
        }
        const result = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'get',
                xmlns: 'w:biz:catalog'
            },
            content: [
                {
                    tag: 'product_catalog',
                    attrs: {
                        jid,
                        'allow_shop_source': 'true'
                    },
                    content: queryParamNodes
                }
            ]
        })
        return business_1.parseCatalogNode(result)
    }
    
    const getCollections = async (jid, limit = 51) => {
        jid = jid || authState.creds.me?.id
        jid = WABinary_1.jidNormalizedUser(jid)
        const result = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'get',
                xmlns: 'w:biz:catalog',
                'smax_id': '35'
            },
            content: [
                {
                    tag: 'collections',
                    attrs: {
                        'biz_jid': jid,
                    },
                    content: [
                        {
                            tag: 'collection_limit',
                            attrs: {},
                            content: Buffer.from(limit.toString())
                        },
                        {
                            tag: 'item_limit',
                            attrs: {},
                            content: Buffer.from(limit.toString())
                        },
                        {
                            tag: 'width',
                            attrs: {},
                            content: Buffer.from('100')
                        },
                        {
                            tag: 'height',
                            attrs: {},
                            content: Buffer.from('100')
                        }
                    ]
                }
            ]
        })
        return business_1.parseCollectionsNode(result)
    }
    
    const getOrderDetails = async (orderId, tokenBase64) => {
        const result = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'get',
                xmlns: 'fb:thrift_iq',
                'smax_id': '5'
            },
            content: [
                {
                    tag: 'order',
                    attrs: {
                        op: 'get',
                        id: orderId
                    },
                    content: [
                        {
                            tag: 'image_dimensions',
                            attrs: {},
                            content: [
                                {
                                    tag: 'width',
                                    attrs: {},
                                    content: Buffer.from('100')
                                },
                                {
                                    tag: 'height',
                                    attrs: {},
                                    content: Buffer.from('100')
                                }
                            ]
                        },
                        {
                            tag: 'token',
                            attrs: {},
                            content: Buffer.from(tokenBase64)
                        }
                    ]
                }
            ]
        })
        return business_1.parseOrderDetailsNode(result)
    }
    
    const productUpdate = async (productId, update) => {
        update = await business_1.uploadingNecessaryImagesOfProduct(update, waUploadToServer)
        const editNode = business_1.toProductNode(productId, update)
        const result = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'w:biz:catalog'
            },
            content: [
                {
                    tag: 'product_catalog_edit',
                    attrs: { v: '1' },
                    content: [
                        editNode,
                        {
                            tag: 'width',
                            attrs: {},
                            content: '100'
                        },
                        {
                            tag: 'height',
                            attrs: {},
                            content: '100'
                        }
                    ]
                }
            ]
        })
        const productCatalogEditNode = generic_utils_1.getBinaryNodeChild(result, 'product_catalog_edit')
        const productNode = generic_utils_1.getBinaryNodeChild(productCatalogEditNode, 'product')
        return business_1.parseProductNode(productNode)
    }
    
    const productCreate = async (create) => {
        // ensure isHidden is defined
        create.isHidden = !!create.isHidden
        create = await business_1.uploadingNecessaryImagesOfProduct(create, waUploadToServer)
        const createNode = business_1.toProductNode(undefined, create)
        const result = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'w:biz:catalog'
            },
            content: [
                {
                    tag: 'product_catalog_add',
                    attrs: { v: '1' },
                    content: [
                        createNode,
                        {
                            tag: 'width',
                            attrs: {},
                            content: '100'
                        },
                        {
                            tag: 'height',
                            attrs: {},
                            content: '100'
                        }
                    ]
                }
            ]
        })
        const productCatalogAddNode = generic_utils_1.getBinaryNodeChild(result, 'product_catalog_add')
        const productNode = generic_utils_1.getBinaryNodeChild(productCatalogAddNode, 'product')
        return business_1.parseProductNode(productNode)
    }
    
    const productDelete = async (productIds) => {
        const result = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'w:biz:catalog'
            },
            content: [
                {
                    tag: 'product_catalog_delete',
                    attrs: { v: '1' },
                    content: productIds.map(id => ({
                        tag: 'product',
                        attrs: {},
                        content: [
                            {
                                tag: 'id',
                                attrs: {},
                                content: Buffer.from(id)
                            }
                        ]
                    }))
                }
            ]
        })
        const productCatalogDelNode = generic_utils_1.getBinaryNodeChild(result, 'product_catalog_delete')
        return {
            deleted: +(productCatalogDelNode?.attrs?.deleted_count || 0) 
        }
    }
    // Funções LID básicas integradas
    const initializeLID = async (force = false) => {
        if (!lidManager) {
            logger?.warn('LID Manager não disponível')
            return false
        }
        
        // Se já foi inicializado automaticamente e não é força, retornar status
        if (lidInitialized && !force) {
            const stats = lidManager.getStats()
            logger?.info(`LID já inicializado - Suportado: ${stats.isSupported}`)
            return stats.isSupported
        }
        
        try {
            logger?.info('🔄 Inicializando LID manualmente...')
            const isSupported = await lidManager.initialize()
            lidInitialized = true
            
            if (isSupported) {
                logger?.info('✅ LID inicializado com sucesso e suportado!')
            } else {
                logger?.info('ℹ️ LID inicializado mas não suportado neste dispositivo')
            }
            
            return isSupported
        } catch (error) {
            logger?.error('❌ Erro ao inicializar LID:', error)
            lidInitialized = true
            return false
        }
    }

    const getLIDStats = () => {
        if (!lidManager) {
            return {
                isSupported: false,
                isInitialized: false,
                mappingsCount: 0,
                migrationTimestamp: null,
                lastSyncTimestamp: 0,
                cacheSize: 0
            }
        }
        
        const baseStats = lidManager.getStats()
        return {
            ...baseStats,
            autoInitialized: lidInitialized,
            managerCreated: !!lidManager
        }
    }

    const sendViaLID = async (jid, message, options = {}) => {
        if (!lidManager?.isInitialized) {
            throw new Error('LID não inicializado')
        }
        // Implementação básica - usar o sendMessage existente com conversão LID
        return await suki.sendMessage(jid, message, { ...options, forceLID: true })
    }

    const sendViaPN = async (jid, message, options = {}) => {
        // Implementação básica - usar o sendMessage existente sem LID
        return await suki.sendMessage(jid, message, { ...options, forcePN: true })
    }

    const convertMessageKey = (messageKey) => {
        return lidManager?.convertMessageKey(messageKey) || messageKey
    }

    const getMessageRoutingInfo = (jid) => {
        return lidManager?.getRoutingInfo(jid) || { 
            usePN: true, 
            useLID: false, 
            originalJid: jid 
        }
    }

    const getAllLIDMappings = () => {
        return lidManager?.getAllMappings() || {
            pnToLid: {},
            lidToPn: {}
        }
    }

    const forceLIDSync = async () => {
        if (!lidManager?.isInitialized) {
            throw new Error('LID não inicializado')
        }
        return await lidManager.forceSync()
    }

    return {
        ...suki,
        logger: config.logger,
        // Funções LID integradas
        initializeLID,
        getLIDStats,
        sendViaLID,
        sendViaPN,
        convertMessageKey,
        getMessageRoutingInfo,
        getAllLIDMappings,
        forceLIDSync,
        // Funções business existentes
        getOrderDetails,
        getCatalog,
        getCollections,
        productCreate,
        productDelete,
        productUpdate
    }
}

module.exports = {
  makeBusinessSocket
}