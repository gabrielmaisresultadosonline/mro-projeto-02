import { useCallback, useEffect, useState } from "react";
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { storageAssetUrl } from '@/lib/assetUrl';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Save, Trash2, Package, LayoutList, ExternalLink, Users, Upload, Image as ImageIcon } from "lucide-react";
import ModuleManager from "@/components/admin/ModuleManager";
import EbookAudiobookManager from "@/components/admin/EbookAudiobookManager";
import HubUsersPanel from "@/components/admin/HubUsersPanel";

import { loadModulesFromCloud, type ModulePlatform } from "@/lib/adminConfig";

interface HubProductRow {
  id?: string;
  slug: string;
  title: string;
  description: string | null;
  thumb_url: string | null;
  app_route: string | null;
  sales_page_url: string | null;
  price: number;
  access_source: string;
  order_index: number;
  is_active: boolean;
  status: 'active' | 'construction';
  is_pinned?: boolean;
  new_until?: string | null;
  is_ebook_hub?: boolean;
  badge_text?: string | null;
  plan_type?: 'mensal' | 'anual' | 'vitalicio';
  is_redirect_only?: boolean;
}

const emptyProduct = (): HubProductRow => ({
  slug: "",
  title: "",
  description: "",
  thumb_url: "",
  app_route: "",
  sales_page_url: "",
  price: 0,
  access_source: "manual",
  order_index: 0,
  is_active: true,
  status: 'active',
  is_pinned: false,
  new_until: null,
  is_ebook_hub: false,
  badge_text: "",
  plan_type: "vitalicio",
  is_redirect_only: false,
});


export default function HubProductsPanel() {
  const { toast } = useToast();
  const [products, setProducts] = useState<HubProductRow[]>([]);
  const [tab, setTab] = useState("produtos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HubProductRow | null>(null);
  // Produto cuja área de membros (módulos) está aberta para edição
  const [membersFor, setMembersFor] = useState<string | null>(null);
  const [hubDownloadLinks, setHubDownloadLinks] = useState<Record<string, string>>({});
  // Quantidade de módulos publicados por slug (para exibir a tarja "Área de membros ativa")
  const [membersCount, setMembersCount] = useState<Record<string, number>>({});
  // Upload da imagem de capa (arquivo, colar ou arrastar)
  const [uploadingThumb, setUploadingThumb] = useState(false);

  /**
   * Envia a imagem para o bucket público "assets" e devolve a URL pública.
   * Valida tipo e tamanho antes do upload para evitar arquivos inválidos.
   */
  const uploadThumbFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast({ title: "Arquivo inválido", description: "Envie uma imagem (PNG, JPG, WEBP).", variant: "destructive" });
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast({ title: "Imagem muito grande", description: "O limite é 8MB.", variant: "destructive" });
        return;
      }
      setUploadingThumb(true);
      try {
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        // Pasta "covers" é a única com policy de escrita liberada no bucket "assets"
        const path = `covers/hub-products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from("assets").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("assets").getPublicUrl(path);
        setEditing((prev) => (prev ? { ...prev, thumb_url: data.publicUrl } : prev));
        toast({ title: "Imagem enviada", description: "Capa atualizada com sucesso." });
      } catch (err) {
        console.error("Erro ao subir capa:", err);
        toast({
          title: "Erro no upload",
          description: err instanceof Error ? err.message : "Não foi possível enviar a imagem.",
          variant: "destructive",
        });
      } finally {
        setUploadingThumb(false);
      }
    },
    [toast]
  );



  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", { body: { action: "admin_list_products" } });
      if (data?.success) {
        const list: HubProductRow[] = data.products || [];
        setProducts(list);

        // Verifica quais produtos já possuem área de membros publicada
        const entries = await Promise.all(
          list
            .filter((p) => !!p.slug)
            .map(async (p) => {
              try {
                const cloud = await loadModulesFromCloud(`hub-${p.slug}` as ModulePlatform);
                return [p.slug, cloud?.modules?.length || 0] as const;
              } catch {
                return [p.slug, 0] as const;
              }
            })
        );
        setMembersCount(Object.fromEntries(entries));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveProduct = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { data } = await supabase.functions.invoke("hub-api", {
        body: { action: "admin_save_product", product: editing },
      });
      if (data?.success) {
        toast({ title: "Produto salvo" });
        setEditing(null);
        load();
      } else {
        toast({ title: data?.error || "Erro ao salvar", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id?: string) => {
    if (!id) return;
    if (!confirm("Excluir este produto e seus tutoriais?")) return;
    await supabase.functions.invoke("hub-api", { body: { action: "admin_delete_product", id } });
    load();
  };




  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="produtos">
            <Package className="h-4 w-4" /> Produtos
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios">
          <HubUsersPanel />
        </TabsContent>

        <TabsContent value="produtos" className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard — Produtos</h2>
          <p className="text-sm text-muted-foreground">
            Produtos exibidos em /dashboard para os clientes, com tutoriais e liberação de acesso.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyProduct())}>
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </div>



      {editing && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Imagem de capa</Label>
                <div
                  onPaste={(e) => {
                    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith("image/"));
                    if (item) {
                      e.preventDefault();
                      void uploadThumbFile(item.getAsFile());
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void uploadThumbFile(e.dataTransfer.files?.[0]);
                  }}
                  className="rounded-lg border border-dashed border-border p-3 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    {editing.thumb_url ? (
                      <img
                        src={storageAssetUrl(editing.thumb_url)}
                        alt="Capa do produto"
                        className="h-16 w-16 rounded-md object-cover border border-border"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        id="hub-thumb-file"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          void uploadThumbFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingThumb}
                        onClick={() => document.getElementById("hub-thumb-file")?.click()}
                      >
                        {uploadingThumb ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {uploadingThumb ? "Enviando..." : "Enviar imagem"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Clique, arraste o arquivo ou cole (Ctrl+V) a imagem aqui. Também aceita URL abaixo.
                      </p>
                    </div>
                  </div>
                  <Input
                    placeholder="https://... (opcional)"
                    value={editing.thumb_url || ""}
                    onChange={(e) => setEditing({ ...editing, thumb_url: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rota interna (ex: /instagram)</Label>
                <Input value={editing.app_route || ""} onChange={(e) => setEditing({ ...editing, app_route: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Página de vendas</Label>
                <Input
                  value={editing.sales_page_url || ""}
                  onChange={(e) => setEditing({ ...editing, sales_page_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Origem do acesso</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.access_source}
                  onChange={(e) => setEditing({ ...editing, access_source: e.target.value })}
                >
                  <option value="manual">Manual / compra pela dashboard</option>
                  <option value="mro_tool">MRO Ferramenta</option>
                  <option value="zapmro">ZAPMRO</option>
                  <option value="postscomia">Posts com IA</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Disponibilidade</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as 'active' | 'construction' })}
                >
                  <option value="active">Ativo (Liberado)</option>
                  <option value="construction">Em Construção (Bloqueado)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Ordem (Índice)</Label>
                <Input
                  type="number"
                  value={editing.order_index}
                  onChange={(e) => setEditing({ ...editing, order_index: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="is_pinned"
                  checked={editing.is_pinned}
                  onChange={(e) => setEditing({ ...editing, is_pinned: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="is_pinned" className="cursor-pointer">Fixar no topo</Label>
              </div>
              <div className="space-y-2">
                <Label>Marcar como "Novo" até</Label>
                <Input
                  type="date"
                  value={editing.new_until ? editing.new_until.split('T')[0] : ""}
                  onChange={(e) => setEditing({ ...editing, new_until: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 15);
                    setEditing({ ...editing, new_until: date.toISOString() });
                  }}
                >
                  +15 dias
                </Button>
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="is_ebook_hub"
                  checked={editing.is_ebook_hub}
                  onChange={(e) => setEditing({ ...editing, is_ebook_hub: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="is_ebook_hub" className="cursor-pointer">É Hub de Ebook/Audiobook</Label>
              </div>
              <div className="space-y-2">
                <Label>Texto da Tarja (Badge)</Label>
                <Input 
                  placeholder="Ex: EBOOK/AUDIOBOOK" 
                  value={editing.badge_text || ""} 
                  onChange={(e) => setEditing({ ...editing, badge_text: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Plano (Exibido no Checkout)</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={editing.plan_type || "vitalicio"}
                  onChange={(e) => setEditing({ ...editing, plan_type: e.target.value as 'mensal' | 'anual' | 'vitalicio' })}
                >
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                  <option value="vitalicio">Vitalício</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="is_redirect_only"
                  checked={Boolean(editing.is_redirect_only)}
                  onChange={(e) => setEditing({ ...editing, is_redirect_only: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="is_redirect_only" className="cursor-pointer">Apenas Redirecionar (Não comprar no hub)</Label>
              </div>
            </div>
            
            {editing.id && editing.is_ebook_hub && (
              <div className="mt-6 border-t pt-6">
                <EbookAudiobookManager productId={editing.id} />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={saveProduct} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {products.map((product) => {
          const hasMembers = (membersCount[product.slug] || 0) > 0;
          return (
            <Card key={product.id}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {product.thumb_url ? (
                        <img src={storageAssetUrl(product.thumb_url)} alt={product.title} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        /{product.slug} · R$ {Number(product.price).toFixed(0)} · {product.access_source}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    {product.status === 'construction' && (
                      <Badge variant="destructive" className="animate-pulse">
                        Em Construção
                      </Badge>
                    )}
                    {hasMembers && (
                      <Badge variant="outline" className="gap-1">
                        <LayoutList className="h-3 w-3" /> Área de membros ativa
                      </Badge>
                    )}
                    {product.is_pinned && (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                        Fixado
                      </Badge>
                    )}
                    {product.new_until && new Date(product.new_until) > new Date() && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Novo (até {new Date(product.new_until).toLocaleDateString()})
                      </Badge>
                    )}
                    {product.app_route && (
                      <Badge variant="outline" className="gap-1">
                        <ExternalLink className="h-3 w-3" /> Redirecionado · {product.app_route}
                      </Badge>
                    )}
                    {product.is_redirect_only && (
                      <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                        Apenas Redirecionar
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant={membersFor === product.slug ? "default" : "outline"}
                      onClick={() => setMembersFor(membersFor === product.slug ? null : product.slug)}
                      disabled={!product.slug}
                    >
                      <LayoutList className="h-4 w-4" /> Área de membros
                    </Button>

                    <Button size="sm" variant="outline" onClick={() => setEditing(product)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteProduct(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>


                  {membersFor === product.slug && product.slug && (
                    <div className="border-t border-border pt-4">
                      {product.title === "O SEGREDO PARA VENDER MAIS !" ? (
                        <EbookAudiobookManager productId={product.id!} />
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground mb-3">
                            Monte a área de membros deste produto...
                          </p>
                          <ModuleManager
                            key={`hub-${product.slug}`}
                            platform={`hub-${product.slug}` as ModulePlatform}
                            downloadLink={hubDownloadLinks[product.slug] || ""}
                            onDownloadLinkChange={(link) =>
                              setHubDownloadLinks((prev) => ({ ...prev, [product.slug]: link }))
                            }
                            onSaveSettings={() => {
                              toast({ title: "Configurações salvas" });
                            }}
                          />
                        </>
                      )}
                    </div>
                  )}


              </CardContent>
            </Card>
          );
        })}
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

