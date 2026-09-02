import { useState, useEffect, useRef } from 'react';
import { TutorialModule, ModuleContent, ModuleVideo, ModuleText, ModuleButton, ModuleSection, ModuleColor, getYoutubeThumbnail, loadModulesFromCloud } from '@/lib/adminConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, X, ChevronLeft, ChevronRight, Type, Loader2, ExternalLink, Gift, ArrowLeft, Settings, Lock } from 'lucide-react';
import { toast } from 'sonner';
import ModuleManager from '@/components/admin/ModuleManager';

const ADMIN_EMAIL = 'mro@gmail.com';
const ADMIN_PASSWORD = 'Ga145523@';

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

interface EstruturaTutoriaisProps {
  onBack: () => void;
}

export const EstruturaTutoriais = ({ onBack }: EstruturaTutoriaisProps) => {
  const [modules, setModules] = useState<TutorialModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<TutorialModule | null>(null);
  const [selectedContent, setSelectedContent] = useState<ModuleContent | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const cloudData = await loadModulesFromCloud('estrutura');
      if (cloudData) {
        setModules(cloudData.modules || []);
      }
    } catch (error) {
      console.error('[EstruturaTutoriais] Error loading modules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdminLogin = () => {
    if (adminEmail === ADMIN_EMAIL && adminPass === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminLogin(false);
      toast.success('Admin autenticado!');
    } else {
      toast.error('Credenciais inválidas');
    }
  };

  const getYoutubeEmbedUrl = (url: string): string => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    return url;
  };

  const handleContentClick = (content: ModuleContent) => {
    if (content.type === 'button') {
      window.open((content as ModuleButton).url, '_blank', 'noopener,noreferrer');
      return;
    }
    setSelectedContent(content);
  };

  const separateContents = (contents: ModuleContent[]) => {
    const sorted = [...contents].sort((a, b) => a.order - b.order);
    const regularContents = sorted.filter(c => c.type !== 'section');
    const sections = sorted.filter(c => c.type === 'section') as ModuleSection[];
    return { regularContents, sections };
  };

  const ContentSection = ({ 
    section, contents, module 
  }: { 
    section: ModuleSection | null; contents: ModuleContent[]; module: TutorialModule;
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const videoContents = contents.filter(c => c.type === 'video' || c.type === 'text');
    const buttonContents = contents.filter(c => c.type === 'button');

    const checkScroll = () => {
      const el = scrollRef.current;
      if (el) {
        setCanScrollLeft(el.scrollLeft > 10);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
      }
    };

    useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = 0;
      checkScroll();
      window.addEventListener('resize', checkScroll);
      return () => window.removeEventListener('resize', checkScroll);
    }, [videoContents.length]);

    const scroll = (dir: 'left' | 'right') => {
      const el = scrollRef.current;
      if (el) {
        const w = el.querySelector('.content-card')?.clientWidth || 140;
        el.scrollBy({ left: dir === 'left' ? -(w + 12) : w + 12, behavior: 'smooth' });
        setTimeout(checkScroll, 300);
      }
    };

    if (videoContents.length === 0 && buttonContents.length === 0) return null;

    const carousel = videoContents.length > 0 && (
      <div className="relative px-6 md:px-8">
        {canScrollLeft && (
          <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
          </button>
        )}
        {canScrollRight && (
          <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
          </button>
        )}
        <div ref={scrollRef} onScroll={checkScroll} className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory touch-pan-x mx-auto w-fit max-w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}>
          {videoContents.map((content, idx) => (
            <div key={content.id} className="content-card group cursor-pointer flex-shrink-0 snap-start w-[120px] sm:w-[140px] md:w-[160px] lg:w-[180px]" onClick={() => handleContentClick(content)}>
              {content.type === 'video' ? (
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black border-2 border-border/50 group-hover:border-primary transition-all duration-300 shadow-lg">
                  <img src={(content as ModuleVideo).thumbnailUrl || getYoutubeThumbnail((content as ModuleVideo).youtubeUrl)} alt={content.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }} />
                  {(content as ModuleVideo).isFileVideo ? (
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600 rounded text-xs font-semibold text-white flex items-center gap-1"><Play className="w-3 h-3" />MP4</div>
                  ) : (
                    <div className="absolute top-2 left-2 w-7 h-5 bg-red-600 rounded flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </div>
                  )}
                  {(content as ModuleVideo).showNumber && (
                    <div className="absolute top-2 right-2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs md:text-sm font-bold shadow-lg">{idx + 1}</div>
                  )}
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center shadow-lg"><Play className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground ml-0.5" /></div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gradient-to-br from-secondary to-muted flex items-center justify-center border-2 border-border/50 group-hover:border-primary transition-all duration-300 shadow-lg">
                  <Type className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="absolute top-2 right-2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs md:text-sm font-bold shadow-lg">{idx + 1}</div>
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

    const buttons = buttonContents.length > 0 && (
      <div className="flex flex-wrap gap-2 md:gap-3 justify-center pt-4 px-4">
        {buttonContents.map((content) => (
          <Button key={content.id} onClick={() => window.open((content as ModuleButton).url, '_blank', 'noopener,noreferrer')} variant="outline" size="sm" className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border-primary/30 text-foreground text-xs md:text-sm">
            <ExternalLink className="h-3 w-3 md:h-4 md:w-4" />{content.title}
          </Button>
        ))}
      </div>
    );

    if (section) {
      return (
        <div className="mt-6 rounded-2xl border border-border/30 bg-card/30 p-4 md:p-6">
          {section.showTitle !== false && (
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <h3 className="text-base md:text-lg font-bold">{section.title}</h3>
                {section.isBonus && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black rounded-full text-xs font-semibold flex items-center gap-1"><Gift className="w-3 h-3" />BÔNUS</span>
                )}
              </div>
              {section.description && <p className="text-xs md:text-sm text-muted-foreground mt-1">{section.description}</p>}
            </div>
          )}
          {carousel}
          {buttons}
        </div>
      );
    }

    return <div className="space-y-2">{carousel}{buttons}</div>;
  };

  const ModuleCarousel = ({ module }: { module: TutorialModule }) => {
    const { regularContents, sections } = separateContents(module.contents);
    return (
      <div className="space-y-4">
        {regularContents.length > 0 && <ContentSection section={null} contents={regularContents} module={module} />}
        {sections.map((section) => (
          <ContentSection key={section.id} section={section} contents={section.contents || []} module={module} />
        ))}
      </div>
    );
  };

  // ─── Admin Mode ───
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 glass-card border-b border-border">
          <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => { setIsAdmin(false); loadData(); }} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar aos Tutoriais
              </Button>
              <h1 className="text-lg md:text-xl font-bold">⚙️ Admin Tutoriais</h1>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIsAdmin(false)} className="text-destructive border-destructive/50">
              <Lock className="w-4 h-4 mr-1" />
              Sair do Admin
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <ModuleManager
            downloadLink=""
            onDownloadLinkChange={() => {}}
            onSaveSettings={() => {
              toast.success('Tutoriais salvos com sucesso!');
            }}
            platform="estrutura"
          />
        </main>
      </div>
    );
  }

  // ─── Admin Login Modal ───
  const adminLoginModal = showAdminLogin && (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdminLogin(false)}>
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Lock className="w-5 h-5 text-primary" />Admin Login</h2>
          <Button variant="ghost" size="icon" onClick={() => setShowAdminLogin(false)}><X className="w-5 h-5" /></Button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">E-mail</label>
            <Input value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@email.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Senha</label>
            <Input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} />
          </div>
          <Button className="w-full" onClick={handleAdminLogin}>Entrar como Admin</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-card border-b border-border">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={onBack} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar ao Início
            </Button>
            <h1 className="text-lg md:text-xl font-bold">📚 Tutoriais</h1>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowAdminLogin(true)} className="text-muted-foreground hover:text-foreground">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {isLoading && (
            <div className="glass-card p-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto text-primary mb-4 animate-spin" />
              <p className="text-muted-foreground">Carregando tutoriais...</p>
            </div>
          )}

          {!isLoading && (
            <>
              <h1 className="text-3xl font-bold mb-2 text-center">📚 Tutoriais</h1>
              <p className="text-muted-foreground mb-8 text-center">Aprenda como fazer tudo passo a passo</p>

              {modules.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum tutorial disponível ainda</p>
                  <p className="text-muted-foreground text-sm mt-2">Os tutoriais serão adicionados em breve.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {modules.sort((a, b) => a.order - b.order).map((module) => {
                    const colorTheme = moduleColorClasses[module.color || 'default'];
                    const isCollapsed = module.collapsedByDefault && !expandedModules.has(module.id);

                    const toggleExpand = () => {
                      setExpandedModules(prev => {
                        const next = new Set(prev);
                        if (next.has(module.id)) next.delete(module.id);
                        else next.add(module.id);
                        return next;
                      });
                    };

                    return (
                      <div key={module.id} className={`glass-card p-6 rounded-xl border-2 ${colorTheme.border} ${colorTheme.bg}`}>
                        <div className={`flex flex-col items-center gap-3 ${isCollapsed ? '' : 'mb-6'} text-center ${module.collapsedByDefault ? 'cursor-pointer' : ''}`} onClick={module.collapsedByDefault ? toggleExpand : undefined}>
                          {module.collapsedByDefault && module.coverUrl && (
                            <div className="relative w-full max-w-xs mx-auto mb-2">
                              <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-secondary group">
                                <img src={module.coverUrl} alt={module.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-xl"><Play className="w-8 h-8 text-primary-foreground" /></div>
                                </div>
                                {isCollapsed && <div className="absolute bottom-2 right-2 px-3 py-1 bg-background/80 rounded-full text-xs font-medium">Clique para ver</div>}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-3 flex-wrap justify-center">
                            <h2 className="text-xl md:text-2xl font-bold">{module.title}</h2>
                            {module.isBonus && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-bold rounded-full shadow-lg animate-pulse"><Gift className="w-3 h-3" />BÔNUS</span>
                            )}
                          </div>
                          {module.description && <p className="text-muted-foreground">{module.description}</p>}
                        </div>

                        {!isCollapsed && (
                          module.contents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>Nenhum conteúdo neste módulo</p>
                            </div>
                          ) : (
                            <ModuleCarousel module={module} />
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Content Lightbox */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => { setSelectedContent(null); setSelectedModule(null); }}>
          <div className="w-full max-w-5xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{selectedContent.title}</h3>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedContent(null); setSelectedModule(null); }}><X className="w-5 h-5" /></Button>
            </div>
            {selectedContent.type === 'video' ? (
              <>
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  {(selectedContent as ModuleVideo).isFileVideo && (selectedContent as ModuleVideo).videoFileUrl ? (
                    <video src={(selectedContent as ModuleVideo).videoFileUrl} title={selectedContent.title} className="w-full h-full" controls autoPlay />
                  ) : (
                    <iframe src={getYoutubeEmbedUrl((selectedContent as ModuleVideo).youtubeUrl)} title={selectedContent.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  )}
                </div>
                {(selectedContent as ModuleVideo).description && <p className="text-muted-foreground mt-4">{(selectedContent as ModuleVideo).description}</p>}
              </>
            ) : (
              <div className="glass-card p-6 rounded-lg">
                <div className="prose prose-invert max-w-none">
                  {(selectedContent as ModuleText).content.split('\n').map((p, i) => (
                    <p key={i} className="mb-4 last:mb-0 text-foreground">{p}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {adminLoginModal}
    </div>
  );
};
