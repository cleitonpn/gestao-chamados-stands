// 🔔 SERVIÇO COMPLETO DE NOTIFICAÇÕES PUSH
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

class PushNotificationService {
  constructor() {
    this.messaging = null;
    this.currentToken = null;
    this.isSupported = false;
    this.permissionStatus = 'default';
    this.vapidKey = 'BM2dED2E6_MUpgzK4f-9eeNEmFPjVQjQNhFtmDJr3SYGwC-_qzZp5lpt-vM_07NilFujTlbv9apf9TugL1-jUng';
    
    this.init();
  }

  // 🚀 INICIALIZAÇÃO DO SERVIÇO
  async init() {
    try {
      // Verificar suporte
      this.isSupported = this.checkSupport();
      
      if (!this.isSupported) {
        console.warn('🚫 Push notifications não suportadas neste dispositivo');
        return;
      }

      // Inicializar Firebase Messaging
      this.messaging = getMessaging(app);
      
      // Configurar listener de mensagens em foreground
      this.setupForegroundListener();
      
      // Verificar permissão atual
      this.permissionStatus = Notification.permission;
      
      console.log('✅ Push Notification Service inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar Push Notification Service:', error);
    }
  }

  // 🔍 VERIFICAR SUPORTE A NOTIFICAÇÕES
  checkSupport() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      'firebase' in window
    );
  }

  // 🔐 SOLICITAR PERMISSÃO E OBTER TOKEN
  async requestPermissionAndGetToken(userId) {
    try {
      if (!this.isSupported) {
        throw new Error('Push notifications não suportadas');
      }

      // Solicitar permissão
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;

      if (permission !== 'granted') {
        console.warn('🚫 Permissão de notificação negada');
        return null;
      }

      // Registrar service worker se necessário
      await this.registerServiceWorker();

      // Obter token FCM
      const token = await getToken(this.messaging, {
        vapidKey: this.vapidKey
      });

      if (token) {
        this.currentToken = token;
        console.log('🎯 Token FCM obtido:', token);
        
        // Salvar token no Firestore
        await this.saveTokenToDatabase(userId, token);
        
        return token;
      } else {
        console.warn('⚠️ Não foi possível obter token FCM');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao obter token FCM:', error);
      return null;
    }
  }

  // 📝 SALVAR TOKEN NO BANCO DE DADOS
  async saveTokenToDatabase(userId, token) {
    try {
      // Verificar se já existe um token para este usuário
      const tokensRef = collection(db, 'fcmTokens');
      const q = query(tokensRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Criar novo registro
        await addDoc(tokensRef, {
          userId: userId,
          token: token,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          active: true,
          deviceInfo: this.getDeviceInfo()
        });
        console.log('✅ Token FCM salvo no banco de dados');
      } else {
        // Atualizar token existente
        const docRef = querySnapshot.docs[0].ref;
        await updateDoc(docRef, {
          token: token,
          updatedAt: serverTimestamp(),
          active: true,
          deviceInfo: this.getDeviceInfo()
        });
        console.log('✅ Token FCM atualizado no banco de dados');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar token no banco:', error);
    }
  }

  // 📱 OBTER INFORMAÇÕES DO DISPOSITIVO
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      timestamp: new Date().toISOString()
    };
  }

  // 🔧 REGISTRAR SERVICE WORKER
  async registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Service Worker registrado:', registration);
        return registration;
      }
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    }
  }

  // 👂 CONFIGURAR LISTENER PARA MENSAGENS EM FOREGROUND
  setupForegroundListener() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('📱 Notificação recebida em foreground:', payload);
      
      // Exibir notificação customizada quando app está aberto
      this.showForegroundNotification(payload);
      
      // Reproduzir som
      this.playNotificationSound(payload.data?.type);
      
      // Disparar evento customizado
      this.dispatchNotificationEvent(payload);
    });
  }

  // 🔔 EXIBIR NOTIFICAÇÃO EM FOREGROUND
  showForegroundNotification(payload) {
    try {
      const title = payload.notification?.title || 'Gestão de Chamados';
      const options = {
        body: payload.notification?.body || 'Você tem uma nova notificação',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        image: payload.notification?.image,
        data: payload.data || {},
        tag: payload.data?.ticketId || 'notification',
        requireInteraction: true,
        silent: false,
        vibrate: [200, 100, 200]
      };

      // Criar notificação do navegador
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, options);
        
        notification.onclick = () => {
          window.focus();
          if (payload.data?.ticketId) {
            window.location.href = `/chamado/${payload.data.ticketId}`;
          } else {
            window.location.href = '/dashboard';
          }
          notification.close();
        };

        // Auto-fechar após 10 segundos
        setTimeout(() => {
          notification.close();
        }, 10000);
      }
    } catch (error) {
      console.error('❌ Erro ao exibir notificação:', error);
    }
  }

  // 🔊 REPRODUZIR SOM DE NOTIFICAÇÃO
  playNotificationSound(type = 'default') {
    try {
      const sounds = {
        newTicket: '/sounds/new-ticket.mp3',
        message: '/sounds/message.mp3',
        escalation: '/sounds/escalation.mp3',
        approval: '/sounds/approval.mp3',
        completion: '/sounds/completion.mp3',
        default: '/sounds/notification.mp3'
      };

      const soundUrl = sounds[type] || sounds.default;
      const audio = new Audio(soundUrl);
      audio.volume = 0.7;
      
      audio.play().catch(error => {
        console.log('🔇 Não foi possível reproduzir som:', error);
      });
    } catch (error) {
      console.log('🔇 Erro ao configurar som:', error);
    }
  }

  // 📡 DISPARAR EVENTO CUSTOMIZADO
  dispatchNotificationEvent(payload) {
    const event = new CustomEvent('pushNotificationReceived', {
      detail: {
        payload,
        timestamp: new Date().toISOString()
      }
    });
    
    window.dispatchEvent(event);
  }

  // 📤 ENVIAR NOTIFICAÇÃO PUSH
  async sendPushNotification(recipientTokens, notificationData) {
    try {
      // Esta função seria chamada do backend
      // Aqui apenas logamos para debug
      console.log('📤 Enviando notificação push:', {
        tokens: recipientTokens,
        data: notificationData
      });

      // Salvar notificação no Firestore para tracking
      await this.saveNotificationToDatabase(notificationData);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar notificação push:', error);
      return false;
    }
  }

  // 💾 SALVAR NOTIFICAÇÃO NO BANCO
  async saveNotificationToDatabase(notificationData) {
    try {
      await addDoc(collection(db, 'pushNotifications'), {
        ...notificationData,
        createdAt: serverTimestamp(),
        status: 'sent'
      });
      console.log('✅ Notificação salva no banco de dados');
    } catch (error) {
      console.error('❌ Erro ao salvar notificação:', error);
    }
  }

  // 🔄 ATUALIZAR TOKEN
  async refreshToken(userId) {
    try {
      const newToken = await this.requestPermissionAndGetToken(userId);
      return newToken;
    } catch (error) {
      console.error('❌ Erro ao atualizar token:', error);
      return null;
    }
  }

  // ❌ DESATIVAR NOTIFICAÇÕES
  async disableNotifications(userId) {
    try {
      if (this.currentToken) {
        // Marcar token como inativo no banco
        const tokensRef = collection(db, 'fcmTokens');
        const q = query(tokensRef, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);

        for (const doc of querySnapshot.docs) {
          await updateDoc(doc.ref, {
            active: false,
            updatedAt: serverTimestamp()
          });
        }
        
        console.log('✅ Notificações desativadas');
      }
    } catch (error) {
      console.error('❌ Erro ao desativar notificações:', error);
    }
  }

  // 📊 OBTER STATUS DAS NOTIFICAÇÕES
  getNotificationStatus() {
    return {
      isSupported: this.isSupported,
      permission: this.permissionStatus,
      hasToken: !!this.currentToken,
      token: this.currentToken
    };
  }

  // 🧪 TESTAR NOTIFICAÇÃO
  async testNotification() {
    try {
      if (Notification.permission === 'granted') {
        const notification = new Notification('🧪 Teste de Notificação', {
          body: 'Se você está vendo isso, as notificações estão funcionando!',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200]
        });

        this.playNotificationSound('default');

        setTimeout(() => {
          notification.close();
        }, 5000);

        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro no teste de notificação:', error);
      return false;
    }
  }
}

// 🔔 INSTÂNCIA SINGLETON
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;

