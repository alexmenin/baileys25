const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('../lib');
const { Boom } = require('@hapi/boom');

/**
 * Exemplo de uso do protocolo LID bidirecional
 * Demonstra envio e recebimento de mensagens em ambos os formatos (LID e JID)
 */
async function startLIDBidirectionalExample() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    
    const socket = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: require('pino')({ level: 'info' }),
        // Ativar suporte LID bidirecional
        lidSupport: true,
        lidOptions: {
            autoConvert: true,      // Conversão automática entre LID/JID
            preferLid: true,        // Preferir LID quando disponível
            fallbackToJid: true,    // Fallback automático para JID
            bidirectional: true     // Suporte bidirecional completo
        }
    });

    socket.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('QR Code gerado, escaneie com WhatsApp');
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada devido a ', lastDisconnect?.error, ', reconectando ', shouldReconnect);
            
            if (shouldReconnect) {
                startLIDBidirectionalExample();
            }
        } else if (connection === 'open') {
            console.log('✅ Conectado com sucesso! Inicializando LID...');
            initializeLIDSupport();
        }
    });

    socket.ev.on('creds.update', saveCreds);

    // Inicializar suporte LID bidirecional
    async function initializeLIDSupport() {
        try {
            console.log('🔄 Inicializando suporte LID bidirecional...');
            
            // Inicializar LID
            const lidInitialized = await socket.initializeLID();
            
            if (lidInitialized) {
                console.log('✅ LID inicializado com sucesso!');
                console.log('📊 Estatísticas LID:', socket.getLIDStats());
                
                // Demonstrar funcionalidades bidirecionais
                demonstrateBidirectionalFeatures();
            } else {
                console.log('❌ LID não suportado neste dispositivo');
            }
            
        } catch (error) {
            console.error('❌ Erro ao inicializar LID:', error);
        }
    }

    // Demonstrar funcionalidades bidirecionais
    async function demonstrateBidirectionalFeatures() {
        console.log('\n🔄 === DEMONSTRAÇÃO BIDIRECIONAL LID ===\n');

        // 1. Envio Automático Inteligente
        console.log('1️⃣ Testando envio automático inteligente...');
        
        // Envio que escolhe automaticamente LID ou JID
        const testJid = '5511999999999@s.whatsapp.net'; // Substitua por um número real
        
        try {
            await socket.sendMessage(testJid, {
                text: '🤖 Mensagem enviada com roteamento automático LID/JID'
            });
            console.log('✅ Mensagem enviada com roteamento automático');
        } catch (error) {
            console.log('❌ Erro no envio automático:', error.message);
        }

        // 2. Controle Manual de Protocolo
        console.log('\n2️⃣ Testando controle manual de protocolo...');
        
        try {
            // Forçar envio via LID
            await socket.sendMessageViaLID(testJid, {
                text: '🎯 Mensagem enviada FORÇANDO LID'
            });
            console.log('✅ Mensagem enviada via LID forçado');
        } catch (error) {
            console.log('❌ LID forçado falhou:', error.message);
        }

        try {
            // Forçar envio via JID
            await socket.sendMessageViaJID(testJid, {
                text: '📱 Mensagem enviada FORÇANDO JID'
            });
            console.log('✅ Mensagem enviada via JID forçado');
        } catch (error) {
            console.log('❌ JID forçado falhou:', error.message);
        }

        // 3. Conversão Manual de MessageKeys
        console.log('\n3️⃣ Testando conversão manual de MessageKeys...');
        
        const sampleMessageKey = {
            remoteJid: testJid,
            fromMe: true,
            id: 'test-message-123',
            participant: testJid
        };

        // Converter para LID
        const lidMessageKey = socket.convertToLIDMessageKey(sampleMessageKey);
        console.log('🔄 JID → LID:', {
            original: sampleMessageKey.remoteJid,
            converted: lidMessageKey.remoteLid ? `${lidMessageKey.remoteLid}@lid.whatsapp.net` : 'N/A'
        });

        // Converter de volta para JID
        if (lidMessageKey.remoteLid) {
            const backToJidKey = socket.convertToJIDMessageKey(lidMessageKey);
            console.log('🔄 LID → JID:', {
                original: lidMessageKey.remoteLid,
                converted: backToJidKey.remoteJid
            });
        }

        // 4. Informações de Roteamento
        console.log('\n4️⃣ Analisando informações de roteamento...');
        
        const routingInfo = socket.getMessageRoutingInfo(sampleMessageKey);
        console.log('📊 Informações de roteamento:', {
            strategy: routingInfo.routingStrategy,
            hasLidMapping: routingInfo.hasRemoteLidMapping,
            isGroup: routingInfo.isGroupMessage
        });

        // 5. Estatísticas Detalhadas
        console.log('\n5️⃣ Estatísticas LID detalhadas...');
        
        const stats = socket.getLIDStats();
        console.log('📈 Estatísticas completas:', {
            suportado: stats.isSupported,
            inicializado: stats.isInitialized,
            mapeamentos: stats.mappingsCount,
            cache: stats.cacheSize,
            ultimaSync: new Date(stats.lastSyncTimestamp).toLocaleString()
        });

        console.log('\n✨ Demonstração bidirecional concluída!');
        console.log('📝 A biblioteca agora funciona automaticamente com LID e JID');
        console.log('🔄 Conversões são transparentes e automáticas');
        console.log('⚡ Fallbacks automáticos garantem compatibilidade total');
    }

    // Handler para mensagens recebidas (demonstra processamento bidirecional)
    socket.ev.on('messages.upsert', async (m) => {
        const messages = m.messages;
        
        for (const message of messages) {
            if (!message.key.fromMe && message.message) {
                // Verificar se é mensagem LID
                const isLidMessage = message._lidMetadata?.originalFormat === 'lid';
                
                console.log(`\n📨 Mensagem recebida (${isLidMessage ? 'LID' : 'JID'}):`);
                console.log('🆔 De:', message.key.remoteJid);
                
                if (isLidMessage) {
                    console.log('🎯 LID original:', message._lidMetadata?.routingInfo);
                    console.log('🔄 Conversão automática aplicada');
                }
                
                // Resposta automática demonstrando bidirecionalidade
                if (message.message.conversation?.includes('teste lid')) {
                    const responseText = isLidMessage 
                        ? '✅ Recebi sua mensagem LID! Respondendo automaticamente...'
                        : '📱 Recebi sua mensagem JID! Convertendo para LID se possível...';
                    
                    await socket.sendMessage(message.key.remoteJid!, {
                        text: responseText
                    });
                }
            }
        }
    });

    // Handler para eventos LID específicos
    socket.ev.on('lid.migration', (data) => {
        console.log('🔄 Migração LID recebida:', {
            mappings: data.mappingsCount,
            total: data.totalMappings,
            timestamp: data.timestamp
        });
    });

    socket.ev.on('lid.sync', (data) => {
        console.log('🔄 Sincronização LID concluída:', data);
    });

    console.log('\n🚀 Sistema LID bidirecional ativo!');
    console.log('📱 Envie "teste lid" para qualquer contato para ver a demonstração');
    console.log('🔄 Todas as mensagens são processadas bidirecionalmente');
    console.log('⚡ Conversões automáticas entre LID ↔ JID ativas');
}

// Iniciar exemplo
startLIDBidirectionalExample().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});

module.exports = { startLIDBidirectionalExample };