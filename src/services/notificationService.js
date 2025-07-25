import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import pushNotificationService from './pushNotificationService';
import fcmBackendService from './fcmBackendService';

class NotificationService {

  // 🔔 MÉTODO PRIVADO PARA CRIAR NOTIFICAÇÕES EM LOTE COM PUSH
  async #sendNotificationToUsers(userIds, notificationData) {
    if (!userIds || userIds.length === 0) return;
    const uniqueUserIds = [...new Set(userIds)];
    
    // 1. Salvar notificações no Firestore (método original)
    const batch = writeBatch(db);
    uniqueUserIds.forEach(userId => {
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
        ...notificationData,
        userId: userId,
        lida: false,
        criadoEm: new Date(),
      });
    });
    
    await batch.commit();
    console.log(`🔔 Notificação do tipo "${notificationData.tipo}" enviada para ${uniqueUserIds.length} usuários.`);

    // 2. 🚀 NOVO: Enviar notificações push
    try {
      const pushData = {
        title: this.#getPushTitle(notificationData.tipo),
        body: this.#getPushBody(notificationData),
        type: notificationData.tipo,
        ticketId: notificationData.chamadoId,
        data: {
          chamadoId: notificationData.chamadoId,
          tipo: notificationData.tipo,
          titulo: notificationData.titulo,
          conteudo: notificationData.conteudo
        }
      };

      await fcmBackendService.sendNotificationToMultipleUsers(uniqueUserIds, pushData);
      console.log('🔔 Notificações push enviadas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao enviar notificações push:', error);
      // Não falhar se push não funcionar - notificação no app ainda funciona
    }
  }

  // 🎯 GERAR TÍTULO DA NOTIFICAÇÃO PUSH
  #getPushTitle(tipo) {
    const titles = {
      'novo_chamado': '📋 Novo Chamado',
      'nova_mensagem': '💬 Nova Mensagem',
      'escalacao_area': '🔄 Chamado Escalado',
      'escalacao_gerencia': '👨‍💼 Escalação Gerencial',
      'mudanca_status': '🔄 Status Atualizado',
      'novo_evento': '📅 Novo Evento'
    };
    return titles[tipo] || '🔔 Notificação';
  }

  // 📝 GERAR CORPO DA NOTIFICAÇÃO PUSH
  #getPushBody(notificationData) {
    const { tipo, titulo, conteudo, remetenteNome } = notificationData;
    
    switch (tipo) {
      case 'novo_chamado':
        return `${titulo} - Novo chamado criado`;
      case 'nova_mensagem':
        return `${remetenteNome}: ${conteudo?.substring(0, 50)}...`;
      case 'escalacao_area':
        return `${titulo} - Escalado para sua área`;
      case 'escalacao_gerencia':
        return `${titulo} - Requer aprovação gerencial`;
      case 'mudanca_status':
        return `${titulo} - Status foi atualizado`;
      case 'novo_evento':
        return `${titulo} - Novo evento cadastrado`;
      default:
        return conteudo || 'Você tem uma nova notificação';
    }
  }

  // Busca usuários por área
  async #getUsersByArea(area) {
    const users = [];
    if (!area) return users;
    const q = query(collection(db, "usuarios"), where("area", "==", area));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  }

  // 💬 NOTIFICA SOBRE NOVA MENSAGEM (ATUALIZADO COM PUSH)
  async notifyNewMessage(chamadoId, chamadoData, messageData, senderId) {
    try {
      console.log('💬 Enviando notificação de nova mensagem...');
      
      const recipients = await this.#getMessageRecipients(chamadoData, senderId);
      
      const notificationData = {
        tipo: 'nova_mensagem',
        titulo: `Nova mensagem em: ${chamadoData.titulo}`,
        conteudo: messageData.conteudo?.substring(0, 100) || 'Nova mensagem no chamado',
        chamadoId: chamadoId,
        remetenteId: senderId,
        remetenteNome: messageData.remetenteNome || 'Usuário',
        metadata: {
          messageId: messageData.id,
          messageType: messageData.type || 'user_message'
        }
      };

      await this.#sendNotificationToUsers(recipients, notificationData);
      
      // 🚀 PUSH ESPECÍFICO PARA MENSAGEM
      try {
        await fcmBackendService.notifyNewMessage(chamadoId, chamadoData, messageData, senderId);
      } catch (pushError) {
        console.error('❌ Erro específico no push de mensagem:', pushError);
      }
      
      console.log('✅ Notificação de nova mensagem enviada');
    } catch (error) {
      console.error('❌ Erro ao notificar nova mensagem:', error);
    }
  }

  // 📋 NOTIFICA SOBRE NOVO CHAMADO (ATUALIZADO COM PUSH)
  async notifyNewTicket(chamadoId, chamadoData, creatorId) {
    try {
      console.log('📋 Enviando notificação de novo chamado...');
      
      const recipients = await this.#getTicketRecipients(chamadoData, creatorId);
      
      const notificationData = {
        tipo: 'novo_chamado',
        titulo: `Novo chamado: ${chamadoData.titulo}`,
        conteudo: `Área: ${chamadoData.area} | Tipo: ${chamadoData.tipo}`,
        chamadoId: chamadoId,
        criadoPor: creatorId,
        metadata: {
          area: chamadoData.area,
          tipo: chamadoData.tipo,
          prioridade: chamadoData.prioridade || 'normal'
        }
      };

      await this.#sendNotificationToUsers(recipients, notificationData);
      
      // 🚀 PUSH ESPECÍFICO PARA NOVO CHAMADO
      try {
        await fcmBackendService.notifyNewTicket(chamadoId, chamadoData, creatorId);
      } catch (pushError) {
        console.error('❌ Erro específico no push de novo chamado:', pushError);
      }
      
      console.log('✅ Notificação de novo chamado enviada');
    } catch (error) {
      console.error('❌ Erro ao notificar novo chamado:', error);
    }
  }

  // 🔄 NOTIFICA SOBRE ESCALAÇÃO (ATUALIZADO COM PUSH)
  async notifyEscalation(chamadoId, chamadoData, targetAreaOrUserId, escalatorId, reason) {
    try {
      console.log('🔄 Enviando notificação de escalação...');
      
      const recipients = await this.#getEscalationRecipients(chamadoData, targetAreaOrUserId);
      
      const notificationData = {
        tipo: 'escalacao_area',
        titulo: `Chamado escalado: ${chamadoData.titulo}`,
        conteudo: `Motivo: ${reason}`,
        chamadoId: chamadoId,
        escaladoPor: escalatorId,
        metadata: {
          targetArea: targetAreaOrUserId,
          reason: reason,
          originalArea: chamadoData.area
        }
      };

      await this.#sendNotificationToUsers(recipients, notificationData);
      
      // 🚀 PUSH ESPECÍFICO PARA ESCALAÇÃO
      try {
        await fcmBackendService.notifyEscalation(chamadoId, chamadoData, 'area', targetAreaOrUserId, escalatorId);
      } catch (pushError) {
        console.error('❌ Erro específico no push de escalação:', pushError);
      }
      
      console.log('✅ Notificação de escalação enviada');
    } catch (error) {
      console.error('❌ Erro ao notificar escalação:', error);
    }
  }

  // 👨‍💼 NOTIFICA SOBRE ESCALAÇÃO GERENCIAL (ATUALIZADO COM PUSH)
  async notifyManagementEscalation(chamadoId, chamadoData, managerId, escalatorId, reason) {
    try {
      console.log('👨‍💼 Enviando notificação de escalação gerencial...');
      
      const recipients = [managerId];
      
      const notificationData = {
        tipo: 'escalacao_gerencia',
        titulo: `Escalação gerencial: ${chamadoData.titulo}`,
        conteudo: `Motivo: ${reason}`,
        chamadoId: chamadoId,
        escaladoPor: escalatorId,
        gerenteResponsavel: managerId,
        metadata: {
          reason: reason,
          originalArea: chamadoData.area,
          requiresApproval: true
        }
      };

      await this.#sendNotificationToUsers(recipients, notificationData);
      
      // 🚀 PUSH ESPECÍFICO PARA ESCALAÇÃO GERENCIAL
      try {
        await fcmBackendService.notifyEscalation(chamadoId, chamadoData, 'management', managerId, escalatorId);
      } catch (pushError) {
        console.error('❌ Erro específico no push de escalação gerencial:', pushError);
      }
      
      console.log('✅ Notificação de escalação gerencial enviada');
    } catch (error) {
      console.error('❌ Erro ao notificar escalação gerencial:', error);
    }
  }

  // 🔄 NOTIFICA SOBRE MUDANÇA DE STATUS (ATUALIZADO COM PUSH)
  async notifyStatusChange(chamadoId, chamadoData, newStatus, oldStatus, updaterId) {
    try {
      console.log('🔄 Enviando notificação de mudança de status...');
      
      const recipients = await this.#getStatusChangeRecipients(chamadoData, updaterId);
      
      const statusNames = {
        'em_tratativa': 'Em Tratativa',
        'executado_aguardando_validacao': 'Executado - Aguardando Validação',
        'concluido': 'Concluído',
        'aprovado': 'Aprovado',
        'reprovado': 'Reprovado'
      };

      const notificationData = {
        tipo: 'mudanca_status',
        titulo: `Status atualizado: ${chamadoData.titulo}`,
        conteudo: `${statusNames[oldStatus] || oldStatus} → ${statusNames[newStatus] || newStatus}`,
        chamadoId: chamadoId,
        atualizadoPor: updaterId,
        metadata: {
          newStatus: newStatus,
          oldStatus: oldStatus,
          statusName: statusNames[newStatus] || newStatus
        }
      };

      await this.#sendNotificationToUsers(recipients, notificationData);
      
      // 🚀 PUSH ESPECÍFICO PARA MUDANÇA DE STATUS
      try {
        await fcmBackendService.notifyStatusChange(chamadoId, chamadoData, newStatus, oldStatus, updaterId);
      } catch (pushError) {
        console.error('❌ Erro específico no push de mudança de status:', pushError);
      }
      
      console.log('✅ Notificação de mudança de status enviada');
    } catch (error) {
      console.error('❌ Erro ao notificar mudança de status:', error);
    }
  }

  // 📅 NOTIFICA SOBRE NOVO EVENTO (ATUALIZADO COM PUSH)
  async notifyNewEvent(eventData, creatorId) {
    try {
      console.log('📅 Enviando notificação de novo evento...');
      
      // Buscar todos os usuários ativos (exceto o criador)
      const allUsers = await this.#getAllActiveUsers();
      const recipients = allUsers.filter(userId => userId !== creatorId);
      
      const notificationData = {
        tipo: 'novo_evento',
        titulo: `Novo evento: ${eventData.nome}`,
        conteudo: `Local: ${eventData.local} | Data: ${eventData.dataInicioEvento}`,
        eventoId: eventData.id,
        criadoPor: creatorId,
        metadata: {
          eventName: eventData.nome,
          location: eventData.local,
          startDate: eventData.dataInicioEvento
        }
      };

      await this.#sendNotificationToUsers(recipients, notificationData);
      
      // 🚀 PUSH ESPECÍFICO PARA NOVO EVENTO
      try {
        await fcmBackendService.notifyNewEvent(eventData, creatorId);
      } catch (pushError) {
        console.error('❌ Erro específico no push de novo evento:', pushError);
      }
      
      console.log('✅ Notificação de novo evento enviada');
    } catch (error) {
      console.error('❌ Erro ao notificar novo evento:', error);
    }
  }

  // 🎯 MÉTODOS AUXILIARES PARA BUSCAR DESTINATÁRIOS

  async #getMessageRecipients(chamadoData, senderId) {
    const recipients = new Set();
    
    // Adicionar criador do chamado
    if (chamadoData.criadoPor && chamadoData.criadoPor !== senderId) {
      recipients.add(chamadoData.criadoPor);
    }
    
    // Adicionar consultor e produtor
    if (chamadoData.consultorId && chamadoData.consultorId !== senderId) {
      recipients.add(chamadoData.consultorId);
    }
    if (chamadoData.produtorId && chamadoData.produtorId !== senderId) {
      recipients.add(chamadoData.produtorId);
    }
    
    // Adicionar operadores da área
    if (chamadoData.area) {
      const areaUsers = await this.#getUsersByArea(chamadoData.area);
      areaUsers.forEach(user => {
        if (user.id !== senderId) {
          recipients.add(user.id);
        }
      });
    }
    
    return Array.from(recipients);
  }

  async #getTicketRecipients(chamadoData, creatorId) {
    const recipients = new Set();
    
    // Adicionar consultor e produtor do projeto
    if (chamadoData.consultorId && chamadoData.consultorId !== creatorId) {
      recipients.add(chamadoData.consultorId);
    }
    if (chamadoData.produtorId && chamadoData.produtorId !== creatorId) {
      recipients.add(chamadoData.produtorId);
    }
    
    // Adicionar operadores da área de destino
    if (chamadoData.area) {
      const areaUsers = await this.#getUsersByArea(chamadoData.area);
      areaUsers.forEach(user => {
        if (user.id !== creatorId) {
          recipients.add(user.id);
        }
      });
    }
    
    return Array.from(recipients);
  }

  async #getEscalationRecipients(chamadoData, targetArea) {
    const recipients = new Set();
    
    // Buscar operadores da área de destino
    const areaUsers = await this.#getUsersByArea(targetArea);
    areaUsers.forEach(user => {
      recipients.add(user.id);
    });
    
    return Array.from(recipients);
  }

  async #getStatusChangeRecipients(chamadoData, updaterId) {
    const recipients = new Set();
    
    // Adicionar criador do chamado
    if (chamadoData.criadoPor && chamadoData.criadoPor !== updaterId) {
      recipients.add(chamadoData.criadoPor);
    }
    
    // Adicionar consultor e produtor
    if (chamadoData.consultorId && chamadoData.consultorId !== updaterId) {
      recipients.add(chamadoData.consultorId);
    }
    if (chamadoData.produtorId && chamadoData.produtorId !== updaterId) {
      recipients.add(chamadoData.produtorId);
    }
    
    // Adicionar operadores das áreas envolvidas
    const areas = [chamadoData.area, chamadoData.areaDeOrigem].filter(Boolean);
    for (const area of areas) {
      const areaUsers = await this.#getUsersByArea(area);
      areaUsers.forEach(user => {
        if (user.id !== updaterId) {
          recipients.add(user.id);
        }
      });
    }
    
    return Array.from(recipients);
  }

  async #getAllActiveUsers() {
    try {
      const usersRef = collection(db, 'usuarios');
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

  // 📱 MÉTODOS DE GERENCIAMENTO DE TOKENS FCM

  async initializePushNotifications(userId) {
    try {
      console.log('📱 Inicializando notificações push para usuário:', userId);
      
      const token = await pushNotificationService.requestPermissionAndGetToken(userId);
      
      if (token) {
        console.log('✅ Notificações push inicializadas com sucesso');
        return token;
      } else {
        console.warn('⚠️ Não foi possível inicializar notificações push');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar notificações push:', error);
      return null;
    }
  }

  async testPushNotification(userId) {
    try {
      console.log('🧪 Testando notificação push...');
      
      // Teste local
      const localTest = await pushNotificationService.testNotification();
      
      // Teste via backend
      const backendTest = await fcmBackendService.testNotification(userId);
      
      return { localTest, backendTest };
    } catch (error) {
      console.error('❌ Erro no teste de notificação push:', error);
      return { localTest: false, backendTest: false };
    }
  }

  getPushNotificationStatus() {
    return pushNotificationService.getNotificationStatus();
  }

  // 📖 MÉTODOS ORIGINAIS MANTIDOS

  async getUserNotifications(userId, limit = 50) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('criadoEm', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const notifications = [];
      
      querySnapshot.forEach(doc => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return notifications.slice(0, limit);
    } catch (error) {
      console.error('❌ Erro ao buscar notificações:', error);
      return [];
    }
  }

  async markAsRead(notificationId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        lida: true,
        lidaEm: new Date()
      });
      console.log('✅ Notificação marcada como lida');
    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
    }
  }

  async markTicketNotificationsAsRead(userId, chamadoId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('chamadoId', '==', chamadoId),
        where('lida', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      querySnapshot.forEach(doc => {
        batch.update(doc.ref, {
          lida: true,
          lidaEm: new Date()
        });
      });
      
      await batch.commit();
      console.log('✅ Notificações do chamado marcadas como lidas');
    } catch (error) {
      console.error('❌ Erro ao marcar notificações do chamado como lidas:', error);
    }
  }

  subscribeToNotifications(userId, callback) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('criadoEm', 'desc')
      );
      
      return onSnapshot(q, (querySnapshot) => {
        const notifications = [];
        querySnapshot.forEach(doc => {
          notifications.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        callback(notifications);
      });
    } catch (error) {
      console.error('❌ Erro ao subscrever notificações:', error);
      return () => {}; // Retorna função vazia para cleanup
    }
  }

  async getUnreadCount(userId) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('lida', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('❌ Erro ao contar notificações não lidas:', error);
      return 0;
    }
  }
}

// 🔔 INSTÂNCIA SINGLETON
const notificationService = new NotificationService();

export default notificationService;

