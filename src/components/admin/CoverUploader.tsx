import { useState, useRef } from 'react';
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Link as LinkIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { storageAssetUrl } from '@/lib/assetUrl';

interface CoverUploaderProps {
  currentUrl: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
  folder?: string;
  id?: string;
}

const CoverUploader = ({ currentUrl, onUpload, onRemove, folder = 'covers', id }: CoverUploaderProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [linkUrl, setLinkUrl] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erro", description: "Selecione um arquivo de imagem (JPG ou PNG)", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Erro", description: "Arquivo muito grande. Máximo 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      // Delete old file if exists and is from our storage
      if (currentUrl && currentUrl.includes('supabase.co/storage')) {
        const oldPath = extractPathFromUrl(currentUrl);
        if (oldPath) {
          await supabase.storage.from('assets').remove([oldPath]);
        }
      }

      // Generate unique filename
      const ext = file.name.split('.').pop();
      const fileName = `${folder}/${id || Date.now()}_${Date.now()}.${ext}`;

      // Upload new file
      const { data, error } = await supabase.storage
        .from('assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(data.path);

      onUpload(publicUrl);
      toast({ title: "Capa enviada!" });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLinkSubmit = () => {
    if (!linkUrl.trim()) return;
    onUpload(linkUrl.trim());
    setLinkUrl('');
    toast({ title: "Link salvo!" });
  };

  const handleRemove = async () => {
    if (currentUrl && currentUrl.includes('supabase.co/storage')) {
      const path = extractPathFromUrl(currentUrl);
      if (path) {
        await supabase.storage.from('assets').remove([path]);
      }
    }
    onRemove();
  };

  const extractPathFromUrl = (url: string): string | null => {
    try {
      const match = url.match(/\/storage\/v1\/object\/public\/assets\/(.+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        Capa (1080x1350)
      </Label>

      {/* Current cover preview */}
      {currentUrl && (
        <div className="relative w-full max-w-[200px] aspect-[1080/1350] rounded-lg overflow-hidden bg-secondary group">
          <img 
            src={storageAssetUrl(currentUrl)} 
            alt="Capa" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="w-4 h-4 text-destructive-foreground" />
          </button>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
            mode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Upload className="w-3 h-3" />
          Arquivo
        </button>
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
            mode === 'link' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LinkIcon className="w-3 h-3" />
          Link
        </button>
      </div>

      {/* Upload mode */}
      {mode === 'upload' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {currentUrl ? 'Substituir capa' : 'Enviar capa'}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">JPG ou PNG, máx. 5MB</p>
        </div>
      )}

      {/* Link mode */}
      {mode === 'link' && (
        <div className="flex gap-2">
          <Input
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="bg-secondary/50 text-sm"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleLinkSubmit}
            disabled={!linkUrl.trim()}
            className="cursor-pointer"
          >
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
};

export default CoverUploader;
