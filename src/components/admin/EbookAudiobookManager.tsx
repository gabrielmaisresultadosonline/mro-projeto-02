import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { Plus } from "lucide-react";

interface EbookAudioBook {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  audio_url: string;
  ebook_url: string;
  order_index: number;
}

const EbookAudiobookManager = ({ productId }: { productId: string }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<EbookAudioBook[]>([]);
  const [editing, setEditing] = useState<EbookAudioBook | null>(null);

  const loadItems = async () => {
    // Cast to any to bypass strict Table names not yet in types.ts
    const { data } = await (supabase.from('hub_product_ebooks' as any)
      .select('*')
      .eq('product_id', productId)
      .order('order_index') as any);
    if (data) setItems(data as EbookAudioBook[]);
  };

  React.useEffect(() => { loadItems(); }, [productId]);

  const saveItem = async () => {
    if (!editing) return;
    
    try {
      // Usar a Edge Function para evitar problemas de CORS/RLS no frontend
      const { data, error } = await supabase.functions.invoke('hub-api', {
        body: { 
          action: 'admin_save_ebook', 
          ebook: {
            ...editing,
            product_id: productId
          }
        }
      });
      
      if (error || !data?.success) {
        toast({ 
          title: "Erro ao salvar", 
          description: error?.message || data?.error || "Erro desconhecido", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Salvo com sucesso!" });
        setEditing(null);
        loadItems();
      }
    } catch (err) {
      console.error("Erro ao salvar ebook:", err);
      toast({ title: "Erro na comunicação com a API", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Ebooks & Audiobooks</h3>
        <Button onClick={() => setEditing({ id: crypto.randomUUID(), title: '', description: '', cover_url: '', audio_url: '', ebook_url: '', order_index: 0 })}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar
        </Button>
      </div>

      {editing && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Capa (Arraste, cole ou clique para selecionar)</Label>
              <div 
                className="relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onPaste={async (e) => {
                  const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith("image/"));
                  if (item) {
                    const file = item.getAsFile();
                    if (file) {
                      const ext = file.name.split('.').pop() || 'png';
                      const path = `ebooks/covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                      const { error } = await supabase.storage.from('assets').upload(path, file, {
                        cacheControl: '3600',
                        upsert: true,
                        contentType: file.type
                      });
                      if (!error) {
                        const { data } = supabase.storage.from('assets').getPublicUrl(path);
                        setEditing(prev => prev ? {...prev, cover_url: data.publicUrl} : null);
                        toast({ title: "Capa atualizada via colagem" });
                      } else {
                        toast({ title: "Erro no upload via colagem", description: error.message, variant: "destructive" });
                      }
                    }
                  }
                }}
                onClick={() => document.getElementById('cover-upload')?.click()}
              >
                <Input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  id="cover-upload"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const ext = file.name.split('.').pop() || 'png';
                      const path = `ebooks/covers/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                      const { error } = await supabase.storage.from('assets').upload(path, file, {
                        cacheControl: '3600',
                        upsert: true,
                        contentType: file.type
                      });
                      if (!error) {
                        const { data } = supabase.storage.from('assets').getPublicUrl(path);
                        setEditing(prev => prev ? {...prev, cover_url: data.publicUrl} : null);
                        toast({ title: "Capa enviada com sucesso" });
                      } else {
                        toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
                      }
                    }
                  }}
                />
                {editing.cover_url ? (
                  <img src={editing.cover_url} alt="Preview" className="mx-auto h-32 object-contain mb-2" />
                ) : (
                  <div className="py-4 text-muted-foreground">Clique para selecionar ou cole a imagem</div>
                )}
                <div onClick={(e) => e.stopPropagation()}>
                  <Input 
                    placeholder="Ou cole a URL da Capa" 
                    value={editing.cover_url} 
                    onChange={e => setEditing({...editing, cover_url: e.target.value})} 
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Arquivo de Áudio (MP3)</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="URL do MP3"
                    value={editing.audio_url} 
                    onChange={e => setEditing({...editing, audio_url: e.target.value})} 
                  />
                  <Input 
                    type="file" 
                    accept="audio/*" 
                    className="hidden" 
                    id="audio-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const path = `ebooks/audio/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                        const { error } = await supabase.storage.from('assets').upload(path, file, {
                          cacheControl: '3600',
                          upsert: true,
                          contentType: file.type
                        });
                        if (!error) {
                          const { data } = supabase.storage.from('assets').getPublicUrl(path);
                          setEditing(prev => prev ? {...prev, audio_url: data.publicUrl} : null);
                          toast({ title: "Áudio enviado" });
                        } else {
                          toast({ title: "Erro no upload do áudio", description: error.message, variant: "destructive" });
                        }
                      }
                    }}
                  />
                  <Button variant="outline" size="icon" onClick={() => document.getElementById('audio-upload')?.click()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Arquivo do Ebook (PDF)</Label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="URL do PDF"
                    value={editing.ebook_url} 
                    onChange={e => setEditing({...editing, ebook_url: e.target.value})} 
                  />
                  <Input 
                    type="file" 
                    accept="application/pdf" 
                    className="hidden" 
                    id="pdf-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const path = `ebooks/files/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                        const { error } = await supabase.storage.from('assets').upload(path, file, {
                          cacheControl: '3600',
                          upsert: true,
                          contentType: file.type
                        });
                        if (!error) {
                          const { data } = supabase.storage.from('assets').getPublicUrl(path);
                          setEditing(prev => prev ? {...prev, ebook_url: data.publicUrl} : null);
                          toast({ title: "PDF enviado" });
                        } else {
                          toast({ title: "Erro no upload do PDF", description: error.message, variant: "destructive" });
                        }
                      }
                    }}
                  />
                  <Button variant="outline" size="icon" onClick={() => document.getElementById('pdf-upload')?.click()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveItem}>Salvar</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 border rounded">
            <span>{item.title}</span>
            <Button variant="ghost" onClick={() => setEditing(item)}>Editar</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EbookAudiobookManager;
