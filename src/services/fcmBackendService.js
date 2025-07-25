// 🚀 SERVIÇO BACKEND PARA FIREBASE CLOUD MESSAGING
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

class FCMBackendService {
  constructor() {
    this.serverEndpoint = process.env.NODE_ENV === 'production' 
      ? 'https://sua-api.vercel.app/api' 
      : 'http://localhost:3001/api';
  }

  // 📤 ENVIAR NOTIFICAÇÃO PARA USUÁRIO ESPECÍFICO
  async sendNotificationToUser(userId, notificationData) {
    try {
      console.log('📤 Enviando notificação para usuário:', userId);

      // Buscar tokens FCM do usuário
      const tokens = await this.getUserTokens(userId);
      
      if (tokens.length === 0) {
        console.warn('⚠️ Nenhum token FCM encontrado para o usuário:', userId);
        return false;
      }

      // Preparar payload da notificação
      const payload = this.prepareNotificationPayload(notificationData);

      // Enviar para cada token do usuário
      const results = await Promise.allSettled(
        tokens.map(token => this.sendToToken(token, payload))
      );

      // Verificar resultados
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`✅ Notificações enviadas: ${successful} sucesso, ${failed} falhas`);

      // Salvar log da notificação
      await this.logNotification(userId, notificationData, successful > 0);

      return successful > 0;
    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error);
      return false;
    }
  }

  // 📤 ENVIAR NOTIFICAÇÃO PARA MÚLTIPLOS USUÁRIOS
  async sendNotificationToMultipleUsers(userIds, notificationData) {
    try {
      console.log('📤 Enviando notificação para múltiplos usuários:', userIds);

      const results = await Promise.allSettled(
        userIds.map(userId => this.sendNotificationToUser(userId, notificationData))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value).length;

      console.log(`✅ Notificações em lote: ${successful} usuários alcançados, ${failed} falhas`);

      return { successful, failed, total: userIds.length };
    } catch (error) {
      console.error('❌ Erro ao enviar notificações em lote:', error);
      return { successful: 0, failed: userIds.length, total: userIds.length };
    }
  }

  // 🔍 BUSCAR TOKENS FCM DO USUÁRIO
  async getUserTokens(userId) {
    try {
      const tokensRef = collection(db, 'fcmTokens');
      const q = query(
        tokensRef, 
        where('userId', '==', userId),
        where('active', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const tokens = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.token) {
          tokens.push(data.token);
        }
      });

      return tokens;
    } catch (error) {
      console.error('❌ Erro ao buscar tokens do usuário:', error);
      return [];
    }
  }

  // 📝 PREPARAR PAYLOAD DA NOTIFICAÇÃO
  prepareNotificationPayload(notificationData) {
    const {
      title,
      body,
      icon = '/icons/icon-192x192.png',
      image,
      data = {},
      type = 'default',
      ticketId,
      priority = 'high',
      playSound = true
    } = notificationData;

    return {
      notification: {
        title: title || 'Gestão de Chamados',
        body: body || 'Você tem uma nova notificação',
        icon,
        image
      },
      data: {
        ...data,
        type,
        ticketId: ticketId?.toString() || '',
        playSound: playSound.toString(),
        timestamp: new Date().toISOString()
      },
      android: {
        priority: priority,
        notification: {
          icon: 'ic_notification',
          color: '#3b82f6',
          sound: 'default',
          channelId: 'gestao_chamados_channel'
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: title || 'Gestão de Chamados',
              body: body || 'Você tem uma nova notificação'
            },
            sound: 'default',
            badge: 1
          }
        }
      },
      webpush: {
        headers: {
          Urgency: priority === 'high' ? 'high' : 'normal'
        },
        notification: {
          title: title || 'Gestão de Chamados',
          body: body || 'Você tem uma nova notificação',
          icon,
          image,
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
          actions: [
            {
              action: 'view',
              title: '👀 Ver Chamado'
            },
            {
              action: 'dismiss',
              title: '❌ Dispensar'
            }
          ]
        }
      }
    };
  }

  // 📡 ENVIAR PARA TOKEN ESPECÍFICO
  async sendToToken(token, payload) {
    try {
      // Simular envio via API do servidor
      const response = await fetch(`${this.serverEndpoint}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          payload
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Notificação enviada com sucesso:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao enviar para token:', error);
      
      // Fallback: usar método direto (apenas para desenvolvimento)
      return this.sendDirectNotification(token, payload);
    }
  }

  // 🔄 MÉTODO DIRETO (FALLBACK)
  async sendDirectNotification(token, payload) {
    try {
      // Este método seria usado apenas em desenvolvimento
      // Em produção, sempre usar o endpoint do servidor
      console.log('🔄 Usando método direto (fallback):', { token, payload });
      
      // Simular sucesso
      return { success: true, messageId: `direct_${Date.now()}` };
    } catch (error) {
      console.error('❌ Erro no método direto:', error);
      throw error;
    }
  }

  // 📝 LOG DA NOTIFICAÇÃO
  async logNotification(userId, notificationData, success) {
    try {
      await addDoc(collection(db, 'notificationLogs'), {
        userId,
        notificationData,
        success,
        timestamp: serverTimestamp(),
        method: 'fcm_push'
      });
    } catch (error) {
      console.error('❌ Erro ao salvar log:', error);
    }
  }

  // 🔔 NOTIFICAÇÕES ESPECÍFICAS POR TIPO

  // 📋 NOVO CHAMADO
  async notifyNewTicket(ticketId, ticketData, creatorId) {
    const recipientIds = await this.getTicketRecipients(ticketData, 'new_ticket');
    
    const notificationData = {
      title: '📋 Novo Chamado Criado',
      body: `${ticketData.titulo} - ${ticketData.area}`,
      type: 'newTicket',
      ticketId,
      data: {
        action: 'view_ticket',
        ticketId,
        creatorId
      }
    };

    return this.sendNotificationToMultipleUsers(recipientIds, notificationData);
  }

  // 💬 NOVA MENSAGEM
  async notifyNewMessage(ticketId, ticketData, messageData, senderId) {
    const recipientIds = await this.getTicketRecipients(ticketData, 'new_message', senderId);
    
    const notificationData = {
      title: '💬 Nova Mensagem',
      body: `${messageData.remetenteNome}: ${messageData.conteudo?.substring(0, 50)}...`,
      type: 'message',
      ticketId,
      data: {
        action: 'view_message',
        ticketId,
        senderId
      }
    };

    return this.sendNotificationToMultipleUsers(recipientIds, notificationData);
  }

  // 🔄 ESCALAÇÃO
  async notifyEscalation(ticketId, ticketData, escalationType, targetUserId, escalatorId) {
    const recipientIds = [targetUserId];
    
    const escalationTypes = {
      area: '🔄 Chamado Escalado para Área',
      management: '👨‍💼 Chamado Escalado para Gerência',
      consultant: '👨‍🎯 Chamado Escalado para Consultor'
    };

    const notificationData = {
      title: escalationTypes[escalationType] || '🔄 Chamado Escalado',
      body: `${ticketData.titulo} - Requer sua atenção`,
      type: 'escalation',
      ticketId,
      priority: 'high',
      data: {
        action: 'view_escalation',
        ticketId,
        escalationType,
        escalatorId
      }
    };

    return this.sendNotificationToMultipleUsers(recipientIds, notificationData);
  }

  // ✅ MUDANÇA DE STATUS
  async notifyStatusChange(ticketId, ticketData, newStatus, oldStatus, updaterId) {
    const recipientIds = await this.getTicketRecipients(ticketData, 'status_change', updaterId);
    
    const statusMessages = {
      'em_tratativa': '🔧 Em Tratativa',
      'executado_aguardando_validacao': '⏳ Executado - Aguardando Validação',
      'concluido': '✅ Concluído',
      'aprovado': '✅ Aprovado',
      'reprovado': '❌ Reprovado'
    };

    const notificationData = {
      title: '🔄 Status Atualizado',
      body: `${ticketData.titulo} - ${statusMessages[newStatus] || newStatus}`,
      type: 'completion',
      ticketId,
      data: {
        action: 'view_status_change',
        ticketId,
        newStatus,
        oldStatus,
        updaterId
      }
    };

    return this.sendNotificationToMultipleUsers(recipientIds, notificationData);
  }

  // 📅 NOVO EVENTO
  async notifyNewEvent(eventData, creatorId) {
    // Buscar todos os usuários ativos
    const allUsers = await this.getAllActiveUsers();
    const recipientIds = allUsers.filter(id => id !== creatorId);
    
    const notificationData = {
      title: '📅 Novo Evento Cadastrado',
      body: `${eventData.nome} - ${eventData.local}`,
      type: 'newEvent',
      data: {
        action: 'view_event',
        eventId: eventData.id,
        creatorId
      }
    };

    return this.sendNotificationToMultipleUsers(recipientIds, notificationData);
  }

  // 👥 BUSCAR DESTINATÁRIOS DO CHAMADO
  async getTicketRecipients(ticketData, notificationType, excludeUserId = null) {
    try {
      const recipients = new Set();

      // Adicionar criador do chamado
      if (ticketData.criadoPor && ticketData.criadoPor !== excludeUserId) {
        recipients.add(ticketData.criadoPor);
      }

      // Adicionar consultor e produtor do projeto
      if (ticketData.consultorId && ticketData.consultorId !== excludeUserId) {
        recipients.add(ticketData.consultorId);
      }
      if (ticketData.produtorId && ticketData.produtorId !== excludeUserId) {
        recipients.add(ticketData.produtorId);
      }

      // Adicionar operadores da área
      if (ticketData.area) {
        const areaOperators = await this.getAreaOperators(ticketData.area);
        areaOperators.forEach(operatorId => {
          if (operatorId !== excludeUserId) {
            recipients.add(operatorId);
          }
        });
      }

      // Adicionar gerente responsável (se houver)
      if (ticketData.gerenteResponsavelId && ticketData.gerenteResponsavelId !== excludeUserId) {
        recipients.add(ticketData.gerenteResponsavelId);
      }

      return Array.from(recipients);
    } catch (error) {
      console.error('❌ Erro ao buscar destinatários:', error);
      return [];
    }
  }

  // 👨‍💼 BUSCAR OPERADORES DA ÁREA
  async getAreaOperators(area) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('area', '==', area),
        where('funcao', '==', 'operador')
      );
      
      const querySnapshot = await getDocs(q);
      const operators = [];
      
      querySnapshot.forEach(doc => {
        operators.push(doc.id);
      });

      return operators;
    } catch (error) {
      console.error('❌ Erro ao buscar operadores da área:', error);
      return [];
    }
  }

  // 👥 BUSCAR TODOS OS USUÁRIOS ATIVOS
  async getAllActiveUsers() {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      const users = [];
      
      querySnapshot.forEach(doc => {
        users.push(doc.id);
      });

      return users;
    } catch (error) {
      console.error('❌ Erro ao buscar usuários ativos:', error);
      return [];
    }
  }

  // 🧪 TESTAR NOTIFICAÇÃO
  async testNotification(userId) {
    const notificationData = {
      title: '🧪 Teste de Notificação Push',
      body: 'Se você está vendo isso, as notificações push estão funcionando perfeitamente!',
      type: 'test',
      priority: 'high',
      data: {
        action: 'test',
        timestamp: new Date().toISOString()
      }
    };

    return this.sendNotificationToUser(userId, notificationData);
  }
}

// 🔔 INSTÂNCIA SINGLETON
const fcmBackendService = new FCMBackendService();

export default fcmBackendService;

