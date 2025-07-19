import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { ticketService } from '../services/ticketService';
import { userService } from '../services/userService';
import { firestoreNotificationService } from '../services/firestoreNotificationService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import Header from '../components/Header';
import { 
  Plus, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Users,
  FolderOpen,
  BarChart3,
  FileText,
  Calendar,
  CalendarDays, // NOVO ÍCONE PARA EVENTOS
  ChevronDown,
  ChevronRight,
  Bell,
  Search,
  Filter,
  Eye,
  Timer,
  RefreshCw,
  Star,
  LayoutDashboard // Ícone para o menu lateral
} from 'lucide-react';

const DashboardPage = () => {
  const { user, userProfile, authInitialized } = useAuth();
  const navigate = useNavigate();
  
  // Estados principais
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectNames, setProjectNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados de interface
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedEvents, setExpandedEvents] = useState({});
  const [ticketNotifications, setTicketNotifications] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');

  // Funções de navegação com permissões corretas
  const handleNavigate = (path, requiredRoles = []) => {
    if (requiredRoles.length > 0 && !requiredRoles.includes(userProfile?.funcao)) {
      console.error(`❌ Acesso negado a ${path}: Apenas para ${requiredRoles.join(', ')}`);
      alert(`Acesso restrito a: ${requiredRoles.join(', ')}`);
      return;
    }
    try {
      console.log(`🎯 Navegando para ${path}`);
      navigate(path);
    } catch (error) {
      console.error(`❌ Erro ao navegar para ${path}:`, error);
    }
  };

  // Função para buscar nome do projeto
  const getProjectName = (projetoId) => {
    return projectNames[projetoId] || 'Projeto não encontrado';
  };

  // Carregar dados do dashboard com regras de negócio específicas
  useEffect(() => {
    if (authInitialized && user && userProfile && user.uid) {
      loadDashboardData();
    } else if (authInitialized && !user) {
      navigate('/login');
    }
  }, [user, userProfile, authInitialized, navigate]);

  const loadDashboardData = async () => {
    // ... (A lógica de carregamento de dados permanece a mesma)
    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Carregando dados para:', userProfile?.funcao);
      
      if (userProfile?.funcao === 'administrador') {
        // ADMINISTRADOR: acesso total (função deus)
        console.log('👑 Administrador: carregando TODOS os dados');
        const [allProjects, allTickets, allUsers] = await Promise.all([
          projectService.getAllProjects(),
          ticketService.getAllTickets(),
          userService.getAllUsers()
        ]);
        setProjects(allProjects);
        setTickets(allTickets);
        setUsers(allUsers);
        
        // Mapear nomes dos projetos
        const projectNamesMap = {};
        allProjects.forEach(project => {
          projectNamesMap[project.id] = project.nome;
        });
        setProjectNames(projectNamesMap);
        
      } else if (userProfile?.funcao === 'produtor') {
        // PRODUTOR: vê somente seus projetos, todos os chamados dos seus projetos
        console.log('🏭 Produtor: carregando projetos próprios e chamados relacionados');
        const [allProjects, allTickets, allUsers] = await Promise.all([
          projectService.getAllProjects(),
          ticketService.getAllTickets(),
          userService.getAllUsers()
        ]);
        
        // Filtrar apenas projetos do produtor
        const produtorProjects = allProjects.filter(project => 
          project.produtorId === user.uid
        );
        
        // Filtrar chamados dos projetos do produtor
        const produtorProjectIds = produtorProjects.map(p => p.id);
        const produtorTickets = allTickets.filter(ticket => 
          produtorProjectIds.includes(ticket.projetoId)
        );
        
        setProjects(produtorProjects);
        setTickets(produtorTickets);
        setUsers(allUsers);
        
        // Mapear nomes dos projetos
        const projectNamesMap = {};
        produtorProjects.forEach(project => {
          projectNamesMap[project.id] = project.nome;
        });
        setProjectNames(projectNamesMap);
        
      } else if (userProfile?.funcao === 'consultor') {
        // CONSULTOR: vê somente seus projetos, chamados abertos por produtor e por ele, escalados para ele
        console.log('👨‍💼 Consultor: carregando projetos próprios e chamados específicos');
        const [allProjects, allTickets, allUsers] = await Promise.all([
          projectService.getAllProjects(),
          ticketService.getAllTickets(),
          userService.getAllUsers()
        ]);
        
        // Filtrar apenas projetos do consultor
        const consultorProjects = allProjects.filter(project => 
          project.consultorId === user.uid
        );
        
        // Filtrar chamados específicos do consultor
        const consultorProjectIds = consultorProjects.map(p => p.id);
        const consultorTickets = allTickets.filter(ticket => {
          // Chamados dos projetos do consultor
          const isFromConsultorProject = consultorProjectIds.includes(ticket.projetoId);
          // Chamados abertos pelo consultor
          const isOpenedByConsultor = ticket.autorId === user.uid;
          // Chamados escalados para o consultor
          const isEscalatedToConsultor = ticket.escalonamentos?.some(esc => 
            esc.consultorId === user.uid || esc.responsavelId === user.uid
          );
          
          return isFromConsultorProject || isOpenedByConsultor || isEscalatedToConsultor;
        });
        
        setProjects(consultorProjects);
        setTickets(consultorTickets);
        setUsers(allUsers);
        
        // Mapear nomes dos projetos
        const projectNamesMap = {};
        allProjects.forEach(project => {
          projectNamesMap[project.id] = project.nome;
        });
        setProjectNames(projectNamesMap);
        
      } else if (userProfile?.funcao === 'operador') {
        // OPERADOR: USAR EXATAMENTE O MÉTODO ORIGINAL QUE FUNCIONAVA
        console.log('⚙️ Operador: carregando TODOS os projetos e chamados da área (MÉTODO ORIGINAL)');
        console.log('🔍 Área do operador:', userProfile?.area);
        
        const [allProjects, operatorTickets, allUsers] = await Promise.all([
          projectService.getAllProjects(),
          ticketService.getTicketsByAreaInvolved(userProfile.area), // MÉTODO ESPECÍFICO ORIGINAL
          userService.getAllUsers()
        ]);
        
        console.log('📊 Projetos carregados:', allProjects.length);
        console.log('📊 Chamados da área carregados:', operatorTickets.length);
        
        // Operador vê TODOS os projetos
        setProjects(allProjects);
        setTickets(operatorTickets); // Usar resultado direto do método específico
        setUsers(allUsers);
        
        // Mapear nomes dos projetos
        const projectNamesMap = {};
        allProjects.forEach(project => {
          projectNamesMap[project.id] = project.nome;
        });
        setProjectNames(projectNamesMap);
        
      } else if (userProfile?.funcao === 'gerente') {
        // GERENTE: vê todos os projetos, todos os chamados, prioridade para escalados para ele
        console.log('👔 Gerente: carregando TODOS os dados com prioridade para escalados');
        const [allProjects, allTickets, allUsers] = await Promise.all([
          projectService.getAllProjects(),
          ticketService.getAllTickets(),
          userService.getAllUsers()
        ]);
        
        // Gerente vê tudo
        setProjects(allProjects);
        setUsers(allUsers);
        
        // Ordenar chamados com prioridade para escalados para o gerente
        const sortedTickets = [...allTickets].sort((a, b) => {
          // Verificar se é escalado para o gerente
          const aEscaladoParaGerente = a.escalonamentos?.some(esc => 
            esc.gerenteId === user.uid || esc.responsavelId === user.uid
          );
          const bEscaladoParaGerente = b.escalonamentos?.some(esc => 
            esc.gerenteId === user.uid || esc.responsavelId === user.uid
          );
          
          // Prioridade para escalados para o gerente
          if (aEscaladoParaGerente && !bEscaladoParaGerente) return -1;
          if (!aEscaladoParaGerente && bEscaladoParaGerente) return 1;
          
          // Depois por data de criação
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
        
        setTickets(sortedTickets);
        
        // Mapear nomes dos projetos
        const projectNamesMap = {};
        allProjects.forEach(project => {
          projectNamesMap[project.id] = project.nome;
        });
        setProjectNames(projectNamesMap);
        
      } else {
        // Outros usuários - comportamento padrão
        console.log('👤 Usuário padrão: carregando dados básicos');
        const [allProjects, userTickets, allUsers] = await Promise.all([
          projectService.getAllProjects(),
          ticketService.getTicketsByUser(user.uid),
          userService.getAllUsers()
        ]);
        
        setProjects(allProjects);
        setTickets(userTickets);
        setUsers(allUsers);
        
        // Mapear nomes dos projetos
        const projectNamesMap = {};
        allProjects.forEach(project => {
          projectNamesMap[project.id] = project.nome;
        });
        setProjectNames(projectNamesMap);
      }
      
      console.log('✅ Dados carregados:', {
        projetos: projects.length,
        chamados: tickets.length,
        usuarios: users.length
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do dashboard:', error);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };


  // Calcular estatísticas dos chamados
  const ticketStats = {
    total: tickets.length,
    abertos: tickets.filter(t => t.status === 'aberto').length,
    emAndamento: tickets.filter(t => t.status === 'em_andamento').length,
    concluidos: tickets.filter(t => t.status === 'concluido').length,
    escalados: tickets.filter(t => t.status === 'escalado_gerencia').length,
    prioridade: tickets.filter(t => {
      // Para gerentes, mostrar chamados escalados para eles
      if (userProfile?.funcao === 'gerente') {
        return t.escalonamentos?.some(esc => 
          esc.gerenteId === user.uid || esc.responsavelId === user.uid
        );
      }
      return false;
    }).length
  };

  // Filtrar chamados
  const getDisplayedTickets = () => {
    return tickets.filter(ticket => {
      const matchesSearch = !searchTerm || 
        ticket.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getProjectName(ticket.projetoId).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.prioridade === priorityFilter;
      const matchesArea = areaFilter === 'all' || ticket.areaAtual === areaFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && matchesArea;
    });
  };

  // Agrupar chamados por projeto
  const getTicketsByProject = () => {
    const grouped = {};
    const displayedTickets = getDisplayedTickets();
    
    displayedTickets.forEach(ticket => {
      const projectName = getProjectName(ticket.projetoId);
      if (!grouped[projectName]) {
        grouped[projectName] = [];
      }
      grouped[projectName].push(ticket);
    });
    
    return grouped;
  };

  // Agrupar projetos por evento
  const getProjectsByEvent = () => {
    const grouped = {};
    
    projects.forEach(project => {
      const eventName = project.feira || project.evento || project.nomeEvento || 'Evento sem nome';
      if (!grouped[eventName]) {
        grouped[eventName] = [];
      }
      grouped[eventName].push(project);
    });
    
    return grouped;
  };

  // Verificar se chamado tem prioridade para o usuário
  const isTicketPriority = (ticket) => {
    if (userProfile?.funcao === 'gerente') {
      return ticket.escalonamentos?.some(esc => 
        esc.gerenteId === user.uid || esc.responsavelId === user.uid
      );
    }
    return false;
  };

  // Funções de formatação
  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'aberto':
        return 'bg-blue-500';
      case 'em_andamento':
        return 'bg-yellow-500';
      case 'concluido':
        return 'bg-green-500';
      case 'escalado_gerencia':
        return 'bg-purple-500';
      case 'aguardando_validacao':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'aberto':
        return 'Aberto';
      case 'em_andamento':
        return 'Em Andamento';
      case 'concluido':
        return 'Concluído';
      case 'escalado_gerencia':
        return 'Escalado';
      case 'aguardando_validacao':
        return 'Aguardando';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta':
        return 'text-red-600 bg-red-50';
      case 'media':
        return 'text-yellow-600 bg-yellow-50';
      case 'baixa':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Verificar se usuário pode ver projetos
  const canViewProjects = () => {
    return ['administrador', 'produtor', 'consultor', 'operador', 'gerente'].includes(userProfile?.funcao);
  };

  if (!authInitialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  // Componente do Menu Lateral
  const Sidebar = () => (
    <aside className="w-full lg:w-60 lg:fixed lg:inset-y-0 lg:left-0 lg:z-10 lg:flex lg:flex-col bg-white border-r border-gray-200 p-4">
      <div className="flex items-center mb-6">
        <LayoutDashboard className="h-6 w-6 mr-2 text-blue-600" />
        <h2 className="text-lg font-bold">Ações Rápidas</h2>
      </div>
      <nav className="flex flex-col space-y-2">
        <Button onClick={() => handleNavigate('/novo-chamado')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Chamado
        </Button>
        {userProfile?.funcao === 'administrador' && (
          <Button variant="outline" onClick={() => handleNavigate('/projetos/novo', ['administrador'])}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        )}
        {canViewProjects() && (
          <Button variant="outline" onClick={() => handleNavigate('/projetos')}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Ver Projetos
          </Button>
        )}
        {/* NOVO BOTÃO: Eventos - Apenas administradores */}
        {userProfile?.funcao === 'administrador' && (
          <Button variant="outline" onClick={() => handleNavigate('/eventos', ['administrador'])}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Eventos
          </Button>
        )}
        {userProfile?.funcao === 'administrador' && (
          <Button variant="outline" onClick={() => handleNavigate('/usuarios', ['administrador'])}>
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </Button>
        )}
        <Button variant="outline" onClick={() => handleNavigate('/cronograma')}>
          <Calendar className="h-4 w-4 mr-2" />
          Cronograma
        </Button>
        <Button variant="outline" onClick={() => handleNavigate('/relatorios')}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Relatórios
        </Button>
        {(userProfile?.funcao === 'administrador' || userProfile?.funcao === 'gerente') && (
          <Button variant="outline" onClick={() => handleNavigate('/analytics', ['administrador', 'gerente'])}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        )}
        {userProfile?.funcao === 'administrador' && (
          <Button variant="outline" onClick={() => handleNavigate('/admin/painel', ['administrador'])}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Painel Admin
          </Button>
        )}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex flex-col lg:flex-row">
        {/* MELHORIA: Renderiza o menu lateral */}
        <Sidebar />
        
        {/* Conteúdo Principal com margem para o menu lateral em telas grandes */}
        <main className="flex-1 lg:ml-60 p-4 sm:p-6 lg:p-8">
          {/* Header do Conteúdo */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Bem-vindo, {userProfile?.nome || user.email} ({userProfile?.funcao})
            </p>
          </div>

          {/* REMOVIDO: Mensagem de debug */}

          {/* Error Alert */}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 mt-0.5" />
                <div className="ml-2 sm:ml-3">
                  <p className="text-xs sm:text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards - Responsivo */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
             {/* ... (código dos cards de estatísticas permanece o mesmo, mas agora em um grid mais adaptável) ... */}
             <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
                    <div className="ml-4 min-w-0">
                      <p className="text-sm font-medium text-gray-600 truncate">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{ticketStats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-yellow-600 flex-shrink-0" />
                    <div className="ml-4 min-w-0">
                      <p className="text-sm font-medium text-gray-600 truncate">Abertos</p>
                      <p className="text-2xl font-bold text-gray-900">{ticketStats.abertos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Timer className="h-8 w-8 text-orange-600 flex-shrink-0" />
                    <div className="ml-4 min-w-0">
                      <p className="text-sm font-medium text-gray-600 truncate">Andamento</p>
                      <p className="text-2xl font-bold text-gray-900">{ticketStats.emAndamento}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                    <div className="ml-4 min-w-0">
                      <p className="text-sm font-medium text-gray-600 truncate">Concluídos</p>
                      <p className="text-2xl font-bold text-gray-900">{ticketStats.concluidos}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </div>

          {/* Tabs - Responsivo */}
          <Tabs defaultValue="chamados" className="space-y-4">
            <TabsList className={`grid w-full ${canViewProjects() ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="chamados">Chamados</TabsTrigger>
              {canViewProjects() && (
                <TabsTrigger value="projetos">Projetos</TabsTrigger>
              )}
            </TabsList>

            {/* Tab Chamados */}
            <TabsContent value="chamados" className="space-y-4">
              {/* ... (código dos filtros e da lista de chamados permanece o mesmo) ... */}
               {/* Lista de Chamados Agrupados por Projeto */}
               <div className="space-y-4">
                {Object.entries(getTicketsByProject()).map(([projectName, projectTickets]) => (
                  <Card key={projectName} className="shadow-sm">
                    {/* MELHORIA: O header inteiro agora é clicável */}
                    <CardHeader 
                      className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedProjects(prev => ({
                        ...prev,
                        [projectName]: !prev[projectName]
                      }))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          {expandedProjects[projectName] ? (
                            <ChevronDown className="h-4 w-4 mr-2 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2 flex-shrink-0" />
                          )}
                          <CardTitle className="text-lg truncate mr-2">{projectName}</CardTitle>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {projectTickets.length} chamado{projectTickets.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {expandedProjects[projectName] && (
                      <CardContent className="pt-2">
                        {/* ... (o resto da lista de chamados permanece o mesmo) ... */}
                        <div className="space-y-3">
                        {projectTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                              isTicketPriority(ticket) ? 'border-yellow-400 bg-yellow-50' : ''
                            }`}
                            onClick={() => navigate(`/chamado/${ticket.id}`)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                {isTicketPriority(ticket) && (
                                  <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                )}
                                <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{ticket.titulo}</h3>
                                <Badge className={`${getStatusColor(ticket.status)} text-white px-2 py-1 text-xs flex-shrink-0`}>
                                  {getStatusText(ticket.status)}
                                </Badge>
                                {ticket.prioridade && (
                                  <Badge variant="outline" className={`${getPriorityColor(ticket.prioridade)} text-xs flex-shrink-0`}>
                                    {ticket.prioridade}
                                  </Badge>
                                )}
                                {ticketNotifications[ticket.id] && (
                                  <Badge variant="destructive" className="text-xs flex-shrink-0">
                                    <Bell className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                                    {ticketNotifications[ticket.id]}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{ticket.descricao}</p>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                                <span>Criado em {formatDate(ticket.createdAt)}</span>
                                <span>Por {ticket.autorNome}</span>
                                {ticket.areaAtual && <span>Área: {ticket.areaAtual}</span>}
                              </div>
                            </div>
                            <div className="flex items-center justify-end mt-2 sm:mt-0 sm:ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/chamado/${ticket.id}`);
                                }}
                                className="p-2"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tab Projetos */}
            {canViewProjects() && (
              <TabsContent value="projetos" className="space-y-4">
                {/* ... (código da lista de projetos permanece o mesmo) ... */}
                <div className="space-y-3 sm:space-y-4">
                {Object.entries(getProjectsByEvent()).map(([eventName, eventProjects]) => (
                  <Card key={eventName} className="shadow-sm">
                    <CardHeader 
                      className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedEvents(prev => ({
                        ...prev,
                        [eventName]: !prev[eventName]
                      }))}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          {expandedEvents[eventName] ? (
                            <ChevronDown className="h-4 w-4 mr-2 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2 flex-shrink-0" />
                          )}
                          <CardTitle className="text-lg truncate mr-2">{eventName}</CardTitle>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {eventProjects.length} projeto{eventProjects.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {expandedEvents[eventName] && (
                      <CardContent className="pt-2">
                         <div className="space-y-2 sm:space-y-3">
                          {eventProjects.map((project) => (
                            <div
                              key={project.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => navigate(`/projeto/${project.id}`)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{project.nome}</h3>
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
                                    {project.status || 'Ativo'}
                                  </Badge>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{project.descricao}</p>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                                  {project.dataInicio && (
                                    <span>Início: {formatDate(project.dataInicio)}</span>
                                  )}
                                  {project.dataFim && (
                                    <span>Fim: {formatDate(project.dataFim)}</span>
                                  )}
                                  {project.local && (
                                    <span>Local: {project.local}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-end mt-2 sm:mt-0 sm:ml-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/projeto/${project.id}`);
                                  }}
                                  className="p-2"
                                >
                                  <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;

