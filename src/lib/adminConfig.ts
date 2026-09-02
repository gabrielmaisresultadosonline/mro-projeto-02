// Admin configuration - uses Supabase Auth for secure authentication
// NO HARDCODED CREDENTIALS - Admin users must be created in Supabase Auth
// with admin role assigned in user_roles table

import { supabase } from '@/integrations/supabase/client';
import { storageAssetUrl } from '@/lib/assetUrl';

// Admin settings stored in localStorage
export interface WelcomeVideo {
  enabled: boolean;
  title: string;
  showTitle: boolean;
  youtubeUrl: string;
  coverUrl: string;
}

export interface CallAnalytics {
  id: string;
  timestamp: string;
  event: 'page_view' | 'ringtone_started' | 'call_answered' | 'audio_completed' | 'cta_clicked';
  userAgent: string;
  referrer: string;
}

export interface CallPageSettings {
  audioUrl: string;
  ringtoneUrl: string;
}

export interface CallPageContent {
  // Landing page
  landingTitle: string; // "Gabriel esta agora disponível..."
  landingButtonText: string; // "Receber chamada agora"
  // Ended state
  endedTitle: string; // "Aproveite agora mesmo!"
  endedMessage: string; // "Planos a partir de R$33 mensal"
  endedPrice: string; // "R$33 mensal"
  ctaButtonText: string; // "Acessar o site agora"
  ctaButtonLink: string; // "https://acessar.click/mrointeligente"
  profileUsername: string; // "@maisresultadosonline"
}

export interface FacebookPixelSettings {
  pixelId: string;
  enabled: boolean;
  trackPageView: boolean;
  trackLead: boolean;
  trackViewContent: boolean;
  customEvents: string[];
}

export interface SalesPageSettings {
  whatsappNumber: string;
  whatsappMessage: string;
  ctaButtonText: string;
}

export interface AdminSettings {
  apis: {
    deepseek: string;
    gemini: string;
    nanoBanana: string;
    openai: string;
    metaClientId?: string;
    metaClientSecret?: string;
    metaAccessToken?: string;
  };
  mroCriativo: {
    urls: {
      authRedirect: string;
      webhookUrl: string;
      termsUrl: string;
      privacyUrl: string;
    };
    fallbacks: {
      defaultMessage: string;
      errorMessage: string;
      offlineMessage: string;
    };
    integrations: {
      active: boolean;
      platform: 'meta' | 'custom';
    };
  };
  facebookPixel: string;
  facebookPixelCode: string; // Complete pixel code for manual injection
  downloadLink: string;
  welcomeVideo: WelcomeVideo;
  callPixelEvents: {
    pageView: boolean;
    audioCompleted: boolean;
    ctaClicked: boolean;
  };
  callPageSettings: CallPageSettings;
  callPageContent: CallPageContent;
  pixelSettings: FacebookPixelSettings;
  salesPageSettings: SalesPageSettings;
}

// Content types for modules
export type ModuleContentType = 'video' | 'text' | 'button' | 'section' | 'product_ad';

export interface ModuleVideo {
  id: string;
  type: 'video';
  title: string;
  description: string;
  youtubeUrl: string; // YouTube URL or empty if using videoFileUrl
  videoFileUrl?: string; // MP4 file URL from storage
  isFileVideo?: boolean; // true if video is from uploaded file
  thumbnailUrl: string;
  showNumber: boolean;
  showTitle: boolean;
  order: number;
  createdAt: string;
}

export interface ModuleText {
  id: string;
  type: 'text';
  title: string;
  content: string;
  showTitle: boolean;
  order: number;
  createdAt: string;
}

export interface ModuleButton {
  id: string;
  type: 'button';
  title: string;
  url: string;
  description: string;
  coverUrl: string;
  showTitle: boolean;
  order: number;
  createdAt: string;
}

export interface ModuleProductAd {
  id: string;
  type: 'product_ad';
  title: string;
  productId: string; // ID of the product from hub_products
  productSlug: string;
  productTitle: string;
  productDescription?: string;
  productThumb?: string;
  productSalesUrl?: string;
  showTitle: boolean;
  order: number;
  createdAt: string;
}

// Section content types (what goes inside a section)
export type SectionContentType = 'video' | 'text' | 'button';
export type SectionContent = ModuleVideo | ModuleText | ModuleButton;

// Section divider - allows grouping content with a title (sub-module with its own contents)
export interface ModuleSection {
  id: string;
  type: 'section';
  title: string;
  description: string;
  showTitle: boolean;
  isBonus: boolean;
  order: number;
  createdAt: string;
  contents: SectionContent[]; // Section's own videos, texts, buttons
}

export type ModuleContent = ModuleVideo | ModuleText | ModuleButton | ModuleSection | ModuleProductAd;

// Module color themes
export type ModuleColor = 'default' | 'green' | 'blue' | 'purple' | 'orange' | 'pink' | 'red' | 'cyan';

export interface TutorialModule {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  showNumber: boolean;
  order: number;
  contents: ModuleContent[];
  createdAt: string;
  color?: ModuleColor;
  isBonus?: boolean;
  collapsedByDefault?: boolean; // Se true, mostra só capa/nome e expande ao clicar
}

// Legacy types for backwards compatibility
export interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  step: number;
  order: number;
  createdAt: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  order: number;
  videos: TutorialVideo[];
}

export interface AdminData {
  settings: AdminSettings;
  tutorials: TutorialStep[]; // Legacy
  modules: TutorialModule[];
  callAnalytics: CallAnalytics[];
}

const DEFAULT_ADMIN_DATA: AdminData = {
  settings: {
    apis: {
      deepseek: '',
      gemini: '',
      nanoBanana: '',
      openai: '',
      metaClientId: '',
      metaClientSecret: '',
      metaAccessToken: ''
    },
    mroCriativo: {
      urls: {
        authRedirect: 'https://maisresultadosonline.com.br/mrocriativo/callback.php',
        webhookUrl: 'https://maisresultadosonline.com.br/mrocriativo/webhook.php',
        termsUrl: 'https://maisresultadosonline.com.br/mrocriativo/terms.php',
        privacyUrl: 'https://maisresultadosonline.com.br/mrocriativo/privacy.php'
      },
      fallbacks: {
        defaultMessage: 'Desculpe, não entendi. Pode repetir?',
        errorMessage: 'Ocorreu um erro ao processar sua solicitação.',
        offlineMessage: 'Estamos em manutenção, voltamos logo!'
      },
      integrations: {
        active: true,
        platform: 'meta'
      }
    },
    facebookPixel: '569414052132145',
    facebookPixelCode: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '569414052132145');
fbq('track', 'PageView');`,
    downloadLink: '',
    welcomeVideo: {
      enabled: false,
      title: '',
      showTitle: true,
      youtubeUrl: '',
      coverUrl: ''
    },
    callPixelEvents: {
      pageView: true,
      audioCompleted: true,
      ctaClicked: true
    },
    callPageSettings: {
      audioUrl: 'https://maisresultadosonline.com.br/3b301aa2-e372-4b47-b35b-34d4b55bcdd9.mp3',
      ringtoneUrl: 'https://maisresultadosonline.com.br/1207.mp4'
    },
    callPageContent: {
      landingTitle: 'Gabriel esta agora disponível para uma chamada, atenda para entender como não Gastar mais com anúncios!',
      landingButtonText: 'Receber chamada agora',
      endedTitle: '🔥 Aproveite agora mesmo!',
      endedMessage: 'Planos a partir de',
      endedPrice: 'R$33 mensal',
      ctaButtonText: 'Acessar o site agora',
      ctaButtonLink: 'https://maisresultadosonline.com.br/mrointeligente',
      profileUsername: '@maisresultadosonline'
    },
    pixelSettings: {
      pixelId: '569414052132145',
      enabled: true,
      trackPageView: true,
      trackLead: true,
      trackViewContent: true,
      customEvents: []
    },
    salesPageSettings: {
      whatsappNumber: '+55 51 9203-6540',
      whatsappMessage: 'Gostaria de saber sobre a promoção.',
      ctaButtonText: 'Gostaria de aproveitar a promoção'
    }
  },
  tutorials: [],
  modules: [],
  callAnalytics: []
};

// NO HARDCODED CREDENTIALS - Admin authentication uses Supabase Auth
// Admin users must have 'admin' role in user_roles table

export const getAdminData = (): AdminData => {
  try {
    const data = localStorage.getItem('mro_admin_data');
    if (data) {
      const parsed = JSON.parse(data);
      return { 
        ...DEFAULT_ADMIN_DATA, 
        ...parsed,
        modules: parsed.modules || [],
        callAnalytics: parsed.callAnalytics || [],
        settings: {
          ...DEFAULT_ADMIN_DATA.settings,
          ...parsed.settings,
          callPixelEvents: {
            ...DEFAULT_ADMIN_DATA.settings.callPixelEvents,
            ...(parsed.settings?.callPixelEvents || {})
          },
          callPageSettings: {
            ...DEFAULT_ADMIN_DATA.settings.callPageSettings,
            ...(parsed.settings?.callPageSettings || {})
          },
          pixelSettings: {
            ...DEFAULT_ADMIN_DATA.settings.pixelSettings,
            ...(parsed.settings?.pixelSettings || {})
          }
        }
      };
    }
  } catch (e) {
    console.error('Error reading admin data:', e);
  }
  return DEFAULT_ADMIN_DATA;
};

export const saveAdminData = (data: AdminData): void => {
  localStorage.setItem('mro_admin_data', JSON.stringify(data));
};

// Platform type for module storage
// Além das plataformas fixas, aceitamos áreas de membros dinâmicas dos produtos
// do dashboard no formato `hub-<slug>`.
export type ModulePlatform = 'mro' | 'zapmro' | 'estrutura' | `hub-${string}`;

/** Chave de localStorage usada para cada plataforma de módulos. */
export const getModulesStorageKey = (platform: ModulePlatform = 'mro'): string => {
  if (platform === 'zapmro') return 'mro_zapmro_modules';
  if (platform === 'estrutura') return 'mro_estrutura_modules';
  if (platform.startsWith('hub-')) return `mro_${platform.replace(/-/g, '_')}_modules`;
  return 'mro_admin_data';
};

// Save modules to cloud storage
export const saveModulesToCloud = async (
  platform: ModulePlatform = 'mro',
  overrideData?: {
    modules: TutorialModule[];
    settings: Pick<AdminSettings, 'downloadLink' | 'welcomeVideo'>;
  }
): Promise<boolean> => {
  try {
    const data = getAdminData();
    const storageKey = getModulesStorageKey(platform);
    const localData = localStorage.getItem(storageKey);
    const parsedData = localData ? JSON.parse(localData) : data;

    const modulesData = {
      modules: overrideData?.modules ?? parsedData.modules ?? [],
      settings: {
        downloadLink: overrideData?.settings?.downloadLink ?? parsedData.settings?.downloadLink ?? '',
        welcomeVideo:
          overrideData?.settings?.welcomeVideo ??
          parsedData.settings?.welcomeVideo ??
          {
            enabled: false,
            title: '',
            showTitle: true,
            youtubeUrl: '',
            coverUrl: '',
          },
      },
    };

    const response = await supabase.functions.invoke('modules-storage', {
      body: { action: 'save', data: modulesData, platform },
    });

    if (response.error) {
      console.error(`[adminConfig] Error saving ${platform} modules to cloud:`, response.error);
      return false;
    }

    const ok = response.data?.success === true;
    if (!ok) {
      console.error(`[adminConfig] Cloud save returned success=false (${platform})`, response.data);
      return false;
    }

    console.log(`[adminConfig] ${platform} modules saved to cloud successfully`, {
      modules: modulesData.modules?.length || 0,
    });
    return true;
  } catch (error) {
    console.error(`[adminConfig] Error saving ${platform} modules to cloud:`, error);
    return false;
  }
};

// Load modules from cloud storage (for public users)
export const loadModulesFromCloud = async (
  platform: ModulePlatform = 'mro'
): Promise<{
  modules: TutorialModule[];
  settings: Pick<AdminSettings, 'downloadLink' | 'welcomeVideo'>;
} | null> => {
  try {
    console.log(`[adminConfig] Loading ${platform} modules from cloud...`);

    const response = await supabase.functions.invoke('modules-storage', {
      body: { action: 'load', platform },
    });

    console.log('[adminConfig] Raw response:', response);

    if (response.error) {
      console.error(`[adminConfig] Error loading ${platform} modules from cloud:`, response.error);
      return null;
    }

    const responseData = response.data;
    console.log('[adminConfig] Response data:', responseData);

    // Quando o arquivo não existe ainda, devolve “vazio” ao invés de null
    if (responseData?.success === true && !responseData?.data) {
      return {
        modules: [],
        settings: {
          downloadLink: '',
          welcomeVideo: {
            enabled: false,
            title: '',
            showTitle: true,
            youtubeUrl: '',
            coverUrl: '',
          },
        },
      };
    }

    if (responseData?.success === true && responseData?.data) {
      console.log(
        `[adminConfig] ${platform} modules loaded from cloud:`,
        responseData.data.modules?.length || 0
      );

      // Conteúdo migrado ainda pode conter URLs absolutas do projeto antigo.
      // Normalizamos recursivamente apenas campos string para preservar toda a
      // estrutura dos módulos, inclusive capas dentro de subseções.
      const normalizeMediaUrls = (value: unknown): unknown => {
        if (typeof value === 'string') return storageAssetUrl(value);
        if (Array.isArray(value)) return value.map(normalizeMediaUrls);
        if (value && typeof value === 'object') {
          return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, normalizeMediaUrls(nestedValue)])
          );
        }
        return value;
      };

      return normalizeMediaUrls(responseData.data) as {
        modules: TutorialModule[];
        settings: Pick<AdminSettings, 'downloadLink' | 'welcomeVideo'>;
      };
    }

    console.log('[adminConfig] No valid data in response');
    return null;
  } catch (error) {
    console.error(`[adminConfig] Error loading ${platform} modules from cloud:`, error);
    return null;
  }
};

export const updateSettings = (settings: Partial<AdminSettings>): void => {
  const data = getAdminData();
  data.settings = { ...data.settings, ...settings };
  saveAdminData(data);
};

// Call Analytics functions
export const trackCallEvent = (event: CallAnalytics['event']): void => {
  const data = getAdminData();
  const analytics: CallAnalytics = {
    id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    event,
    userAgent: navigator.userAgent,
    referrer: document.referrer || 'direct'
  };
  data.callAnalytics.push(analytics);
  // Keep only last 1000 events
  if (data.callAnalytics.length > 1000) {
    data.callAnalytics = data.callAnalytics.slice(-1000);
  }
  saveAdminData(data);
};

export const getCallAnalytics = (): CallAnalytics[] => {
  return getAdminData().callAnalytics;
};

export const clearCallAnalytics = (): void => {
  const data = getAdminData();
  data.callAnalytics = [];
  saveAdminData(data);
};

// Module functions
export const addModule = (title: string, description: string = '', coverUrl: string = '', showNumber: boolean = true, color: ModuleColor = 'default', isBonus: boolean = false, collapsedByDefault: boolean = false): TutorialModule => {
  const data = getAdminData();
  const newModule: TutorialModule = {
    id: `module_${Date.now()}`,
    title,
    description,
    coverUrl,
    showNumber,
    order: data.modules.length + 1,
    contents: [],
    createdAt: new Date().toISOString(),
    color,
    isBonus,
    collapsedByDefault
  };
  data.modules.push(newModule);
  saveAdminData(data);
  return newModule;
};

export const updateModule = (moduleId: string, updates: Partial<Omit<TutorialModule, 'id' | 'contents' | 'createdAt'>>): void => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (module) {
    Object.assign(module, updates);
    saveAdminData(data);
  }
};

export const deleteModule = (moduleId: string): void => {
  const data = getAdminData();
  data.modules = data.modules.filter(m => m.id !== moduleId);
  // Reorder
  data.modules.forEach((m, i) => m.order = i + 1);
  saveAdminData(data);
};

export const reorderModules = (moduleIds: string[]): void => {
  const data = getAdminData();
  const reordered: TutorialModule[] = [];
  moduleIds.forEach((id, index) => {
    const module = data.modules.find(m => m.id === id);
    if (module) {
      module.order = index + 1;
      reordered.push(module);
    }
  });
  data.modules = reordered;
  saveAdminData(data);
};

// Content functions
export const addVideoToModule = (
  moduleId: string, 
  video: { title: string; description: string; youtubeUrl: string; thumbnailUrl?: string; showNumber?: boolean; showTitle?: boolean }
): ModuleVideo | null => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (!module) return null;
  
  const newVideo: ModuleVideo = {
    id: `video_${Date.now()}`,
    type: 'video',
    title: video.title,
    description: video.description,
    youtubeUrl: video.youtubeUrl,
    thumbnailUrl: video.thumbnailUrl || getYoutubeThumbnail(video.youtubeUrl),
    showNumber: video.showNumber ?? true,
    showTitle: video.showTitle ?? true,
    order: module.contents.length + 1,
    createdAt: new Date().toISOString()
  };
  module.contents.push(newVideo);
  saveAdminData(data);
  return newVideo;
};

export const addTextToModule = (
  moduleId: string,
  text: { title: string; content: string; showTitle?: boolean }
): ModuleText | null => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (!module) return null;
  
  const newText: ModuleText = {
    id: `text_${Date.now()}`,
    type: 'text',
    title: text.title,
    content: text.content,
    showTitle: text.showTitle ?? true,
    order: module.contents.length + 1,
    createdAt: new Date().toISOString()
  };
  module.contents.push(newText);
  saveAdminData(data);
  return newText;
};

export const addButtonToModule = (
  moduleId: string,
  button: { title: string; url: string; description?: string; coverUrl?: string; showTitle?: boolean }
): ModuleButton | null => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (!module) return null;
  
  const newButton: ModuleButton = {
    id: `button_${Date.now()}`,
    type: 'button',
    title: button.title,
    url: button.url,
    description: button.description || '',
    coverUrl: button.coverUrl || '',
    showTitle: button.showTitle ?? true,
    order: module.contents.length + 1,
    createdAt: new Date().toISOString()
  };
  module.contents.push(newButton);
  saveAdminData(data);
  return newButton;
};

export const addSectionToModule = (
  moduleId: string,
  section: { title: string; description?: string; showTitle?: boolean; isBonus?: boolean }
): ModuleSection | null => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (!module) return null;
  
  const newSection: ModuleSection = {
    id: `section_${Date.now()}`,
    type: 'section',
    title: section.title,
    description: section.description || '',
    showTitle: section.showTitle ?? true,
    isBonus: section.isBonus ?? false,
    order: module.contents.length + 1,
    createdAt: new Date().toISOString(),
    contents: [] // Section starts with no contents
  };
  module.contents.push(newSection);
  saveAdminData(data);
  return newSection;
};

// Add content to a section inside a module
export const addVideoToSection = (
  moduleId: string,
  sectionId: string,
  video: { title: string; description: string; youtubeUrl: string; thumbnailUrl?: string; showNumber?: boolean; showTitle?: boolean }
): ModuleVideo | null => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (!module) return null;
  
  const section = module.contents.find(c => c.id === sectionId && c.type === 'section') as ModuleSection | undefined;
  if (!section) return null;
  
  const newVideo: ModuleVideo = {
    id: `video_${Date.now()}`,
    type: 'video',
    title: video.title,
    description: video.description,
    youtubeUrl: video.youtubeUrl,
    thumbnailUrl: video.thumbnailUrl || getYoutubeThumbnail(video.youtubeUrl),
    showNumber: video.showNumber ?? true,
    showTitle: video.showTitle ?? true,
    order: section.contents.length + 1,
    createdAt: new Date().toISOString()
  };
  section.contents.push(newVideo);
  saveAdminData(data);
  return newVideo;
};

export const addButtonToSection = (
  moduleId: string,
  sectionId: string,
  button: { title: string; url: string; description?: string; coverUrl?: string; showTitle?: boolean }
): ModuleButton | null => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (!module) return null;
  
  const section = module.contents.find(c => c.id === sectionId && c.type === 'section') as ModuleSection | undefined;
  if (!section) return null;
  
  const newButton: ModuleButton = {
    id: `button_${Date.now()}`,
    type: 'button',
    title: button.title,
    url: button.url,
    description: button.description || '',
    coverUrl: button.coverUrl || '',
    showTitle: button.showTitle ?? true,
    order: section.contents.length + 1,
    createdAt: new Date().toISOString()
  };
  section.contents.push(newButton);
  saveAdminData(data);
  return newButton;
};

export const deleteSectionContent = (moduleId: string, sectionId: string, contentId: string): void => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (module) {
    const section = module.contents.find(c => c.id === sectionId && c.type === 'section') as ModuleSection | undefined;
    if (section) {
      section.contents = section.contents.filter(c => c.id !== contentId);
      section.contents.forEach((c, i) => c.order = i + 1);
      saveAdminData(data);
    }
  }
};

export const updateContent = (moduleId: string, contentId: string, updates: Partial<ModuleContent>): void => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (module) {
    const content = module.contents.find(c => c.id === contentId);
    if (content) {
      Object.assign(content, updates);
      saveAdminData(data);
    }
  }
};

export const deleteContent = (moduleId: string, contentId: string): void => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (module) {
    module.contents = module.contents.filter(c => c.id !== contentId);
    // Reorder
    module.contents.forEach((c, i) => c.order = i + 1);
    saveAdminData(data);
  }
};

export const reorderContents = (moduleId: string, contentIds: string[]): void => {
  const data = getAdminData();
  const module = data.modules.find(m => m.id === moduleId);
  if (module) {
    const reordered: ModuleContent[] = [];
    contentIds.forEach((id, index) => {
      const content = module.contents.find(c => c.id === id);
      if (content) {
        content.order = index + 1;
        reordered.push(content);
      }
    });
    module.contents = reordered;
    saveAdminData(data);
  }
};

// Helper function
export const getYoutubeThumbnail = (url: string): string => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (match) {
    return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
  }
  return '';
};

// Legacy functions for backwards compatibility
export const addTutorialStep = (title: string): TutorialStep => {
  const data = getAdminData();
  const newStep: TutorialStep = {
    id: `step_${Date.now()}`,
    title,
    order: data.tutorials.length + 1,
    videos: []
  };
  data.tutorials.push(newStep);
  saveAdminData(data);
  return newStep;
};

export const addVideoToStep = (stepId: string, video: Omit<TutorialVideo, 'id' | 'step' | 'createdAt'>): TutorialVideo | null => {
  const data = getAdminData();
  const step = data.tutorials.find(s => s.id === stepId);
  if (!step) return null;
  
  const newVideo: TutorialVideo = {
    ...video,
    id: `video_${Date.now()}`,
    step: step.order,
    createdAt: new Date().toISOString()
  };
  step.videos.push(newVideo);
  saveAdminData(data);
  return newVideo;
};

export const deleteTutorialStep = (stepId: string): void => {
  const data = getAdminData();
  data.tutorials = data.tutorials.filter(s => s.id !== stepId);
  // Reorder
  data.tutorials.forEach((s, i) => s.order = i + 1);
  saveAdminData(data);
};

export const deleteVideo = (stepId: string, videoId: string): void => {
  const data = getAdminData();
  const step = data.tutorials.find(s => s.id === stepId);
  if (step) {
    step.videos = step.videos.filter(v => v.id !== videoId);
    saveAdminData(data);
  }
};

// Check if admin is logged in - requires a valid (non-expired) session token.
// Legacy sessions saved before the token-based auth are discarded so the
// operator is asked to sign in again and receives a real session token.
export const isAdminLoggedIn = (): boolean => {
  try {
    const stored = localStorage.getItem('mro_admin_session');
    if (!stored) return false;

    const session = JSON.parse(stored) as { email?: unknown; token?: unknown; expiresAt?: unknown };
    const emailOk = typeof session.email === 'string' && session.email.toUpperCase() === 'MRO@GMAIL.COM';
    const tokenOk = typeof session.token === 'string' && session.token.length > 0;
    const notExpired = !(typeof session.expiresAt === 'number' && session.expiresAt < Date.now());

    if (!emailOk || !tokenOk || !notExpired) {
      localStorage.removeItem('mro_admin_session');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error verifying admin status:', error);
    return false;
  }
};


// Verify admin - alias for isAdminLoggedIn
export const verifyAdmin = isAdminLoggedIn;

const ADMIN_EMAIL = 'MRO@GMAIL.COM';
const ADMIN_PASSWORD = 'Ga145523@';

// Login admin - validates credentials
export const loginAdmin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('lovablack-api', {
      body: { action: 'admin_login', email: email.trim(), password },
    });
    if (error || !data?.success || !data?.token) {
      return { success: false, error: data?.error || 'Credenciais inválidas' };
    }
    localStorage.setItem('mro_admin_session', JSON.stringify({
      email: ADMIN_EMAIL,
      token: data.token,
      expiresAt: data.expires_at,
      loginAt: new Date().toISOString(),
    }));
    return { success: true };
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, error: 'Erro ao fazer login' };
  }
};

// Logout admin - clears localStorage session
export const logoutAdmin = async (): Promise<void> => {
  localStorage.removeItem('mro_admin_session');
};

// Returns the Posts com IA / painel admin credentials when the main admin
// session is active. Used to auto-login embedded admin panels without
// asking the operator to sign in twice.
export const getAdminCredentials = (): { email: string; password: string } | null => {
  if (!isAdminLoggedIn()) return null;
  return { email: ADMIN_EMAIL.toLowerCase(), password: ADMIN_PASSWORD };
};

export const getAdminSessionToken = (): string | null => {
  try {
    const stored = localStorage.getItem('mro_admin_session');
    if (!stored) return null;
    const session = JSON.parse(stored) as { token?: unknown; expiresAt?: unknown };
    if (typeof session.token !== 'string') return null;
    if (typeof session.expiresAt === 'number' && session.expiresAt < Date.now()) return null;
    return session.token;
  } catch {
    return null;
  }
};
