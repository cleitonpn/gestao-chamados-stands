import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { ticketService } from '../services/ticketService';
import { userService } from '../services/userService';
import { firestoreNotificationService } from '../services/firestoreNotificationService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import NotificationCenter from '../components/NotificationCenter';
import NotificationBadge from '../components/NotificationBadge';
import { useNotifications } from '../hooks/useNotifications';
import { 
  LogOut, 
  Plus, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Users,
  FolderOpen,
  BarChart3,
  Menu,
  X,
  ExternalLink,
  MapPin,
  User,
  FileText,
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  MoreVertical,
  Archive,
  Trash2,
  Edit
  // Eye removido - usando SVG no NotificationBadge
} from 'lucide-react';

const DashboardPage = () => {
  const { user, userProfile, logout, authInitialized } = useAuth();
  const navigate = useNavigate();
  
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectNames, setProjectNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedEvents, setExpandedEvents] = useState({});
  const [selectedTab, setSelectedTab] = useState('chamados');
  const [ticketNotifications, setTicketNotifications] = useState({});
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Hook de notificações
  const {
    unreadCounts,
    loading: notificationsLoading,
    markAsViewed,
    getUnreadCount,
    getTotalUnread
  } = useNotifications(tickets);

  // Função para lidar com clique no ícone de visualização
  const handleViewTicket = async (ticketId, event) => {
    if (event) {
      event.stopPropagation(); // Prevenir navegação do card
    }
    
    // Marcar como visualizado
    await markAsViewed(ticketId);
    
    // Navegar para o chamado
    navigate(`/chamado/${ticketId}`);
  };

  // Resto do código da DashboardPage original...
  useEffect(() => {
    if (!authInitialized) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    loadData();
  }, [user, userProfile, authInitialized, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar usuários
      const usersData = await userService.getAllUsers();
      setUsers(usersData);

      // Carregar projetos baseado no papel do usuário
      let projectsData = [];
      if (userProfile?.funcao === 'administrador' || userProfile?.funcao === 'gerente' || userProfile?.funcao === 'operador') {
        projectsData = await projectService.getAllProjects();
      } else if (userProfile?.funcao === 'consultor') {
        projectsData = await projectService.getProjectsByConsultor(user.uid);
      } else if (userProfile?.funcao === 'produtor') {
        projectsData = await projectService.getProjectsByProdutor(user.uid);
      }
      
      setProjects(projectsData);

      // Criar mapeamento de nomes de projetos
      const projectNamesMap = {};
      projectsData.forEach(project => {
        projectNamesMap[project.id] = project.nome;
      });
      setProjectNames(projectNamesMap);

      // Carregar chamados baseado no papel do usuário
      let ticketsData = [];
      if (userProfile?.funcao === 'administrador') {
        ticketsData = await ticketService.getAllTickets();
      } else if (userProfile?.funcao === 'gerente') {
        ticketsData = await ticketService.getAllTickets();
      } else if (userProfile?.funcao === 'consultor') {
        ticketsData = await ticketService.getTicketsByConsultor(user.uid);
      } else if (userProfile?.funcao === 'produtor') {
        ticketsData = await ticketService.getTicketsByProdutor(user.uid);
      } else if (userProfile?.funcao === 'operador') {
        ticketsData = await ticketService.getTicketsByArea(userProfile.area);
      }

      setTickets(ticketsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funções auxiliares para organização dos dados
  const getTicketsByProject = () => {
    const grouped = {};
    
    tickets.forEach(ticket => {
      const projectName = projectNames[ticket.projetoId] || 'Projeto não encontrado';
      if (!grouped[projectName]) {
        grouped[projectName] = [];
      }
      grouped[projectName].push(ticket);
    });

    // Ordenar chamados por data de atualização (mais recentes primeiro)
    Object.keys(grouped).forEach(projectName => {
      grouped[projectName].sort((a, b) => {
        const dateA = a.dataUltimaAtualizacao?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.dataUltimaAtualizacao?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    });

    return grouped;
  };

  const getProjectsByEvent = () => {
    const grouped = {};
    
    projects.forEach(project => {
      const eventName = project.feira || 'Sem evento definido';
      if (!grouped[eventName]) {
        grouped[eventName] = [];
      }
      grouped[eventName].push(project);
    });

    return grouped;
  };

  // Funções de expansão
  const toggleProjectExpansion = (projectName) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectName]: !prev[projectName]
    }));
  };

  const toggleEventExpansion = (eventName) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventName]: !prev[eventName]
    }));
  };

  // Funções de estilo
  const getStatusColor = (status) => {
    const colors = {
      'aberto': 'bg-blue-100 text-blue-800',
      'em_tratativa': 'bg-yellow-100 text-yellow-800',
      'aguardando_aprovacao': 'bg-orange-100 text-orange-800',
      'concluido': 'bg-green-100 text-green-800',
      'cancelado': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'baixa': 'bg-green-100 text-green-800',
      'media': 'bg-yellow-100 text-yellow-800',
      'alta': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  // Funções de ação em lote
  const handleTicketSelect = (ticketId, checked) => {
    const newSelected = new Set(selectedTickets);
    if (checked) {
      newSelected.add(ticketId);
    } else {
      newSelected.delete(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleProjectClick = (project) => {
    navigate(`/projeto/${project.id}`);
  };

  if (!authInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Gestão de Chamados</h1>
              <span className="text-sm text-gray-500">
                Bem-vindo, {userProfile?.nome || user?.email}!
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Contador total de notificações */}
              {getTotalUnread() > 0 && (
                <Badge className="bg-red-500 text-white">
                  {getTotalUnread()} nova{getTotalUnread() > 1 ? 's' : ''} atualização{getTotalUnread() > 1 ? 'ões' : ''}
                </Badge>
              )}
              
              <NotificationCenter />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    {userProfile?.nome || user?.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chamados" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Chamados</span>
              {getTotalUnread() > 0 && (
                <Badge className="bg-red-500 text-white text-xs ml-1">
                  {getTotalUnread()}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="projetos" className="flex items-center space-x-2">
              <FolderOpen className="h-4 w-4" />
              <span>Projetos</span>
            </TabsTrigger>
          </TabsList>

          {/* Aba de Chamados */}
          <TabsContent value="chamados" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-semibold">Chamados</h2>
              
              {(userProfile?.funcao === 'produtor' || userProfile?.funcao === 'consultor' || userProfile?.funcao === 'administrador' || 
                (userProfile?.funcao === 'operador' && userProfile?.area === 'operacional') ||
                (userProfile?.funcao === 'operador' && userProfile?.area === 'comunicacao_visual') ||
                (userProfile?.funcao === 'operador' && userProfile?.area === 'almoxarifado')) && (
                <Button 
                  onClick={() => navigate('/novo-chamado')}
                  className="w-full sm:w-auto touch-target"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Chamado
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              {Object.entries(getTicketsByProject()).map(([projectName, projectTickets]) => (
                <div key={projectName} className="border rounded-lg">
                  <button
                    onClick={() => toggleProjectExpansion(projectName)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {expandedProjects[projectName] ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                      <div>
                        <h3 className="font-medium text-sm md:text-base">{projectName}</h3>
                        <p className="text-xs text-gray-500">{projectTickets.length} chamado{projectTickets.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </button>
                  
                  {expandedProjects[projectName] && (
                    <div className="border-t bg-gray-50/50 p-4 space-y-3">
                      {projectTickets.map((ticket) => {
                        const isAwaitingApproval = ticket.status === 'aguardando_aprovacao' && 
                                                 userProfile?.funcao === 'gerente' && 
                                                 ticket.gerenteResponsavelId === user.uid;
                        
                        const unreadCount = getUnreadCount(ticket.id);
                        
                        const cardClassName = `${bulkActionMode ? 'cursor-default' : 'cursor-pointer hover:shadow-md'} transition-shadow mobile-card touch-target ${
                          isAwaitingApproval 
                            ? 'bg-orange-50 border-2 border-orange-400 shadow-lg ring-2 ring-orange-200' 
                            : 'bg-white'
                        } ${selectedTickets.has(ticket.id) ? 'ring-2 ring-blue-500' : ''}`;
                        
                        return (
                        <Card 
                          key={ticket.id} 
                          className={cardClassName}
                          onClick={bulkActionMode ? undefined : () => handleViewTicket(ticket.id)}
                        >
                          <CardContent className="p-3 md:p-4">
                            <div className="flex flex-col space-y-3">
                              <div className="flex items-start justify-between">
                                {bulkActionMode && (
                                  <div className="flex items-center mr-3">
                                    <Checkbox
                                      checked={selectedTickets.has(ticket.id)}
                                      onCheckedChange={(checked) => handleTicketSelect(ticket.id, checked)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-sm md:text-base truncate">{ticket.titulo}</h3>
                                    {/* Badge de notificação antigo - manter para compatibilidade */}
                                    {ticketNotifications[ticket.id] && (
                                      <Badge className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                        {ticketNotifications[ticket.id]}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs md:text-sm text-gray-600 mt-1 line-clamp-2">{ticket.descricao}</p>
                                </div>
                                
                                {/* Novo sistema de notificações com ícone do olho */}
                                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                                  <div className="text-right text-xs text-gray-500">
                                    <div className="flex flex-col items-end">
                                      <span className="font-medium">
                                        {(ticket.dataUltimaAtualizacao?.toDate?.() || ticket.createdAt?.toDate?.())?.toLocaleDateString('pt-BR') || 'N/A'}
                                      </span>
                                      <span className="text-xs opacity-75">
                                        {(ticket.dataUltimaAtualizacao?.toDate?.() || ticket.createdAt?.toDate?.())?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) || ''}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Badge de notificação com ícone do olho */}
                                  <NotificationBadge
                                    unreadCount={unreadCount}
                                    onClick={(e) => handleViewTicket(ticket.id, e)}
                                    size="default"
                                    className="touch-target"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={`${getStatusColor(ticket.status)} text-xs`}>
                                  {ticket.status?.replace('_', ' ')}
                                </Badge>
                                <Badge className={`${getPriorityColor(ticket.prioridade)} text-xs`}>
                                  {ticket.prioridade}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {ticket.area?.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              
              {Object.keys(getTicketsByProject()).length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum chamado encontrado</h3>
                    <p className="text-gray-500">Não há chamados para exibir no momento.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Aba de Projetos */}
          <TabsContent value="projetos" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Projetos</h2>
              <div className="flex space-x-2">
                {userProfile?.funcao === 'administrador' && (
                  <>
                    <Button variant="outline" onClick={() => navigate('/templates')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Templates
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/projetos')}>
                      Gerenciar Projetos
                    </Button>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Projeto
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {Object.entries(getProjectsByEvent()).map(([eventName, eventProjects]) => (
                <div key={eventName} className="border rounded-lg">
                  <button
                    onClick={() => toggleEventExpansion(eventName)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {expandedEvents[eventName] ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                      <h3 className="font-semibold text-lg">{eventName}</h3>
                      <Badge variant="secondary" className="ml-2">
                        {eventProjects.length} projeto{eventProjects.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </button>
                  
                  {expandedEvents[eventName] && (
                    <div className="border-t bg-gray-50/50 p-4 space-y-3">
                      {eventProjects.map((project) => (
                        <Card 
                          key={project.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow bg-white"
                          onClick={() => handleProjectClick(project)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <h4 className="font-medium">{project.nome}</h4>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">
                                    {project.status?.replace('_', ' ')}
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {project.local}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right text-xs text-gray-500">
                                <div>
                                  {project.dataInicio && new Date(project.dataInicio.seconds * 1000).toLocaleDateString('pt-BR')}
                                </div>
                                <div>
                                  {project.dataFim && new Date(project.dataFim.seconds * 1000).toLocaleDateString('pt-BR')}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {Object.keys(getProjectsByEvent()).length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto encontrado</h3>
                    <p className="text-gray-500">Não há projetos para exibir no momento.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardPage;

