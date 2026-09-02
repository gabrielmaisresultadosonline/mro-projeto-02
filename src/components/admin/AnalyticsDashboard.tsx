import { useState } from 'react';
import { SyncedInstagramProfile, getSyncData, saveSyncData } from '@/lib/syncStorage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { storageAssetUrl } from '@/lib/assetUrl';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  TrendingUp, Users, Calendar, RefreshCw, ArrowUpDown, 
  GitCompare, CheckCircle, Clock, ChevronDown, ChevronUp
} from 'lucide-react';

interface AnalyticsDashboardProps {
  profiles: SyncedInstagramProfile[];
  onProfilesUpdate: () => void;
}

type SortMode = 'followers' | 'recent' | 'growth';

const AnalyticsDashboard = ({ profiles, onProfilesUpdate }: AnalyticsDashboardProps) => {
  const { toast } = useToast();
  const [sortMode, setSortMode] = useState<SortMode>('followers');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparingProfile, setComparingProfile] = useState<string | null>(null);
  const [comparisonResults, setComparisonResults] = useState<{
    username: string;
    oldFollowers: number;
    newFollowers: number;
    growth: number;
    lastSync: string;
  }[]>([]);
  const [showChart, setShowChart] = useState(true);
  const [showProfiles, setShowProfiles] = useState(false);

  // Sort profiles
  const sortedProfiles = [...profiles].sort((a, b) => {
    switch (sortMode) {
      case 'followers':
        return b.followers - a.followers;
      case 'recent':
        return new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime();
      case 'growth':
        const growthA = a.growthHistory.length >= 2 
          ? a.growthHistory[a.growthHistory.length - 1].followers - a.growthHistory[0].followers 
          : 0;
        const growthB = b.growthHistory.length >= 2 
          ? b.growthHistory[b.growthHistory.length - 1].followers - b.growthHistory[0].followers 
          : 0;
        return growthB - growthA;
      default:
        return 0;
    }
  });

  // Prepare chart data for selected profiles or top 5
  const chartProfiles = selectedForCompare.length > 0 
    ? profiles.filter(p => selectedForCompare.includes(p.username))
    : sortedProfiles.slice(0, 5);

  // Generate chart data merging all dates
  const generateChartData = () => {
    const allDates = new Set<string>();
    chartProfiles.forEach(p => {
      p.growthHistory.forEach(h => {
        const dateStr = new Date(h.date).toLocaleDateString('pt-BR');
        allDates.add(dateStr);
      });
    });

    const sortedDates = Array.from(allDates).sort((a, b) => {
      const dateA = a.split('/').reverse().join('-');
      const dateB = b.split('/').reverse().join('-');
      return dateA.localeCompare(dateB);
    });

    return sortedDates.map(date => {
      const entry: any = { date };
      chartProfiles.forEach(p => {
        const history = p.growthHistory.find(h => 
          new Date(h.date).toLocaleDateString('pt-BR') === date
        );
        if (history) {
          entry[p.username] = history.followers;
        }
      });
      return entry;
    });
  };

  const chartData = generateChartData();

  // Colors for chart lines
  const chartColors = [
    'hsl(var(--primary))',
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16', // lime
  ];

  // Toggle profile selection for compare
  const toggleCompareSelection = (username: string) => {
    setSelectedForCompare(prev => 
      prev.includes(username) 
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  // Compare profile - fetch new data
  const compareProfile = async (profile: SyncedInstagramProfile) => {
    setComparingProfile(profile.username);

    try {
      const { data, error } = await supabase.functions.invoke('sync-instagram-profile', {
        body: { username: profile.username }
      });

      if (error) throw error;

      if (data?.success && data?.profile) {
        const newData = data.profile;
        const oldFollowers = profile.followers;
        const newFollowers = newData.followers || oldFollowers;
        const growth = newFollowers - oldFollowers;

        // Update the profile in storage
        const syncData = getSyncData();
        const profileIndex = syncData.profiles.findIndex(
          p => p.username.toLowerCase() === profile.username.toLowerCase()
        );

        if (profileIndex >= 0) {
          // Add new entry to growth history
          syncData.profiles[profileIndex].followers = newFollowers;
          syncData.profiles[profileIndex].following = newData.following || profile.following;
          syncData.profiles[profileIndex].lastUpdated = new Date().toISOString();
          syncData.profiles[profileIndex].growthHistory.push({
            date: new Date().toISOString(),
            followers: newFollowers
          });
          saveSyncData(syncData);
        }

        // Add to comparison results
        setComparisonResults(prev => {
          const existing = prev.findIndex(r => r.username === profile.username);
          const newResult = {
            username: profile.username,
            oldFollowers,
            newFollowers,
            growth,
            lastSync: profile.lastUpdated
          };
          
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newResult;
            return updated;
          }
          return [...prev, newResult];
        });

        toast({
          title: growth > 0 ? '📈 Crescimento detectado!' : growth < 0 ? '📉 Queda detectada' : 'Sem alteração',
          description: `@${profile.username}: ${oldFollowers.toLocaleString()} → ${newFollowers.toLocaleString()} (${growth > 0 ? '+' : ''}${growth.toLocaleString()})`,
        });

        onProfilesUpdate();
      } else {
        toast({
          title: 'Não foi possível atualizar',
          description: data?.message || 'Perfil não encontrado ou API indisponível',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error comparing profile:', error);
      toast({
        title: 'Erro ao comparar',
        description: 'Não foi possível buscar dados atualizados',
        variant: 'destructive'
      });
    } finally {
      setComparingProfile(null);
    }
  };

  // Get growth for a profile
  const getGrowth = (profile: SyncedInstagramProfile) => {
    if (profile.growthHistory.length < 2) return 0;
    return profile.growthHistory[profile.growthHistory.length - 1].followers - profile.growthHistory[0].followers;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-display font-bold">Analytics de Crescimento</h2>
        </div>
        
        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ordenar por:</span>
          <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setSortMode('followers')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer flex items-center gap-1 ${
                sortMode === 'followers' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4" />
              Seguidores
            </button>
            <button
              type="button"
              onClick={() => setSortMode('recent')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer flex items-center gap-1 ${
                sortMode === 'recent' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Clock className="w-4 h-4" />
              Mais Recente
            </button>
            <button
              type="button"
              onClick={() => setSortMode('growth')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer flex items-center gap-1 ${
                sortMode === 'growth' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Crescimento
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonResults.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-primary">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              Resultados da Comparação
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setComparisonResults([])}
            >
              Limpar
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {comparisonResults.map(result => (
              <div 
                key={result.username} 
                className={`p-3 rounded-lg ${
                  result.growth > 0 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : result.growth < 0 
                      ? 'bg-red-500/10 border border-red-500/30'
                      : 'bg-secondary/50'
                }`}
              >
                <p className="font-medium text-sm">@{result.username}</p>
                <p className="text-xs text-muted-foreground">
                  {result.oldFollowers.toLocaleString()} → {result.newFollowers.toLocaleString()}
                </p>
                <p className={`text-lg font-bold ${
                  result.growth > 0 ? 'text-green-500' : result.growth < 0 ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {result.growth > 0 ? '+' : ''}{result.growth.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Gráfico de Crescimento
            {selectedForCompare.length > 0 && (
              <span className="text-xs px-2 py-1 bg-primary/20 rounded-full">
                {selectedForCompare.length} selecionados
              </span>
            )}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowChart(!showChart)}
          >
            {showChart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showChart ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>

        {showChart && chartData.length > 0 && (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [value.toLocaleString(), `@${name}`]}
                />
                <Legend />
                {chartProfiles.map((profile, index) => (
                  <Line
                    key={profile.username}
                    type="monotone"
                    dataKey={profile.username}
                    stroke={chartColors[index % chartColors.length]}
                    strokeWidth={2}
                    dot={{ fill: chartColors[index % chartColors.length], strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name={`@${profile.username}`}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length === 0 && (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhum dado de histórico disponível para exibir no gráfico
          </div>
        )}
      </div>

      {/* Profile Cards Section - Hidden by default */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Perfis ({sortedProfiles.length})
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowProfiles(!showProfiles)}
          >
            {showProfiles ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            {showProfiles ? 'Ocultar Perfis' : 'Mostrar Perfis'}
          </Button>
        </div>
      </div>

      {showProfiles && (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedProfiles.map((profile, index) => {
          const growth = getGrowth(profile);
          const isSelected = selectedForCompare.includes(profile.username);
          const isComparing = comparingProfile === profile.username;
          const colorIndex = chartProfiles.findIndex(p => p.username === profile.username);

          return (
            <div 
              key={profile.username}
              className={`glass-card p-4 transition-all relative ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
            >
              {/* Selection indicator */}
              {colorIndex >= 0 && (
                <div 
                  className="absolute top-2 left-2 w-3 h-3 rounded-full"
                  style={{ backgroundColor: chartColors[colorIndex % chartColors.length] }}
                />
              )}

              {/* Profile Photo */}
              <div className="flex flex-col items-center mb-3">
                {profile.profilePicUrl && !profile.profilePicUrl.includes('dicebear') ? (
                  <img
                    src={storageAssetUrl(profile.profilePicUrl)}
                    alt={profile.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-border mb-2"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border-2 border-border mb-2">
                    <span className="text-xl font-bold text-muted-foreground">{profile.username?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <p className="font-medium text-sm">@{profile.username}</p>
                <p className="text-xs text-muted-foreground truncate max-w-full">
                  {profile.fullName || 'Sem nome'}
                </p>
              </div>

              {/* Stats */}
              <div className="space-y-2 text-center mb-3">
                <div className="p-2 rounded-lg bg-secondary/50">
                  <p className="text-lg font-bold">{profile.followers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">seguidores</p>
                </div>
                
                {growth !== 0 && (
                  <div className={`p-2 rounded-lg ${
                    growth > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    <p className={`text-sm font-bold ${
                      growth > 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {growth > 0 ? '+' : ''}{growth.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">crescimento</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {new Date(profile.syncedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => toggleCompareSelection(profile.username)}
                >
                  <CheckCircle className={`w-3 h-3 mr-1 ${isSelected ? '' : 'opacity-50'}`} />
                  {isSelected ? 'Selecionado' : 'Selecionar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => compareProfile(profile)}
                  disabled={isComparing}
                  className="text-xs"
                >
                  {isComparing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <GitCompare className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {profiles.length === 0 && (
        <div className="glass-card p-12 text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhum perfil sincronizado para análise.
            <br />
            Sincronize perfis na aba "Sincronizar" para ver os analytics.
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
