// Sync storage for SquareCloud users and Instagram profiles
// NOW WITH SERVER PERSISTENCE

import { supabase } from '@/integrations/supabase/client';
import { storageAssetUrl } from '@/lib/assetUrl';

export interface SquareCloudUser {
  ID: string;
  numero: string;
  dataDeExpiracao: number | string;
  blackList: boolean;
  igInstagram: string[];
  creativesUnlocked?: boolean; // Admin can unlock creatives for lifetime users
}

export interface SyncedInstagramProfile {
  username: string;
  followers: number;
  following: number;
  posts: number;
  profilePicUrl: string;
  fullName: string;
  bio: string;
  ownerUserId: string;
  ownerUserName: string;
  syncedAt: string;
  lastUpdated: string;
  isConnectedToDashboard: boolean;
  growthHistory: {
    date: string;
    followers: number;
  }[];
  // Admin control fields
  isBlocked?: boolean;
  blockedAt?: string;
  blockedReason?: string;
  lastStrategyReset?: string;
  creativesUsed?: number;
  creativesLimit?: number;
}

export interface InvalidProfile {
  username: string;
  markedAt: string;
  reason: string;
}

export interface SyncData {
  lastSyncDate: string | null;
  lastFullSyncDate: string | null;
  lastAutoSyncDate: string | null;
  isSyncComplete: boolean;
  users: SquareCloudUser[];
  profiles: SyncedInstagramProfile[];
  invalidProfiles: InvalidProfile[]; // Profiles that don't exist anymore
  syncQueue: string[]; // usernames waiting to be synced
  currentlySyncing: string | null;
  isPaused: boolean;
  isStopped: boolean;
  totalProfilesCount: number;
}

const SYNC_STORAGE_KEY = 'mro_sync_data';

const DEFAULT_SYNC_DATA: SyncData = {
  lastSyncDate: null,
  lastFullSyncDate: null,
  lastAutoSyncDate: null,
  isSyncComplete: false,
  users: [],
  profiles: [],
  invalidProfiles: [],
  syncQueue: [],
  currentlySyncing: null,
  isPaused: false,
  isStopped: false,
  totalProfilesCount: 0
};

const normalizeProfileUrls = (data: SyncData): SyncData => ({
  ...data,
  profiles: data.profiles.map((profile) => ({
    ...profile,
    profilePicUrl: storageAssetUrl(profile.profilePicUrl),
  })),
});

// Local cache for fast access
let localCache: SyncData | null = null;
let isSavingToServer = false;

// Get sync data from local storage (fast)
export const getSyncData = (): SyncData => {
  if (localCache) return localCache;
  
  try {
    const data = localStorage.getItem(SYNC_STORAGE_KEY);
    if (data) {
      localCache = normalizeProfileUrls({ ...DEFAULT_SYNC_DATA, ...JSON.parse(data) });
      return localCache;
    }
  } catch (e) {
    console.error('Error reading sync data:', e);
  }
  return DEFAULT_SYNC_DATA;
};

// Save to local storage (fast)
const saveToLocal = (data: SyncData): void => {
  localCache = data;
  localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(data));
};

// Save sync data to local AND server
export const saveSyncData = (data: SyncData): void => {
  // Always save locally first (fast)
  saveToLocal(data);
  
  // Save to server in background (don't block)
  if (!isSavingToServer) {
    isSavingToServer = true;
    saveToServer(data).finally(() => {
      isSavingToServer = false;
    });
  }
};

// Save to server (async, background) - uses public edge function
const saveToServer = async (data: SyncData): Promise<void> => {
  try {
    console.log('💾 Salvando dados do admin no servidor...');
    const { data: response, error } = await supabase.functions.invoke('admin-data-storage', {
      body: { action: 'save', data }
    });

    if (error) {
      console.error('Erro ao salvar no servidor:', error);
      return;
    }

    if (response?.success) {
      console.log('✅ Dados do admin salvos no servidor');
    } else {
      console.error('Erro ao salvar:', response?.error);
    }
  } catch (error) {
    console.error('Erro ao salvar dados do admin:', error);
  }
};

// Load from server (call on admin login) - uses public edge function
export const loadSyncDataFromServer = async (): Promise<SyncData> => {
  try {
    console.log('🔄 Carregando dados do admin do servidor...');
    
    // Use public edge function to load admin data
    const { data: response, error } = await supabase.functions.invoke('load-admin-data', {
      body: {}
    });

    if (error) {
      console.error('Erro ao carregar do servidor:', error);
      return getSyncData(); // Fallback to local
    }

    if (response?.success && response?.data) {
      console.log(`✅ Dados do admin carregados: ${response.data.profiles?.length || 0} perfis`);
      const serverData = normalizeProfileUrls({ ...DEFAULT_SYNC_DATA, ...response.data });
      saveToLocal(serverData);
      return serverData;
    }

    // No data on server - use local
    console.log('📦 Nenhum dado no servidor, usando local');
    return getSyncData();
  } catch (error) {
    console.error('Erro ao carregar dados do admin:', error);
    return getSyncData();
  }
};

// Force sync local data to server (call when needed) - uses public edge function
export const forceSyncToServer = async (): Promise<boolean> => {
  const data = getSyncData();
  try {
    console.log('💾 Forçando salvamento no servidor...');
    const { data: response, error } = await supabase.functions.invoke('admin-data-storage', {
      body: { action: 'save', data }
    });

    if (error) {
      console.error('Erro ao forçar sync:', error);
      return false;
    }

    if (response?.success) {
      console.log('✅ Dados salvos com sucesso no servidor');
    }

    return response?.success || false;
  } catch (err) {
    console.error('Erro ao forçar sync:', err);
    return false;
  }
};

export const shouldAutoSync = (): boolean => {
  const data = getSyncData();
  if (!data.lastAutoSyncDate) return true;
  
  const lastSync = new Date(data.lastAutoSyncDate);
  const now = new Date();
  
  // Check if it's a new day (after midnight)
  return lastSync.toDateString() !== now.toDateString();
};

export const wasProfileSyncedToday = (username: string): boolean => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  
  if (!profile) return false;
  
  const lastUpdated = new Date(profile.lastUpdated);
  const today = new Date();
  
  return lastUpdated.toDateString() === today.toDateString();
};

// Check if profile exists in dashboard session
export const isProfileInDashboard = (username: string): boolean => {
  try {
    const session = localStorage.getItem('mro_session');
    if (!session) return false;
    
    const parsed = JSON.parse(session);
    return parsed.profiles?.some((p: any) => 
      p.profile?.username?.toLowerCase() === username.toLowerCase()
    ) || false;
  } catch {
    return false;
  }
};

// Check if profile already exists in sync data
export const isProfileAlreadySynced = (username: string): boolean => {
  const data = getSyncData();
  return data.profiles.some(p => p.username.toLowerCase() === username.toLowerCase());
};

// Get all profiles (merged from dashboard + synced, no duplicates)
export const getAllMergedProfiles = (): SyncedInstagramProfile[] => {
  const syncData = getSyncData();
  
  // Start with synced profiles
  const mergedProfiles: SyncedInstagramProfile[] = syncData.profiles.map(p => ({ ...p }));
  
  console.log(`getAllMergedProfiles: ${syncData.profiles.length} perfis sincronizados encontrados`);
  
  // Get dashboard profiles
  try {
    const session = localStorage.getItem('mro_session');
    if (session) {
      const parsed = JSON.parse(session);
      const dashboardProfiles = parsed.profiles || [];
      
      console.log(`getAllMergedProfiles: ${dashboardProfiles.length} perfis do dashboard encontrados`);
      
      dashboardProfiles.forEach((dp: any) => {
        const username = dp.profile?.username?.toLowerCase();
        if (!username) return;
        
        // Check if already in merged list
        const existingIndex = mergedProfiles.findIndex(
          p => p.username.toLowerCase() === username
        );
        
        if (existingIndex >= 0) {
          // Update existing with dashboard connection status
          mergedProfiles[existingIndex].isConnectedToDashboard = true;
          // Update with latest data from dashboard
          mergedProfiles[existingIndex].followers = dp.profile.followers || mergedProfiles[existingIndex].followers;
          mergedProfiles[existingIndex].following = dp.profile.following || mergedProfiles[existingIndex].following;
          mergedProfiles[existingIndex].posts = dp.profile.posts || mergedProfiles[existingIndex].posts;
          mergedProfiles[existingIndex].profilePicUrl = dp.profile.profilePicUrl || mergedProfiles[existingIndex].profilePicUrl;
          mergedProfiles[existingIndex].fullName = dp.profile.fullName || mergedProfiles[existingIndex].fullName;
          mergedProfiles[existingIndex].bio = dp.profile.bio || mergedProfiles[existingIndex].bio;
        } else {
          // Add new from dashboard
          mergedProfiles.push({
            username: dp.profile.username,
            followers: dp.profile.followers || 0,
            following: dp.profile.following || 0,
            posts: dp.profile.posts || 0,
            profilePicUrl: dp.profile.profilePicUrl || '',
            fullName: dp.profile.fullName || '',
            bio: dp.profile.bio || '',
            ownerUserId: 'dashboard',
            ownerUserName: 'Dashboard',
            syncedAt: dp.startedAt || new Date().toISOString(),
            lastUpdated: dp.lastUpdated || new Date().toISOString(),
            isConnectedToDashboard: true,
            growthHistory: dp.growthHistory || []
          });
        }
      });
    }
  } catch (e) {
    console.error('Error merging dashboard profiles:', e);
  }
  
  console.log(`getAllMergedProfiles: Total ${mergedProfiles.length} perfis mesclados`);
  
  return mergedProfiles;
};

export const updateProfile = (profile: SyncedInstagramProfile): void => {
  try {
    const data = getSyncData();
    const existingIndex = data.profiles.findIndex(
      p => p.username.toLowerCase() === profile.username.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Update existing
      const existing = data.profiles[existingIndex];
      
      // Add to growth history if followers changed
      if (existing.followers !== profile.followers) {
        profile.growthHistory = [
          ...existing.growthHistory,
          { date: new Date().toISOString(), followers: profile.followers }
        ];
      } else {
        profile.growthHistory = existing.growthHistory;
      }
      
      // Manter dados existentes que não vieram na atualização
      profile.syncedAt = existing.syncedAt || profile.syncedAt;
      
      data.profiles[existingIndex] = profile;
    } else {
      // Add new profile
      profile.growthHistory = [
        { date: new Date().toISOString(), followers: profile.followers }
      ];
      data.profiles.push(profile);
    }
    
    // SALVAR LOCAL E SERVIDOR
    saveSyncData(data);
    
    // Verificar se salvou corretamente
    const verification = getSyncData();
    const saved = verification.profiles.find(
      p => p.username.toLowerCase() === profile.username.toLowerCase()
    );
    
    if (!saved) {
      console.error(`❌ ERRO: Perfil @${profile.username} não foi salvo!`);
      // Tentar salvar novamente
      const retryData = getSyncData();
      retryData.profiles.push(profile);
      saveSyncData(retryData);
    } else {
      console.log(`💾 Perfil @${profile.username} salvo com sucesso (${saved.followers} seguidores)`);
    }
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
  }
};

export const getTopGrowingProfiles = (limit: number = 5): SyncedInstagramProfile[] => {
  const allProfiles = getAllMergedProfiles();
  
  return allProfiles
    .filter(p => p.growthHistory.length >= 2)
    .map(p => {
      const first = p.growthHistory[0].followers;
      const last = p.growthHistory[p.growthHistory.length - 1].followers;
      return { ...p, growth: last - first };
    })
    .sort((a, b) => (b as any).growth - (a as any).growth)
    .slice(0, limit);
};

export const markSyncComplete = (): void => {
  const data = getSyncData();
  data.isSyncComplete = true;
  data.lastFullSyncDate = new Date().toISOString();
  data.lastAutoSyncDate = new Date().toISOString();
  data.syncQueue = [];
  data.currentlySyncing = null;
  data.isPaused = false;
  data.isStopped = false;
  saveSyncData(data);
};

export const stopSync = (): void => {
  const data = getSyncData();
  data.isStopped = true;
  data.isPaused = false;
  data.currentlySyncing = null;
  data.lastSyncDate = new Date().toISOString();
  saveSyncData(data);
};

export const pauseSync = (): void => {
  const data = getSyncData();
  data.isPaused = true;
  saveSyncData(data);
};

export const resumeSync = (): void => {
  const data = getSyncData();
  data.isPaused = false;
  data.isStopped = false;
  saveSyncData(data);
};

// Admin profile management functions
export const blockProfile = (username: string, reason?: string): void => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  if (profile) {
    profile.isBlocked = true;
    profile.blockedAt = new Date().toISOString();
    profile.blockedReason = reason || 'Bloqueado pelo administrador';
    saveSyncData(data);
  }
};

export const unblockProfile = (username: string): void => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  if (profile) {
    profile.isBlocked = false;
    profile.blockedAt = undefined;
    profile.blockedReason = undefined;
    saveSyncData(data);
  }
};

export const removeProfileFromSync = (username: string): void => {
  const data = getSyncData();
  data.profiles = data.profiles.filter(p => p.username.toLowerCase() !== username.toLowerCase());
  saveSyncData(data);
};

export const resetProfileStrategy = (username: string): void => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  if (profile) {
    profile.lastStrategyReset = new Date().toISOString();
    saveSyncData(data);
  }
};

export const getStrategyDaysRemaining = (profile: SyncedInstagramProfile): number => {
  // Check last strategy reset or syncedAt date
  const lastReset = profile.lastStrategyReset || profile.syncedAt;
  if (!lastReset) return 0;
  
  const lastDate = new Date(lastReset);
  const nextMonth = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 1);
  const now = new Date();
  
  const diff = nextMonth.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const canGenerateStrategy = (profile: SyncedInstagramProfile): boolean => {
  return getStrategyDaysRemaining(profile) === 0;
};

export const getCreativesInfo = (profile: SyncedInstagramProfile): { used: number; available: number; limit: number } => {
  const limit = profile.creativesLimit || 6;
  const used = profile.creativesUsed || 0;
  return {
    used,
    available: Math.max(0, limit - used),
    limit
  };
};

export const updateCreativesUsed = (username: string, count: number): void => {
  const data = getSyncData();
  const profile = data.profiles.find(p => p.username.toLowerCase() === username.toLowerCase());
  if (profile) {
    profile.creativesUsed = count;
    saveSyncData(data);
  }
};

// Admin function to unlock creatives for a lifetime user
export const unlockCreativesForSquareUser = (userId: string): void => {
  const data = getSyncData();
  const user = data.users.find(u => u.ID.toLowerCase() === userId.toLowerCase());
  if (user) {
    user.creativesUnlocked = true;
    saveSyncData(data);
  }
};

// Admin function to lock creatives for a lifetime user
export const lockCreativesForSquareUser = (userId: string): void => {
  const data = getSyncData();
  const user = data.users.find(u => u.ID.toLowerCase() === userId.toLowerCase());
  if (user) {
    user.creativesUnlocked = false;
    saveSyncData(data);
  }
};

// Check if a Square user has creatives unlocked
export const isUserCreativesUnlocked = (userId: string): boolean => {
  const data = getSyncData();
  const user = data.users.find(u => u.ID.toLowerCase() === userId.toLowerCase());
  return user?.creativesUnlocked || false;
};

// Check if user is lifetime (> 365 days)
export const isUserLifetime = (dataDeExpiracao: number | string): boolean => {
  const days = typeof dataDeExpiracao === 'string' ? parseInt(dataDeExpiracao) : dataDeExpiracao;
  return days > 365;
};

// Format days display for admin
export const formatUserDays = (dataDeExpiracao: number | string): string => {
  const days = typeof dataDeExpiracao === 'string' ? parseInt(dataDeExpiracao) : dataDeExpiracao;
  if (days > 365) {
    return 'Vitalício';
  }
  return `${days} dias`;
};

// Check if profile is marked as invalid (doesn't exist anymore)
export const isProfileInvalid = (username: string): boolean => {
  const data = getSyncData();
  return data.invalidProfiles?.some(p => p.username.toLowerCase() === username.toLowerCase()) || false;
};

// Mark a profile as invalid (doesn't exist)
export const markProfileAsInvalid = (username: string, reason: string = 'Perfil não encontrado'): void => {
  const data = getSyncData();
  if (!data.invalidProfiles) {
    data.invalidProfiles = [];
  }
  
  // Check if already marked
  if (data.invalidProfiles.some(p => p.username.toLowerCase() === username.toLowerCase())) {
    return;
  }
  
  data.invalidProfiles.push({
    username: username.toLowerCase(),
    markedAt: new Date().toISOString(),
    reason
  });
  
  saveSyncData(data);
  console.log(`🚫 Perfil @${username} marcado como inválido: ${reason}`);
};

// Unmark a profile as invalid (re-enable syncing)
export const unmarkProfileAsInvalid = (username: string): void => {
  const data = getSyncData();
  if (!data.invalidProfiles) return;
  
  data.invalidProfiles = data.invalidProfiles.filter(
    p => p.username.toLowerCase() !== username.toLowerCase()
  );
  
  saveSyncData(data);
  console.log(`✅ Perfil @${username} removido da lista de inválidos`);
};

// Get all invalid profiles
export const getInvalidProfiles = (): InvalidProfile[] => {
  const data = getSyncData();
  return data.invalidProfiles || [];
};

// Clear all invalid profiles
export const clearInvalidProfiles = (): void => {
  const data = getSyncData();
  data.invalidProfiles = [];
  saveSyncData(data);
  console.log('🗑️ Lista de perfis inválidos limpa');
};

// ================== CACHE SYSTEM (7 DAYS) ==================

const CACHE_DAYS = 7;

export interface CachedProfileResult {
  isCached: boolean;
  isRecent: boolean; // Less than 7 days
  cachedProfile: SyncedInstagramProfile | null;
  hasRecentPosts: boolean;
  daysSinceLastUpdate: number;
}

// Check if a profile has recent cached data (within 7 days)
export const getCachedProfileData = (username: string): CachedProfileResult => {
  const data = getSyncData();
  const normalizedUsername = username.toLowerCase().replace('@', '');
  
  const profile = data.profiles.find(
    p => p.username.toLowerCase() === normalizedUsername
  );
  
  if (!profile) {
    return {
      isCached: false,
      isRecent: false,
      cachedProfile: null,
      hasRecentPosts: false,
      daysSinceLastUpdate: -1
    };
  }
  
  const lastUpdated = new Date(profile.lastUpdated);
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const daysSinceLastUpdate = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Check if profile has recent posts data (we store followers, bio etc but might not have posts)
  // Since SyncedInstagramProfile doesn't have recentPosts array, we consider it doesn't have posts
  const hasRecentPosts = false; // Synced profiles don't store the 6 recent posts
  
  const isRecent = daysSinceLastUpdate < CACHE_DAYS;
  
  console.log(`📦 Cache check for @${normalizedUsername}: ${isRecent ? 'RECENT' : 'STALE'} (${daysSinceLastUpdate} days old)`);
  
  return {
    isCached: true,
    isRecent,
    cachedProfile: profile,
    hasRecentPosts,
    daysSinceLastUpdate
  };
};

// Convert cached SyncedInstagramProfile to InstagramProfile format
export const convertCachedToInstagramProfile = (cached: SyncedInstagramProfile): any => {
  return {
    username: cached.username,
    fullName: cached.fullName || cached.username,
    bio: cached.bio || '',
    followers: cached.followers || 0,
    following: cached.following || 0,
    posts: cached.posts || 0,
    profilePicUrl: cached.profilePicUrl || '',
    isBusinessAccount: true,
    category: '',
    externalUrl: '',
    recentPosts: [], // Empty - will be fetched separately if needed
    engagement: 0,
    avgLikes: 0,
    avgComments: 0
  };
};

// Update cached profile with new data
export const updateCachedProfile = (username: string, newData: Partial<SyncedInstagramProfile>): void => {
  const data = getSyncData();
  const normalizedUsername = username.toLowerCase().replace('@', '');
  
  const profileIndex = data.profiles.findIndex(
    p => p.username.toLowerCase() === normalizedUsername
  );
  
  if (profileIndex >= 0) {
    data.profiles[profileIndex] = {
      ...data.profiles[profileIndex],
      ...newData,
      lastUpdated: new Date().toISOString()
    };
    saveSyncData(data);
    console.log(`✅ Cache atualizado para @${normalizedUsername}`);
  }
};
