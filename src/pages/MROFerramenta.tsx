import { useState, useEffect, useRef } from 'react';
import { getAdminData, TutorialModule, ModuleContent, ModuleVideo, ModuleText, ModuleButton, ModuleSection, ModuleColor, getYoutubeThumbnail, loadModulesFromCloud, AdminSettings } from '@/lib/adminConfig';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Play, Download, X, ChevronLeft, ChevronRight, Type, Loader2, ExternalLink, Link2, Gift, LayoutList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoginPage } from '@/components/LoginPage';
import { getUserSession, loginUser } from '@/lib/userStorage';
import { loginToSquare } from '@/lib/squareApi';
import {
  isEmbedMode,
  readEmbedCredentialsFromUrl,
  listenForEmbedCredentials,
  scrubEmbedUrl,
  postToHost,
  type EmbedCredentials,
} from '@/lib/embedAuth';


// Color mapping for modules
const moduleColorClasses: Record<ModuleColor, { border: string; bg: string; accent: string }> = {
  default: { border: 'border-border', bg: 'bg-card', accent: 'bg-muted' },
  green: { border: 'border-emerald-500/50', bg: 'bg-emerald-950/30', accent: 'bg-emerald-500' },
  blue: { border: 'border-blue-500/50', bg: 'bg-blue-950/30', accent: 'bg-blue-500' },
  purple: { border: 'border-purple-500/50', bg: 'bg-purple-950/30', accent: 'bg-purple-500' },
  orange: { border: 'border-orange-500/50', bg: 'bg-orange-950/30', accent: 'bg-orange-500' },
  pink: { border: 'border-pink-500/50', bg: 'bg-pink-950/30', accent: 'bg-pink-500' },
  red: { border: 'border-red-500/50', bg: 'bg-red-950/30', accent: 'bg-red-500' },
  cyan: { border: 'border-cyan-500/50', bg: 'bg-cyan-950/30', accent: 'bg-cyan-500' },
};

const MROFerramenta = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState<TutorialModule[]>([]);
  const [settings, setSettings] = useState<Pick<AdminSettings, 'downloadLink' | 'welcomeVideo'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<TutorialModule | null>(null);
  const [selectedContent, setSelectedContent] = useState<ModuleContent | null>(null);
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [embed] = useState(() => isEmbedMode());
  const [embedError, setEmbedError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const session = getUserSession();
      setIsAuthenticated(session.isAuthenticated);
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // Embed mode: hidrata a sessão via query string ou postMessage (extensão / site externo)
  useEffect(() => {
    if (!embed) return;

    let cancelled = false;

    const authenticate = async ({ username, password }: EmbedCredentials) => {
      if (cancelled) return;
      setCheckingAuth(true);
      setEmbedError(null);
      try {
        const result = await loginToSquare(username.trim(), password.trim());
        if (!result.success) {
          throw new Error(result.error || 'Credenciais inválidas');
        }
        await loginUser(username.trim(), result.daysRemaining || 365, undefined, password.trim());
        if (cancelled) return;
        setIsAuthenticated(true);
        scrubEmbedUrl();
        postToHost({ type: 'MRO_EMBED_AUTH_RESULT', success: true, username: username.trim() });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Falha ao autenticar';
        setEmbedError(message);
        postToHost({ type: 'MRO_EMBED_AUTH_RESULT', success: false, error: message });
      } finally {
        if (!cancelled) setCheckingAuth(false);
      }
    };

    // 1) Credenciais na URL
    const urlCreds = readEmbedCredentialsFromUrl();
    if (urlCreds && !getUserSession().isAuthenticated) {
      void authenticate(urlCreds);
    }

    // 2) Credenciais via postMessage (host informa depois do load)
    const stop = listenForEmbedCredentials(authenticate);
    postToHost({ type: 'MRO_EMBED_READY' });

    return () => {
      cancelled = true;
      stop();
    };
  }, [embed]);


  // Load modules from cloud on mount (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadModules = async () => {
      setIsLoading(true);
      console.log('[MROFerramenta] Starting to load modules...');
      try {
        // Sempre prioriza nuvem (fonte da verdade)
        const cloudData = await loadModulesFromCloud('mro');
        console.log('[MROFerramenta] Cloud response:', cloudData);

        if (cloudData) {
          setModules(cloudData.modules || []);
          setSettings(cloudData.settings || null);
          return;
        }

        // Fallback apenas se houve erro/indisponibilidade da nuvem
        console.log('[MROFerramenta] Cloud unavailable, checking localStorage fallback...');
        const localData = getAdminData();
        setModules(localData.modules);
        setSettings({
          downloadLink: localData.settings.downloadLink,
          welcomeVideo: localData.settings.welcomeVideo,
        });
      } catch (error) {
        console.error('[MROFerramenta] Error loading modules:', error);
        const localData = getAdminData();
        setModules(localData.modules);
        setSettings({
          downloadLink: localData.settings.downloadLink,
          welcomeVideo: localData.settings.welcomeVideo,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadModules();
  }, [isAuthenticated]);

  // Handle successful login
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    // Em embed, mostra um estado enxuto (o host é quem envia as credenciais)
    if (embed) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-sm space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              {embedError
                ? `Não foi possível autenticar: ${embedError}`
                : 'Aguardando autenticação da extensão...'}
            </p>
          </div>
        </div>
      );
    }
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }


  const welcomeVideo = settings?.welcomeVideo;

  const getYoutubeEmbedUrl = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return url;
  };

  const handleContentClick = (content: ModuleContent) => {
    // If it's a button/link, open in new tab
    if (content.type === 'button') {
      window.open((content as ModuleButton).url, '_blank', 'noopener,noreferrer');
      return;
    }
    setSelectedContent(content);
  };

  const handleBack = () => {
    if (selectedContent) {
      setSelectedContent(null);
      setSelectedModule(null);
    } else {
      const fromEstrutura = localStorage.getItem('mro_from_estrutura') === 'true';
      if (fromEstrutura) {
        // No longer removing here because the user might go back and forth
        navigate('/estruturarendaextra');
      } else {
        navigate('/instagram');
      }
    }
  };


  // Get video contents with numbering
  const getVideoIndex = (module: TutorialModule, contentId: string): number => {
    const videos = module.contents.filter(c => c.type === 'video');
    return videos.findIndex(v => v.id === contentId) + 1;
  };

  // Helper: separate module contents into regular contents and sections
  const separateContents = (contents: ModuleContent[]) => {
    const sorted = [...contents].sort((a, b) => a.order - b.order);
    const regularContents = sorted.filter(c => c.type !== 'section');
    const sections = sorted.filter(c => c.type === 'section') as ModuleSection[];
    return { regularContents, sections };
  };

  // Content Section Component (renders a group of videos/buttons)
  const ContentSection = ({ 
    section,
    contents,
    module,
    onContentClick,
    getVideoIndex
  }: { 
    section: ModuleSection | null;
    contents: ModuleContent[];
    module: TutorialModule;
    onContentClick: (content: ModuleContent) => void;
    getVideoIndex: (module: TutorialModule, contentId: string) => number;
  }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const videoContents = contents.filter(c => c.type === 'video' || c.type === 'text');
    const buttonContents = contents.filter(c => c.type === 'button');

    const checkScroll = () => {
      const container = scrollContainerRef.current;
      if (container) {
        setCanScrollLeft(container.scrollLeft > 10);
        setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
      }
    };

    useEffect(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = 0;
      }
      checkScroll();
      window.addEventListener('resize', checkScroll);
      return () => window.removeEventListener('resize', checkScroll);
    }, [videoContents.length]);

    const scroll = (direction: 'left' | 'right') => {
      const container = scrollContainerRef.current;
      if (container) {
        const cardWidth = container.querySelector('.content-card')?.clientWidth || 140;
        const scrollAmount = cardWidth + 12;
        container.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth'
        });
        setTimeout(checkScroll, 300);
      }
    };

    const renderVideoCarousel = () => (
      <div className="relative px-6 md:px-8">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
          </button>
        )}

        <div 
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory touch-pan-x mx-auto w-fit max-w-full"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none', 
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory'
          }}
        >
          {videoContents.map((content, idx) => (
            <div 
              key={content.id}
              className="content-card group cursor-pointer flex-shrink-0 snap-start w-[120px] sm:w-[140px] md:w-[160px] lg:w-[180px]"
              onClick={() => onContentClick(content)}
            >
              {content.type === 'video' ? (
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black border-2 border-border/50 group-hover:border-primary transition-all duration-300 shadow-lg">
                  <img 
                    src={(content as ModuleVideo).thumbnailUrl || getYoutubeThumbnail((content as ModuleVideo).youtubeUrl)}
                    alt={content.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  
                  {/* Video source badge - YouTube or MP4 */}
                  {(content as ModuleVideo).isFileVideo ? (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600 rounded text-xs font-semibold text-white flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      MP4
                    </div>
                  ) : (
                    <div className="absolute top-2 left-2 w-7 h-5 bg-red-600 rounded flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                  )}
                  
                  {/* Number badge */}
                  {(content as ModuleVideo).showNumber && (
                    <div className="absolute top-2 right-2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs md:text-sm font-bold shadow-lg">
                      {idx + 1}
                    </div>
                  )}

                  {/* Hover play overlay */}
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gradient-to-br from-secondary to-muted flex items-center justify-center border-2 border-border/50 group-hover:border-primary transition-all duration-300 shadow-lg">
                  <Type className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="absolute top-2 right-2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs md:text-sm font-bold shadow-lg">
                    {idx + 1}
                  </div>
                </div>
              )}
              {((content as any).showTitle !== false) && (
                <p className="font-medium mt-2 text-xs md:text-sm text-center group-hover:text-primary transition-colors line-clamp-2 px-1">{content.title}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );

    const renderButtons = () => (
      <div className="flex flex-wrap gap-2 md:gap-3 justify-center pt-4 px-4">
        {buttonContents.map((content) => (
          <Button
            key={content.id}
            onClick={() => window.open((content as ModuleButton).url, '_blank', 'noopener,noreferrer')}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border-primary/30 text-foreground text-xs md:text-sm"
          >
            <ExternalLink className="h-3 w-3 md:h-4 md:w-4" />
            {content.title}
          </Button>
        ))}
      </div>
    );

    // If this is a section (sub-module), render as a card
    if (section) {
      if (videoContents.length === 0 && buttonContents.length === 0) return null;
      
      return (
        <div className="mt-6 rounded-2xl border border-border/30 bg-card/30 p-4 md:p-6">
          {/* Section Header */}
          {section.showTitle !== false && (
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <h3 className="text-base md:text-lg font-bold">{section.title}</h3>
                {section.isBonus && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded-full text-xs font-semibold flex items-center gap-1">
                    <Gift className="w-3 h-3" />
                    BÔNUS
                  </span>
                )}
              </div>
              {section.description && (
                <p className="text-xs md:text-sm text-muted-foreground mt-1">{section.description}</p>
              )}
            </div>
          )}

          {/* Videos Carousel inside section */}
          {videoContents.length > 0 && renderVideoCarousel()}

          {/* Buttons inside section - centered below carousel */}
          {buttonContents.length > 0 && renderButtons()}
        </div>
      );
    }

    // Regular content (not in a section)
    if (videoContents.length === 0 && buttonContents.length === 0) return null;

    return (
      <div className="space-y-2">
        {/* Video/Text Carousel */}
        {videoContents.length > 0 && renderVideoCarousel()}

        {/* Buttons Section - centered below carousel */}
        {buttonContents.length > 0 && renderButtons()}
      </div>
    );
  };

  // Module Carousel Component
  const ModuleCarousel = ({ 
    module, 
    onContentClick, 
    getVideoIndex 
  }: { 
    module: TutorialModule; 
    onContentClick: (content: ModuleContent) => void;
    getVideoIndex: (module: TutorialModule, contentId: string) => number;
  }) => {
    const { regularContents, sections } = separateContents(module.contents);

    return (
      <div className="space-y-4">
        {/* Regular contents (videos, text, buttons) at module level */}
        {regularContents.length > 0 && (
          <ContentSection 
            section={null}
            contents={regularContents}
            module={module}
            onContentClick={onContentClick}
            getVideoIndex={getVideoIndex}
          />
        )}

        {/* Sections (sub-modules) with their own contents */}
        {sections.map((section) => (
          <ContentSection 
            key={section.id}
            section={section}
            contents={section.contents || []}
            module={module}
            onContentClick={onContentClick}
            getVideoIndex={getVideoIndex}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header — oculto no modo embed (layout enxuto para iframe/extensão) */}
      {!embed && (
      <header className="sticky top-0 z-40 glass-card border-b border-border">
        <div className="container mx-auto px-4 py-3 md:py-4">
          {/* Mobile: Logo on top, buttons below */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
            {/* Logo - centered on mobile */}
            <div className="flex justify-center md:hidden">
              <Logo size="sm" />
            </div>
            
            {/* Buttons row */}
            <div className="flex items-center justify-between md:justify-start gap-2 md:gap-4">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleBack} 
                className="cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              
              {/* Logo - hidden on mobile, shown on desktop */}
              <div className="hidden md:flex items-center gap-2">
                <Logo size="sm" />
                <span className="text-sm font-medium text-primary">MRO Ferramenta</span>
              </div>
            </div>

            {settings?.downloadLink && (
              <Button 
                type="button"
                variant="gradient" 
                size="sm"
                onClick={() => window.open(settings.downloadLink, '_blank')}
                className="cursor-pointer w-full md:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Download MRO
              </Button>
            )}
          </div>
        </div>
      </header>
      )}


      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Welcome Video Section */}
          {welcomeVideo?.enabled && welcomeVideo.youtubeUrl && !selectedModule && (
            <div className="mb-10 text-center">
              {welcomeVideo.showTitle && welcomeVideo.title && (
                <h2 className="text-2xl font-display font-bold mb-4">{welcomeVideo.title}</h2>
              )}
              <div 
                className="relative aspect-video max-w-3xl mx-auto rounded-xl overflow-hidden cursor-pointer group shadow-lg border border-border"
                onClick={() => setShowWelcomeVideo(true)}
              >
                {welcomeVideo.coverUrl ? (
                  <img 
                    src={welcomeVideo.coverUrl}
                    alt={welcomeVideo.title || 'Vídeo de boas-vindas'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <img 
                    src={getYoutubeThumbnail(welcomeVideo.youtubeUrl)}
                    alt={welcomeVideo.title || 'Vídeo de boas-vindas'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-background/40 flex items-center justify-center group-hover:bg-background/50 transition-colors">
                  <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Play className="w-10 h-10 text-white ml-1" fill="white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="glass-card p-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto text-primary mb-4 animate-spin" />
              <p className="text-muted-foreground">Carregando módulos...</p>
            </div>
          )}

          {/* Module List View - Modules as containers with content inside */}
          {!selectedModule && !isLoading && (
            <>
              <h1 className="text-3xl font-display font-bold mb-2 text-center">Módulos</h1>
              <p className="text-muted-foreground mb-8 text-center">Aprenda a usar a ferramenta MRO Inteligente</p>

              {modules.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum módulo disponível ainda</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {modules.sort((a, b) => a.order - b.order).map((module) => {
                    const colorTheme = moduleColorClasses[module.color || 'default'];
                    const isCollapsed = module.collapsedByDefault && !expandedModules.has(module.id);
                    
                    const toggleExpand = () => {
                      setExpandedModules(prev => {
                        const next = new Set(prev);
                        if (next.has(module.id)) {
                          next.delete(module.id);
                        } else {
                          next.add(module.id);
                        }
                        return next;
                      });
                    };

                    return (
                    <div 
                      key={module.id}
                      className={`glass-card p-6 rounded-xl border-2 ${colorTheme.border} ${colorTheme.bg}`}
                    >
                      {/* Module Header - Centered */}
                      <div 
                        className={`flex flex-col items-center gap-3 ${isCollapsed ? '' : 'mb-6'} text-center ${module.collapsedByDefault ? 'cursor-pointer' : ''}`}
                        onClick={module.collapsedByDefault ? toggleExpand : undefined}
                      >
                        {/* Collapsed: Show cover image prominently */}
                        {module.collapsedByDefault && module.coverUrl && (
                          <div className="relative w-full max-w-xs mx-auto mb-2">
                            <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-secondary group">
                              <img 
                                src={module.coverUrl} 
                                alt={module.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              {/* Play/Expand overlay */}
                              <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-xl">
                                  <Play className="w-8 h-8 text-primary-foreground" />
                                </div>
                              </div>
                              {/* Expand indicator */}
                              {isCollapsed && (
                                <div className="absolute bottom-2 right-2 px-3 py-1 bg-background/80 rounded-full text-xs font-medium">
                                  Clique para ver
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3 flex-wrap justify-center">
                          <h2 className="text-xl md:text-2xl font-display font-bold">{module.title}</h2>
                          {module.isBonus && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-bold rounded-full shadow-lg animate-pulse">
                              <Gift className="w-3 h-3" />
                              BÔNUS
                            </span>
                          )}
                        </div>
                        {module.description && (
                          <p className="text-muted-foreground">{module.description}</p>
                        )}
                      </div>

                      {/* Module Contents - Hidden when collapsed */}
                      {!isCollapsed && (
                        <>
                          {module.contents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>Nenhum conteúdo neste módulo</p>
                            </div>
                          ) : (
                            <ModuleCarousel 
                              module={module} 
                              onContentClick={(content) => {
                                setSelectedModule(module);
                                handleContentClick(content);
                              }}
                              getVideoIndex={getVideoIndex}
                            />
                          )}
                        </>
                      )}
                    </div>
                  );})}
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Welcome Video Lightbox */}
      {showWelcomeVideo && welcomeVideo?.youtubeUrl && (
        <div 
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowWelcomeVideo(false)}
        >
          <div 
            className="w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{welcomeVideo.title || 'Boas-vindas'}</h3>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={() => setShowWelcomeVideo(false)}
                className="cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={getYoutubeEmbedUrl(welcomeVideo.youtubeUrl)}
                title={welcomeVideo.title || 'Vídeo de boas-vindas'}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Content Lightbox */}
      {selectedContent && (
        <div 
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => { setSelectedContent(null); setSelectedModule(null); }}
        >
          <div 
            className="w-full max-w-5xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{selectedContent.title}</h3>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                onClick={() => { setSelectedContent(null); setSelectedModule(null); }}
                className="cursor-pointer"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {selectedContent.type === 'video' ? (
              <>
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  {(selectedContent as ModuleVideo).isFileVideo && (selectedContent as ModuleVideo).videoFileUrl ? (
                    <video
                      src={(selectedContent as ModuleVideo).videoFileUrl}
                      title={selectedContent.title}
                      className="w-full h-full"
                      controls
                      autoPlay
                    />
                  ) : (
                    <iframe
                      src={getYoutubeEmbedUrl((selectedContent as ModuleVideo).youtubeUrl)}
                      title={selectedContent.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
                {(selectedContent as ModuleVideo).description && (
                  <p className="text-muted-foreground mt-4">{(selectedContent as ModuleVideo).description}</p>
                )}
              </>
            ) : (
              <div className="glass-card p-6 rounded-lg">
                <div className="prose prose-invert max-w-none">
                  {(selectedContent as ModuleText).content.split('\n').map((paragraph, idx) => (
                    <p key={idx} className="mb-4 last:mb-0 text-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MROFerramenta;
