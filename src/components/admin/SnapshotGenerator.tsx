import { useState, useRef, useEffect } from 'react';
import { SyncedInstagramProfile } from '@/lib/syncStorage';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { storageAssetUrl } from '@/lib/assetUrl';
import html2canvas from 'html2canvas';
import { 
  Download, Image as ImageIcon, ChevronLeft, CheckSquare, 
  Loader2, X
} from 'lucide-react';

interface SnapshotGeneratorProps {
  profile: SyncedInstagramProfile;
  onClose: () => void;
  allProfiles?: SyncedInstagramProfile[];
  multiSelectMode?: boolean;
}

interface PrintSettings {
  colorType: 'gradient' | 'solid';
  gradientFrom: string;
  gradientTo: string;
  solidColor: string;
  showGrowth: boolean;
  showDate: boolean;
}

const GRADIENT_PRESETS = [
  { name: 'Preto/Cinza', from: '#1a1a1a', to: '#4a4a4a' },
  { name: 'Primary', from: 'hsl(var(--primary))', to: 'hsl(var(--mro-cyan))' },
  { name: 'Cyan', from: '#0891b2', to: '#22d3ee' },
  { name: 'Roxo', from: '#7c3aed', to: '#a855f7' },
  { name: 'Dourado', from: '#ca8a04', to: '#fbbf24' },
  { name: 'Verde', from: '#16a34a', to: '#4ade80' },
  { name: 'Rosa', from: '#db2777', to: '#f472b6' },
  { name: 'Vermelho', from: '#dc2626', to: '#f87171' },
];

const SOLID_COLORS = [
  { name: 'Preto', value: '#0a0a0a' },
  { name: 'Cinza Escuro', value: '#1f1f1f' },
  { name: 'Cinza', value: '#3f3f3f' },
  { name: 'Primary', value: 'hsl(var(--primary))' },
  { name: 'Cyan', value: '#0891b2' },
  { name: 'Roxo', value: '#7c3aed' },
  { name: 'Dourado', value: '#ca8a04' },
  { name: 'Verde', value: '#16a34a' },
];

const SnapshotGenerator = ({ 
  profile, 
  onClose, 
  allProfiles = [], 
  multiSelectMode = false 
}: SnapshotGeneratorProps) => {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([profile.username]);
  const [showMultiSelect, setShowMultiSelect] = useState(multiSelectMode);
  
  const [settings, setSettings] = useState<PrintSettings>({
    colorType: 'gradient',
    gradientFrom: GRADIENT_PRESETS[0].from,
    gradientTo: GRADIENT_PRESETS[0].to,
    solidColor: SOLID_COLORS[0].value,
    showGrowth: true,
    showDate: true
  });

  // Calculate growth for a profile
  const getProfileGrowth = (p: SyncedInstagramProfile) => {
    if (p.growthHistory.length < 2) return 0;
    const first = p.growthHistory[0].followers;
    const last = p.growthHistory[p.growthHistory.length - 1].followers;
    return last - first;
  };

  const getBackgroundStyle = () => {
    if (settings.colorType === 'solid') {
      return { background: settings.solidColor };
    }
    return { 
      background: `linear-gradient(135deg, ${settings.gradientFrom}, ${settings.gradientTo})` 
    };
  };

  const handleGradientPreset = (preset: typeof GRADIENT_PRESETS[0]) => {
    setSettings(prev => ({
      ...prev,
      colorType: 'gradient',
      gradientFrom: preset.from,
      gradientTo: preset.to
    }));
  };

  const handleSolidColor = (color: typeof SOLID_COLORS[0]) => {
    setSettings(prev => ({
      ...prev,
      colorType: 'solid',
      solidColor: color.value
    }));
  };

  const toggleProfileSelection = (username: string) => {
    setSelectedProfiles(prev => 
      prev.includes(username) 
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  const selectAllProfiles = () => {
    setSelectedProfiles(allProfiles.map(p => p.username));
  };

  const deselectAllProfiles = () => {
    setSelectedProfiles([]);
  };

  const downloadSnapshot = async (targetProfile: SyncedInstagramProfile) => {
    // Create a temporary container for this specific profile
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    const growth = getProfileGrowth(targetProfile);

    container.innerHTML = `
      <div style="
        width: 1080px; 
        height: 1920px; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        text-align: center;
        padding: 60px;
        ${settings.colorType === 'solid' 
          ? `background: ${settings.solidColor};` 
          : `background: linear-gradient(135deg, ${settings.gradientFrom}, ${settings.gradientTo});`
        }
      ">
        <img 
          src="${targetProfile.profilePicUrl}"
          style="
            width: 200px; 
            height: 200px; 
            border-radius: 50%; 
            object-fit: cover; 
            border: 6px solid rgba(255,255,255,0.3);
            margin-bottom: 40px;
          "
          crossorigin="anonymous"
        />
        <p style="
          font-size: 48px; 
          font-weight: bold; 
          color: white; 
          margin: 0;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        ">CLIENTE ATIVO</p>
        <p style="
          font-size: 36px; 
          font-weight: 600; 
          color: white; 
          margin-top: 20px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        ">@${targetProfile.username}</p>
        <p style="
          font-size: 24px; 
          color: rgba(255,255,255,0.8); 
          margin-top: 10px;
        ">${targetProfile.followers.toLocaleString()} seguidores</p>
        ${settings.showDate ? `
          <p style="
            font-size: 20px; 
            color: rgba(255,255,255,0.6); 
            margin-top: 40px;
          ">${new Date().toLocaleDateString('pt-BR')}</p>
        ` : ''}
        ${settings.showGrowth && growth > 0 ? `
          <div style="
            margin-top: 40px; 
            padding: 20px 40px; 
            background: rgba(255,255,255,0.2); 
            border-radius: 16px;
          ">
            <p style="
              font-size: 24px; 
              font-weight: bold; 
              color: white;
            ">+${growth.toLocaleString()} seguidores</p>
          </div>
        ` : ''}
      </div>
    `;

    try {
      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        allowTaint: true,
        width: 1080,
        height: 1920
      });

      const link = document.createElement('a');
      link.download = `cliente-ativo-${targetProfile.username}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      return true;
    } catch (error) {
      console.error('Error generating snapshot:', error);
      return false;
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleDownloadSingle = async () => {
    setIsGenerating(true);
    const success = await downloadSnapshot(profile);
    setIsGenerating(false);
    if (success) {
      toast({ title: "Snapshot baixado!" });
    } else {
      toast({ title: "Erro ao gerar snapshot", variant: "destructive" });
    }
  };

  const handleDownloadMultiple = async () => {
    if (selectedProfiles.length === 0) {
      toast({ title: "Selecione pelo menos um perfil", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    let successCount = 0;
    
    for (const username of selectedProfiles) {
      const targetProfile = allProfiles.find(p => p.username === username);
      if (targetProfile) {
        const success = await downloadSnapshot(targetProfile);
        if (success) successCount++;
        // Small delay between downloads to avoid browser blocking
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsGenerating(false);
    toast({ 
      title: `${successCount} snapshot(s) baixado(s)!`,
      description: successCount < selectedProfiles.length 
        ? `${selectedProfiles.length - successCount} falharam` 
        : undefined
    });
  };

  const growth = getProfileGrowth(profile);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Snapshot Cliente Ativo
        </h4>
        {allProfiles.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMultiSelect(!showMultiSelect)}
            className="cursor-pointer"
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            {showMultiSelect ? 'Único' : 'Múltiplos'}
          </Button>
        )}
      </div>

      {/* Multi-select mode */}
      {showMultiSelect && allProfiles.length > 1 && (
        <div className="mb-6 p-4 bg-secondary/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium">
              Selecionar Perfis ({selectedProfiles.length}/{allProfiles.length})
            </Label>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={selectAllProfiles}
                className="cursor-pointer text-xs"
              >
                Todos
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={deselectAllProfiles}
                className="cursor-pointer text-xs"
              >
                Nenhum
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {allProfiles.map(p => (
              <label 
                key={p.username}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  selectedProfiles.includes(p.username) 
                    ? 'bg-primary/20 border border-primary/50' 
                    : 'bg-secondary/50 hover:bg-secondary'
                }`}
              >
                <Checkbox
                  checked={selectedProfiles.includes(p.username)}
                  onCheckedChange={() => toggleProfileSelection(p.username)}
                />
                {p.profilePicUrl && !p.profilePicUrl.includes('dicebear') ? (
                  <img 
                    src={storageAssetUrl(p.profilePicUrl)}
                    alt={p.username}
                    className="w-6 h-6 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{p.username?.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <span className="text-sm truncate">@{p.username}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Color Settings */}
      <div className="space-y-4 mb-6">
        {/* Color Type Toggle */}
        <div className="flex gap-2 bg-secondary/50 rounded-lg p-1 w-fit">
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, colorType: 'gradient' }))}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              settings.colorType === 'gradient' 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Gradiente
          </button>
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, colorType: 'solid' }))}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              settings.colorType === 'solid' 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Cor Sólida
          </button>
        </div>

        {/* Gradient Presets */}
        {settings.colorType === 'gradient' && (
          <div>
            <Label className="text-sm mb-2 block">Gradiente</Label>
            <div className="flex flex-wrap gap-2">
              {GRADIENT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleGradientPreset(preset)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all cursor-pointer ${
                    settings.gradientFrom === preset.from && settings.gradientTo === preset.to
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Solid Colors */}
        {settings.colorType === 'solid' && (
          <div>
            <Label className="text-sm mb-2 block">Cor</Label>
            <div className="flex flex-wrap gap-2">
              {SOLID_COLORS.map((color, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSolidColor(color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all cursor-pointer ${
                    settings.solidColor === color.value
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ background: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.showGrowth}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showGrowth: checked }))}
            />
            <Label className="text-sm">Mostrar +seguidores</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.showDate}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showDate: checked }))}
            />
            <Label className="text-sm">Mostrar data</Label>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div 
        ref={printRef}
        className="p-6 rounded-lg aspect-[9/16] max-w-[200px] mx-auto flex flex-col items-center justify-center text-center"
        style={getBackgroundStyle()}
      >
        {profile.profilePicUrl && !profile.profilePicUrl.includes('dicebear') ? (
          <img 
            src={storageAssetUrl(profile.profilePicUrl)}
            alt={profile.username}
            className="w-16 h-16 rounded-full object-cover border-2 border-white/30 mb-3"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 mb-3">
            <span className="text-xl font-bold text-white">{profile.username?.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <p className="text-lg font-display font-bold text-white drop-shadow-lg">CLIENTE ATIVO</p>
        <p className="text-sm font-semibold text-white mt-1 drop-shadow">@{profile.username}</p>
        <p className="text-xs text-white/80 mt-0.5">
          {profile.followers.toLocaleString()} seguidores
        </p>
        {settings.showDate && (
          <p className="text-xs text-white/60 mt-3">
            {new Date().toLocaleDateString('pt-BR')}
          </p>
        )}
        {settings.showGrowth && growth > 0 && (
          <div className="mt-3 px-3 py-1.5 bg-white/20 rounded-lg">
            <p className="text-xs font-bold text-white">+{growth.toLocaleString()} seguidores</p>
          </div>
        )}
      </div>
      
      {/* Download Buttons */}
      <div className="flex gap-2 mt-4">
        {showMultiSelect && selectedProfiles.length > 0 ? (
          <Button 
            type="button" 
            variant="gradient"
            className="flex-1 cursor-pointer"
            onClick={handleDownloadMultiple}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Baixar {selectedProfiles.length} Snapshot(s)
              </>
            )}
          </Button>
        ) : (
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1 cursor-pointer"
            onClick={handleDownloadSingle}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Baixar Snapshot
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SnapshotGenerator;
