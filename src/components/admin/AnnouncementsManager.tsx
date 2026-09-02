import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { 
  Bell, Plus, Trash2, Save, Eye, EyeOff, 
  Upload, X, AlertTriangle, Image as ImageIcon,
  Link as LinkIcon, Users, Clock, RefreshCw, Youtube,
  Chrome, FileText, ExternalLink, Zap
} from 'lucide-react';
import ExtensionAnnouncementDocs from './ExtensionAnnouncementDocs';
import { storageAssetUrl } from '@/lib/assetUrl';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  thumbnailUrl?: string;
  youtubeUrl?: string;
  isActive: boolean;
  forceRead: boolean;
  forceReadSeconds: number;
  forceNotClose: boolean;
  maxViews: number;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  targetArea?: string;
  // Extension-specific fields
  delaySeconds?: number;
  frequencyType?: 'once' | 'times_per_day' | 'times_per_hours';
  frequencyValue?: number;
  frequencyHours?: number;
  buttonText?: string;
  buttonUrl?: string;
}

interface AnnouncementsData {
  announcements: Announcement[];
  lastUpdated: string;
}

interface AnnouncementsManagerProps {
  filterArea?: 'instagram' | 'zapmro';
}

/** Cache local para o painel abrir instantaneamente (revalida em seguida). */
const CACHE_KEY = 'mro:admin:announcements:cache:v1';

const persistCache = (announcements: Announcement[], extensions: string[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ announcements, extensions }));
  } catch {
    // Quota cheia não deve quebrar o painel.
  }
};

/**
 * Reduz a imagem no navegador antes do upload. Um print de 4MB virava um POST
 * lento (às vezes "travado"); com isso o envio fica em dezenas de KB.
 */
const compressImage = async (file: File): Promise<Blob> => {
  if (file.type === 'image/gif' || file.size <= 300 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
};

const AnnouncementsManager = ({ filterArea }: AnnouncementsManagerProps = {}) => {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [thumbnailMode, setThumbnailMode] = useState<'url' | 'file' | 'paste'>('url');
  const [extensionDocsPath, setExtensionDocsPath] = useState<string | null>(null);
  const [availableExtensions, setAvailableExtensions] = useState<string[]>(['extension', 'extension2']);
  const [showNewExtensionInput, setShowNewExtensionInput] = useState(false);
  const [newExtensionName, setNewExtensionName] = useState('');
  const [showDocsForAnnouncement, setShowDocsForAnnouncement] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    thumbnailUrl: '',
    youtubeUrl: '',
    isActive: true,
    forceRead: false,
    forceReadSeconds: 5,
    forceNotClose: false,
    maxViews: 1,
    targetArea: filterArea || 'all',
    delaySeconds: 0,
    frequencyType: 'once',
    frequencyValue: 1,
    frequencyHours: 1,
    buttonText: '',
    buttonUrl: ''
  });

  useEffect(() => {
    // Pinta imediatamente com o cache local e revalida em segundo plano:
    // o painel deixa de ficar "carregando" enquanto o storage responde.
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          announcements: Announcement[];
          extensions: string[];
        };
        if (Array.isArray(parsed.announcements)) {
          setAnnouncements(parsed.announcements);
          if (parsed.extensions?.length) setAvailableExtensions(parsed.extensions);
          setIsLoading(false);
        }
      }
    } catch {
      // Cache corrompido é irrelevante: seguimos para o carregamento remoto.
    }
    loadAnnouncements();
  }, []);

  const downloadJson = async (path: string): Promise<any | null> => {
    try {
      const { data, error } = await supabase.storage.from('user-data').download(path);
      if (error || !data) return null;
      return JSON.parse(await data.text());
    } catch {
      return null;
    }
  };

  const loadAnnouncements = async () => {
    setIsLoading(true);
    try {
      const detectedExtensions = new Set<string>(['extension', 'extension2']);

      // Baixa o arquivo principal e lista os arquivos de extensão em paralelo.
      const [regularParsed, listResult] = await Promise.all([
        downloadJson('admin/announcements.json'),
        supabase.storage.from('user-data').list('admin'),
      ]);

      const regularList: Announcement[] = (regularParsed?.announcements || []).map(
        (a: Announcement) => ({ ...a, targetArea: a.targetArea || 'all' }),
      );

      const announcementFiles = (listResult.data || []).filter(
        (f) => f.name.endsWith('-announcements.json') && f.name !== 'announcements.json',
      );

      // Todos os arquivos de extensão em paralelo (antes era um a um).
      const extensionLists = await Promise.all(
        announcementFiles.map(async (file) => {
          // Backends antigos retornavam só o basename; algumas versões locais
          // retornavam o caminho completo. Aceitamos ambos sem gerar admin/admin.
          const listedName = file.name.split('/').filter(Boolean).pop() || file.name;
          const extKey = listedName.replace('-announcements.json', '');
          detectedExtensions.add(extKey);
          const parsed = await downloadJson(`admin/${listedName}`);
          return (parsed?.announcements || []).map((a: any) => ({
            ...a,
            targetArea: extKey,
            forceRead: a.forceRead ?? false,
            forceReadSeconds: a.forceReadSeconds ?? 5,
            forceNotClose: a.forceNotClose ?? false,
            maxViews: a.maxViews ?? 1,
            viewCount: a.viewCount ?? 0,
          })) as Announcement[];
        }),
      );

      const allAnnouncements = [...regularList, ...extensionLists.flat()];
      const extensions = Array.from(detectedExtensions).sort();

      setAvailableExtensions(extensions);
      setAnnouncements(allAnnouncements);
      persistCache(allAnnouncements, extensions);
    } catch (error) {
      console.error('Erro geral ao carregar avisos:', error);
      toast({ 
        title: 'Erro ao carregar', 
        description: 'Não foi possível carregar todos os avisos', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnnouncements = async (data: Announcement[]) => {
    setIsSaving(true);
    console.log('💾 Salvando avisos...', data.length);
    try {
      // Agrupar anúncios por área de destino
      const groups: Record<string, Announcement[]> = {};
      
      // Inicializar grupos para extensões conhecidas para garantir que possamos limpá-las se necessário
      availableExtensions.forEach(ext => {
        groups[ext] = [];
      });
      // Grupos padrão
      groups['all'] = [];
      groups['instagram'] = [];
      groups['zapmro'] = [];

      data.forEach(a => {
        const area = a.targetArea || 'all';
        if (!groups[area]) groups[area] = [];
        groups[area].push(a);
      });

      // 1. Salvar anúncios regulares (all, instagram, zapmro) em announcements.json
      const regularPayload: AnnouncementsData = {
        announcements: data.filter(a => {
          const area = a.targetArea || 'all';
          return !area.startsWith('extension');
        }),
        lastUpdated: new Date().toISOString()
      };

      console.log('📝 Salvando admin/announcements.json');
      const regularBlob = new Blob([JSON.stringify(regularPayload, null, 2)], { type: 'application/json' });
      const { error: regularUploadError } = await supabase.storage
        .from('user-data')
        .upload('admin/announcements.json', regularBlob, { 
          upsert: true,
          contentType: 'application/json'
        });
      // Falha silenciosa aqui era o motivo do aviso "sumir" depois de salvar.
      if (regularUploadError) throw regularUploadError;

      // 2. Salvar anúncios de extensão em arquivos separados (em paralelo).
      const extensionAreas = Object.keys(groups).filter(area => area.startsWith('extension'));

      await Promise.all(extensionAreas.map(async (area) => {
        const fileName = `${area}-announcements.json`;
        const extAnnouncements = groups[area];
        
        console.log(`📝 Salvando admin/${fileName} (${extAnnouncements.length} avisos)`);
        
        const extensionPayload = {
          announcements: extAnnouncements.map(a => ({
            id: a.id,
            title: a.title,
            content: a.content,
            thumbnailUrl: a.thumbnailUrl,
            youtubeUrl: a.youtubeUrl,
            buttonText: a.buttonText,
            buttonUrl: a.buttonUrl,
            isActive: a.isActive,
            delaySeconds: a.delaySeconds || 0,
            frequencyType: a.frequencyType || 'once',
            frequencyValue: a.frequencyValue || 1,
            frequencyHours: a.frequencyHours || 1,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
            forceRead: a.forceRead,
            forceReadSeconds: a.forceReadSeconds,
            forceNotClose: a.forceNotClose,
            maxViews: a.maxViews,
            viewCount: a.viewCount
          })),
          lastUpdated: new Date().toISOString()
        };

        const extensionBlob = new Blob([JSON.stringify(extensionPayload)], { type: 'application/json' });
        await supabase.storage
          .from('user-data')
          .upload(`admin/${fileName}`, extensionBlob, { 
            upsert: true,
            contentType: 'application/json'
          });
      }));

      persistCache(data, availableExtensions);
      toast({ title: 'Avisos salvos!', description: 'Alterações publicadas com sucesso' });
    } catch (error) {
      console.error('Erro ao salvar avisos:', error);
      toast({ 
        title: 'Erro ao salvar', 
        description: 'Verifique o console para mais detalhes', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImageFile = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Selecione uma imagem', variant: 'destructive' });
      return null;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 15MB', variant: 'destructive' });
      return null;
    }

    setIsUploading(true);
    try {
      // Comprime antes de enviar: é o que tornava o upload lento/"travado".
      const blob = await compressImage(file);
      const converted = blob !== (file as unknown as Blob) && blob.type === 'image/jpeg';
      const baseName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const safeName = converted ? `${baseName.replace(/\.[^.]+$/, '')}.jpg` : baseName;
      const fileName = `announcements/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, blob, { 
          upsert: true,
          contentType: blob.type || file.type
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      toast({ title: 'Imagem enviada!', description: 'Thumbnail atualizada com sucesso' });
      return storageAssetUrl(urlData.publicUrl);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro no upload',
        description: error instanceof Error ? error.message : 'Não foi possível enviar a imagem',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImageFile(file);
    if (url) {
      setFormData(prev => ({ ...prev, thumbnailUrl: url }));
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const url = await uploadImageFile(file);
          if (url) {
            // Use callback form to ensure we get the latest state
            setFormData(prev => ({ ...prev, thumbnailUrl: url }));
          }
        }
        break;
      }
    }
  };

  const handleAddNew = () => {
    setEditingId('new');
    setThumbnailMode('url');
    setFormData({
      title: '',
      content: '',
      thumbnailUrl: '',
      youtubeUrl: '',
      isActive: true,
      forceRead: false,
      forceReadSeconds: 5,
      forceNotClose: false,
      maxViews: 1,
      targetArea: filterArea || 'all',
      delaySeconds: 0,
      frequencyType: 'once',
      frequencyValue: 1,
      frequencyHours: 1,
      buttonText: '',
      buttonUrl: ''
    });
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setThumbnailMode('url');
    setFormData({
      title: announcement.title,
      content: announcement.content,
      thumbnailUrl: announcement.thumbnailUrl || '',
      youtubeUrl: announcement.youtubeUrl || '',
      isActive: announcement.isActive,
      forceRead: announcement.forceRead,
      forceReadSeconds: announcement.forceReadSeconds || 5,
      forceNotClose: announcement.forceNotClose ?? false,
      maxViews: announcement.maxViews,
      targetArea: announcement.targetArea || 'all',
      delaySeconds: announcement.delaySeconds || 0,
      frequencyType: announcement.frequencyType || 'once',
      frequencyValue: announcement.frequencyValue || 1,
      frequencyHours: announcement.frequencyHours || 1,
      buttonText: announcement.buttonText || '',
      buttonUrl: announcement.buttonUrl || ''
    });
  };

  const handleSave = async () => {
    let finalTargetArea = formData.targetArea || 'all';
    
    // If a new extension was specified
    if (showNewExtensionInput && newExtensionName.trim()) {
      const sanitizedName = newExtensionName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      finalTargetArea = `extension${sanitizedName}`;
      
      if (!availableExtensions.includes(finalTargetArea)) {
        setAvailableExtensions(prev => [...prev, finalTargetArea].sort());
      }
      
      setShowNewExtensionInput(false);
      setNewExtensionName('');
    }

    if (!formData.title || !formData.content) {
      toast({ title: 'Preencha título e conteúdo', variant: 'destructive' });
      return;
    }

    let updatedAnnouncements: Announcement[];

    if (editingId === 'new') {
      const newAnnouncement: Announcement = {
        id: `ann_${Date.now()}`,
        title: formData.title!,
        content: formData.content!,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        youtubeUrl: formData.youtubeUrl || undefined,
        isActive: formData.isActive ?? true,
        forceRead: formData.forceRead ?? false,
        forceReadSeconds: formData.forceReadSeconds ?? 5,
        forceNotClose: formData.forceNotClose ?? false,
        maxViews: formData.maxViews ?? 1,
        targetArea: finalTargetArea,
        delaySeconds: formData.delaySeconds || 0,
        frequencyType: formData.frequencyType || 'once',
        frequencyValue: formData.frequencyValue || 1,
        frequencyHours: formData.frequencyHours || 1,
        buttonText: formData.buttonText || undefined,
        buttonUrl: formData.buttonUrl || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewCount: 0
      };
      updatedAnnouncements = [...announcements, newAnnouncement];
    } else {
      updatedAnnouncements = announcements.map(a => 
        a.id === editingId 
          ? { 
              ...a, 
              title: formData.title!,
              content: formData.content!,
              thumbnailUrl: formData.thumbnailUrl || undefined,
              youtubeUrl: formData.youtubeUrl || undefined,
              isActive: formData.isActive ?? true,
              forceRead: formData.forceRead ?? false,
              forceReadSeconds: formData.forceReadSeconds ?? 5,
              forceNotClose: formData.forceNotClose ?? false,
              maxViews: formData.maxViews ?? 1,
              targetArea: finalTargetArea,
              delaySeconds: formData.delaySeconds || 0,
              frequencyType: formData.frequencyType || 'once',
              frequencyValue: formData.frequencyValue || 1,
              frequencyHours: formData.frequencyHours || 1,
              buttonText: formData.buttonText || undefined,
              buttonUrl: formData.buttonUrl || undefined,
              updatedAt: new Date().toISOString()
            }
          : a
      );
    }

    setAnnouncements(updatedAnnouncements);
    await saveAnnouncements(updatedAnnouncements);
    setEditingId(null);
    setFormData({});
  };

  const handleDelete = async (id: string) => {
    const updatedAnnouncements = announcements.filter(a => a.id !== id);
    setAnnouncements(updatedAnnouncements);
    await saveAnnouncements(updatedAnnouncements);
    toast({ title: 'Aviso removido' });
  };

  const handleToggleActive = async (id: string) => {
    const updatedAnnouncements = announcements.map(a =>
      a.id === id ? { ...a, isActive: !a.isActive, updatedAt: new Date().toISOString() } : a
    );
    setAnnouncements(updatedAnnouncements);
    await saveAnnouncements(updatedAnnouncements);
  };

  const handleResetViews = async (id: string) => {
    const updatedAnnouncements = announcements.map(a =>
      a.id === id ? { ...a, viewCount: 0, updatedAt: new Date().toISOString() } : a
    );
    setAnnouncements(updatedAnnouncements);
    await saveAnnouncements(updatedAnnouncements);
    toast({ title: 'Visualizações zeradas' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando avisos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-display font-bold">Avisos</h2>
          <span className="text-sm text-muted-foreground">
            ({announcements.filter(a => a.isActive).length} ativos)
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {availableExtensions.map(ext => (
            <Button 
              key={ext}
              variant="outline" 
              size="sm"
              onClick={() => setExtensionDocsPath(ext)} 
              className="gap-2 text-purple-400 border-purple-400/30 hover:bg-purple-500/10"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">
                Docs {ext === 'extension' ? 'Extensão' : `Extensão ${ext.replace('extension', '')}`}
              </span>
            </Button>
          ))}
          <Button variant="outline" onClick={loadAnnouncements} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button onClick={handleAddNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Aviso
          </Button>
        </div>
      </div>

      <div className="glass-card p-4 bg-yellow-500/10 border-yellow-500/30">
        <p className="text-sm text-yellow-200">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Os avisos aparecem como popup logo após o usuário fazer login no sistema.
          Formatos de imagem suportados: 1920x1080, 1080x1920, 1080x1080, 1080x1350
        </p>
      </div>

      {/* Edit Form */}
      {editingId && (
        <div className="glass-card p-6 space-y-4 border-2 border-primary/50">
          <h3 className="font-bold text-lg">
            {editingId === 'new' ? 'Novo Aviso' : 'Editar Aviso'}
          </h3>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="title">Título do Aviso</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Nova atualização disponível!"
              />
            </div>

            <div>
              <Label htmlFor="content">Conteúdo (suporta múltiplas linhas)</Label>
              <Textarea
                id="content"
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Escreva o conteúdo do aviso aqui..."
                rows={5}
              />
            </div>

            {/* Thumbnail Section */}
            <div className="space-y-3">
              <Label>Thumbnail (opcional)</Label>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={thumbnailMode === 'url' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setThumbnailMode('url')}
                  className="gap-2"
                >
                  <LinkIcon className="w-4 h-4" />
                  Link URL
                </Button>
                <Button
                  type="button"
                  variant={thumbnailMode === 'file' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setThumbnailMode('file')}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Arquivo
                </Button>
                <Button
                  type="button"
                  variant={thumbnailMode === 'paste' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setThumbnailMode('paste');
                    setTimeout(() => pasteAreaRef.current?.focus(), 100);
                  }}
                  className="gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Colar Imagem
                </Button>
              </div>

              {thumbnailMode === 'url' && (
                <Input
                  value={formData.thumbnailUrl || ''}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              )}

              {thumbnailMode === 'file' && (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Selecionar Imagem do Computador
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP • Máximo 5MB
                  </p>
                </div>
              )}

              {thumbnailMode === 'paste' && (
                <div className="space-y-2">
                  <div
                    ref={pasteAreaRef}
                    onPaste={handlePaste}
                    tabIndex={0}
                    className={`
                      w-full min-h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 p-4 cursor-pointer transition-colors focus:outline-none
                      ${isUploading 
                        ? 'border-primary bg-primary/10' 
                        : 'border-primary/50 bg-primary/5 hover:bg-primary/10 focus:border-primary focus:bg-primary/10'
                      }
                    `}
                  >
                    {isUploading ? (
                      <>
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-muted-foreground">Enviando imagem...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-10 h-10 text-primary" />
                        <span className="text-sm text-foreground font-medium">
                          Clique aqui e use <span className="font-bold text-primary">Ctrl+V</span> para colar
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Cole uma imagem da área de transferência
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tamanhos recomendados: 1920x1080, 1080x1920, 1080x1080, 1080x1350
                  </p>
                </div>
              )}

              {formData.thumbnailUrl && (
                <div className="relative mt-2">
                  <img 
                    src={storageAssetUrl(formData.thumbnailUrl)} 
                    alt="Preview" 
                    className="max-h-48 rounded-lg object-contain bg-secondary/50"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData({ ...formData, thumbnailUrl: '' })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* YouTube Video Section */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500" />
                Vídeo do YouTube (opcional)
              </Label>
              <Input
                value={formData.youtubeUrl || ''}
                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
              />
              <p className="text-xs text-muted-foreground">
                Cole o link do vídeo do YouTube para incluir no aviso
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxViews">Exibir quantas vezes por usuário</Label>
                <select
                  id="maxViews"
                  value={formData.maxViews || 1}
                  onChange={(e) => setFormData({ ...formData, maxViews: Number(e.target.value) })}
                  className="w-full mt-1 bg-secondary border border-border rounded-md px-3 py-2"
                >
                  <option value={1}>1 vez</option>
                  <option value={2}>2 vezes</option>
                  <option value={3}>3 vezes</option>
                  <option value={99}>Sempre (não limitar)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="targetArea">Exibir para qual área</Label>
                <select
                  id="targetArea"
                  value={formData.targetArea || 'all'}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'new_extension') {
                      setShowNewExtensionInput(true);
                    } else {
                      setFormData({ ...formData, targetArea: value as any });
                      setShowNewExtensionInput(false);
                    }
                  }}
                  className="w-full mt-1 bg-secondary border border-border rounded-md px-3 py-2"
                >
                  <option value="all">Todas as áreas</option>
                  <option value="instagram">Apenas Instagram (MRO)</option>
                  <option value="zapmro">Apenas ZAPMRO</option>
                  {availableExtensions.map(ext => (
                    <option key={ext} value={ext}>
                      🧩 {ext === 'extension' ? 'Extensão Chrome' : `Extensão Chrome ${ext.replace('extension', '')}`}
                    </option>
                  ))}
                  <option value="new_extension">+ Criar novo caminho de extensão...</option>
                </select>
              </div>
            </div>
            
            {showNewExtensionInput && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="newExtensionName">Número ou Nome da Nova Extensão</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="newExtensionName"
                    value={newExtensionName}
                    onChange={(e) => setNewExtensionName(e.target.value)}
                    placeholder="Ex: 3, 4, pro..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowNewExtensionInput(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Isso criará um novo endpoint para esta extensão específica.
                </p>
              </div>
            )}

            {/* Extension-specific settings */}
            {(formData.targetArea?.startsWith('extension')) && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Chrome className="w-5 h-5 text-purple-400" />
                  <h4 className="font-bold text-purple-300">Configurações da Extensão</h4>
                </div>

                {/* Delay before showing */}
                <div>
                  <Label htmlFor="delaySeconds" className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    Delay antes de exibir (segundos)
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="delaySeconds"
                      type="number"
                      min={0}
                      max={300}
                      value={formData.delaySeconds || 0}
                      onChange={(e) => setFormData({ ...formData, delaySeconds: Math.max(0, Number(e.target.value)) })}
                      className="w-24 bg-secondary"
                    />
                    <span className="text-sm text-muted-foreground">segundos (0 = imediato)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aguarda X segundos após a página carregar para exibir o aviso
                  </p>
                </div>

                {/* Forçar Leitura e Não Fechar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-purple-500/20">
                  <div className="flex items-center justify-between gap-2 bg-purple-500/5 p-3 rounded-md border border-purple-500/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        Forçar Leitura
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Exige espera de X segundos</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.forceRead && (
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={formData.forceReadSeconds || 5}
                          onChange={(e) => setFormData({ ...formData, forceReadSeconds: Math.max(1, Number(e.target.value)) })}
                          className="w-14 h-8 text-xs bg-secondary"
                        />
                      )}
                      <Switch
                        checked={formData.forceRead || false}
                        onCheckedChange={(checked) => setFormData({ ...formData, forceRead: checked })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-red-500/5 p-3 rounded-md border border-red-500/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <X className="w-3.5 h-3.5 text-red-400" />
                        Forçar Não Fechar
                      </Label>
                      <p className="text-[10px] text-muted-foreground">Oculta botão de fechar</p>
                    </div>
                    <Switch
                      checked={formData.forceNotClose || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, forceNotClose: checked })}
                    />
                  </div>
                </div>

                {/* Frequency settings */}
                <div>
                  <Label htmlFor="frequencyType">Frequência de exibição</Label>
                  <select
                    id="frequencyType"
                    value={formData.frequencyType || 'once'}
                    onChange={(e) => setFormData({ ...formData, frequencyType: e.target.value as any })}
                    className="w-full mt-1 bg-secondary border border-border rounded-md px-3 py-2"
                  >
                    <option value="once">Exibir apenas 1 vez (total)</option>
                    <option value="times_per_day">X vezes por dia</option>
                    <option value="times_per_hours">X vezes a cada Y horas</option>
                  </select>
                </div>

                {formData.frequencyType === 'times_per_day' && (
                  <div>
                    <Label>Quantas vezes por dia</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.frequencyValue || 1}
                        onChange={(e) => setFormData({ ...formData, frequencyValue: Math.max(1, Number(e.target.value)) })}
                        className="w-20 bg-secondary"
                      />
                      <span className="text-sm text-muted-foreground">vez(es) por dia</span>
                    </div>
                  </div>
                )}

                {formData.frequencyType === 'times_per_hours' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quantas vezes</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={formData.frequencyValue || 1}
                          onChange={(e) => setFormData({ ...formData, frequencyValue: Math.max(1, Number(e.target.value)) })}
                          className="w-20 bg-secondary"
                        />
                        <span className="text-sm text-muted-foreground">vez(es)</span>
                      </div>
                    </div>
                    <div>
                      <Label>A cada quantas horas</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          value={formData.frequencyHours || 1}
                          onChange={(e) => setFormData({ ...formData, frequencyHours: Math.max(1, Number(e.target.value)) })}
                          className="w-20 bg-secondary"
                        />
                        <span className="text-sm text-muted-foreground">hora(s)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Button CTA for extension */}
                <div className="space-y-3 pt-2 border-t border-purple-500/20">
                  <Label className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    Botão de Ação (opcional)
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input
                        placeholder="Texto do botão"
                        value={formData.buttonText || ''}
                        onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                        className="bg-secondary"
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="URL do botão"
                        value={formData.buttonUrl || ''}
                        onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                        className="bg-secondary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Regular announcement settings (non-extension) */}
            {!formData.targetArea?.startsWith('extension') && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={formData.isActive ?? true}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                      <Label>Aviso Ativo</Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={formData.forceRead ?? false}
                        onCheckedChange={(checked) => setFormData({ ...formData, forceRead: checked })}
                      />
                      <div>
                        <Label className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          Forçar Leitura (Temporizador)
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timer seconds when force read is enabled */}
                {formData.forceRead && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <Label htmlFor="forceReadSeconds" className="flex items-center gap-2 text-yellow-300">
                      <Clock className="w-4 h-4" />
                      Segundos para aguardar antes de poder fechar
                    </Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Input
                        id="forceReadSeconds"
                        type="number"
                        min={1}
                        max={60}
                        value={formData.forceReadSeconds || 5}
                        onChange={(e) => setFormData({ ...formData, forceReadSeconds: Math.min(60, Math.max(1, Number(e.target.value))) })}
                        className="w-24 bg-secondary"
                      />
                      <span className="text-sm text-muted-foreground">segundos (1-60)</span>
                    </div>
                    <p className="text-xs text-yellow-400/70 mt-2">
                      O usuário não poderá fechar o aviso até o tempo acabar
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Extension active toggle */}
            {(formData.targetArea?.startsWith('extension')) && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.isActive ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Aviso Ativo</Label>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : 'Salvar Aviso'}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum aviso cadastrado</p>
            <p className="text-sm">Clique em "Novo Aviso" para criar</p>
          </div>
        ) : (
          announcements
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((announcement) => (
            <div 
              key={announcement.id} 
              className={`glass-card p-4 flex items-center gap-4 transition-opacity ${
                !announcement.isActive ? 'opacity-50' : ''
              }`}
            >
              {announcement.thumbnailUrl && (
                <img 
                  src={storageAssetUrl(announcement.thumbnailUrl)} 
                  alt="" 
                  className="w-20 h-20 rounded-lg object-cover"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold truncate">{announcement.title}</h4>
                  {announcement.forceRead && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {announcement.forceReadSeconds}s
                    </span>
                  )}
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                    {announcement.maxViews === 99 ? 'Sempre' : `${announcement.maxViews}x`}
                  </span>
                  {/* Target area badge */}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    announcement.targetArea === 'instagram' 
                      ? 'bg-pink-500/20 text-pink-400' 
                      : announcement.targetArea === 'zapmro'
                      ? 'bg-green-500/20 text-green-400'
                      : announcement.targetArea === 'extension'
                      ? 'bg-purple-500/20 text-purple-400'
                      : announcement.targetArea === 'extension2'
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {announcement.targetArea === 'instagram' 
                      ? '📸 Instagram' 
                      : announcement.targetArea === 'zapmro'
                      ? '💬 ZAPMRO'
                      : announcement.targetArea === 'extension'
                      ? '🧩 Extensão'
                      : announcement.targetArea === 'extension2'
                      ? '🧩 Extensão 2'
                      : '🌐 Todas'}
                  </span>
                  {/* Extension delay badge */}
                  {(announcement.targetArea === 'extension' || announcement.targetArea === 'extension2') && announcement.delaySeconds && announcement.delaySeconds > 0 && (
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {announcement.delaySeconds}s delay
                    </span>
                  )}
                  {/* View count badge */}
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {announcement.viewCount || 0} views
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {announcement.content}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Criado: {new Date(announcement.createdAt).toLocaleDateString('pt-BR')}
                  {announcement.targetArea?.startsWith('extension') && announcement.frequencyType && (
                    <span className="ml-2 text-purple-400">
                      • {announcement.frequencyType === 'once' 
                        ? '1x total' 
                        : announcement.frequencyType === 'times_per_day'
                        ? `${announcement.frequencyValue}x/dia`
                        : `${announcement.frequencyValue}x a cada ${announcement.frequencyHours}h`}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Docs button for extension announcements */}
                {announcement.targetArea?.startsWith('extension') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDocsForAnnouncement(announcement.id)}
                    title="Ver documentação da API"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleResetViews(announcement.id)}
                  title="Zerar visualizações"
                  className="text-blue-400 hover:text-blue-300"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(announcement.id)}
                  title={announcement.isActive ? 'Desativar' : 'Ativar'}
                >
                  {announcement.isActive ? (
                    <Eye className="w-4 h-4 text-green-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(announcement)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(announcement.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Extension Docs Modal */}
      <ExtensionAnnouncementDocs 
        isOpen={!!extensionDocsPath || showDocsForAnnouncement !== null} 
        onClose={() => {
          setExtensionDocsPath(null);
          setShowDocsForAnnouncement(null);
        }} 
        announcementId={showDocsForAnnouncement || undefined}
        targetArea={
          showDocsForAnnouncement 
            ? announcements.find(a => a.id === showDocsForAnnouncement)?.targetArea || 'extension'
            : extensionDocsPath || 'extension'
        }
      />
    </div>
  );
};

export default AnnouncementsManager;
