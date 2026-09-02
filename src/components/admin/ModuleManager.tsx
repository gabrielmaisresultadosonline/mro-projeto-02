import { useState, useEffect } from 'react';
import { 
  getAdminData, saveAdminData, addModule, updateModule, deleteModule,
  addVideoToModule, addTextToModule, addButtonToModule, addSectionToModule, deleteContent, updateContent,
  addVideoToSection, addButtonToSection, deleteSectionContent,
  TutorialModule, ModuleContent, ModuleVideo, ModuleText, ModuleButton, ModuleSection, ModuleColor, getYoutubeThumbnail,
  saveModulesToCloud, loadModulesFromCloud, SectionContent, ModulePlatform, AdminData, getModulesStorageKey, ModuleProductAd
} from '@/lib/adminConfig';
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { storageAssetUrl } from '@/lib/assetUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import CoverUploader from './CoverUploader';
import { 
  Plus, Trash2, Save, Check, X, Play, Video, Type, 
  ChevronDown, ChevronUp, Image as ImageIcon,
  Edit2, Upload, Loader2, Link2, ExternalLink, LayoutList, Database, Download,
  ArrowUp, ArrowDown, Sparkles
} from 'lucide-react';

interface ModuleManagerProps {
  downloadLink: string;
  onDownloadLinkChange: (link: string) => void;
  onSaveSettings: () => void;
  platform?: ModulePlatform;
}

// Helper to delete storage file
const deleteStorageFile = async (url: string) => {
  if (url && url.includes('supabase.co/storage')) {
    try {
      const match = url.match(/\/storage\/v1\/object\/public\/assets\/(.+)/);
      if (match) {
        await supabase.storage.from('assets').remove([match[1]]);
      }
    } catch (e) {
      console.error('Error deleting file:', e);
    }
  }
};

const ModuleManager = ({ downloadLink, onDownloadLinkChange, onSaveSettings, platform = 'mro' }: ModuleManagerProps) => {
  const { toast } = useToast();
  const storageKey = getModulesStorageKey(platform);
  
  // Default empty data for fresh state
  const getEmptyData = (): AdminData => ({
    settings: {
      apis: { deepseek: '', gemini: '', nanoBanana: '', openai: '', metaClientId: '', metaClientSecret: '', metaAccessToken: '' },
      mroCriativo: {
        urls: {
          authRedirect: 'https://mrocriativo.com.br/callback',
          webhookUrl: 'https://mrocriativo.com.br/webhook',
          termsUrl: 'https://mrocriativo.com.br/terms',
          privacyUrl: 'https://mrocriativo.com.br/privacy'
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
      facebookPixel: '',
      facebookPixelCode: '',
      downloadLink: '',
      welcomeVideo: { enabled: false, title: '', showTitle: true, youtubeUrl: '', coverUrl: '' },
      callPixelEvents: { pageView: false, audioCompleted: false, ctaClicked: false },
      callPageSettings: { audioUrl: '', ringtoneUrl: '' },
      callPageContent: {
        landingTitle: '',
        landingButtonText: 'Receber chamada agora',
        endedTitle: '🔥 Aproveite agora mesmo!',
        endedMessage: 'Planos a partir de',
        endedPrice: 'R$33 mensal',
        ctaButtonText: 'Acessar o site agora',
        ctaButtonLink: 'https://maisresultadosonline.com.br/mrointeligente',
        profileUsername: '@maisresultadosonline'
      },
      pixelSettings: { pixelId: '', enabled: false, trackPageView: false, trackLead: false, trackViewContent: false, customEvents: [] },
      salesPageSettings: { whatsappNumber: '+55 51 9203-6540', whatsappMessage: 'Gostaria de saber sobre a promoção.', ctaButtonText: 'Gostaria de aproveitar a promoção' }
    },
    tutorials: [],
    modules: [],
    callAnalytics: []
  });
  
  const getLocalData = (): AdminData => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return getEmptyData();
      }
    }
    return getEmptyData();
  };
  
  const saveLocalData = (data: AdminData) => {
    localStorage.setItem(storageKey, JSON.stringify(data));
  };
  
  // Start with local data (platform-specific) and then reconcile with cloud
  const [adminData, setAdminData] = useState<AdminData>(() => getLocalData());
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<{ moduleId: string; content: ModuleContent; sectionId?: string } | null>(null);
  const [showAddContent, setShowAddContent] = useState<{ moduleId: string; type: 'video' | 'text' | 'button' | 'section' | 'product_ad'; sectionId?: string } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(true);
  const [draggingContent, setDraggingContent] = useState<{ moduleId: string; contentId: string } | null>(null);

  const handleReorderContent = (moduleId: string, fromId: string, toId: string) => {
    if (fromId === toId) return;
    const data = getLocalData();
    const module = (data.modules || []).find(m => m.id === moduleId);
    if (!module) return;
    const sorted = [...module.contents].sort((a, b) => a.order - b.order);
    const fromIdx = sorted.findIndex(c => c.id === fromId);
    const toIdx = sorted.findIndex(c => c.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, moved);
    sorted.forEach((c, i) => { c.order = i + 1; });
    module.contents = sorted;
    saveLocalData(data);
    refreshData();
    toast({ title: "Ordem atualizada!" });
  };

  // New section content forms
  const [newSectionVideo, setNewSectionVideo] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    videoFileUrl: '',
    isFileVideo: false,
    thumbnailUrl: '',
    showNumber: true,
    showTitle: true
  });
  const [isUploadingSectionVideo, setIsUploadingSectionVideo] = useState(false);
  const [sectionVideoUploadProgress, setSectionVideoUploadProgress] = useState(0);

  const [newSectionButton, setNewSectionButton] = useState({
    title: '',
    url: '',
    description: '',
    coverUrl: '',
    showTitle: true
  });
  
  // Load modules from cloud on mount
  useEffect(() => {
    const loadFromCloud = async () => {
      // Sempre mostra imediatamente o que existe no navegador (evita “sumir”)
      const local = getLocalData();
      setAdminData(local);
      setWelcomeVideo(
        local.settings?.welcomeVideo || {
          enabled: false,
          title: '',
          showTitle: true,
          youtubeUrl: '',
          coverUrl: '',
        }
      );
      if (local.settings?.downloadLink) {
        onDownloadLinkChange(local.settings.downloadLink);
      }

      try {
        console.log(`[ModuleManager] Loading ${platform} modules from cloud...`);
        const cloudData = await loadModulesFromCloud(platform);

        // Se a nuvem tiver módulos, ela manda
        if (cloudData && (cloudData.modules?.length || 0) > 0) {
          console.log(`[ModuleManager] Loaded ${cloudData.modules.length} ${platform} modules from cloud`);

          const currentData = getLocalData();
          currentData.modules = cloudData.modules;
          if (cloudData.settings && currentData.settings) {
            currentData.settings.downloadLink = cloudData.settings.downloadLink || currentData.settings.downloadLink;
            currentData.settings.welcomeVideo = cloudData.settings.welcomeVideo || currentData.settings.welcomeVideo;

            if (cloudData.settings.downloadLink) {
              onDownloadLinkChange(cloudData.settings.downloadLink);
            }
          }

          saveLocalData(currentData);
          setAdminData(currentData);
          setWelcomeVideo(
            currentData.settings?.welcomeVideo || {
              enabled: false,
              title: '',
              showTitle: true,
              youtubeUrl: '',
              coverUrl: '',
            }
          );

          toast({
            title: 'Módulos carregados',
            description: `${cloudData.modules.length} módulos carregados da nuvem`,
          });
          return;
        }

        // Nuvem sem módulos: mantém módulos locais, mas puxa settings se existirem
        if (cloudData?.settings) {
          const currentData = getLocalData();
          if (currentData.settings) {
            currentData.settings.downloadLink = cloudData.settings.downloadLink || currentData.settings.downloadLink;
            currentData.settings.welcomeVideo = cloudData.settings.welcomeVideo || currentData.settings.welcomeVideo;
          }
          saveLocalData(currentData);
          setAdminData(currentData);
          setWelcomeVideo(
            currentData.settings?.welcomeVideo || {
              enabled: false,
              title: '',
              showTitle: true,
              youtubeUrl: '',
              coverUrl: '',
            }
          );
          if (cloudData.settings.downloadLink) {
            onDownloadLinkChange(cloudData.settings.downloadLink);
          }
        }

        console.log(`[ModuleManager] No ${platform} cloud modules, keeping local`);
      } catch (error) {
        console.error(`[ModuleManager] Error loading ${platform} from cloud:`, error);
      } finally {
        setIsLoadingCloud(false);
      }
    };

    loadFromCloud();
  }, [platform]);
  
  // Welcome video state
  const [welcomeVideo, setWelcomeVideo] = useState(adminData.settings.welcomeVideo || {
    enabled: false,
    title: '',
    showTitle: true,
    youtubeUrl: '',
    coverUrl: ''
  });

  // New module form
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    coverUrl: '',
    showNumber: true,
    color: 'default' as ModuleColor,
    isBonus: false,
    collapsedByDefault: false
  });

  // Edit module form
  const [editModuleData, setEditModuleData] = useState<Partial<TutorialModule>>({});

  // New content forms
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    videoFileUrl: '',
    isFileVideo: false,
    thumbnailUrl: '',
    showNumber: true,
    showTitle: true
  });
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  const [newText, setNewText] = useState({
    title: '',
    content: '',
    showTitle: true
  });

  const [newButton, setNewButton] = useState({
    title: '',
    url: '',
    description: '',
    coverUrl: '',
    showTitle: true
  });
  
  const [newProductAd, setNewProductAd] = useState({
    title: '',
    productId: '',
    showTitle: true
  });
  
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase.functions.invoke("hub-api", { body: { action: "admin_list_products" } });
      if (data?.success) {
        setAvailableProducts(data.products || []);
      }
    };
    fetchProducts();
  }, []);

  const [newSection, setNewSection] = useState({
    title: '',
    description: '',
    showTitle: true,
    isBonus: false
  });

  const refreshData = () => {
    const data = getLocalData();
    setAdminData(data);
    setWelcomeVideo(data.settings?.welcomeVideo || {
      enabled: false,
      title: '',
      showTitle: true,
      youtubeUrl: '',
      coverUrl: ''
    });
  };

  const handleSaveWelcomeVideo = () => {
    const data = getLocalData();
    if (data.settings) {
      data.settings.welcomeVideo = welcomeVideo;
    }
    saveLocalData(data);
    toast({ title: "Salvo!", description: "Vídeo de boas-vindas atualizado" });
    refreshData();
  };

  // Publish modules to cloud for all users
  const handlePublishToCloud = async () => {
    setIsPublishing(true);
    try {
      // Evita sobrescrever com vazio: se a tela estiver vazia, mantém o que já existe no navegador
      const localBefore = getLocalData();
      const modulesToPublish =
        (adminData.modules && adminData.modules.length > 0)
          ? adminData.modules
          : (localBefore.modules || []);

      const current = { ...localBefore, modules: modulesToPublish };
      if (current.settings) {
        current.settings.downloadLink = downloadLink;
        current.settings.welcomeVideo = welcomeVideo;
      }
      saveLocalData(current);

      const success = await saveModulesToCloud(platform, {
        modules: modulesToPublish,
        settings: {
          downloadLink,
          welcomeVideo,
        },
      });

      if (success) {
        toast({
          title: "Publicado!",
          description: `Módulos ${platform.toUpperCase()} publicados para todos os usuários`,
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível publicar os módulos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error publishing modules:', error);
      toast({
        title: "Erro",
        description: "Erro ao publicar módulos",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Backup modules to cloud (saves to both main and backup files)
  const handleBackupToCloud = async () => {
    setIsBackingUp(true);
    try {
      const localBefore = getLocalData();
      const modulesToBackup =
        (adminData.modules && adminData.modules.length > 0)
          ? adminData.modules
          : (localBefore.modules || []);

      if (modulesToBackup.length === 0) {
        toast({
          title: "Erro",
          description: "Não há módulos para fazer backup",
          variant: "destructive",
        });
        return;
      }

      const backupData = {
        modules: modulesToBackup,
        settings: {
          downloadLink,
          welcomeVideo,
        },
      };

      // Save to main file
      const mainResponse = await supabase.functions.invoke('modules-storage', {
        body: { action: 'save', data: backupData, platform, isBackup: false },
      });

      // Save to backup file
      const backupResponse = await supabase.functions.invoke('modules-storage', {
        body: { action: 'save', data: backupData, platform, isBackup: true },
      });

      if (mainResponse.data?.success && backupResponse.data?.success) {
        toast({
          title: "Backup Completo! ✅",
          description: `${modulesToBackup.length} módulos salvos na nuvem principal E no backup`,
        });
      } else {
        toast({
          title: "Backup Parcial",
          description: "Houve um problema com um dos salvamentos. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error backing up modules:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer backup dos módulos",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore from backup
  const handleRestoreFromBackup = async () => {
    if (!confirm('Tem certeza que deseja restaurar do backup? Isso substituirá os dados atuais.')) {
      return;
    }

    setIsRestoringBackup(true);
    try {
      const response = await supabase.functions.invoke('modules-storage', {
        body: { action: 'load', platform, isBackup: true },
      });

      if (response.data?.success && response.data?.data?.modules?.length > 0) {
        const backupData = response.data.data;
        
        // Save to local storage
        const current = getLocalData();
        current.modules = backupData.modules;
        if (current.settings && backupData.settings) {
          current.settings.downloadLink = backupData.settings.downloadLink || current.settings.downloadLink;
          current.settings.welcomeVideo = backupData.settings.welcomeVideo || current.settings.welcomeVideo;
        }
        saveLocalData(current);
        setAdminData(current);
        
        if (backupData.settings?.welcomeVideo) {
          setWelcomeVideo(backupData.settings.welcomeVideo);
        }
        if (backupData.settings?.downloadLink) {
          onDownloadLinkChange(backupData.settings.downloadLink);
        }

        toast({
          title: "Restaurado! ✅",
          description: `${backupData.modules.length} módulos restaurados do backup`,
        });
      } else {
        toast({
          title: "Backup Vazio",
          description: "Não há dados no backup para restaurar",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error restoring from backup:', error);
      toast({
        title: "Erro",
        description: "Erro ao restaurar do backup",
        variant: "destructive",
      });
    } finally {
      setIsRestoringBackup(false);
    }
  };

  // Module handlers - use local storage with correct key
  const handleAddModule = () => {
    if (!newModule.title.trim()) {
      toast({ title: "Erro", description: "Preencha o título do módulo", variant: "destructive" });
      return;
    }
    const data = getLocalData();
    const newMod: TutorialModule = {
      id: `module_${Date.now()}`,
      title: newModule.title,
      description: newModule.description,
      coverUrl: newModule.coverUrl,
      showNumber: newModule.showNumber,
      order: (data.modules?.length || 0) + 1,
      contents: [],
      createdAt: new Date().toISOString(),
      color: newModule.color,
      isBonus: newModule.isBonus,
      collapsedByDefault: newModule.collapsedByDefault
    };
    data.modules = [...(data.modules || []), newMod];
    saveLocalData(data);
    setNewModule({ title: '', description: '', coverUrl: '', showNumber: true, color: 'default', isBonus: false, collapsedByDefault: false });
    refreshData();
    toast({ title: "Módulo criado!" });
  };

  const handleUpdateModule = (moduleId: string) => {
    const data = getLocalData();
    const module = data.modules?.find(m => m.id === moduleId);
    if (module) {
      Object.assign(module, editModuleData);
      saveLocalData(data);
    }
    setEditingModule(null);
    setEditModuleData({});
    refreshData();
    toast({ title: "Módulo atualizado!" });
  };

  const handleMoveModule = (moduleId: string, direction: 'up' | 'down') => {
    const data = getLocalData();
    const modules = data.modules || [];
    const index = modules.findIndex(m => m.id === moduleId);
    if (index < 0) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === modules.length - 1) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [modules[index], modules[swapIndex]] = [modules[swapIndex], modules[index]];
    modules.forEach((m, i) => m.order = i + 1);
    data.modules = modules;
    saveLocalData(data);
    refreshData();
    toast({ title: "Ordem atualizada!" });
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (confirm('Tem certeza que deseja excluir este módulo e todo seu conteúdo?')) {
      const module = adminData.modules?.find(m => m.id === moduleId);
      if (module) {
        // Delete module cover from storage
        await deleteStorageFile(module.coverUrl);
        // Delete all content covers from storage
        for (const content of module.contents) {
          if (content.type === 'video') {
            await deleteStorageFile((content as ModuleVideo).thumbnailUrl);
          }
        }
      }
      const data = getLocalData();
      data.modules = (data.modules || []).filter(m => m.id !== moduleId);
      data.modules.forEach((m, i) => m.order = i + 1);
      saveLocalData(data);
      refreshData();
      toast({ title: "Módulo excluído!" });
    }
  };

  // Content handlers - use local storage with correct key
  const handleAddVideo = (moduleId: string) => {
    const hasYoutube = newVideo.youtubeUrl.trim();
    const hasFile = newVideo.videoFileUrl.trim();
    
    if (!newVideo.title || (!hasYoutube && !hasFile)) {
      toast({ title: "Erro", description: "Preencha título e URL do YouTube OU envie um arquivo MP4", variant: "destructive" });
      return;
    }
    const data = getLocalData();
    const module = data.modules?.find(m => m.id === moduleId);
    if (module) {
      const newVid: ModuleVideo = {
        id: `video_${Date.now()}`,
        type: 'video',
        title: newVideo.title,
        description: newVideo.description,
        youtubeUrl: hasFile ? '' : newVideo.youtubeUrl,
        videoFileUrl: hasFile ? newVideo.videoFileUrl : undefined,
        isFileVideo: hasFile ? true : false,
        thumbnailUrl: newVideo.thumbnailUrl || (hasFile ? '' : getYoutubeThumbnail(newVideo.youtubeUrl)),
        showNumber: newVideo.showNumber,
        showTitle: newVideo.showTitle,
        order: module.contents.length + 1,
        createdAt: new Date().toISOString()
      };
      module.contents.push(newVid);
      saveLocalData(data);
    }
    setNewVideo({ title: '', description: '', youtubeUrl: '', videoFileUrl: '', isFileVideo: false, thumbnailUrl: '', showNumber: true, showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Vídeo adicionado!" });
  };

  // Handle video file upload - Direct upload to Supabase Storage
  const handleVideoFileUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file size (100MB max)
    const maxSize = 300 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "Erro", description: "Arquivo muito grande. Máximo 300MB.", variant: "destructive" });
      return;
    }
    
    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'application/octet-stream'];
    const allowedExts = ['mp4', 'webm', 'mov', 'avi'];
    const fileExt = file.name.toLowerCase().split('.').pop() || '';
    
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) {
      toast({ title: "Erro", description: "Tipo de arquivo inválido. Use MP4, WebM, MOV ou AVI.", variant: "destructive" });
      return;
    }
    
    setIsUploadingVideo(true);
    setVideoUploadProgress(10);
    
    try {
      // Generate unique filename
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `module-videos/${filename}`;
      
      console.log(`[Upload] Starting direct upload: ${filePath}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      setVideoUploadProgress(20);
      
      // Direct upload to Supabase Storage from frontend
      const { data, error } = await supabase.storage
        .from('assets')
        .upload(filePath, file, {
          contentType: file.type || 'video/mp4',
          upsert: true,
          duplex: 'half', // Required for streaming uploads
        });
      
      setVideoUploadProgress(80);
      
      if (error) {
        console.error('[Upload] Storage error:', error);
        throw new Error(error.message);
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);
      
      console.log(`[Upload] Success: ${publicUrl}`);
      setVideoUploadProgress(100);
      
      setNewVideo(prev => ({ 
        ...prev, 
        videoFileUrl: publicUrl,
        isFileVideo: true,
        youtubeUrl: '' // Clear YouTube URL when uploading file
      }));
      toast({ title: "Upload concluído!", description: `Vídeo enviado (${(file.size / 1024 / 1024).toFixed(1)}MB)` });
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Video upload error:', error);
      toast({ title: "Erro no upload", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploadingVideo(false);
      setVideoUploadProgress(0);
    }
  };

  const handleAddText = (moduleId: string) => {
    if (!newText.title || !newText.content) {
      toast({ title: "Erro", description: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }
    const data = getLocalData();
    const module = data.modules?.find(m => m.id === moduleId);
    if (module) {
      const newTxt: ModuleText = {
        id: `text_${Date.now()}`,
        type: 'text',
        title: newText.title,
        content: newText.content,
        showTitle: newText.showTitle,
        order: module.contents.length + 1,
        createdAt: new Date().toISOString()
      };
      module.contents.push(newTxt);
      saveLocalData(data);
    }
    setNewText({ title: '', content: '', showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Texto adicionado!" });
  };

  const handleAddButton = (moduleId: string) => {
    if (!newButton.title || !newButton.url) {
      toast({ title: "Erro", description: "Preencha título e URL do link", variant: "destructive" });
      return;
    }
    const data = getLocalData();
    const module = data.modules?.find(m => m.id === moduleId);
    if (module) {
      const newBtn: ModuleButton = {
        id: `button_${Date.now()}`,
        type: 'button',
        title: newButton.title,
        url: newButton.url,
        description: newButton.description,
        coverUrl: newButton.coverUrl,
        showTitle: newButton.showTitle,
        order: module.contents.length + 1,
        createdAt: new Date().toISOString()
      };
      module.contents.push(newBtn);
      saveLocalData(data);
    }
    setNewButton({ title: '', url: '', description: '', coverUrl: '', showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Botão adicionado!" });
  };

  const handleAddProductAd = (moduleId: string) => {
    if (!newProductAd.productId) {
      toast({ title: "Erro", description: "Selecione um produto", variant: "destructive" });
      return;
    }
    const data = getLocalData();
    const module = data.modules?.find(m => m.id === moduleId);
    const prod = availableProducts.find(p => p.id === newProductAd.productId);
    
    if (module && prod) {
      const newAd: ModuleProductAd = {
        id: `ad_${Date.now()}`,
        type: 'product_ad',
        title: newProductAd.title,
        productId: prod.id,
        productSlug: prod.slug,
        productTitle: prod.title,
        productDescription: prod.description,
        productThumb: prod.thumb_url,
        productSalesUrl: prod.sales_page_url,
        showTitle: newProductAd.showTitle,
        order: module.contents.length + 1,
        createdAt: new Date().toISOString()
      };
      module.contents.push(newAd);
      saveLocalData(data);
    }
    setNewProductAd({ title: '', productId: '', showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Propaganda de produto adicionada!" });
  };

  const handleAddSection = (moduleId: string) => {
    if (!newSection.title) {
      toast({ title: "Erro", description: "Preencha o título da seção", variant: "destructive" });
      return;
    }
    const data = getLocalData();
    const module = data.modules?.find(m => m.id === moduleId);
    if (module) {
      const newSec: ModuleSection = {
        id: `section_${Date.now()}`,
        type: 'section',
        title: newSection.title,
        description: newSection.description,
        showTitle: newSection.showTitle,
        isBonus: newSection.isBonus,
        contents: [],
        order: module.contents.length + 1,
        createdAt: new Date().toISOString()
      };
      module.contents.push(newSec);
      saveLocalData(data);
    }
    setNewSection({ title: '', description: '', showTitle: true, isBonus: false });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Seção adicionada!" });
  };

  // Section content handlers
  const handleAddVideoToSection = (moduleId: string, sectionId: string) => {
    const hasYoutube = newSectionVideo.youtubeUrl.trim();
    const hasFile = newSectionVideo.videoFileUrl.trim();
    
    if (!newSectionVideo.title || (!hasYoutube && !hasFile)) {
      toast({ title: "Erro", description: "Preencha título e URL do YouTube OU envie um arquivo MP4", variant: "destructive" });
      return;
    }
    const data = getLocalData();
    const module = data.modules?.find(m => m.id === moduleId);
    const section = module?.contents.find(c => c.id === sectionId && c.type === 'section') as ModuleSection | undefined;
    if (section) {
      const newVid: ModuleVideo = {
        id: `video_${Date.now()}`,
        type: 'video',
        title: newSectionVideo.title,
        description: newSectionVideo.description,
        youtubeUrl: hasFile ? '' : newSectionVideo.youtubeUrl,
        videoFileUrl: hasFile ? newSectionVideo.videoFileUrl : undefined,
        isFileVideo: hasFile ? true : false,
        thumbnailUrl: newSectionVideo.thumbnailUrl || (hasFile ? '' : getYoutubeThumbnail(newSectionVideo.youtubeUrl)),
        showNumber: newSectionVideo.showNumber,
        showTitle: newSectionVideo.showTitle,
        order: section.contents.length + 1,
        createdAt: new Date().toISOString()
      };
      section.contents.push(newVid);
      saveLocalData(data);
    }
    setNewSectionVideo({ title: '', description: '', youtubeUrl: '', videoFileUrl: '', isFileVideo: false, thumbnailUrl: '', showNumber: true, showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Vídeo adicionado à seção!" });
  };

  // Handle section video file upload - Direct upload to Supabase Storage
  const handleSectionVideoFileUpload = async (file: File) => {
    if (!file) return;
    
    const maxSize = 300 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "Erro", description: "Arquivo muito grande. Máximo 300MB.", variant: "destructive" });
      return;
    }
    
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'application/octet-stream'];
    const allowedExts = ['mp4', 'webm', 'mov', 'avi'];
    const fileExt = file.name.toLowerCase().split('.').pop() || '';
    
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) {
      toast({ title: "Erro", description: "Tipo de arquivo inválido. Use MP4, WebM, MOV ou AVI.", variant: "destructive" });
      return;
    }
    
    setIsUploadingSectionVideo(true);
    setSectionVideoUploadProgress(10);
    
    try {
      // Generate unique filename
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `module-videos/${filename}`;
      
      console.log(`[Upload Section] Starting direct upload: ${filePath}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      setSectionVideoUploadProgress(20);
      
      // Direct upload to Supabase Storage from frontend
      const { data, error } = await supabase.storage
        .from('assets')
        .upload(filePath, file, {
          contentType: file.type || 'video/mp4',
          upsert: true,
          duplex: 'half', // Required for streaming uploads
        });
      
      setSectionVideoUploadProgress(80);
      
      if (error) {
        console.error('[Upload Section] Storage error:', error);
        throw new Error(error.message);
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);
      
      console.log(`[Upload Section] Success: ${publicUrl}`);
      setSectionVideoUploadProgress(100);
      
      setNewSectionVideo(prev => ({ 
        ...prev, 
        videoFileUrl: publicUrl,
        isFileVideo: true,
        youtubeUrl: ''
      }));
      toast({ title: "Upload concluído!", description: `Vídeo enviado (${(file.size / 1024 / 1024).toFixed(1)}MB)` });
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Section video upload error:', error);
      toast({ title: "Erro no upload", description: errorMessage, variant: "destructive" });
    } finally {
      setIsUploadingSectionVideo(false);
      setSectionVideoUploadProgress(0);
    }
  };

  const handleAddButtonToSection = (moduleId: string, sectionId: string) => {
    if (!newSectionButton.title || !newSectionButton.url) {
      toast({ title: "Erro", description: "Preencha título e URL", variant: "destructive" });
      return;
    }
    const data = getLocalData();
    const module = data.modules?.find(m => m.id === moduleId);
    const section = module?.contents.find(c => c.id === sectionId && c.type === 'section') as ModuleSection | undefined;
    if (section) {
      const newBtn: ModuleButton = {
        id: `button_${Date.now()}`,
        type: 'button',
        title: newSectionButton.title,
        url: newSectionButton.url,
        description: newSectionButton.description,
        coverUrl: newSectionButton.coverUrl,
        showTitle: newSectionButton.showTitle,
        order: section.contents.length + 1,
        createdAt: new Date().toISOString()
      };
      section.contents.push(newBtn);
      saveLocalData(data);
    }
    setNewSectionButton({ title: '', url: '', description: '', coverUrl: '', showTitle: true });
    setShowAddContent(null);
    refreshData();
    toast({ title: "Botão adicionado à seção!" });
  };

  const handleDeleteSectionContent = async (moduleId: string, sectionId: string, contentId: string) => {
    if (confirm('Excluir este conteúdo da seção?')) {
      const data = getLocalData();
      const module = data.modules?.find(m => m.id === moduleId);
      const section = module?.contents.find(c => c.id === sectionId && c.type === 'section') as ModuleSection | undefined;
      if (section) {
        section.contents = section.contents.filter(c => c.id !== contentId);
        saveLocalData(data);
      }
      refreshData();
      toast({ title: "Conteúdo excluído!" });
    }
  };

  const handleUpdateContent = (moduleId: string, contentId: string, updates: Partial<ModuleContent>) => {
    const data = getLocalData();
    const module = data.modules?.find(m => m.id === moduleId);
    if (module) {
      const content = module.contents.find(c => c.id === contentId);
      if (content) {
        Object.assign(content, updates);
        saveLocalData(data);
      }
    }
    setEditingContent(null);
    refreshData();
    toast({ title: "Conteúdo atualizado!" });
  };

  const handleToggleContentTitle = (moduleId: string, content: ModuleContent) => {
    const showTitle = (content as any).showTitle ?? true;
    handleUpdateContent(moduleId, content.id, { showTitle: !showTitle } as any);
  };

  const handleDeleteContent = async (moduleId: string, contentId: string) => {
    if (confirm('Excluir este conteúdo?')) {
      const module = adminData.modules?.find(m => m.id === moduleId);
      const content = module?.contents.find(c => c.id === contentId);
      if (content && content.type === 'video') {
        await deleteStorageFile((content as ModuleVideo).thumbnailUrl);
      }
      const data = getLocalData();
      const mod = data.modules?.find(m => m.id === moduleId);
      if (mod) {
        mod.contents = mod.contents.filter(c => c.id !== contentId);
        saveLocalData(data);
      }
      refreshData();
      toast({ title: "Conteúdo excluído!" });
    }
  };

  const handleToggleContentNumber = (moduleId: string, content: ModuleContent) => {
    if (content.type === 'video') {
      handleUpdateContent(moduleId, content.id, { showNumber: !(content as ModuleVideo).showNumber });
    }
  };

  const startEditModule = (module: TutorialModule) => {
    setEditingModule(module.id);
    setEditModuleData({
      title: module.title,
      description: module.description,
      coverUrl: module.coverUrl,
      showNumber: module.showNumber,
      color: module.color || 'default',
      isBonus: module.isBonus || false,
      collapsedByDefault: module.collapsedByDefault || false
    });
  };

  const getVideoCount = (module: TutorialModule) => {
    return module.contents.filter(c => c.type === 'video').length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-display font-bold">MRO Ferramenta - Módulos</h2>
          {isLoadingCloud && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando da nuvem...
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Restore from Backup */}
          <Button 
            onClick={handleRestoreFromBackup}
            disabled={isRestoringBackup}
            variant="outline"
            className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
          >
            {isRestoringBackup ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Restaurando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Restaurar Backup
              </>
            )}
          </Button>

          {/* Backup Button */}
          <Button 
            onClick={handleBackupToCloud}
            disabled={isBackingUp || adminData.modules.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isBackingUp ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando Backup...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Backup
              </>
            )}
          </Button>

          {/* Publish Button */}
          <Button 
            onClick={handlePublishToCloud}
            disabled={isPublishing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Publicar para Usuários
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Download Link */}
      <div className="glass-card p-4">
        <Label className="mb-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Link de Download (Área de Membros)
        </Label>
        <div className="flex gap-3">
          <Input
            placeholder="https://..."
            value={downloadLink}
            onChange={(e) => onDownloadLinkChange(e.target.value)}
            className="bg-secondary/50"
          />
          <Button type="button" onClick={() => {
            // Save download link to local storage for this platform
            const data = getLocalData();
            if (data.settings) {
              data.settings.downloadLink = downloadLink;
            }
            saveLocalData(data);
            onSaveSettings();
            toast({ title: "Salvo!", description: `Link de download ${platform.toUpperCase()} salvo.` });
          }} className="cursor-pointer">
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Welcome Video */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-red-500" />
          Vídeo de Boas-Vindas
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={welcomeVideo.enabled}
                onCheckedChange={(checked) => setWelcomeVideo(prev => ({ ...prev, enabled: checked }))}
              />
              <Label>Ativar vídeo de boas-vindas</Label>
            </div>
            
            {welcomeVideo.enabled && (
              <>
                <div>
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Bem-vindo ao MRO!"
                    value={welcomeVideo.title}
                    onChange={(e) => setWelcomeVideo(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-secondary/50 mt-1"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <Switch
                    checked={welcomeVideo.showTitle}
                    onCheckedChange={(checked) => setWelcomeVideo(prev => ({ ...prev, showTitle: checked }))}
                  />
                  <Label>Exibir título</Label>
                </div>
                
                <div>
                  <Label>URL do YouTube *</Label>
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={welcomeVideo.youtubeUrl}
                    onChange={(e) => setWelcomeVideo(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    className="bg-secondary/50 mt-1"
                  />
                </div>
              </>
            )}
          </div>
          
          {welcomeVideo.enabled && (
            <div>
              <Label className="mb-2 block">Capa do Vídeo (opcional)</Label>
              <CoverUploader
                currentUrl={welcomeVideo.coverUrl}
                onUpload={(url) => setWelcomeVideo(prev => ({ ...prev, coverUrl: url }))}
                onRemove={() => setWelcomeVideo(prev => ({ ...prev, coverUrl: '' }))}
                folder="welcome-video"
                id="welcome_video"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Se não definir uma capa, usaremos a thumbnail do YouTube
              </p>
            </div>
          )}
        </div>
        
        <Button 
          type="button" 
          onClick={handleSaveWelcomeVideo} 
          className="mt-4 cursor-pointer"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>

      {/* Add New Module */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          Novo Módulo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <Label>Título do Módulo *</Label>
              <Input
                placeholder="Ex: Módulo 1 - Introdução"
                value={newModule.title}
                onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                className="bg-secondary/50 mt-1"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição do módulo..."
                value={newModule.description}
                onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                className="bg-secondary/50 mt-1"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={newModule.showNumber}
                onCheckedChange={(checked) => setNewModule(prev => ({ ...prev, showNumber: checked }))}
              />
              <Label>Exibir número do módulo</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={newModule.isBonus}
                onCheckedChange={(checked) => setNewModule(prev => ({ ...prev, isBonus: checked }))}
              />
              <Label>🎁 Tag Bônus</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={newModule.collapsedByDefault}
                onCheckedChange={(checked) => setNewModule(prev => ({ ...prev, collapsedByDefault: checked }))}
              />
              <Label>📦 Colapsado (só mostra capa/nome)</Label>
            </div>
            <div>
              <Label>Cor do Módulo</Label>
              <select
                value={newModule.color}
                onChange={(e) => setNewModule(prev => ({ ...prev, color: e.target.value as ModuleColor }))}
                className="w-full mt-1 bg-secondary/50 border border-border rounded-md p-2 text-sm"
              >
                <option value="default">Padrão (Cinza)</option>
                <option value="green">Verde</option>
                <option value="blue">Azul</option>
                <option value="purple">Roxo</option>
                <option value="orange">Laranja</option>
                <option value="pink">Rosa</option>
                <option value="red">Vermelho</option>
                <option value="cyan">Ciano</option>
              </select>
            </div>
          </div>
          <div>
            <CoverUploader
              currentUrl={newModule.coverUrl}
              onUpload={(url) => setNewModule(prev => ({ ...prev, coverUrl: url }))}
              onRemove={() => setNewModule(prev => ({ ...prev, coverUrl: '' }))}
              folder="module-covers"
              id={`new_${Date.now()}`}
            />
          </div>
        </div>
        <Button 
          type="button" 
          onClick={handleAddModule} 
          disabled={!newModule.title.trim()} 
          className="mt-4 cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Módulo
        </Button>
      </div>

      {/* Module List */}
      <div className="space-y-4">
        {adminData.modules.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum módulo criado ainda</p>
          </div>
        ) : (
          adminData.modules.map((module) => (
            <div key={module.id} className="glass-card overflow-hidden">
              {/* Module Header */}
              <div 
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
              >
                {/* Cover/Number - Aspect ratio 1080x1350 = 4:5 */}
                <div className="relative w-16 aspect-[4/5] rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                  {module.coverUrl ? (
                    <img 
                      src={storageAssetUrl(module.coverUrl)} 
                      alt={module.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-mro-cyan/20">
                      {module.showNumber && (
                        <span className="text-xl font-bold text-primary">{module.order}</span>
                      )}
                    </div>
                  )}
                  {module.coverUrl && module.showNumber && (
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {module.order}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg">{module.title}</h3>
                  {module.description && (
                    <p className="text-sm text-muted-foreground truncate">{module.description}</p>
                  )}
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{getVideoCount(module)} vídeos</span>
                    <span>{module.contents.filter(c => c.type === 'text').length} textos</span>
                    <span>{module.contents.filter(c => c.type === 'product_ad').length} propagandas</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleMoveModule(module.id, 'up')}
                    className="cursor-pointer"
                    disabled={adminData.modules.indexOf(module) === 0}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleMoveModule(module.id, 'down')}
                    className="cursor-pointer"
                    disabled={adminData.modules.indexOf(module) === adminData.modules.length - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => startEditModule(module)}
                    className="cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteModule(module.id)}
                    className="cursor-pointer text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {expandedModule === module.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Edit Module Form */}
              {editingModule === module.id && (
                <div className="p-4 border-t border-border bg-secondary/20">
                  <h4 className="font-medium mb-3">Editar Módulo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <Label>Título</Label>
                        <Input
                          value={editModuleData.title || ''}
                          onChange={(e) => setEditModuleData(prev => ({ ...prev, title: e.target.value }))}
                          className="bg-secondary/50 mt-1"
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={editModuleData.description || ''}
                          onChange={(e) => setEditModuleData(prev => ({ ...prev, description: e.target.value }))}
                          className="bg-secondary/50 mt-1"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={editModuleData.showNumber ?? true}
                          onCheckedChange={(checked) => setEditModuleData(prev => ({ ...prev, showNumber: checked }))}
                        />
                        <Label>Exibir número</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={editModuleData.isBonus ?? false}
                          onCheckedChange={(checked) => setEditModuleData(prev => ({ ...prev, isBonus: checked }))}
                        />
                        <Label>🎁 Tag Bônus</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={editModuleData.collapsedByDefault ?? false}
                          onCheckedChange={(checked) => setEditModuleData(prev => ({ ...prev, collapsedByDefault: checked }))}
                        />
                        <Label>📦 Colapsado (só mostra capa/nome)</Label>
                      </div>
                      <div>
                        <Label>Cor do Módulo</Label>
                        <select
                          value={editModuleData.color || 'default'}
                          onChange={(e) => setEditModuleData(prev => ({ ...prev, color: e.target.value as ModuleColor }))}
                          className="w-full mt-1 bg-secondary/50 border border-border rounded-md p-2 text-sm"
                        >
                          <option value="default">Padrão (Cinza)</option>
                          <option value="green">Verde</option>
                          <option value="blue">Azul</option>
                          <option value="purple">Roxo</option>
                          <option value="orange">Laranja</option>
                          <option value="pink">Rosa</option>
                          <option value="red">Vermelho</option>
                          <option value="cyan">Ciano</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <CoverUploader
                        currentUrl={editModuleData.coverUrl || ''}
                        onUpload={(url) => setEditModuleData(prev => ({ ...prev, coverUrl: url }))}
                        onRemove={() => setEditModuleData(prev => ({ ...prev, coverUrl: '' }))}
                        folder="module-covers"
                        id={module.id}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button type="button" onClick={() => handleUpdateModule(module.id)} className="cursor-pointer">
                      <Check className="w-4 h-4 mr-1" />
                      Salvar
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingModule(null)} className="cursor-pointer">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Expanded Content */}
              {expandedModule === module.id && (
                <div className="p-4 border-t border-border">
                  {/* Add Content Buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddContent({ moduleId: module.id, type: 'video' })}
                      className="cursor-pointer"
                    >
                      <Video className="w-4 h-4 mr-1" />
                      Adicionar Vídeo
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddContent({ moduleId: module.id, type: 'text' })}
                      className="cursor-pointer"
                    >
                      <Type className="w-4 h-4 mr-1" />
                      Adicionar Texto
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddContent({ moduleId: module.id, type: 'button' })}
                      className="cursor-pointer"
                    >
                      <Link2 className="w-4 h-4 mr-1" />
                      Adicionar Botão/Link
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddContent({ moduleId: module.id, type: 'section' })}
                      className="cursor-pointer"
                    >
                      <LayoutList className="w-4 h-4 mr-1" />
                      Adicionar Seção
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddContent({ moduleId: module.id, type: 'product_ad' })}
                      className="cursor-pointer border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Adicionar Propaganda
                    </Button>
                  </div>

                  {/* Add Video Form */}
                  {showAddContent?.moduleId === module.id && showAddContent.type === 'video' && (
                    <div className="p-4 rounded-lg bg-secondary/30 mb-4">
                      <h4 className="font-medium mb-3">Novo Vídeo</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Input
                            placeholder="Título do vídeo"
                            value={newVideo.title}
                            onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                            className="bg-secondary/50"
                          />
                          
                          {/* Video Source Toggle */}
                          <div className="flex gap-2 mb-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={!newVideo.isFileVideo ? 'default' : 'outline'}
                              onClick={() => setNewVideo(prev => ({ ...prev, isFileVideo: false, videoFileUrl: '' }))}
                              className="cursor-pointer"
                            >
                              <Link2 className="w-4 h-4 mr-1" />
                              Link YouTube
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={newVideo.isFileVideo ? 'default' : 'outline'}
                              onClick={() => setNewVideo(prev => ({ ...prev, isFileVideo: true, youtubeUrl: '' }))}
                              className="cursor-pointer"
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              Arquivo MP4
                            </Button>
                          </div>
                          
                          {/* YouTube URL Input */}
                          {!newVideo.isFileVideo && (
                            <Input
                              placeholder="URL do YouTube"
                              value={newVideo.youtubeUrl}
                              onChange={(e) => setNewVideo(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                              className="bg-secondary/50"
                            />
                          )}
                          
                          {/* File Upload */}
                          {newVideo.isFileVideo && (
                            <div className="space-y-2">
                              {newVideo.videoFileUrl ? (
                                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                  <Check className="w-5 h-5 text-green-500" />
                                  <span className="text-sm text-green-400 flex-1 truncate">Vídeo enviado com sucesso!</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setNewVideo(prev => ({ ...prev, videoFileUrl: '' }))}
                                    className="cursor-pointer text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted rounded-lg cursor-pointer hover:bg-secondary/20 transition-colors">
                                    {isUploadingVideo ? (
                                      <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        <span className="text-sm text-muted-foreground">Enviando... {videoUploadProgress}%</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-1">
                                        <Upload className="w-6 h-6 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Clique para enviar MP4</span>
                                        <span className="text-xs text-muted-foreground">Máximo 300MB</span>
                                      </div>
                                    )}
                                    <input
                                      type="file"
                                      accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                                      className="hidden"
                                      disabled={isUploadingVideo}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleVideoFileUpload(file);
                                      }}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <Textarea
                            placeholder="Descrição (opcional)"
                            value={newVideo.description}
                            onChange={(e) => setNewVideo(prev => ({ ...prev, description: e.target.value }))}
                            className="bg-secondary/50"
                            rows={2}
                          />
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={newVideo.showNumber}
                              onCheckedChange={(checked) => setNewVideo(prev => ({ ...prev, showNumber: checked }))}
                            />
                            <Label className="text-sm">Exibir número na capa</Label>
                          </div>
                        </div>
                        <div>
                          <CoverUploader
                            currentUrl={newVideo.thumbnailUrl}
                            onUpload={(url) => setNewVideo(prev => ({ ...prev, thumbnailUrl: url }))}
                            onRemove={() => setNewVideo(prev => ({ ...prev, thumbnailUrl: '' }))}
                            folder="video-covers"
                            id={`video_new_${Date.now()}`}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            {newVideo.isFileVideo 
                              ? 'Capa obrigatória para vídeos MP4'
                              : 'Se não enviar capa, será usada a thumbnail do YouTube'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          type="button" 
                          onClick={() => handleAddVideo(module.id)} 
                          className="cursor-pointer"
                          disabled={isUploadingVideo}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add Text Form */}
                  {showAddContent?.moduleId === module.id && showAddContent.type === 'text' && (
                    <div className="p-4 rounded-lg bg-secondary/30 mb-4 space-y-3">
                      <h4 className="font-medium">Novo Texto</h4>
                      <Input
                        placeholder="Título do texto"
                        value={newText.title}
                        onChange={(e) => setNewText(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-secondary/50"
                      />
                      <Textarea
                        placeholder="Conteúdo do texto (suporta quebras de linha)"
                        value={newText.content}
                        onChange={(e) => setNewText(prev => ({ ...prev, content: e.target.value }))}
                        className="bg-secondary/50"
                        rows={5}
                      />
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => handleAddText(module.id)} className="cursor-pointer">
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add Button Form */}
                  {showAddContent?.moduleId === module.id && showAddContent.type === 'button' && (
                    <div className="p-4 rounded-lg bg-secondary/30 mb-4">
                      <h4 className="font-medium mb-3">Novo Botão/Link</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Input
                            placeholder="Título do botão"
                            value={newButton.title}
                            onChange={(e) => setNewButton(prev => ({ ...prev, title: e.target.value }))}
                            className="bg-secondary/50"
                          />
                          <Input
                            placeholder="URL do link (ex: https://drive.google.com/...)"
                            value={newButton.url}
                            onChange={(e) => setNewButton(prev => ({ ...prev, url: e.target.value }))}
                            className="bg-secondary/50"
                          />
                          <Textarea
                            placeholder="Descrição (opcional)"
                            value={newButton.description}
                            onChange={(e) => setNewButton(prev => ({ ...prev, description: e.target.value }))}
                            className="bg-secondary/50"
                            rows={2}
                          />
                        </div>
                        <div>
                          <CoverUploader
                            currentUrl={newButton.coverUrl}
                            onUpload={(url) => setNewButton(prev => ({ ...prev, coverUrl: url }))}
                            onRemove={() => setNewButton(prev => ({ ...prev, coverUrl: '' }))}
                            folder="button-covers"
                            id={`button_new_${Date.now()}`}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Capa opcional para o botão
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button type="button" onClick={() => handleAddButton(module.id)} className="cursor-pointer">
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add Section Form */}
                  {showAddContent?.moduleId === module.id && showAddContent.type === 'section' && (
                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4 space-y-3">
                      <h4 className="font-medium text-amber-400">Nova Seção (Sub-módulo)</h4>
                      <p className="text-sm text-muted-foreground">
                        Seções aparecem como um card/box abaixo dos botões, com título e conteúdo próprio
                      </p>
                      <Input
                        placeholder="Título da seção (ex: Preste serviço com a MRO)"
                        value={newSection.title}
                        onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-secondary/50"
                      />
                      <Textarea
                        placeholder="Descrição da seção (ex: Faturando mais de 5K com a MRO !)"
                        value={newSection.description}
                        onChange={(e) => setNewSection(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-secondary/50"
                        rows={2}
                      />
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={newSection.showTitle}
                            onCheckedChange={(checked) => setNewSection(prev => ({ ...prev, showTitle: checked }))}
                          />
                          <Label className="text-sm">Exibir título</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={newSection.isBonus}
                            onCheckedChange={(checked) => setNewSection(prev => ({ ...prev, isBonus: checked }))}
                          />
                          <Label className="text-sm">🎁 Tag Bônus</Label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => handleAddSection(module.id)} className="cursor-pointer">
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add Product Ad Form */}
                  {showAddContent?.moduleId === module.id && showAddContent.type === 'product_ad' && (
                    <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 mb-4 space-y-3">
                      <h4 className="font-medium text-indigo-400">Nova Propaganda de Produto</h4>
                      <p className="text-sm text-muted-foreground">
                        Exibe um card de produto do Hub para fazer propaganda dentro da área de membros
                      </p>
                      <Input
                        placeholder="Texto acima do produto (ex: Conheça a Ferramenta MRO)"
                        value={newProductAd.title}
                        onChange={(e) => setNewProductAd(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-secondary/50"
                      />
                      <div className="space-y-2">
                        <Label className="text-sm">Selecione o Produto</Label>
                        <select
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={newProductAd.productId}
                          onChange={(e) => setNewProductAd(prev => ({ ...prev, productId: e.target.value }))}
                        >
                          <option value="">Selecione um produto...</option>
                          {availableProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" onClick={() => handleAddProductAd(module.id)} className="cursor-pointer bg-indigo-600 hover:bg-indigo-700">
                          <Check className="w-4 h-4 mr-1" />
                          Adicionar Propaganda
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Content List - Aspect ratio 1080x1350 = 4:5 */}
                  {module.contents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum conteúdo neste módulo
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                       {module.contents.sort((a, b) => a.order - b.order).map((content, idx) => (
                         <div
                           key={content.id}
                           draggable
                           onDragStart={(e) => {
                             setDraggingContent({ moduleId: module.id, contentId: content.id });
                             e.dataTransfer.effectAllowed = 'move';
                           }}
                           onDragOver={(e) => {
                             if (draggingContent?.moduleId === module.id) {
                               e.preventDefault();
                               e.dataTransfer.dropEffect = 'move';
                             }
                           }}
                           onDrop={(e) => {
                             e.preventDefault();
                             if (draggingContent?.moduleId === module.id) {
                               handleReorderContent(module.id, draggingContent.contentId, content.id);
                             }
                             setDraggingContent(null);
                           }}
                           onDragEnd={() => setDraggingContent(null)}
                           className={`relative group cursor-move ${draggingContent?.contentId === content.id ? 'opacity-50' : ''}`}
                         >
                          {content.type === 'video' ? (
                            <div className="aspect-[4/5] rounded-lg overflow-hidden bg-secondary relative">
                              <img 
                                src={storageAssetUrl((content as ModuleVideo).thumbnailUrl) || getYoutubeThumbnail((content as ModuleVideo).youtubeUrl)}
                                alt={content.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/1080x1350?text=Video';
                                }}
                              />
                              {(content as ModuleVideo).showNumber && (
                                <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg">
                                  {idx + 1}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-10 h-10 text-primary" />
                              </div>
                            </div>
                          ) : content.type === 'button' ? (
                            <div className="aspect-[4/5] rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-mro-cyan/20 relative">
                              {(content as ModuleButton).coverUrl ? (
                                <img 
                                  src={storageAssetUrl((content as ModuleButton).coverUrl)}
                                  alt={content.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Link2 className="w-10 h-10 text-primary" />
                                </div>
                              )}
                              <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          ) : content.type === 'section' ? (
                            <div 
                              onClick={() => setExpandedSection(expandedSection === content.id ? null : content.id)}
                              className="aspect-[4/5] rounded-lg overflow-hidden bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex flex-col items-center justify-center relative border-2 border-dashed border-amber-500/50 cursor-pointer hover:border-amber-400 transition-colors"
                            >
                              <LayoutList className="w-10 h-10 text-amber-500" />
                              <span className="text-xs text-amber-500 font-medium mt-2">SEÇÃO</span>
                              <span className="text-[10px] text-amber-400 mt-1">
                                {(content as ModuleSection).contents?.length || 0} itens
                              </span>
                            </div>
                          ) : content.type === 'product_ad' ? (
                            <div className="aspect-[4/5] rounded-lg overflow-hidden bg-indigo-500/10 border-2 border-indigo-500/50 flex flex-col items-center justify-center relative">
                              <Sparkles className="w-10 h-10 text-indigo-500" />
                              <span className="text-[10px] text-indigo-400 font-bold mt-2 uppercase tracking-tighter">PROPAGANDA</span>
                              <span className="text-[9px] text-indigo-300 mt-1 truncate max-w-full px-2">
                                {(content as any).productTitle}
                              </span>
                            </div>
                          ) : (
                            <div className="aspect-[4/5] rounded-lg overflow-hidden bg-gradient-to-br from-secondary to-muted flex items-center justify-center relative">
                              <Type className="w-10 h-10 text-muted-foreground" />
                              <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-muted-foreground/30 text-foreground flex items-center justify-center text-sm font-bold">
                                {idx + 1}
                              </div>
                            </div>
                          )}
                          {((content as any).showTitle !== false) && (
                            <p className="text-sm font-medium mt-2 truncate">{content.title}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {content.type === 'video' ? 'Vídeo' : content.type === 'button' ? 'Link' : content.type === 'section' ? 'Seção' : content.type === 'product_ad' ? 'Propaganda' : 'Texto'}
                          </p>
                          
                          {/* Action buttons overlay */}
                          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingContent({ moduleId: module.id, content });
                              }}
                              className="w-9 h-9 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90"
                              title="Editar conteúdo"
                            >
                              <Edit2 className="w-4 h-4 text-primary-foreground" />
                            </button>
                            
                            {/* Toggle title button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleContentTitle(module.id, content);
                              }}
                              className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer shadow-lg ${
                                (content as any).showTitle !== false ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-secondary hover:bg-secondary/80'
                              }`}
                              title={(content as any).showTitle !== false ? 'Ocultar título' : 'Mostrar título'}
                            >
                              <Type className="w-4 h-4" />
                            </button>
                            
                            {/* Toggle number for videos */}
                            {content.type === 'video' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleContentNumber(module.id, content);
                                }}
                                className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer shadow-lg ${
                                  (content as ModuleVideo).showNumber ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-secondary hover:bg-secondary/80'
                                }`}
                                title={(content as ModuleVideo).showNumber ? 'Ocultar número' : 'Mostrar número'}
                              >
                                <span className="text-xs font-bold">#</span>
                              </button>
                            )}
                            
                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContent(module.id, content.id);
                              }}
                              className="w-9 h-9 bg-destructive rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-destructive/90"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-destructive-foreground" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded Section Contents */}
                  {module.contents.filter(c => c.type === 'section').map(sectionContent => {
                    const section = sectionContent as ModuleSection;
                    if (expandedSection !== section.id) return null;
                    
                    return (
                      <div key={section.id} className="mt-6 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-amber-400 flex items-center gap-2">
                            <LayoutList className="w-5 h-5" />
                            Conteúdos da Seção: {section.title}
                          </h4>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setExpandedSection(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Add content to section buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowAddContent({ moduleId: module.id, type: 'video', sectionId: section.id })}
                            className="cursor-pointer border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                          >
                            <Video className="w-4 h-4 mr-1" />
                            Adicionar Vídeo
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowAddContent({ moduleId: module.id, type: 'button', sectionId: section.id })}
                            className="cursor-pointer border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                          >
                            <Link2 className="w-4 h-4 mr-1" />
                            Adicionar Botão
                          </Button>
                        </div>

                        {/* Add Video to Section Form */}
                        {showAddContent?.moduleId === module.id && showAddContent.sectionId === section.id && showAddContent.type === 'video' && (
                          <div className="p-4 rounded-lg bg-secondary/30 mb-4">
                            <h5 className="font-medium mb-3">Novo Vídeo na Seção</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <Input
                                  placeholder="Título do vídeo"
                                  value={newSectionVideo.title}
                                  onChange={(e) => setNewSectionVideo(prev => ({ ...prev, title: e.target.value }))}
                                  className="bg-secondary/50"
                                />
                                <Input
                                  placeholder="URL do YouTube"
                                  value={newSectionVideo.youtubeUrl}
                                  onChange={(e) => setNewSectionVideo(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                                  className="bg-secondary/50"
                                />
                                <Textarea
                                  placeholder="Descrição (opcional)"
                                  value={newSectionVideo.description}
                                  onChange={(e) => setNewSectionVideo(prev => ({ ...prev, description: e.target.value }))}
                                  className="bg-secondary/50"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <CoverUploader
                                  currentUrl={newSectionVideo.thumbnailUrl}
                                  onUpload={(url) => setNewSectionVideo(prev => ({ ...prev, thumbnailUrl: url }))}
                                  onRemove={() => setNewSectionVideo(prev => ({ ...prev, thumbnailUrl: '' }))}
                                  folder="section-video-covers"
                                  id={`section_video_new_${Date.now()}`}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button type="button" onClick={() => handleAddVideoToSection(module.id, section.id)} className="cursor-pointer">
                                <Check className="w-4 h-4 mr-1" />
                                Adicionar
                              </Button>
                              <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Add Button to Section Form */}
                        {showAddContent?.moduleId === module.id && showAddContent.sectionId === section.id && showAddContent.type === 'button' && (
                          <div className="p-4 rounded-lg bg-secondary/30 mb-4">
                            <h5 className="font-medium mb-3">Novo Botão na Seção</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <Input
                                  placeholder="Título do botão"
                                  value={newSectionButton.title}
                                  onChange={(e) => setNewSectionButton(prev => ({ ...prev, title: e.target.value }))}
                                  className="bg-secondary/50"
                                />
                                <Input
                                  placeholder="URL do link"
                                  value={newSectionButton.url}
                                  onChange={(e) => setNewSectionButton(prev => ({ ...prev, url: e.target.value }))}
                                  className="bg-secondary/50"
                                />
                                <Textarea
                                  placeholder="Descrição (opcional)"
                                  value={newSectionButton.description}
                                  onChange={(e) => setNewSectionButton(prev => ({ ...prev, description: e.target.value }))}
                                  className="bg-secondary/50"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <CoverUploader
                                  currentUrl={newSectionButton.coverUrl}
                                  onUpload={(url) => setNewSectionButton(prev => ({ ...prev, coverUrl: url }))}
                                  onRemove={() => setNewSectionButton(prev => ({ ...prev, coverUrl: '' }))}
                                  folder="section-button-covers"
                                  id={`section_button_new_${Date.now()}`}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button type="button" onClick={() => handleAddButtonToSection(module.id, section.id)} className="cursor-pointer">
                                <Check className="w-4 h-4 mr-1" />
                                Adicionar
                              </Button>
                              <Button type="button" variant="ghost" onClick={() => setShowAddContent(null)} className="cursor-pointer">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Section contents list */}
                        {(!section.contents || section.contents.length === 0) ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nenhum conteúdo nesta seção
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {section.contents.sort((a, b) => a.order - b.order).map((sContent, sIdx) => (
                              <div key={sContent.id} className="relative group">
                                {sContent.type === 'video' ? (
                                  <div className="aspect-[4/5] rounded-lg overflow-hidden bg-secondary relative">
                                    <img 
                                      src={(sContent as ModuleVideo).thumbnailUrl || getYoutubeThumbnail((sContent as ModuleVideo).youtubeUrl)}
                                      alt={sContent.title}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                      {sIdx + 1}
                                    </div>
                                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Play className="w-8 h-8 text-primary" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="aspect-[4/5] rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-mro-cyan/20 relative flex items-center justify-center">
                                    {(sContent as ModuleButton).coverUrl ? (
                                      <img 
                                        src={(sContent as ModuleButton).coverUrl}
                                        alt={sContent.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Link2 className="w-8 h-8 text-primary" />
                                    )}
                                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                      <ExternalLink className="w-3 h-3" />
                                    </div>
                                  </div>
                                )}
                                <p className="text-xs font-medium mt-1 truncate">{sContent.title}</p>
                                
                                {/* Delete button */}
                                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSectionContent(module.id, section.id, sContent.id)}
                                    className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-destructive/90"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive-foreground" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Content Modal */}
      {editingContent && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Editar {editingContent.content.type === 'video' ? 'Vídeo' : editingContent.content.type === 'button' ? 'Botão/Link' : editingContent.content.type === 'product_ad' ? 'Propaganda' : 'Texto'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input
                  value={editingContent.content.title}
                  onChange={(e) => setEditingContent({
                    ...editingContent,
                    content: { ...editingContent.content, title: e.target.value }
                  })}
                  className="bg-secondary/50 mt-1"
                />
              </div>

              {editingContent.content.type === 'video' && (
                <>
                  <div>
                    <Label>URL do YouTube</Label>
                    <Input
                      value={(editingContent.content as ModuleVideo).youtubeUrl}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, youtubeUrl: e.target.value } as ModuleVideo
                      })}
                      className="bg-secondary/50 mt-1"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={(editingContent.content as ModuleVideo).description}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, description: e.target.value } as ModuleVideo
                      })}
                      className="bg-secondary/50 mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Capa personalizada</Label>
                    <CoverUploader
                      currentUrl={(editingContent.content as ModuleVideo).thumbnailUrl}
                      onUpload={(url) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, thumbnailUrl: url } as ModuleVideo
                      })}
                      onRemove={() => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, thumbnailUrl: '' } as ModuleVideo
                      })}
                      folder="video-covers"
                      id={editingContent.content.id}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={(editingContent.content as ModuleVideo).showNumber}
                      onCheckedChange={(checked) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, showNumber: checked } as ModuleVideo
                      })}
                    />
                    <Label>Exibir número na capa</Label>
                  </div>
                </>
              )}

              {editingContent.content.type === 'text' && (
                <div>
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={(editingContent.content as ModuleText).content}
                    onChange={(e) => setEditingContent({
                      ...editingContent,
                      content: { ...editingContent.content, content: e.target.value } as ModuleText
                    })}
                    className="bg-secondary/50 mt-1"
                    rows={6}
                  />
                </div>
              )}

              {editingContent.content.type === 'button' && (
                <>
                  <div>
                    <Label>URL do Link</Label>
                    <Input
                      value={(editingContent.content as ModuleButton).url}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, url: e.target.value } as ModuleButton
                      })}
                      className="bg-secondary/50 mt-1"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={(editingContent.content as ModuleButton).description}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, description: e.target.value } as ModuleButton
                      })}
                      className="bg-secondary/50 mt-1"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Capa</Label>
                    <CoverUploader
                      currentUrl={(editingContent.content as ModuleButton).coverUrl}
                      onUpload={(url) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, coverUrl: url } as ModuleButton
                      })}
                      onRemove={() => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, coverUrl: '' } as ModuleButton
                      })}
                      folder="button-covers"
                      id={editingContent.content.id}
                    />
                  </div>
                </>
              )}

              {editingContent.content.type === 'product_ad' && (
                <div className="space-y-4">
                  <div>
                    <Label>Texto de propaganda</Label>
                    <Input
                      value={editingContent.content.title}
                      onChange={(e) => setEditingContent({
                        ...editingContent,
                        content: { ...editingContent.content, title: e.target.value }
                      })}
                      className="bg-secondary/50 mt-1"
                    />
                  </div>
                  <div>
                    <Label>Produto</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
                      value={(editingContent.content as ModuleProductAd).productId}
                      onChange={(e) => {
                        const prod = availableProducts.find(p => p.id === e.target.value);
                        if (prod) {
                          setEditingContent({
                            ...editingContent,
                            content: { 
                              ...editingContent.content, 
                              productId: prod.id,
                              productSlug: prod.slug,
                              productTitle: prod.title,
                              productDescription: prod.description,
                              productThumb: prod.thumb_url,
                              productSalesUrl: prod.sales_page_url
                            } as ModuleProductAd
                          });
                        }
                      }}
                    >
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Switch
                  checked={(editingContent.content as any).showTitle !== false}
                  onCheckedChange={(checked) => setEditingContent({
                    ...editingContent,
                    content: { ...editingContent.content, showTitle: checked } as any
                  })}
                />
                <Label>Exibir título abaixo da capa</Label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button 
                type="button" 
                onClick={() => handleUpdateContent(editingContent.moduleId, editingContent.content.id, editingContent.content)}
                className="cursor-pointer"
              >
                <Check className="w-4 h-4 mr-1" />
                Salvar
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setEditingContent(null)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleManager;
