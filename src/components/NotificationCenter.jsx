import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar notificações
  const loadNotifications = () => {
    try {
      const allNotifications = notificationService.getInAppNotifications(20);
      setNotifications(allNotifications);
      setUnreadCount(notificationService.getUnreadCount());
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  // Efeito para carregar notificações iniciais
  useEffect(() => {
    loadNotifications();
  }, []);

  // Efeito para escutar novas notificações
  useEffect(() => {
    const handleNewNotification = (event) => {
      loadNotifications();
      
      // Mostrar notificação visual se o centro não estiver aberto
      if (!isOpen) {
        showBrowserNotification(event.detail);
      }
    };

    const handleNotificationRead = () => {
      loadNotifications();
    };

    const handleAllRead = () => {
      loadNotifications();
    };

    window.addEventListener('newNotification', handleNewNotification);
    window.addEventListener('notificationRead', handleNotificationRead);
    window.addEventListener('allNotificationsRead', handleAllRead);

    return () => {
      window.removeEventListener('newNotification', handleNewNotification);
      window.removeEventListener('notificationRead', handleNotificationRead);
      window.removeEventListener('allNotificationsRead', handleAllRead);
    };
  }, [isOpen]);

  // Mostrar notificação do navegador
  const showBrowserNotification = (notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: `ticket-${notification.ticketId}`
      });
    }
  };

  // Solicitar permissão para notificações do navegador
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Permissão para notificações concedida');
      }
    }
  };

  // Marcar notificação como lida
  const markAsRead = (notificationId) => {
    notificationService.markAsRead(notificationId);
    loadNotifications();
  };

  // Marcar todas como lidas
  const markAllAsRead = () => {
    setLoading(true);
    notificationService.markAllAsRead();
    loadNotifications();
    setLoading(false);
  };

  // Limpar notificações antigas
  const clearOldNotifications = () => {
    setLoading(true);
    const removed = notificationService.clearOldNotifications(7); // 7 dias
    loadNotifications();
    setLoading(false);
    
    if (removed > 0) {
      alert(`${removed} notificações antigas foram removidas.`);
    } else {
      alert('Nenhuma notificação antiga encontrada.');
    }
  };

  // Formatar data
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Navegar para chamado
  const navigateToTicket = (ticketId) => {
    if (ticketId) {
      window.location.href = `/chamado/${ticketId}`;
    }
  };

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          requestNotificationPermission();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
        title="Notificações"
      >
        🔔
        
        {/* Badge de contagem */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Painel de notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Cabeçalho */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notificações
                {unreadCount > 0 && (
                  <span className="ml-2 text-sm text-red-600 font-normal">
                    ({unreadCount} não lidas)
                  </span>
                )}
              </h3>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    title="Marcar todas como lidas"
                  >
                    ✓ Todas
                  </button>
                )}
                <button
                  onClick={clearOldNotifications}
                  disabled={loading}
                  className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                  title="Limpar antigas"
                >
                  🧹
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🔔</div>
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notification.id);
                    if (notification.ticketId) {
                      navigateToTicket(notification.ticketId);
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    {/* Ícone */}
                    <div 
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: notification.color }}
                    >
                      {notification.icon}
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium text-gray-900 ${!notification.read ? 'font-semibold' : ''}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatDate(notification.timestamp)}
                        </span>
                        {notification.priority && (
                          <span 
                            className="text-xs px-2 py-1 rounded-full text-white font-medium"
                            style={{ backgroundColor: notificationService.getPriorityColor(notification.priority) }}
                          >
                            {notification.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Indicador de não lida */}
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé */}
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                Mostrando {Math.min(notifications.length, 20)} notificações mais recentes
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;

