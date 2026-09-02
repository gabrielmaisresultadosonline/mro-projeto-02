import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { toast } from "sonner";
import { Upload, Loader2, Link, Image } from "lucide-react";

interface VideoThumbnailUploaderProps {
  thumbnailUrl: string;
  onUpload: (url: string) => void;
}

export const VideoThumbnailUploader = ({ thumbnailUrl, onUpload }: VideoThumbnailUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [linkValue, setLinkValue] = useState(thumbnailUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `video-thumb-${Date.now()}.${ext}`;
      const filePath = `video-thumbnails/${fileName}`;
      
      const { error } = await supabase.storage
        .from("metodo-seguidor-content")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });
      
      if (error) throw error;
      
      const { data } = supabase.storage.from("metodo-seguidor-content").getPublicUrl(filePath);
      onUpload(data.publicUrl);
      toast.success("Capa enviada!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar capa");
    } finally {
      setUploading(false);
    }
  };

  const handleLinkSubmit = () => {
    if (linkValue.trim()) {
      onUpload(linkValue.trim());
      toast.success("Link da capa salvo!");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "upload" ? "default" : "outline"}
          onClick={() => setMode("upload")}
          className={mode === "upload" ? "bg-amber-500 text-black" : "border-gray-700"}
        >
          <Upload className="w-4 h-4 mr-1" />
          Arquivo
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "link" ? "default" : "outline"}
          onClick={() => setMode("link")}
          className={mode === "link" ? "bg-amber-500 text-black" : "border-gray-700"}
        >
          <Link className="w-4 h-4 mr-1" />
          Link
        </Button>
      </div>

      {mode === "upload" ? (
        <div>
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
            disabled={uploading}
            className="w-full border-gray-700 border-dashed"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
            ) : (
              <><Image className="w-4 h-4 mr-2" />Selecionar capa (1080x1920)</>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder="https://exemplo.com/imagem.jpg"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            className="bg-gray-800 border-gray-700 flex-1"
          />
          <Button
            type="button"
            onClick={handleLinkSubmit}
            className="bg-green-600 hover:bg-green-700"
          >
            Salvar
          </Button>
        </div>
      )}

      {thumbnailUrl && (
        <div className="relative aspect-[9/16] max-h-48 w-auto bg-gray-800 rounded-lg overflow-hidden">
          <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
};
