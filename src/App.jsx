import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NewNotificationProvider } from './contexts/NewNotificationContext';

// 🔔 IMPORTAR SERVIÇOS DE NOTIFICAÇÃO PUSH
import pushNotificationService from './services/pushNotificationService';
import notificationService from './services/notificationService';

// Components
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NewTicketPage from './pages/NewTicketPage';
import TicketDetailPage from './pages/TicketDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectFormPage from './pages/ProjectFormPage';
import EventsPage from './pages/EventsPage';
import UsersPage from './pages/UsersPage';
import AdminPanelPage from './pages/AdminPanelPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CronogramaPage from './pages/CronogramaPage';
import OperationalPanel from './pages/OperationalPanel';
import TVPanel from './pages/TVPanel';
import TestPage from './pages/TestPage';
import TemplateManagerPage from './pages/TemplateManagerPage';

// 🔔 COMPONENTE DE INICIALIZAÇÃO DE PUSH NOTIFICATIONS
function PushNotificationInitializer() {
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const initializePushNotifications = async () => {
      if (!user || !userProfile) return;

      try {
        console.log('🔔 Inicializando notificações push para usuário:', user.uid);

        // Verificar se o navegador suporta notificações
        if (!('Notification' in window)) {
          console.warn('🚫 Este navegador não suporta notificações');
          return;
        }

        // Verificar se já tem permissão
        if (Notification.permission === 'granted') {
          console.log('✅ Permissão já concedida, inicializando...');
          await notificationService.initializePushNotifications(user.uid);
        } else if (Notification.permission === 'default') {
          // Aguardar um pouco antes de solicitar permissão
          setTimeout(async () => {
            const shouldRequest = window.confirm(
              'Deseja receber notificações push sobre novos chamados e mensagens?'
            );
            
            if (shouldRequest) {
              await notificationService.initializePushNotifications(user.uid);
            }
          }, 3000); // Aguardar 3 segundos após login
        }

        // Configurar listener para notificações em foreground
        window.addEventListener('pushNotificationReceived', (event) => {
          console.log('📱 Notificação push recebida no app:', event.detail);
          
          // Aqui você pode atualizar o estado da aplicação
          // Por exemplo, recarregar notificações, mostrar toast, etc.
        });

      } catch (error) {
        console.error('❌ Erro ao inicializar notificações push:', error);
      }
    };

    initializePushNotifications();

    // Cleanup
    return () => {
      window.removeEventListener('pushNotificationReceived', () => {});
    };
  }, [user, userProfile]);

  return null; // Este componente não renderiza nada
}

// 🔔 COMPONENTE DE TESTE DE NOTIFICAÇÕES (APENAS EM DESENVOLVIMENTO)
function NotificationTester() {
  const { user } = useAuth();

  useEffect(() => {
    // Adicionar botão de teste apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development' && user) {
      const addTestButton = () => {
        if (document.getElementById('notification-test-btn')) return;

        const button = document.createElement('button');
        button.id = 'notification-test-btn';
        button.innerHTML = '🧪 Testar Push';
        button.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        button.onclick = async () => {
          try {
            const result = await notificationService.testPushNotification(user.uid);
            alert(`Teste de notificação:\nLocal: ${result.localTest ? '✅' : '❌'}\nBackend: ${result.backendTest ? '✅' : '❌'}`);
          } catch (error) {
            alert('❌ Erro no teste: ' + error.message);
          }
        };

        document.body.appendChild(button);
      };

      // Aguardar um pouco para garantir que a página carregou
      setTimeout(addTestButton, 2000);
    }
  }, [user]);

  return null;
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Header />}
      
      {/* 🔔 INICIALIZADOR DE PUSH NOTIFICATIONS */}
      {user && <PushNotificationInitializer />}
      
      {/* 🧪 TESTADOR DE NOTIFICAÇÕES (APENAS EM DEV) */}
      {user && <NotificationTester />}

      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        
        <Route path="/novo-chamado" element={
          <ProtectedRoute>
            <NewTicketPage />
          </ProtectedRoute>
        } />
        
        <Route path="/chamado/:id" element={
          <ProtectedRoute>
            <TicketDetailPage />
          </ProtectedRoute>
        } />
        
        <Route path="/projetos" element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/projeto/:id" element={
          <ProtectedRoute>
            <ProjectDetailPage />
          </ProtectedRoute>
        } />
        
        <Route path="/novo-projeto" element={
          <ProtectedRoute allowedRoles={['administrador', 'consultor']}>
            <ProjectFormPage />
          </ProtectedRoute>
        } />
        
        <Route path="/editar-projeto/:id" element={
          <ProtectedRoute allowedRoles={['administrador', 'consultor']}>
            <ProjectFormPage />
          </ProtectedRoute>
        } />
        
        <Route path="/eventos" element={
          <ProtectedRoute allowedRoles={['administrador']}>
            <EventsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/usuarios" element={
          <ProtectedRoute allowedRoles={['administrador']}>
            <UsersPage />
          </ProtectedRoute>
        } />
        
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['administrador']}>
            <AdminPanelPage />
          </ProtectedRoute>
        } />
        
        <Route path="/relatorios" element={
          <ProtectedRoute allowedRoles={['administrador', 'gerente']}>
            <ReportsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/analytics" element={
          <ProtectedRoute allowedRoles={['administrador']}>
            <AnalyticsPage />
          </ProtectedRoute>
        } />
        
        <Route path="/cronograma" element={
          <ProtectedRoute>
            <CronogramaPage />
          </ProtectedRoute>
        } />
        
        <Route path="/painel-operacional" element={
          <ProtectedRoute allowedRoles={['administrador', 'operador', 'gerente']}>
            <OperationalPanel />
          </ProtectedRoute>
        } />
        
        <Route path="/tv-panel" element={
          <ProtectedRoute allowedRoles={['administrador']}>
            <TVPanel />
          </ProtectedRoute>
        } />
        
        <Route path="/test" element={
          <ProtectedRoute allowedRoles={['administrador']}>
            <TestPage />
          </ProtectedRoute>
        } />
        
        <Route path="/template-manager" element={
          <ProtectedRoute allowedRoles={['administrador']}>
            <TemplateManagerPage />
          </ProtectedRoute>
        } />
      </Routes>

      {/* PWA Components */}
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      
      {/* Toast Notifications */}
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        duration={5000}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <NewNotificationProvider>
          <Router>
            <AppContent />
          </Router>
        </NewNotificationProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;

