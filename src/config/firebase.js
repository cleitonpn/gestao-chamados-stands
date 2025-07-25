// 🔥 CONFIGURAÇÃO FIREBASE COM SUPORTE A FCM
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

// 🔧 CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBOLJhZOJGKLGNJOJGKLGNJOJGKLGNJOJGK", // Substitua pela sua chave
  authDomain: "gestao-chamados-stands.firebaseapp.com",
  projectId: "gestao-chamados-stands",
  storageBucket: "gestao-chamados-stands.appspot.com",
  messagingSenderId: "103953800507", // Substitua pelo seu sender ID
  appId: "1:103953800507:web:abcdefghijklmnopqrstuvwxyz" // Substitua pelo seu app ID
};

// 🚀 INICIALIZAR FIREBASE
const app = initializeApp(firebaseConfig);

// 🔐 SERVIÇOS FIREBASE
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// 🔔 FIREBASE CLOUD MESSAGING
let messaging = null;

// Função para inicializar messaging apenas se suportado
export const initializeMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
      console.log('✅ Firebase Cloud Messaging inicializado');
      return messaging;
    } else {
      console.warn('🚫 Firebase Cloud Messaging não suportado neste ambiente');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Cloud Messaging:', error);
    return null;
  }
};

// Getter para messaging
export const getMessagingInstance = () => messaging;

// 📱 CONFIGURAÇÕES ESPECÍFICAS PARA PWA
export const pwaConfig = {
  // VAPID Key para Web Push
  vapidKey: 'BM2dED2E6_MUpgzK4f-9eeNEmFPjVQjQNhFtmDJr3SYGwC-_qzZp5lpt-vM_07NilFujTlbv9apf9TugL1-jUng',
  
  // Service Worker path
  serviceWorkerPath: '/firebase-messaging-sw.js',
  
  // Configurações de notificação
  notificationConfig: {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false
  }
};

// 🔧 CONFIGURAÇÕES DE DESENVOLVIMENTO/PRODUÇÃO
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// 📊 CONFIGURAÇÕES DE LOGGING
export const loggingConfig = {
  enableConsoleLogging: isDevelopment,
  enableFirestoreLogging: true,
  logLevel: isDevelopment ? 'debug' : 'error'
};

// 🔔 TIPOS DE NOTIFICAÇÃO
export const NOTIFICATION_TYPES = {
  NEW_TICKET: 'novo_chamado',
  NEW_MESSAGE: 'nova_mensagem',
  ESCALATION_AREA: 'escalacao_area',
  ESCALATION_MANAGEMENT: 'escalacao_gerencia',
  STATUS_CHANGE: 'mudanca_status',
  NEW_EVENT: 'novo_evento',
  APPROVAL_REQUEST: 'solicitacao_aprovacao',
  SYSTEM_ALERT: 'alerta_sistema'
};

// 🎵 CONFIGURAÇÕES DE SOM
export const SOUND_CONFIG = {
  enabled: true,
  volume: 0.7,
  sounds: {
    [NOTIFICATION_TYPES.NEW_TICKET]: '/sounds/new-ticket.mp3',
    [NOTIFICATION_TYPES.NEW_MESSAGE]: '/sounds/message.mp3',
    [NOTIFICATION_TYPES.ESCALATION_AREA]: '/sounds/escalation.mp3',
    [NOTIFICATION_TYPES.ESCALATION_MANAGEMENT]: '/sounds/escalation.mp3',
    [NOTIFICATION_TYPES.STATUS_CHANGE]: '/sounds/completion.mp3',
    [NOTIFICATION_TYPES.NEW_EVENT]: '/sounds/event.mp3',
    [NOTIFICATION_TYPES.APPROVAL_REQUEST]: '/sounds/approval.mp3',
    [NOTIFICATION_TYPES.SYSTEM_ALERT]: '/sounds/alert.mp3',
    default: '/sounds/notification.mp3'
  }
};

// 📱 CONFIGURAÇÕES ESPECÍFICAS PARA MOBILE
export const mobileConfig = {
  // Configurações para Android
  android: {
    channelId: 'gestao_chamados_channel',
    channelName: 'Gestão de Chamados',
    channelDescription: 'Notificações do sistema de gestão de chamados',
    importance: 'high',
    vibrationPattern: [200, 100, 200],
    lightColor: '#3b82f6',
    smallIcon: 'ic_notification'
  },
  
  // Configurações para iOS
  ios: {
    sound: 'default',
    badge: true,
    alert: true,
    criticalAlert: false
  }
};

// 🔐 CONFIGURAÇÕES DE SEGURANÇA
export const securityConfig = {
  // Domínios permitidos para notificações
  allowedOrigins: [
    'https://gestao-chamados-stands.vercel.app',
    'https://gestao-chamados-stands.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  
  // Timeout para requests
  requestTimeout: 10000,
  
  // Máximo de tentativas de reenvio
  maxRetries: 3,
  
  // Intervalo entre tentativas (ms)
  retryInterval: 1000
};

// 🔄 CONFIGURAÇÕES DE SINCRONIZAÇÃO
export const syncConfig = {
  // Intervalo de sincronização em background (ms)
  backgroundSyncInterval: 30000,
  
  // Máximo de notificações em cache
  maxCachedNotifications: 100,
  
  // Tempo de vida das notificações em cache (ms)
  notificationTTL: 24 * 60 * 60 * 1000, // 24 horas
  
  // Habilitar sincronização offline
  enableOfflineSync: true
};

// 📊 CONFIGURAÇÕES DE ANALYTICS
export const analyticsConfig = {
  // Rastrear eventos de notificação
  trackNotificationEvents: true,
  
  // Eventos a serem rastreados
  trackedEvents: [
    'notification_sent',
    'notification_received',
    'notification_clicked',
    'notification_dismissed',
    'permission_granted',
    'permission_denied'
  ]
};

// 🧪 CONFIGURAÇÕES DE TESTE
export const testConfig = {
  // Habilitar modo de teste
  enableTestMode: isDevelopment,
  
  // Usuário de teste padrão
  testUserId: 'test-user-123',
  
  // Dados de teste para notificações
  testNotificationData: {
    title: '🧪 Teste de Notificação',
    body: 'Esta é uma notificação de teste do sistema',
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'test',
      timestamp: new Date().toISOString()
    }
  }
};

// 🔧 FUNÇÃO DE INICIALIZAÇÃO COMPLETA
export const initializeFirebaseServices = async () => {
  try {
    console.log('🔥 Inicializando serviços Firebase...');
    
    // Inicializar messaging se suportado
    const messagingInstance = await initializeMessaging();
    
    // Registrar service worker se necessário
    if ('serviceWorker' in navigator && messagingInstance) {
      try {
        const registration = await navigator.serviceWorker.register(pwaConfig.serviceWorkerPath);
        console.log('✅ Service Worker registrado:', registration);
      } catch (swError) {
        console.error('❌ Erro ao registrar Service Worker:', swError);
      }
    }
    
    console.log('✅ Serviços Firebase inicializados com sucesso');
    
    return {
      app,
      auth,
      db,
      storage,
      messaging: messagingInstance
    };
  } catch (error) {
    console.error('❌ Erro ao inicializar serviços Firebase:', error);
    throw error;
  }
};

// 🔔 FUNÇÃO PARA VERIFICAR SUPORTE A NOTIFICAÇÕES
export const checkNotificationSupport = () => {
  const support = {
    notifications: 'Notification' in window,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    messaging: !!messaging
  };
  
  const isFullySupported = Object.values(support).every(Boolean);
  
  console.log('📱 Suporte a notificações:', support);
  
  return {
    ...support,
    isFullySupported
  };
};

// Export default
export { app };
export default app;

