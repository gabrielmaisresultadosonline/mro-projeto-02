import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { X, Bell, Clock } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  thumbnailUrl?: string;
  youtubeUrl?: string;
  isActive: boolean;
  forceRead: boolean;
  forceReadSeconds: number;
  maxViews: number;
  createdAt: string;
  viewCount?: number;
}

const getYoutubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

interface ViewedAnnouncement {
  id: string;
  viewCount: number;
  lastViewed: string;
}

interface AnnouncementPopupProps {
  onComplete?: () => void;
  targetArea?: 'instagram' | 'zapmro';
}

const STORAGE_KEY = 'mro_viewed_announcements';

const AnnouncementPopup = ({ onComplete, targetArea }: AnnouncementPopupProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [canClose, setCanClose] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);
  const announcementsRef = useRef<Announcement[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getViewedAnnouncements = (): ViewedAnnouncement[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveViewedAnnouncement = (id: string) => {
    const viewed = getViewedAnnouncements();
    const existing = viewed.find(v => v.id === id);
    
    if (existing) {
      existing.viewCount += 1;
      existing.lastViewed = new Date().toISOString();
    } else {
      viewed.push({
        id,
        viewCount: 1,
        lastViewed: new Date().toISOString()
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(viewed));
  };

  const incrementViewCount = async (announcementId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('user-data')
        .download('admin/announcements.json');
      
      if (error) return;

      const text = await data.text();
      const parsed = JSON.parse(text);
      
      const updatedAnnouncements = parsed.announcements.map((a: Announcement) => {
        if (a.id === announcementId) {
          return { ...a, viewCount: (a.viewCount || 0) + 1 };
        }
        return a;
      });

      const blob = new Blob([JSON.stringify({ ...parsed, announcements: updatedAnnouncements }, null, 2)], { type: 'application/json' });
      
      await supabase.storage
        .from('user-data')
        .upload('admin/announcements.json', blob, { 
          upsert: true,
          contentType: 'application/json'
        });

      console.log('📢 View count incrementado para:', announcementId);
    } catch (error) {
      console.error('📢 Erro ao incrementar view count:', error);
    }
  };

  const shouldShowAnnouncement = (announcement: Announcement): boolean => {
    const viewed = getViewedAnnouncements();
    const viewedRecord = viewed.find(v => v.id === announcement.id);
    
    if (!viewedRecord) return true;
    if (announcement.maxViews === 99) return true;
    
    return viewedRecord.viewCount < announcement.maxViews;
  };

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('📢 Carregando avisos do servidor...', targetArea ? `(área: ${targetArea})` : '(todas as áreas)');
      const { data, error } = await supabase.storage
        .from('user-data')
        .download('admin/announcements.json');
      
      if (error) {
        console.log('📢 Nenhum aviso encontrado:', error.message);
        setIsLoading(false);
        onComplete?.();
        return;
      }

      const text = await data.text();
      const parsed = JSON.parse(text);
      
      // Filter by target area if specified
      const activeAnnouncements = (parsed.announcements || [])
        .filter((a: Announcement & { targetArea?: string }) => a.isActive)
        .filter((a: Announcement & { targetArea?: string }) => {
          // If no targetArea specified on component, show all
          if (!targetArea) return true;
          // If announcement has no targetArea or is 'all', show it
          if (!a.targetArea || a.targetArea === 'all') return true;
          // Otherwise, match the specific area
          return a.targetArea === targetArea;
        })
        .filter((a: Announcement) => shouldShowAnnouncement(a));

      console.log(`📢 ${activeAnnouncements.length} avisos ativos para exibir`);
      
      if (activeAnnouncements.length === 0) {
        setIsLoading(false);
        onComplete?.();
        return;
      }

      setAnnouncements(activeAnnouncements);
      announcementsRef.current = activeAnnouncements;
      showAnnouncement(activeAnnouncements[0]);
    } catch (error) {
      console.error('📢 Erro ao carregar avisos:', error);
      onComplete?.();
    } finally {
      setIsLoading(false);
    }
  }, [onComplete, targetArea]);

  useEffect(() => {
    if (!hasTriggered.current) {
      hasTriggered.current = true;
      loadAnnouncements();
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [loadAnnouncements]);

  const showAnnouncement = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setIsVisible(true);
    
    // Increment view count
    incrementViewCount(announcement.id);
    
    if (announcement.forceRead && announcement.forceReadSeconds > 0) {
      setCanClose(false);
      setSecondsRemaining(announcement.forceReadSeconds);
      
      // Start countdown timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            setCanClose(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCanClose(true);
      setSecondsRemaining(0);
    }
  };

  const handleClose = () => {
    if (!canClose) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (currentAnnouncement) {
      saveViewedAnnouncement(currentAnnouncement.id);
      
      const currentIndex = announcementsRef.current.findIndex(a => a.id === currentAnnouncement.id);
      const nextAnnouncement = announcementsRef.current[currentIndex + 1];
      
      if (nextAnnouncement) {
        showAnnouncement(nextAnnouncement);
      } else {
        setIsVisible(false);
        setCurrentAnnouncement(null);
        onComplete?.();
      }
    }
  };

  if (!isVisible || !currentAnnouncement) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border-primary/30">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">{currentAnnouncement.title}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={!canClose}
            className={!canClose ? 'opacity-30 cursor-not-allowed' : ''}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content - Fixed height with scroll for force read */}
        <div 
          ref={contentRef}
          className={`flex-1 overflow-y-auto p-4 space-y-4 ${
            currentAnnouncement.forceRead ? 'max-h-64' : ''
          }`}
        >
          {currentAnnouncement.youtubeUrl && getYoutubeVideoId(currentAnnouncement.youtubeUrl) && (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeVideoId(currentAnnouncement.youtubeUrl)}`}
                title="YouTube video"
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {currentAnnouncement.thumbnailUrl && (
            <img 
              src={storageAssetUrl(currentAnnouncement.thumbnailUrl)} 
              alt="" 
              className="w-full rounded-lg object-contain max-h-80"
              onError={(e) => e.currentTarget.style.display = 'none'}
            />
          )}
          
          <div className="whitespace-pre-wrap text-foreground leading-relaxed">
            {currentAnnouncement.content}
          </div>

          {/* Add padding for short content when force read */}
          {currentAnnouncement.forceRead && (
            <div className="min-h-[100px]" />
          )}
        </div>

        {/* Timer Footer */}
        <div className="p-4 border-t border-border bg-secondary/30">
          {!canClose && secondsRemaining > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-yellow-400">
                <Clock className="w-5 h-5 animate-pulse" />
                <span className="text-xl font-bold">{secondsRemaining}s</span>
              </div>
              <p className="text-sm text-yellow-400/80 text-center animate-pulse">
                ⏳ Aguarde {secondsRemaining} segundos para continuar...
              </p>
            </div>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Entendido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPopup;
