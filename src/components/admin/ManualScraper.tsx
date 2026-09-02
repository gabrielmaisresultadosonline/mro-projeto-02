import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { storageAssetUrl } from '@/lib/assetUrl';
import { 
  ExternalLink, 
  Save, 
  Instagram, 
  User, 
  Users, 
  FileText, 
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Database
} from 'lucide-react';

interface ScrapedPost {
  imageUrl: string;
  postUrl?: string; // Instagram post/reel URL
  likes: number;
  comments: number;
  caption?: string;
}

interface ScrapedProfileData {
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  postsCount: number;
  profilePicture: string;
  externalUrl: string;
  isVerified: boolean;
  posts: ScrapedPost[];
}

interface CachedProfile {
  username: string;
  fullName?: string;
  bio?: string;
  followers?: number;
  following?: number;
  postsCount?: number;
  profilePicture?: string;
  externalUrl?: string;
  isVerified?: boolean;
  manuallyScraped?: boolean;
  scrapedAt?: string;
  recentPosts?: any[];
  posts?: any[];
  avgLikes?: number;
  avgComments?: number;
}

const ManualScraper = () => {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [targetUsername, setTargetUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cachedProfiles, setCachedProfiles] = useState<CachedProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ScrapedProfileData>({
    username: '',
    fullName: '',
    bio: '',
    followers: 0,
    following: 0,
    postsCount: 0,
    profilePicture: '',
    externalUrl: '',
    isVerified: false,
    posts: Array(6).fill({ imageUrl: '', postUrl: '', likes: 0, comments: 0, caption: '' })
  });

  // Load cached profiles on mount
  useEffect(() => {
    loadCachedProfiles();
  }, []);

  const loadCachedProfiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-data-storage', {
        body: { action: 'load' }
      });

      if (!error && data?.exists && data?.data?.profiles) {
        const manualProfiles = data.data.profiles.filter((p: any) => p.manuallyScraped);
        setCachedProfiles(manualProfiles);
      }
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = (profile: CachedProfile) => {
    setEditingProfile(profile.username);
    setTargetUsername(profile.username);
    setUsername(profile.username);
    
    // Convert posts to ScrapedPost format
    const posts = (profile.recentPosts || profile.posts || []).slice(0, 6);
    const formattedPosts: ScrapedPost[] = Array(6).fill({ imageUrl: '', postUrl: '', likes: 0, comments: 0, caption: '' }).map((_, idx) => {
      const p = posts[idx];
      return p ? {
        imageUrl: p.imageUrl || '',
        postUrl: p.postUrl || '',
        likes: p.likes || 0,
        comments: p.comments || 0,
        caption: p.caption || ''
      } : { imageUrl: '', postUrl: '', likes: 0, comments: 0, caption: '' };
    });

    setProfileData({
      username: profile.username,
      fullName: profile.fullName || '',
      bio: profile.bio || '',
      followers: profile.followers || 0,
      following: profile.following || 0,
      postsCount: profile.postsCount || 0,
      profilePicture: profile.profilePicture || '',
      externalUrl: profile.externalUrl || '',
      isVerified: profile.isVerified || false,
      posts: formattedPosts
    });

    toast({
      title: "Editando perfil",
      description: `@${profile.username} carregado para edição`
    });
  };

  const handleDeleteProfile = async (profileUsername: string) => {
    if (!confirm(`Tem certeza que deseja excluir @${profileUsername}?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-data-storage', {
        body: { action: 'load' }
      });

      if (error || !data?.exists || !data?.data) {
        throw new Error('Erro ao carregar dados');
      }

      const syncData = data.data;
      syncData.profiles = syncData.profiles.filter(
        (p: any) => p.username?.toLowerCase() !== profileUsername.toLowerCase()
      );

      await supabase.functions.invoke('admin-data-storage', {
        body: { action: 'save', data: syncData }
      });

      toast({
        title: "Perfil excluído",
        description: `@${profileUsername} foi removido do cache`
      });

      loadCachedProfiles();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o perfil",
        variant: "destructive"
      });
    }
  };

  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Upload image to Supabase storage
  const uploadImageToStorage = async (file: File, path: string): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}-${Date.now()}.${fileExt}`;
      const filePath = `manual-scraper/${fileName}`;
      
      // Upload to profile-cache bucket (public)
      const { data, error } = await supabase.storage
        .from('profile-cache')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Erro no upload",
          description: error.message,
          variant: "destructive"
        });
        return null;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-cache')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    toast({ title: "Enviando imagem..." });
    const url = await uploadImageToStorage(file, `profile-${targetUsername}`);
    
    if (url) {
      setProfileData(prev => ({ ...prev, profilePicture: url }));
      toast({ title: "Foto de perfil enviada!", description: "Imagem salva com sucesso" });
    }
  };

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    toast({ title: `Enviando imagem do post ${index + 1}...` });
    const url = await uploadImageToStorage(file, `post-${targetUsername}-${index}`);
    
    if (url) {
      const newPosts = [...profileData.posts];
      newPosts[index] = { ...newPosts[index], imageUrl: url };
      setProfileData(prev => ({ ...prev, posts: newPosts }));
      toast({ title: "Imagem do post enviada!" });
    }
  };

  // Handle paste from clipboard (Ctrl+V)
  const handlePasteImage = async (e: React.ClipboardEvent<HTMLDivElement>, index: number) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        toast({ title: `Colando imagem do post ${index + 1}...` });
        const url = await uploadImageToStorage(file, `post-${targetUsername}-${index}-paste`);
        
        if (url) {
          const newPosts = [...profileData.posts];
          newPosts[index] = { ...newPosts[index], imageUrl: url };
          setProfileData(prev => ({ ...prev, posts: newPosts }));
          toast({ title: "Imagem colada com sucesso!" });
        }
        break;
      }
    }
  };

  // Extract username from URL or clean input
  const cleanUsername = (input: string): string => {
    let clean = input.trim();
    
    // Remove @ if present
    if (clean.startsWith('@')) {
      clean = clean.substring(1);
    }
    
    // Extract from Instagram URL
    const urlPatterns = [
      /instagram\.com\/([^\/\?]+)/i,
      /instagr\.am\/([^\/\?]+)/i
    ];
    
    for (const pattern of urlPatterns) {
      const match = clean.match(pattern);
      if (match) {
        clean = match[1];
        break;
      }
    }
    
    return clean.toLowerCase();
  };

  const handleOpenInstagram = () => {
    const cleanedUsername = cleanUsername(username);
    if (!cleanedUsername) {
      toast({
        title: "Username obrigatório",
        description: "Digite o username do Instagram para abrir",
        variant: "destructive"
      });
      return;
    }
    
    setTargetUsername(cleanedUsername);
    setProfileData(prev => ({ ...prev, username: cleanedUsername }));
    
    // Open Instagram profile in popup
    const instagramUrl = `https://www.instagram.com/${cleanedUsername}/`;
    window.open(instagramUrl, '_blank', 'width=500,height=800,scrollbars=yes');
    
    toast({
      title: "Instagram aberto!",
      description: "Copie os dados do perfil e preencha o formulário abaixo"
    });
  };

  const handleSaveToUser = async () => {
    if (!targetUsername) {
      toast({
        title: "Erro",
        description: "Primeiro abra um perfil do Instagram",
        variant: "destructive"
      });
      return;
    }

    if (!profileData.followers && !profileData.fullName) {
      toast({
        title: "Dados incompletos",
        description: "Preencha pelo menos seguidores ou nome completo",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // Calculate engagement from posts
      const validPosts = profileData.posts.filter(p => p.likes > 0 || p.comments > 0);
      const totalLikes = validPosts.reduce((sum, p) => sum + p.likes, 0);
      const totalComments = validPosts.reduce((sum, p) => sum + p.comments, 0);
      const avgLikes = validPosts.length > 0 ? totalLikes / validPosts.length : 0;
      const avgComments = validPosts.length > 0 ? totalComments / validPosts.length : 0;
      const engagement = profileData.followers > 0 ? ((avgLikes + avgComments) / profileData.followers) * 100 : 0;

      // Format posts for storage
      const formattedPosts = profileData.posts
        .filter(p => p.imageUrl || p.postUrl || p.likes > 0)
        .map((p, index) => ({
          id: `manual-${targetUsername}-${index}`,
          imageUrl: p.imageUrl || '',
          postUrl: p.postUrl || '',
          likes: p.likes || 0,
          comments: p.comments || 0,
          caption: p.caption || '',
          timestamp: new Date().toISOString()
        }));

      // Prepare profile data for caching
      const cacheData = {
        username: targetUsername,
        fullName: profileData.fullName || targetUsername,
        bio: profileData.bio || '',
        followers: profileData.followers || 0,
        following: profileData.following || 0,
        postsCount: profileData.postsCount || 0,
        profilePicture: profileData.profilePicture || `https://ui-avatars.com/api/?name=${targetUsername}&background=E1306C&color=fff`,
        externalUrl: profileData.externalUrl || '',
        isVerified: profileData.isVerified || false,
        isPrivate: false,
        engagementRate: engagement,
        avgLikes,
        avgComments,
        recentPosts: formattedPosts,
        posts: formattedPosts,
        manuallyScraped: true,
        scrapedAt: new Date().toISOString()
      };

      // Save to admin sync data storage
      const { data: existingData, error: loadError } = await supabase.functions.invoke('admin-data-storage', {
        body: { action: 'load' }
      });

      let syncData = { profiles: [], users: [], lastSync: null };
      
      if (!loadError && existingData?.exists && existingData?.data) {
        syncData = existingData.data;
      }

      // Check if profile already exists and update it, or add new
      const existingIndex = syncData.profiles.findIndex(
        (p: any) => p.username?.toLowerCase() === targetUsername.toLowerCase()
      );

      if (existingIndex >= 0) {
        // Update existing profile
        syncData.profiles[existingIndex] = {
          ...syncData.profiles[existingIndex],
          ...cacheData,
          growthHistory: syncData.profiles[existingIndex].growthHistory || []
        };
      } else {
        // Add new profile
        syncData.profiles.push({
          ...cacheData,
          syncedAt: new Date().toISOString(),
          ownerUserName: 'manual-admin',
          isConnectedToDashboard: false,
          growthHistory: [{
            date: new Date().toISOString(),
            followers: cacheData.followers
          }]
        });
      }

      syncData.lastSync = new Date().toISOString();

      // Save back to storage
      const { error: saveError } = await supabase.functions.invoke('admin-data-storage', {
        body: { action: 'save', data: syncData }
      });

      if (saveError) throw saveError;

      toast({
        title: "Perfil salvo!",
        description: `@${targetUsername} foi cacheado com sucesso`
      });

      // Reset form
      setUsername('');
      setTargetUsername('');
      setProfileData({
        username: '',
        fullName: '',
        bio: '',
        followers: 0,
        following: 0,
        postsCount: 0,
        profilePicture: '',
        externalUrl: '',
        isVerified: false,
        posts: Array(6).fill({ imageUrl: '', postUrl: '', likes: 0, comments: 0, caption: '' })
      });
      setEditingProfile(null);
      
      // Refresh the cached profiles list
      loadCachedProfiles();

    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados do perfil",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatNumber = (value: string): number => {
    // Remove non-numeric characters except dots and commas
    let clean = value.replace(/[^\d.,kmKM]/g, '');
    
    // Handle K/M suffixes
    if (clean.toLowerCase().includes('k')) {
      return Math.round(parseFloat(clean.replace(/[kK]/g, '')) * 1000);
    }
    if (clean.toLowerCase().includes('m')) {
      return Math.round(parseFloat(clean.replace(/[mM]/g, '')) * 1000000);
    }
    
    // Handle comma as thousand separator
    clean = clean.replace(/\./g, '').replace(/,/g, '');
    
    return parseInt(clean) || 0;
  };



  const getTotalPostsCount = (profile: any): number => {
    const raw = profile?.postsCount ?? profile?.posts ?? profile?.postCount ?? 0;
    if (Array.isArray(raw)) return raw.length;
    const num = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(num) ? num : 0;
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Scraper Manual de Perfis</h2>
            <p className="text-sm text-muted-foreground">
              Para perfis com restrição de idade que não podem ser buscados via API
            </p>
          </div>
        </div>

        {/* Step 1: Open Instagram */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 text-primary font-medium">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
            Abrir perfil do Instagram
          </div>
          
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="@username ou link do perfil"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
            <Button 
              onClick={handleOpenInstagram}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Instagram
            </Button>
          </div>

          {targetUsername && (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <CheckCircle className="w-4 h-4" />
              Perfil aberto: @{targetUsername}
            </div>
          )}
        </div>

        {/* Step 2: Fill form */}
        {targetUsername && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-medium">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
              Preencher dados do perfil (copie do Instagram)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username (readonly) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </Label>
                <Input
                  value={targetUsername}
                  readOnly
                  className="bg-secondary/30"
                />
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome Completo
                </Label>
                <Input
                  placeholder="Nome exibido no perfil"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="bg-secondary/50"
                />
              </div>

              {/* Followers */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Seguidores
                </Label>
                <Input
                  placeholder="Ex: 10.5K ou 1500"
                  value={profileData.followers > 0 ? String(profileData.followers) : ''}
                  onChange={(e) => setProfileData(prev => ({ ...prev, followers: formatNumber(e.target.value) }))}
                  className="bg-secondary/50"
                />
                {profileData.followers > 0 && (
                  <span className="text-xs text-muted-foreground">
                    = {profileData.followers.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Following */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Seguindo
                </Label>
                <Input
                  placeholder="Ex: 500"
                  value={profileData.following > 0 ? String(profileData.following) : ''}
                  onChange={(e) => setProfileData(prev => ({ ...prev, following: formatNumber(e.target.value) }))}
                  className="bg-secondary/50"
                />
              </div>

              {/* Posts Count */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Publicações
                </Label>
                <Input
                  placeholder="Número de posts"
                  value={profileData.postsCount > 0 ? String(profileData.postsCount) : ''}
                  onChange={(e) => setProfileData(prev => ({ ...prev, postsCount: formatNumber(e.target.value) }))}
                  className="bg-secondary/50"
                />
              </div>

              {/* Profile Picture */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Foto de Perfil
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Cole a URL da imagem aqui"
                    value={profileData.profilePicture}
                    onChange={(e) => setProfileData(prev => ({ ...prev, profilePicture: e.target.value }))}
                    className="bg-secondary/50 flex-1"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isUploadingImage}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={isUploadingImage}
                      className="whitespace-nowrap"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4 mr-1" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {profileData.profilePicture && (
                  <div className="flex items-center gap-3 p-2 bg-secondary/30 rounded">
                    <img 
                      src={storageAssetUrl(profileData.profilePicture)} 
                      alt="Preview" 
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <span className="text-xs text-green-500 truncate flex-1">{profileData.profilePicture.substring(0, 50)}...</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setProfileData(prev => ({ ...prev, profilePicture: '' }))}
                      className="text-red-500 h-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* External URL */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Link Externo (se houver)
                </Label>
                <Input
                  placeholder="Link na bio do perfil"
                  value={profileData.externalUrl}
                  onChange={(e) => setProfileData(prev => ({ ...prev, externalUrl: e.target.value }))}
                  className="bg-secondary/50"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Bio
                </Label>
                <Textarea
                  placeholder="Copie e cole a bio do perfil"
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  className="bg-secondary/50 min-h-[100px]"
                />
              </div>

              {/* Is Verified */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Perfil Verificado?
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={profileData.isVerified ? "default" : "outline"}
                    size="sm"
                    onClick={() => setProfileData(prev => ({ ...prev, isVerified: true }))}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={!profileData.isVerified ? "default" : "outline"}
                    size="sm"
                    onClick={() => setProfileData(prev => ({ ...prev, isVerified: false }))}
                  >
                    Não
                  </Button>
                </div>
              </div>
            </div>

            {/* Posts Section */}
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-primary font-medium">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">📸</span>
                Últimas 6 Publicações (opcional)
              </div>
              <p className="text-xs text-muted-foreground">
                Copie os dados das últimas 6 publicações. Clique com botão direito na imagem → "Copiar endereço da imagem"
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profileData.posts.map((post, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-secondary/30 rounded-lg space-y-2 border border-border/30 focus-within:ring-2 focus-within:ring-pink-500"
                    onPaste={(e) => handlePasteImage(e, index)}
                    tabIndex={0}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        Post {index + 1}
                      </span>
                      {(post.imageUrl || post.postUrl) && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>

                    {/* Paste Zone */}
                    <div 
                      className="border-2 border-dashed border-pink-500/50 rounded-lg p-3 text-center cursor-pointer hover:bg-pink-500/10 transition-colors"
                      onClick={() => {
                        // Focus this element to enable paste
                        (document.activeElement as HTMLElement)?.blur();
                      }}
                    >
                      <p className="text-xs text-pink-400 font-medium">📋 Clique aqui e cole (Ctrl+V)</p>
                      <p className="text-xs text-muted-foreground">Print do post</p>
                    </div>
                    
                    {/* Instagram Post URL */}
                    <div className="space-y-1">
                      <Label className="text-xs text-pink-400">Link do Post/Reel</Label>
                      <Input
                        placeholder="https://instagram.com/.../p/... ou /reel/..."
                        value={post.postUrl || ''}
                        onChange={(e) => {
                          const newPosts = [...profileData.posts];
                          newPosts[index] = { ...newPosts[index], postUrl: e.target.value };
                          setProfileData(prev => ({ ...prev, posts: newPosts }));
                        }}
                        className="bg-secondary/50 text-xs"
                      />
                    </div>

                    {/* Instagram Embed Preview */}
                    {post.postUrl && post.postUrl.includes('instagram.com') && (
                      <div className="relative">
                        <iframe
                          src={`${post.postUrl}embed/`}
                          className="w-full h-[200px] rounded border-0"
                          scrolling="no"
                          allowTransparency={true}
                          allow="encrypted-media"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(post.postUrl, '_blank')}
                          className="absolute top-1 right-1 h-6 w-6 p-0 bg-black/50 hover:bg-pink-500"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Image URL or Upload (alternative) */}
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Ou URL da imagem (opcional)</Label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="URL da imagem"
                          value={post.imageUrl}
                          onChange={(e) => {
                            const newPosts = [...profileData.posts];
                            newPosts[index] = { ...newPosts[index], imageUrl: e.target.value };
                            setProfileData(prev => ({ ...prev, posts: newPosts }));
                          }}
                          className="bg-secondary/50 text-xs flex-1"
                        />
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePostImageUpload(e, index)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={isUploadingImage}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            disabled={isUploadingImage}
                            className="h-9 px-2"
                          >
                            {isUploadingImage ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ImageIcon className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Image Preview (if no embed) */}
                    {post.imageUrl && !post.postUrl && (
                      <div className="relative">
                        <img 
                          src={storageAssetUrl(post.imageUrl)} 
                          alt={`Post ${index + 1}`}
                          className="w-full h-24 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Erro';
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newPosts = [...profileData.posts];
                            newPosts[index] = { ...newPosts[index], imageUrl: '' };
                            setProfileData(prev => ({ ...prev, posts: newPosts }));
                          }}
                          className="absolute top-1 right-1 h-6 w-6 p-0 bg-black/50 hover:bg-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Likes and Comments */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Likes</Label>
                        <Input
                          placeholder="0"
                          value={post.likes > 0 ? post.likes.toString() : ''}
                          onChange={(e) => {
                            const newPosts = [...profileData.posts];
                            newPosts[index] = { ...newPosts[index], likes: formatNumber(e.target.value) };
                            setProfileData(prev => ({ ...prev, posts: newPosts }));
                          }}
                          className="bg-secondary/50 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Comentários</Label>
                        <Input
                          placeholder="0"
                          value={post.comments > 0 ? post.comments.toString() : ''}
                          onChange={(e) => {
                            const newPosts = [...profileData.posts];
                            newPosts[index] = { ...newPosts[index], comments: formatNumber(e.target.value) };
                            setProfileData(prev => ({ ...prev, posts: newPosts }));
                          }}
                          className="bg-secondary/50 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {(profileData.fullName || profileData.followers > 0) && (
              <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Preview dos dados:</h3>
                <div className="flex items-center gap-4">
                  {profileData.profilePicture && !profileData.profilePicture.includes('ui-avatars') ? (
                    <img 
                      src={storageAssetUrl(profileData.profilePicture)} 
                      alt={targetUsername}
                      className="w-16 h-16 rounded-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                      {targetUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold">{profileData.fullName || targetUsername}</p>
                    <p className="text-sm text-muted-foreground">@{targetUsername}</p>
                    <div className="flex gap-4 mt-1 text-sm">
                      <span><strong>{profileData.followers.toLocaleString()}</strong> seguidores</span>
                      <span><strong>{profileData.following.toLocaleString()}</strong> seguindo</span>
                      <span><strong>{profileData.postsCount.toLocaleString()}</strong> posts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Save */}
            <div className="flex items-center gap-2 text-primary font-medium mt-6">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">3</span>
              Salvar dados do perfil
            </div>

            <Button 
              onClick={handleSaveToUser}
              disabled={isSaving}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Perfil no Sistema
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Cached Profiles List */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <Database className="w-5 h-5" />
            Perfis Cacheados Manualmente ({cachedProfiles.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={loadCachedProfiles}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : cachedProfiles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum perfil cacheado manualmente ainda.
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {cachedProfiles.map((profile) => (
              <div 
                key={profile.username}
                className={`p-3 rounded-lg border transition-colors ${
                  editingProfile === profile.username 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border/50 bg-secondary/30 hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {profile.profilePicture ? (
                    <img 
                      src={storageAssetUrl(profile.profilePicture)} 
                      alt={profile.username}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">@{profile.username}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.fullName || 'Sem nome'}
                    </p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span>{(profile.followers || 0).toLocaleString()} seg</span>
                      <span>{getTotalPostsCount(profile).toLocaleString('pt-BR')} posts</span>
                      <span>{Math.min((profile.recentPosts?.length || profile.posts?.length || 0), 6)}/6 salvos</span>
                      {profile.scrapedAt && (
                        <span className="text-green-500">
                          {new Date(profile.scrapedAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditProfile(profile)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProfile(profile.username)}
                      className="h-8 w-8 p-0 hover:bg-red-500/20 hover:border-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Show posts count indicator */}
                {(profile.recentPosts?.length || 0) > 0 && (
                  <div className="mt-2 flex gap-1">
                    {(profile.recentPosts || []).slice(0, 6).map((_, idx) => (
                      <div 
                        key={idx}
                        className="w-2 h-2 rounded-full bg-green-500"
                        title={`Post ${idx + 1} salvo`}
                      />
                    ))}
                    {Array(6 - (profile.recentPosts?.length || 0)).fill(0).map((_, idx) => (
                      <div 
                        key={`empty-${idx}`}
                        className="w-2 h-2 rounded-full bg-muted"
                        title={`Post ${(profile.recentPosts?.length || 0) + idx + 1} não salvo`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="glass-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Como usar o Scraper Manual
        </h3>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">1</span>
            <span>Digite o username ou link do perfil do Instagram com restrição de idade</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">2</span>
            <span>Clique em "Abrir Instagram" - uma nova janela abrirá com o perfil</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">3</span>
            <span>No Instagram, copie os dados: nome, seguidores, seguindo, posts, bio</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">4</span>
            <span>Para a foto de perfil: clique com botão direito na foto → "Copiar endereço da imagem"</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">5</span>
            <span>Preencha o formulário com os dados copiados</span>
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs flex-shrink-0">6</span>
            <span>Clique em "Salvar Perfil" para cachear os dados no sistema</span>
          </li>
        </ol>
        
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            <strong>Dica:</strong> Use seu navegador logado no Instagram para acessar perfis com restrição de idade. 
            Os dados salvos aqui serão usados quando o usuário tentar buscar esse perfil.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManualScraper;
