import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminLoggedIn, logoutAdmin, verifyAdmin, getAdminData, saveAdminData, AdminData } from '@/lib/adminConfig';
import { getSession } from '@/lib/storage';
import { getUserSession } from '@/lib/userStorage';
import { getSyncData, SyncedInstagramProfile, SyncData, getAllMergedProfiles, loadSyncDataFromServer } from '@/lib/syncStorage';
import { ProfileSession, MROSession } from '@/types/instagram';
import type { UserSession } from '@/types/user';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

import ModuleManager from '@/components/admin/ModuleManager';
import SnapshotGenerator from '@/components/admin/SnapshotGenerator';
import ProfileActions from '@/components/admin/ProfileActions';
import CallAnalyticsDashboard from '@/components/admin/CallAnalyticsDashboard';
import ConnectedUsersPanel from '@/components/admin/ConnectedUsersPanel';
import AnnouncementsManager from '@/components/admin/AnnouncementsManager';
import PixelAndCallSettings from '@/components/admin/PixelAndCallSettings';
import CreativesProManager from '@/components/admin/CreativesProManager';
import TicketsManager from '@/components/admin/TicketsManager';
import UsersListPanel from '@/components/admin/UsersListPanel';
import WhatsAppSettingsTab from '@/components/admin/WhatsAppSettingsTab';
import PartnersPanel from '@/components/admin/PartnersPanel';
import ZapmroFeesPanel from '@/components/admin/ZapmroFeesPanel';
import ZapmroToolPanel from '@/components/admin/ZapmroToolPanel';
import HubProductsPanel from '@/components/admin/HubProductsPanel';
import MergeLogsPanel from '@/components/admin/MergeLogsPanel';

import MroToolPanel from '@/components/admin/MroToolPanel';
import LovablackPanel from '@/components/admin/LovablackPanel';
import RenddxLeadsPanel from '@/components/admin/RenddxLeadsPanel';
import LotarGruposPanel from '@/components/admin/LotarGruposPanel';
import DumpPanel from '@/components/admin/DumpPanel';
import MigrationEnvPanel from '@/components/admin/MigrationEnvPanel';

import {
  Users, Settings, Video, LogOut, Search, 
  Eye, TrendingUp, Calendar, Sparkles, Download, 
  Save, RefreshCw, Check, ExternalLink,
  Image as ImageIcon, User,
  Instagram, CheckCircle, XCircle, Phone, Bell, MessageCircle, Ticket,
  Menu, LayoutDashboard, ChevronLeft, ShieldCheck, UserPlus,
  Package,

  Database,
  ServerCog,
} from 'lucide-react';

import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { storageAssetUrl } from '@/lib/assetUrl';

const PostsComIAAdmin = lazy(() => import('@/pages/PostsComIAAdmin'));

type Tab = 'users' | 'calls' | 'tutorials' | 'zapmro' | 'zapmro_taxas' | 'estrutura' | 'tickets' | 'announcements' | 'pixel' | 'settings' | 'userlist' | 'whatsapp' | 'partners' | 'hub' | 'postscomia' | 'merges' | 'lovablack' | 'renddx_leads' | 'lotargrupos' | 'dump' | 'migracao' | 'tokens';
type UserFilter = 'all' | 'instagram' | 'connected';

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [session, setSession] = useState<MROSession | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [syncData, setSyncData] = useState<SyncData>(getSyncData());
  const [adminData, setAdminData] = useState<AdminData>(getAdminData());
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [selectedSyncedProfile, setSelectedSyncedProfile] = useState<SyncedInstagramProfile | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  // Settings state
  const [settings, setSettings] = useState(adminData.settings);
  const [zapmroDownloadLink, setZapmroDownloadLink] = useState('');
  const [testingApi, setTestingApi] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      setIsVerifying(true);
      
      if (!isAdminLoggedIn()) {
        navigate('/admin/login');
        return;
      }
      
      // Load data from server on mount
      console.log('🔄 Admin: Carregando dados do servidor...');
      try {
        const serverSyncData = await loadSyncDataFromServer();
        setSyncData(serverSyncData);
        console.log(`✅ Admin: ${serverSyncData.profiles.length} perfis carregados do servidor`);
      } catch (error) {
        console.error('Erro ao carregar dados do servidor:', error);
      }
      
      // Load sessions
      const mroSession = getSession();
      const userSess = getUserSession();
      setSession(mroSession);
      setUserSession(userSess);
      
      // Load saved settings
      const savedData = getAdminData();
      setAdminData(savedData);
      setSettings(savedData.settings);
      
      setIsVerifying(false);
    };
    
    checkAdminAccess();

    // Refresh sync data periodically (from local cache)
    const interval = setInterval(() => {
      setSyncData(getSyncData());
    }, 5000);

    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate('/admin/login');
  };

  // Refresh user list
  const refreshUserList = () => {
    setIsRefreshing(true);
    setSyncData(getSyncData());
    toast({ title: "Lista atualizada!", description: `${getAllMergedProfiles().length} perfis encontrados` });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter profiles matching search
  const filteredProfiles = session?.profiles.filter(p => 
    p.profile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.profile.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (userSession?.user?.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filter synced profiles (merged with dashboard profiles)
  const allMergedProfiles = getAllMergedProfiles();
  
  const filteredSyncedProfiles = allMergedProfiles.filter(p => {
    const matchesSearch = p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ownerUserName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (userFilter === 'connected') return p.isConnectedToDashboard;
    if (userFilter === 'instagram') return true;
    return true;
  });

  // Get combined count for stats
  const totalSyncedProfiles = allMergedProfiles.length;
  const connectedProfiles = allMergedProfiles.filter(p => p.isConnectedToDashboard).length;
  const notConnectedProfiles = allMergedProfiles.filter(p => !p.isConnectedToDashboard).length;

  // Calculate growth for synced profile
  const getSyncedProfileGrowth = (profile: SyncedInstagramProfile) => {
    if (profile.growthHistory.length < 2) return 0;
    const first = profile.growthHistory[0].followers;
    const last = profile.growthHistory[profile.growthHistory.length - 1].followers;
    return last - first;
  };

  // Get the user info who registered this instagram
  const getRegisteredUserInfo = (username: string) => {
    if (!userSession?.user) return null;
    const registeredIG = userSession.user.registeredIGs.find(
      ig => ig.username.toLowerCase() === username.toLowerCase()
    );
    return registeredIG ? {
      ownerName: userSession.user.username,
      email: registeredIG.email,
      registeredAt: registeredIG.registeredAt,
      syncedFromSquare: registeredIG.syncedFromSquare
    } : null;
  };

  const handleSaveSettings = () => {
    const updatedData = { ...adminData, settings };
    saveAdminData(updatedData);
    setAdminData(updatedData);
    toast({ title: "Configurações salvas!", description: "Todas as alterações foram salvas." });
  };

  const testApi = async (apiName: string, apiKey: string) => {
    setTestingApi(apiName);
    
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (apiKey && apiKey.length > 10) {
      toast({ title: `${apiName} OK!`, description: "API funcionando corretamente" });
    } else {
      toast({ title: `${apiName} Erro`, description: "Chave inválida ou vazia", variant: "destructive" });
    }
    
    setTestingApi(null);
  };

  const tabs = [
    { id: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" /> },
    { id: 'hub', label: 'Dashboard Produtos', icon: <Package className="w-4 h-4" /> },
    { id: 'postscomia', label: 'Admin Posts com IA', icon: <Package className="w-4 h-4" /> },
    { id: 'merges', label: 'Unificações', icon: <ShieldCheck className="w-4 h-4" /> },



    { id: 'partners', label: 'Parceiros', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'tickets', label: 'Tickets', icon: <Ticket className="w-4 h-4" /> },
    { id: 'calls', label: 'Chamadas', icon: <Phone className="w-4 h-4" /> },
    { id: 'tutorials', label: 'MRO Ferramenta', icon: <Video className="w-4 h-4" /> },
    { id: 'zapmro', label: 'ZAPMRO Ferramenta', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'zapmro_taxas', label: 'ZAPMRO Taxas Pagas', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'estrutura', label: 'Estrutura Tutoriais', icon: <Video className="w-4 h-4" /> },
    { id: 'announcements', label: 'Avisos', icon: <Bell className="w-4 h-4" /> },
    { id: 'pixel', label: 'Pixel & Ligação', icon: <ExternalLink className="w-4 h-4" /> },
    { id: 'settings', label: 'APIs', icon: <Settings className="w-4 h-4" /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'userlist', label: 'Usuarios Lista', icon: <User className="w-4 h-4" /> },
    { id: 'lovablack', label: 'LOVABLACK', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'renddx_leads', label: 'Leads Renddx', icon: <Users className="w-4 h-4" /> },
    { id: 'lotargrupos', label: 'Lotar Grupos', icon: <Video className="w-4 h-4" /> },
    { id: 'dump', label: 'Dump', icon: <Database className="w-4 h-4" /> },
    { id: 'migracao', label: 'Migração', icon: <ServerCog className="w-4 h-4" /> },
    { id: 'tokens', label: 'Tokens', icon: <KeyRound className="w-4 h-4" /> },
  ];


  const getSelectedProfileData = () => {
    return session?.profiles.find(p => p.id === selectedProfile);
  };

  // Some older cached records may have `posts` as an array of post objects.
  // Normalize to a numeric count to avoid rendering objects in React.
  const getPostsCount = (profile: any): number => {
    const raw = profile?.postsCount ?? profile?.posts ?? profile?.postCount ?? 0;
    if (Array.isArray(raw)) return raw.length;
    const num = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(num) ? num : 0;
  };

  const calculateGrowth = (profileData: ProfileSession) => {
    if (profileData.growthHistory.length < 2) return 0;
    const first = profileData.growthHistory[0].followers;
    const last = profileData.growthHistory[profileData.growthHistory.length - 1].followers;
    return last - first;
  };

  const getNextStrategyDate = (profileData: ProfileSession) => {
    if (profileData.strategies.length === 0) return null;
    const lastStrategy = profileData.strategies[profileData.strategies.length - 1];
    const lastDate = new Date(lastStrategy.createdAt);
    const nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1);
    return nextMonth;
  };

  const getDaysUntilNextStrategy = (profileData: ProfileSession) => {
    const nextDate = getNextStrategyDate(profileData);
    if (!nextDate) return 0;
    const now = new Date();
    const diff = nextDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!isAdminLoggedIn()) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="h-screen w-full flex overflow-hidden bg-background">
        <Sidebar className="border-r shadow-sm">
          <SidebarHeader className="p-4 border-b flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-primary uppercase tracking-tighter leading-none">Painel</span>
                <span className="text-xs font-black uppercase tracking-tight">Administrativo</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Gestão</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tabs.map((tab) => (
                    <SidebarMenuItem key={tab.id}>
                      <SidebarMenuButton 
                        isActive={activeTab === tab.id} 
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all",
                          activeTab === tab.id ? "bg-primary/10 text-primary shadow-sm" : "hover:bg-muted"
                        )}
                      >
                        <div className={cn("shrink-0", activeTab === tab.id ? "text-primary" : "text-muted-foreground")}>
                          {tab.icon}
                        </div>
                        <span className="font-semibold text-sm">{tab.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive h-10 px-4" onClick={handleLogout}>
              <LogOut className="mr-3 h-4 w-4" /> <span className="font-bold">Sair</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1 h-full overflow-hidden">
          <header className="h-16 border-b flex items-center px-6 bg-card/50 backdrop-blur-sm z-10 shrink-0 justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-4 w-px bg-border mx-2 hidden md:block" />
              <h1 className="text-xl font-bold tracking-tight capitalize flex items-center gap-2">
                {tabs.find(t => t.id === activeTab)?.icon}
                {tabs.find(t => t.id === activeTab)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {syncData.currentlySyncing && (
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 animate-pulse h-8 hidden sm:flex">
                  Sincronizando: @{syncData.currentlySyncing}
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={refreshUserList} className="h-9 gap-2 font-bold border-zinc-200">
                <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            </div>
          </header>
          
          <main className="flex-1 overflow-auto bg-muted/5 relative">

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="glass-card p-4 text-center">
                <Instagram className="w-6 h-6 mx-auto text-pink-500 mb-2" />
                <p className="text-2xl font-bold">{totalSyncedProfiles}</p>
                <p className="text-xs text-muted-foreground">Perfis Instagram Total</p>
              </div>
              <div className="glass-card p-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{connectedProfiles}</p>
                <p className="text-xs text-muted-foreground">Conectados Dashboard</p>
              </div>
              <div className="glass-card p-4 text-center">
                <XCircle className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold">{notConnectedProfiles}</p>
                <p className="text-xs text-muted-foreground">Não Conectados</p>
              </div>
              <div className="glass-card p-4 text-center">
                <Users className="w-6 h-6 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{syncData.users.length}</p>
                <p className="text-xs text-muted-foreground">Usuários MRO</p>
              </div>
            </div>

            {/* Connected Users Panel */}
            <ConnectedUsersPanel />

            {/* Creatives PRO Manager */}
            <CreativesProManager />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-display font-bold">Perfis Instagram</h2>
                {/* Refresh Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={refreshUserList}
                  className="cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Atualizar Lista
                </Button>
                {syncData.currentlySyncing && (
                  <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full animate-pulse">
                    Sincronizando: @{syncData.currentlySyncing}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Filter Buttons */}
                <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setUserFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                      userFilter === 'all' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter('instagram')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                      userFilter === 'instagram' 
                        ? 'bg-pink-500 text-white' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Instagram className="w-4 h-4 inline mr-1" />
                    Instagram
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter('connected')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                      userFilter === 'connected' 
                        ? 'bg-green-500 text-white' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Cadastrados
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por @username ou usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-72 bg-secondary/50"
                  />
                </div>
              </div>
            </div>

            {selectedProfile || selectedSyncedProfile ? (
              // Profile Detail View
              <div className="space-y-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setSelectedProfile(null); setSelectedSyncedProfile(null); }} 
                  className="cursor-pointer"
                >
                  ← Voltar para lista
                </Button>
                
                {/* Dashboard Connected Profile View */}
                {selectedProfile && (() => {
                  const profileData = getSelectedProfileData();
                  if (!profileData) return null;
                  
                  const userInfo = getRegisteredUserInfo(profileData.profile.username);
                  const growth = calculateGrowth(profileData);
                  const daysUntilNext = getDaysUntilNextStrategy(profileData);
                  
                  return (
                    <div className="grid gap-6">
                      {/* Profile Header */}
                      <div className="glass-card p-6">
                        <div className="flex items-start gap-6">
                          {profileData.profile.profilePicUrl && !profileData.profile.profilePicUrl.includes('dicebear') ? (
                            <img 
                              src={storageAssetUrl(profileData.profile.profilePicUrl)}
                              alt={profileData.profile.username}
                              className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
                              <span className="text-2xl font-bold text-primary">{profileData.profile.username?.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="text-2xl font-display font-bold">@{profileData.profile.username}</h3>
                            <p className="text-muted-foreground">{profileData.profile.fullName}</p>
                            <p className="text-sm mt-2">{profileData.profile.bio}</p>
                            <div className="flex gap-4 mt-4 text-sm">
                              <span><strong>{profileData.profile.followers.toLocaleString()}</strong> seguidores</span>
                              <span><strong>{profileData.profile.following.toLocaleString()}</strong> seguindo</span>
                              <span><strong>{getPostsCount(profileData.profile).toLocaleString('pt-BR')}</strong> posts</span>
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground space-y-2">
                            {userInfo && (
                              <div className="p-3 rounded-lg bg-primary/10 mb-3">
                                <p className="text-xs text-muted-foreground">Cadastrado por:</p>
                                <p className="font-semibold text-foreground flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {userInfo.ownerName}
                                </p>
                                <p className="text-xs">{userInfo.email}</p>
                              </div>
                            )}
                            <p>Cadastrado em:</p>
                            <p className="font-medium text-foreground">{new Date(profileData.startedAt).toLocaleDateString('pt-BR')}</p>
                            <p className="mt-2">Último acesso:</p>
                            <p className="font-medium text-foreground">{new Date(profileData.lastUpdated).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Strategy Countdown */}
                      {profileData.strategies.length > 0 && (
                        <div className="glass-card p-4 border-l-4 border-primary">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Próxima estratégia disponível em:</p>
                              <p className="text-2xl font-bold text-primary">
                                {daysUntilNext > 0 ? `${daysUntilNext} dias` : 'Disponível agora!'}
                              </p>
                            </div>
                            <Calendar className="w-10 h-10 text-primary/50" />
                          </div>
                        </div>
                      )}

                      {/* Snapshot Generator */}
                      {(() => {
                        const syncedFormat: SyncedInstagramProfile = {
                          username: profileData.profile.username,
                          fullName: profileData.profile.fullName,
                          profilePicUrl: profileData.profile.profilePicUrl,
                          bio: profileData.profile.bio,
                          followers: profileData.profile.followers,
                          following: profileData.profile.following,
                          posts: 0,
                          ownerUserId: '',
                          ownerUserName: userSession?.user?.username || '',
                          syncedAt: profileData.startedAt,
                          lastUpdated: new Date().toISOString(),
                          growthHistory: profileData.growthHistory.map(g => ({
                            date: g.date,
                            followers: g.followers
                          })),
                          isConnectedToDashboard: true
                        };
                        return (
                          <SnapshotGenerator
                            profile={syncedFormat}
                            onClose={() => {}}
                            allProfiles={[syncedFormat]}
                          />
                        );
                      })()}

                      {/* Growth Chart */}
                      <div className="glass-card p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          Crescimento desde o cadastro
                        </h4>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="p-4 rounded-lg bg-primary/10 text-center">
                            <p className="text-2xl font-bold text-primary">
                              {growth > 0 ? `+${growth.toLocaleString()}` : growth.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Novos Seguidores</p>
                          </div>
                          <div className="p-4 rounded-lg bg-mro-cyan/10 text-center">
                            <p className="text-2xl font-bold text-mro-cyan">
                              {profileData.strategies.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Estratégias Geradas</p>
                          </div>
                          <div className="p-4 rounded-lg bg-mro-purple/10 text-center">
                            <p className="text-2xl font-bold text-mro-purple">
                              {profileData.creatives.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Criativos Gerados</p>
                          </div>
                        </div>
                        
                        {/* Growth Timeline */}
                        <div className="space-y-2">
                          {profileData.growthHistory.slice(-12).map((snapshot, i) => (
                            <div key={i} className="flex items-center gap-4 text-sm">
                              <span className="w-24 text-muted-foreground">
                                {new Date(snapshot.date).toLocaleDateString('pt-BR')}
                              </span>
                              <div className="flex-1 h-4 bg-secondary/50 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-mro-cyan rounded-full transition-all"
                                  style={{ 
                                    width: `${Math.min(100, (snapshot.followers / (profileData.growthHistory[profileData.growthHistory.length - 1]?.followers || 1)) * 100)}%` 
                                  }}
                                />
                              </div>
                              <span className="w-24 text-right font-medium">
                                {snapshot.followers.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strategies */}
                      <div className="glass-card p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-primary" />
                          Estratégias Geradas ({profileData.strategies.length})
                        </h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {profileData.strategies.map((strategy) => (
                            <div key={strategy.id} className="p-4 rounded-lg bg-secondary/30 border border-border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary">{strategy.type}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(strategy.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <p className="font-medium">{strategy.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
                              
                              {/* Show posts calendar if available */}
                              {strategy.postsCalendar && strategy.postsCalendar.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <p className="text-xs font-medium mb-2">Posts gerados ({strategy.postsCalendar.length}):</p>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    {strategy.postsCalendar.slice(0, 6).map((post, idx) => (
                                      <div key={idx} className="p-2 bg-background/50 rounded text-center">
                                        <p className="text-muted-foreground">{post.date}</p>
                                        <p className="truncate">{post.postType}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {profileData.strategies.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">Nenhuma estratégia gerada ainda</p>
                          )}
                        </div>
                      </div>

                      {/* Creatives */}
                      <div className="glass-card p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-primary" />
                          Criativos Gerados ({profileData.creatives.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {profileData.creatives.map((creative) => (
                            <div key={creative.id} className="relative aspect-square rounded-lg overflow-hidden group">
                              <img 
                                src={storageAssetUrl(creative.imageUrl)} 
                                alt={creative.headline}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                                <p className="text-xs font-medium">{creative.headline}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(creative.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          ))}
                          {profileData.creatives.length === 0 && (
                            <p className="text-muted-foreground text-center py-4 col-span-full">Nenhum criativo gerado ainda</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Synced Profile View (not connected to dashboard) */}
                {selectedSyncedProfile && (
                  <div className="grid gap-6">
                    {/* Profile Header */}
                    <div className="glass-card p-6">
                      <div className="flex items-start gap-6">
                        {selectedSyncedProfile.profilePicUrl && !selectedSyncedProfile.profilePicUrl.includes('dicebear') ? (
                          <img 
                            src={storageAssetUrl(selectedSyncedProfile.profilePicUrl)}
                            alt={selectedSyncedProfile.username}
                            className={`w-24 h-24 rounded-full object-cover border-2 ${
                              selectedSyncedProfile.isConnectedToDashboard ? 'border-green-500' : 'border-yellow-500'
                            }`}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className={`w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center border-2 ${
                            selectedSyncedProfile.isConnectedToDashboard ? 'border-green-500' : 'border-yellow-500'
                          }`}>
                            <span className="text-2xl font-bold text-muted-foreground">{selectedSyncedProfile.username?.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-2xl font-display font-bold">@{selectedSyncedProfile.username}</h3>
                            {selectedSyncedProfile.isConnectedToDashboard ? (
                              <div className="relative group">
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-background border border-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  Conectado
                                </span>
                              </div>
                            ) : (
                              <div className="relative group">
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-background border border-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  Não conectado
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-muted-foreground">{selectedSyncedProfile.fullName}</p>
                          <p className="text-sm mt-2">{selectedSyncedProfile.bio}</p>
                          <div className="flex gap-4 mt-4 text-sm">
                            <span><strong>{selectedSyncedProfile.followers.toLocaleString()}</strong> seguidores</span>
                            <span><strong>{selectedSyncedProfile.following.toLocaleString()}</strong> seguindo</span>
                            <span><strong>{getPostsCount(selectedSyncedProfile).toLocaleString('pt-BR')}</strong> posts</span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground space-y-2">
                          <div className="p-3 rounded-lg bg-primary/10 mb-3">
                            <p className="text-xs text-muted-foreground">Usuário MRO:</p>
                            <p className="font-semibold text-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {selectedSyncedProfile.ownerUserName}
                            </p>
                          </div>
                          <p>Sincronizado em:</p>
                          <p className="font-medium text-foreground">{new Date(selectedSyncedProfile.syncedAt).toLocaleDateString('pt-BR')}</p>
                          <p className="mt-2">Última atualização:</p>
                          <p className="font-medium text-foreground">{new Date(selectedSyncedProfile.lastUpdated).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Growth Stats */}
                    <div className="glass-card p-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Crescimento
                      </h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 rounded-lg bg-primary/10 text-center">
                          <p className="text-2xl font-bold text-primary">
                            {getSyncedProfileGrowth(selectedSyncedProfile) > 0 
                              ? `+${getSyncedProfileGrowth(selectedSyncedProfile).toLocaleString()}` 
                              : getSyncedProfileGrowth(selectedSyncedProfile).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Novos Seguidores</p>
                        </div>
                        <div className="p-4 rounded-lg bg-mro-cyan/10 text-center">
                          <p className="text-2xl font-bold text-mro-cyan">
                            {selectedSyncedProfile.growthHistory.length}
                          </p>
                          <p className="text-xs text-muted-foreground">Snapshots</p>
                        </div>
                      </div>
                      
                      {/* Growth Timeline */}
                      {selectedSyncedProfile.growthHistory.length > 0 && (
                        <div className="space-y-2">
                          {selectedSyncedProfile.growthHistory.slice(-12).map((snapshot, i) => (
                            <div key={i} className="flex items-center gap-4 text-sm">
                              <span className="w-24 text-muted-foreground">
                                {new Date(snapshot.date).toLocaleDateString('pt-BR')}
                              </span>
                              <div className="flex-1 h-4 bg-secondary/50 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-primary to-mro-cyan rounded-full transition-all"
                                  style={{ 
                                    width: `${Math.min(100, (snapshot.followers / (selectedSyncedProfile.growthHistory[selectedSyncedProfile.growthHistory.length - 1]?.followers || 1)) * 100)}%` 
                                  }}
                                />
                              </div>
                              <span className="w-24 text-right font-medium">
                                {snapshot.followers.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Snapshot Generator */}
                    <SnapshotGenerator
                      profile={selectedSyncedProfile}
                      onClose={() => {}}
                      allProfiles={allMergedProfiles}
                      multiSelectMode={false}
                    />
                  </div>
                )}
              </div>
            ) : (
              // Profile List View - Show synced profiles with scroll
              <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-2">
                {filteredSyncedProfiles.length === 0 ? (
                  <div className="glass-card p-12 text-center">
                    <Instagram className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm 
                        ? 'Nenhum perfil encontrado com esse termo' 
                        : 'Nenhum perfil sincronizado ainda.'}
                    </p>
                  </div>
                ) : (
                  filteredSyncedProfiles.map((profile) => {
                    const growth = getSyncedProfileGrowth(profile);
                    
                    return (
                      <div 
                        key={profile.username} 
                        className={`glass-card p-4 hover:border-primary/50 transition-colors ${
                          profile.isConnectedToDashboard ? 'border-l-4 border-l-green-500' : ''
                        } ${profile.isBlocked ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="flex items-center gap-4 flex-1 cursor-pointer"
                            onClick={() => setSelectedSyncedProfile(profile)}
                          >
                            {profile.profilePicUrl && !profile.profilePicUrl.includes('dicebear') ? (
                              <img 
                                src={storageAssetUrl(profile.profilePicUrl)}
                                alt={profile.username}
                                className={`w-16 h-16 rounded-full object-cover border-2 ${
                                  profile.isBlocked ? 'border-red-500 grayscale' :
                                  profile.isConnectedToDashboard ? 'border-green-500' : 'border-border'
                                }`}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className={`w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border-2 ${
                                profile.isBlocked ? 'border-red-500' :
                                profile.isConnectedToDashboard ? 'border-green-500' : 'border-border'
                              }`}>
                                <span className="text-xl font-bold text-muted-foreground">{profile.username?.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">@{profile.username}</p>
                                {profile.isBlocked && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500 flex items-center gap-1">
                                    Bloqueado
                                  </span>
                                )}
                                {!profile.isBlocked && profile.isConnectedToDashboard ? (
                                  <div className="relative group">
                                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-background border border-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                      Conectado
                                    </span>
                                  </div>
                                ) : !profile.isBlocked && (
                                  <div className="relative group">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-background border border-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                      Não conectado
                                    </span>
                                  </div>
                                )}
                                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                                  <User className="w-3 h-3 inline mr-1" />
                                  {profile.ownerUserName}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{profile.fullName}</p>
                              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                <span>{profile.followers.toLocaleString()} seguidores</span>
                                <span>{profile.following.toLocaleString()} seguindo</span>
                                <span>{getPostsCount(profile).toLocaleString('pt-BR')} posts</span>
                                {growth > 0 && (
                                  <span className="text-green-500 font-medium">+{growth.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Profile Actions */}
                          <ProfileActions 
                            profile={profile} 
                            onUpdate={() => setSyncData(getSyncData())} 
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <TicketsManager />
        )}

        {/* Calls Analytics Tab */}
        {activeTab === 'calls' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold">Analytics de Chamadas</h2>
            <p className="text-muted-foreground">
              Acompanhe métricas da página /ligacao - quem ouviu o áudio completo e quem clicou no CTA.
            </p>
            <CallAnalyticsDashboard />
          </div>
        )}


        {/* MRO Ferramenta Tab */}
        {activeTab === 'tutorials' && (
          <MroToolPanel
            downloadLink={settings.downloadLink}
            onDownloadLinkChange={(link) => setSettings(prev => ({ ...prev, downloadLink: link }))}
            onSaveSettings={handleSaveSettings}
          />
        )}


        {/* ZAPMRO Ferramenta Tab */}
        {activeTab === 'zapmro' && (
          <ZapmroToolPanel
            downloadLink={zapmroDownloadLink}
            onDownloadLinkChange={(link) => setZapmroDownloadLink(link)}
            onSaveSettings={() => {
              toast({ title: "Link salvo!", description: "Link de download ZAPMRO salvo." });
            }}
          />
        )}

        {/* ZAPMRO Taxas Pagas Tab */}
        {activeTab === 'zapmro_taxas' && <ZapmroFeesPanel />}

        {/* Dashboard Produtos Tab */}
        {activeTab === 'hub' && <HubProductsPanel />}
        {/* Unificações de Acesso (logs + desfazer) */}
        {activeTab === 'merges' && <MergeLogsPanel />}


        {/* Admin Posts com IA (embutido) */}
        {activeTab === 'postscomia' && (
          <div className="-m-4 md:-m-6">
            <Suspense fallback={<div className="p-8 text-muted-foreground">Carregando...</div>}>
              <PostsComIAAdmin embedded />
            </Suspense>
          </div>
        )}





        {/* Estrutura Tutoriais Tab */}
        {activeTab === 'estrutura' && (
          <ModuleManager 
            downloadLink=""
            onDownloadLinkChange={() => {}}
            onSaveSettings={() => {
              toast({ title: "Salvo!", description: "Tutoriais da Estrutura salvos." });
            }}
            platform="estrutura"
          />
        )}


        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <AnnouncementsManager />
        )}

        {/* Pixel & Call Settings Tab */}
        {activeTab === 'pixel' && (
          <div className="max-w-4xl mx-auto">
            <PixelAndCallSettings />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-display font-bold">Configurações</h2>

            {/* API Keys */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                APIs de I.A da MRO
              </h3>

              <div className="space-y-4">
                <div>
                  <Label>DeepSeek API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="password"
                      value={settings.apis.deepseek}
                      onChange={(e) => setSettings(prev => ({ ...prev, apis: { ...prev.apis, deepseek: e.target.value }}))}
                      placeholder="sk-..."
                      className="bg-secondary/50"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => testApi('DeepSeek', settings.apis.deepseek)}
                      disabled={testingApi === 'DeepSeek'}
                      className="cursor-pointer"
                    >
                      {testingApi === 'DeepSeek' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                  {settings.apis.deepseek && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Chave salva
                    </p>
                  )}
                </div>

                <div>
                  <Label>Gemini API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="password"
                      value={settings.apis.gemini}
                      onChange={(e) => setSettings(prev => ({ ...prev, apis: { ...prev.apis, gemini: e.target.value }}))}
                      placeholder="AIza..."
                      className="bg-secondary/50"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => testApi('Gemini', settings.apis.gemini)}
                      disabled={testingApi === 'Gemini'}
                      className="cursor-pointer"
                    >
                      {testingApi === 'Gemini' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                  {settings.apis.gemini && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Chave salva
                    </p>
                  )}
                </div>

                <div>
                  <Label>Nano Banana (Gemini Image) API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="password"
                      value={settings.apis.nanoBanana}
                      onChange={(e) => setSettings(prev => ({ ...prev, apis: { ...prev.apis, nanoBanana: e.target.value }}))}
                      placeholder="..."
                      className="bg-secondary/50"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => testApi('Nano Banana', settings.apis.nanoBanana)}
                      disabled={testingApi === 'Nano Banana'}
                      className="cursor-pointer"
                    >
                      {testingApi === 'Nano Banana' ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Testar'}
                    </Button>
                  </div>
                  {settings.apis.nanoBanana && (
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Chave salva
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Facebook Pixel */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-primary" />
                Facebook Pixel
              </h3>

              <div>
                <Label>Código do Pixel</Label>
                <Textarea
                  value={settings.facebookPixel}
                  onChange={(e) => setSettings(prev => ({ ...prev, facebookPixel: e.target.value }))}
                  placeholder="Cole o código completo do Facebook Pixel aqui..."
                  className="bg-secondary/50 mt-1 font-mono text-xs"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cole o script completo do Facebook Pixel para rastreamento
                </p>
              </div>
            </div>

            {/* Save Button */}
            <Button type="button" onClick={handleSaveSettings} variant="gradient" size="lg" className="w-full cursor-pointer">
              <Save className="w-5 h-5 mr-2" />
              Salvar Todas as Configurações
            </Button>
          </div>
        )}
        {activeTab === 'partners' && (
          <PartnersPanel />
        )}
        {/* WhatsApp Settings Tab */}
        {activeTab === 'whatsapp' && (
          <WhatsAppSettingsTab />
        )}
        {/* Users List Tab */}
        {activeTab === 'userlist' && (
          <UsersListPanel />
        )}
        {activeTab === 'lovablack' && (
          <LovablackPanel />
        )}
        {activeTab === 'renddx_leads' && (
          <RenddxLeadsPanel />
        )}
        {activeTab === 'lotargrupos' && (
          <LotarGruposPanel />
        )}
        {activeTab === 'dump' && (
          <DumpPanel />
        )}
        {activeTab === 'migracao' && (
          <MigrationEnvPanel />
        )}
        {activeTab === 'tokens' && (
          <TokensPanel />
        )}

          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Admin;

