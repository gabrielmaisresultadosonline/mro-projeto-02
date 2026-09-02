import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, X, Check, Loader2, Clipboard, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InstagramProfile } from '@/types/instagram';
import { readInstagramScreenshot, restoreStoredScreenshot } from '@/lib/instagramScreenshot';

interface ProfileScreenshotUploadProps {
  username: string;
  squarecloudUsername: string;
  existingScreenshotUrl?: string | null;
  uploadCount?: number;
  analysisCompleted?: boolean;
  onScreenshotUploaded: (url: string) => void;
  onScreenshotRemoved?: () => void;
  onAnalysisComplete?: (analysis: any) => void;
  onProfileDataExtracted?: (profileData: Partial<InstagramProfile>) => void;
  onAnalysisApplied?: (payload: { analysis: any; profileData?: Partial<InstagramProfile> }) => void;
}

export const ProfileScreenshotUpload = ({
  username,
  squarecloudUsername,
  existingScreenshotUrl,
  uploadCount = 0,
  analysisCompleted = false,
  onScreenshotUploaded,
  onScreenshotRemoved,
  onAnalysisComplete,
  onProfileDataExtracted,
  onAnalysisApplied
}: ProfileScreenshotUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Lock uploads only if analysis was already completed successfully
  // If analysis never completed, allow retry regardless of upload count
  const isLocked = analysisCompleted && uploadCount >= 2;

  useEffect(() => {
    setPreviewUrl(existingScreenshotUrl || null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [username, existingScreenshotUrl]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) processFile(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Por favor, selecione uma imagem'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo 10MB'); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setPreviewUrl(event.target?.result as string);
    reader.readAsDataURL(file);
    toast.success('Imagem selecionada! Clique em "Enviar e Analisar"');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) { toast.error('Selecione uma imagem primeiro'); return; }
    setIsUploading(true);

    try {
      const previousScreenshotUrl = existingScreenshotUrl || null;
      const ocrResult = await readInstagramScreenshot(selectedFile);

      if (ocrResult.detectedUsername && ocrResult.detectedUsername !== username.toLowerCase()) {
        toast.error(`O print enviado é do perfil @${ocrResult.detectedUsername}, mas a conta cadastrada é @${username}. Envie o print real do perfil correto.`);
        setSelectedFile(null);
        setPreviewUrl(previousScreenshotUrl);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        const { data, error } = await supabase.functions.invoke('upload-profile-screenshot', {
          body: {
            username,
            squarecloud_username: squarecloudUsername,
            image_base64: base64.split(',')[1],
            content_type: selectedFile.type
          }
        });

        if (error) throw error;

        if (data?.url) {
          setPreviewUrl(data.url);
          onScreenshotUploaded(data.url);
          setSelectedFile(null);
          toast.success('Print enviado com sucesso!');

          setIsAnalyzing(true);
          try {
            const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-profile-screenshot', {
              body: {
                screenshot_url: data.url,
                username,
                ocr_text: ocrResult.text,
                image_base64: base64.split(',')[1],
                content_type: selectedFile.type,
              }
            });

            if (analysisError) throw analysisError;

            if (analysisData?.success === false) {
              if (analysisData?.error === 'not_instagram_profile' || analysisData?.error === 'username_mismatch') {
                // CRITICAL: Restore the previously saved screenshot in DB.
                // Only an admin can permanently remove a saved print.
                await restoreStoredScreenshot({
                  username,
                  squarecloudUsername,
                  screenshotUrl: previousScreenshotUrl,
                });
                toast.error(
                  analysisData?.message ||
                    (analysisData?.error === 'username_mismatch'
                      ? `O print enviado não corresponde ao perfil @${username}. Troque o print e tente novamente.`
                      : 'Este print não parece ser de um perfil do Instagram. Envie um print real do perfil que está utilizando.')
                );
                // Keep the previously saved print visible; do NOT call onScreenshotRemoved.
                setPreviewUrl(previousScreenshotUrl);
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                if (!previousScreenshotUrl) {
                  // Only when there was no saved print before, tell parent there's nothing.
                  onScreenshotRemoved?.();
                }
                return;
              }
            }

            const extracted = analysisData?.extracted_data;
            let profileUpdate: Partial<InstagramProfile> | undefined;
            if (onProfileDataExtracted && extracted) {
              profileUpdate = {
                followers: Number(extracted.followers) || 0,
                following: Number(extracted.following) || 0,
                posts: Number(extracted.posts_count) || 0,
                bio: extracted.bio || '',
                fullName: extracted.full_name || '',
                isBusinessAccount: extracted.is_business || false,
                category: extracted.category || '',
                externalUrl: extracted.external_link || '',
                needsScreenshotAnalysis: false,
                dataSource: 'screenshot',
              };
            }

            if (analysisData?.analysis && onAnalysisApplied) {
              onAnalysisApplied({
                analysis: analysisData.analysis,
                profileData: profileUpdate,
              });
            } else {
              if (analysisData?.analysis && onAnalysisComplete) {
                onAnalysisComplete(analysisData.analysis);
              }
              if (onProfileDataExtracted && profileUpdate) {
                onProfileDataExtracted(profileUpdate);
              }
            }

            if (profileUpdate && onProfileDataExtracted && !onAnalysisApplied) {
              onProfileDataExtracted(profileUpdate);
            }

            toast.success('Análise concluída! Dados do perfil atualizados.');
          } catch (analysisErr) {
            console.error('Analysis error:', analysisErr);
            await restoreStoredScreenshot({
              username,
              squarecloudUsername,
              screenshotUrl: previousScreenshotUrl,
            });
            setPreviewUrl(previousScreenshotUrl);
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            toast.error('Erro na análise. Tente novamente.');
          } finally {
            setIsAnalyzing(false);
          }
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar print. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(existingScreenshotUrl || null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasExistingScreenshot = !!existingScreenshotUrl;
  const hasNewSelection = !!selectedFile;
  const showUploadButton = hasNewSelection && previewUrl !== existingScreenshotUrl;

  if (isLocked && previewUrl) {
    return (
      <Card className="glass-card glow-border">
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            Print Salvo Definitivamente
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Você já enviou o print do perfil 2 vezes. Não é possível alterar novamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 py-3 sm:px-6 sm:py-4">
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img src={previewUrl} alt="Print do perfil" className="w-full max-h-[300px] sm:max-h-[400px] object-contain bg-muted" />
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-green-500/90 text-white px-2 py-1 rounded text-xs">
              <Check className="w-3 h-3" />
              Salvo definitivamente
            </div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
            <p className="text-yellow-600 dark:text-yellow-400">
              ⚠️ O limite de 2 envios foi atingido. O print atual não pode mais ser alterado.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card glow-border">
      <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Print do Perfil
          {uploadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">({uploadCount}/2 envios)</span>
          )}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {hasExistingScreenshot 
            ? uploadCount === 1
              ? 'Print atual do seu perfil. Você pode trocar mais 1 vez.'
              : 'Print atual do seu perfil.'
            : '📸 Envie um print do seu perfil do Instagram para análise completa com I.A. Todos os dados (seguidores, seguindo, posts, bio, nicho) serão extraídos automaticamente.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 py-3 sm:px-6 sm:py-4">
        {previewUrl ? (
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img src={previewUrl} alt="Print do perfil" className="w-full max-h-[300px] sm:max-h-[400px] object-contain bg-muted" />
            {!isUploading && !isAnalyzing && !analysisCompleted && (
              <Button variant="destructive" size="icon" className="absolute top-2 right-2 w-8 h-8" onClick={handleRemove}>
                <X className="w-4 h-4" />
              </Button>
            )}
            {hasExistingScreenshot && !hasNewSelection && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-green-500/90 text-white px-2 py-1 rounded text-xs">
                <Check className="w-3 h-3" />
                Salvo
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div className="sm:hidden">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm">Toque para selecionar imagem</span>
              </Button>
            </div>
            
            <div ref={dropZoneRef} tabIndex={0}
              className="hidden sm:block border-2 border-dashed border-border rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              onClick={(e) => { e.currentTarget.focus(); toast.info('Área selecionada! Use Ctrl+V para colar a imagem'); }}
            >
              <Clipboard className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-muted-foreground mb-2 text-sm sm:text-base">
                Clique aqui e use <span className="text-primary font-medium">Ctrl+V</span> para colar
              </p>
              <p className="text-xs text-muted-foreground">Cole uma imagem da área de transferência</p>
            </div>
            
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>
            
            <Button variant="outline" className="hidden sm:flex w-full" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Selecionar Imagem do Computador
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">PNG, JPG ou WEBP até 10MB</p>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

        <div className="flex flex-col sm:flex-row gap-2">
          {previewUrl && !hasNewSelection && (
            <Button onClick={() => fileInputRef.current?.click()} className="flex-1" variant="outline" size="default">
              <Upload className="w-4 h-4 mr-2" />
              Trocar Imagem
            </Button>
          )}

          {showUploadButton && (
            <Button onClick={handleUpload} disabled={isUploading || isAnalyzing} className="flex-1 bg-primary" size="default">
              {isUploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>)
               : isAnalyzing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisando com I.A...</>)
               : (<><Check className="w-4 h-4 mr-2" />Enviar e Analisar</>)}
            </Button>
          )}
        </div>

        <div className="bg-secondary/50 rounded-lg p-2 sm:p-3 text-xs sm:text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">📸 Como tirar um bom print:</p>
          <ul className="list-disc list-inside space-y-0.5 sm:space-y-1">
            <li>Abra seu perfil no Instagram</li>
            <li>Certifique-se que mostra seguidores, seguindo e posts</li>
            <li>Tire um print da tela inteira do perfil</li>
            <li>Nossa IA vai extrair todos os dados e analisar automaticamente!</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
