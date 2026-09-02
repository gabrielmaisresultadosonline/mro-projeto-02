import React, { useState, useEffect } from 'react';
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAdminSessionToken } from "@/lib/adminConfig";
import { 
  Users, Plus, FileText, Search, Loader2, 
  ShieldBan, ShieldCheck, Mail, Video, Edit2, Trash2, Save, MoveUp, MoveDown, Image as ImageIcon,
  ShoppingBag, CheckCircle, Clock, AlertCircle, UserPlus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function LotarGruposPanel() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });

  const invokeAdmin = async (action: string, payload: Record<string, unknown> = {}) => {
    const token = getAdminSessionToken();
    if (!token) throw new Error("Sessão administrativa expirada.");
    const { data, error } = await supabase.functions.invoke('lotargrupos-api', {
      body: { action, admin_token: token, ...payload },
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Erro na operação");
    return data;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const usersData = await invokeAdmin('admin_list_users');
      const lessonsData = await invokeAdmin('admin_list_lessons');
      const salesData = await invokeAdmin('admin_list_sales');
      setUsers(usersData.users || []);
      setLessons(lessonsData.lessons || []);
      setSales(salesData.sales || []);
    } catch (error: any) {
      toast({ title: "Erro ao buscar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await invokeAdmin('admin_save_lesson', { lesson: editingLesson });
      toast({ title: "Aula salva com sucesso!" });
      setIsLessonDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao salvar aula", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;
    try {
      await invokeAdmin('admin_delete_lesson', { id });
      toast({ title: "Aula excluída!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao excluir aula", description: error.message, variant: "destructive" });
    }
  };

  const toggleUserStatus = async (user: any) => {
    try {
      const newStatus = user.status === 'active' ? 'blocked' : 'active';
      await invokeAdmin('admin_update_user', { id: user.id, updates: { status: newStatus } });
      toast({ title: "Status do usuário atualizado!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar usuário", description: error.message, variant: "destructive" });
    }
  };

  const handleAddUserManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await invokeAdmin('admin_add_user_manual', { user: newUser });
      toast({ title: "Membro adicionado manualmente!" });
      setIsUserDialogOpen(false);
      setNewUser({ name: '', email: '', password: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao adicionar membro", description: error.message, variant: "destructive" });
    }
  };

  const handleApproveSale = async (nsu: string) => {
    try {
      await invokeAdmin('admin_approve_sale', { nsu_order: nsu });
      toast({ title: "Venda aprovada com sucesso!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao aprovar venda", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" /> Gestão Lotar Grupos
        </h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsUserDialogOpen(true)} size="sm" variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" /> Add Membro
          </Button>
          <Button onClick={() => { setEditingLesson({ order_index: lessons.length + 1, title: "", description: "" }); setIsLessonDialogOpen(true); }} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Nova Aula
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Aulas */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 px-1">
            <Video className="h-4 w-4" /> Aulas do Curso
          </h3>
          <div className="space-y-3">
            {lessons.map(lesson => (
              <Card key={lesson.id} className="bg-card/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/20 text-primary w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                      {lesson.order_index}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{lesson.title}</h4>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{lesson.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLesson(lesson); setIsLessonDialogOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteLesson(lesson.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Usuários */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 px-1">
            <Users className="h-4 w-4" /> Alunos Cadastrados
          </h3>
          <div className="space-y-3">
            {users.map(user => (
              <Card key={user.id} className={user.status === 'blocked' ? "opacity-60" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">{user.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{user.email}</p>
                    <Badge className={user.status === 'active' ? "bg-green-600 mt-1" : "bg-destructive mt-1"}>
                      {user.status === 'active' ? "Ativo" : "Bloqueado"}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleUserStatus(user)}>
                    {user.status === 'active' ? <ShieldBan className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-green-500" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Vendas */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2 px-1">
          <ShoppingBag className="h-4 w-4" /> Vendas Lotar Grupos (NSU)
        </h3>
        <Card className="bg-card/50">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">Status</th>
                  <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">Data</th>
                  <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">Email</th>
                  <th className="p-4 text-left font-bold text-xs uppercase text-muted-foreground">NSU</th>
                  <th className="p-4 text-right font-bold text-xs uppercase text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="p-4">
                      {sale.status === 'paid' ? (
                        <Badge className="bg-green-600/20 text-green-500 border-green-500/30 gap-1">
                          <CheckCircle className="w-3 h-3" /> Aprovada
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-600/20 text-yellow-500 border-yellow-500/30 gap-1">
                          <Clock className="w-3 h-3" /> Pendente
                        </Badge>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(sale.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 font-medium">{sale.email}</td>
                    <td className="p-4 font-mono text-xs">{sale.nsu_order}</td>
                    <td className="p-4 text-right">
                      {sale.status !== 'paid' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-green-500 hover:text-green-600 hover:bg-green-500/10 gap-1"
                          onClick={() => handleApproveSale(sale.nsu_order)}
                        >
                          <ShieldCheck className="w-3 h-3" /> Aprovar Manual
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      Nenhuma venda registrada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader><DialogTitle className="text-white">Adicionar Membro Manual</DialogTitle></DialogHeader>
          <form onSubmit={handleAddUserManual} className="space-y-4 py-4">
            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
              <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="bg-slate-950 border-slate-800" required />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Melhor E-mail</label>
              <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="bg-slate-950 border-slate-800" required />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Senha (Padrão: Mro@123456)</label>
              <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Mro@123456" className="bg-slate-950 border-slate-800" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"><UserPlus className="h-4 w-4" /> Liberar Acesso</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isLessonDialogOpen} onOpenChange={setIsLessonDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white">
          <DialogHeader><DialogTitle className="text-white">{editingLesson?.id ? "Editar Aula" : "Nova Aula"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveLesson} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Título da Aula</label>
                <Input value={editingLesson?.title || ""} onChange={e => setEditingLesson({...editingLesson, title: e.target.value})} className="bg-slate-950 border-slate-800" required />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Ordem</label>
                <Input type="number" value={editingLesson?.order_index || 0} onChange={e => setEditingLesson({...editingLesson, order_index: parseInt(e.target.value)})} className="bg-slate-950 border-slate-800" required />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">URL do Vídeo (Embed/Direct)</label>
              <Input 
                value={editingLesson?.video_url || ""} 
                onChange={e => setEditingLesson({...editingLesson, video_url: e.target.value})} 
                placeholder="Ex: https://iframe.mediadelivery.net/embed/..." 
                className="bg-slate-950 border-slate-800"
              />
            </div>
            
            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Upload de Vídeo (Opcional)</label>
              <div className="flex gap-2">
                <Input 
                  type="file" 
                  accept="video/*" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    toast({ title: "Fazendo upload do vídeo...", description: "Aguarde a conclusão. Isso pode levar alguns minutos dependendo do tamanho." });
                    try {
                      const fileExt = file.name.split('.').pop();
                      const fileName = `${Math.random()}.${fileExt}`;
                      const filePath = `videos/${fileName}`;
                      
                      console.log("Iniciando upload para bucket 'assets', path:", filePath);
                      const { data, error } = await supabase.storage
                        .from('assets')
                        .upload(filePath, file, {
                          cacheControl: '3600',
                          upsert: false
                        });
                        
                      if (error) {
                        console.error("Erro no upload do Supabase Storage:", error);
                        throw error;
                      }
                      
                      const { data: { publicUrl } } = supabase.storage
                        .from('assets')
                        .getPublicUrl(filePath);
                        
                      setEditingLesson({...editingLesson, video_url: publicUrl});
                      toast({ title: "Upload de vídeo concluído!" });
                    } catch (err: any) {
                      toast({ title: "Erro no upload do vídeo", description: err.message, variant: "destructive" });
                    }
                  }}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <p className="text-[10px] text-slate-400 italic">Dica: Se preferir, pode continuar usando uma URL externa no campo acima.</p>
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Thumbnail (URL, Paste Image ou Upload)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    value={editingLesson?.thumbnail_url || ""} 
                    onChange={e => setEditingLesson({...editingLesson, thumbnail_url: e.target.value})} 
                    onPaste={async (e) => {
                      const items = e.clipboardData.items;
                      for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf("image") !== -1) {
                          const file = items[i].getAsFile();
                          if (file) {
                            toast({ title: "Processando imagem...", description: "Aguarde o upload da imagem colada." });
                            try {
                              const fileExt = file.name ? file.name.split('.').pop() : 'png';
                              const fileName = `${Math.random()}.${fileExt}`;
                              const filePath = `thumbnails/${fileName}`;
                              const { data, error } = await supabase.storage.from('assets').upload(filePath, file);
                              if (error) throw error;
                              const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filePath);
                              setEditingLesson({...editingLesson, thumbnail_url: publicUrl});
                              toast({ title: "Imagem colada com sucesso!" });
                            } catch (err: any) {
                              toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
                            }
                          }
                        }
                      }
                    }}
                    placeholder="URL ou cole uma imagem aqui" 
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="thumb-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      toast({ title: "Fazendo upload...", description: "Aguarde a conclusão." });
                      try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Math.random()}.${fileExt}`;
                        const filePath = `thumbnails/${fileName}`;
                        const { data, error } = await supabase.storage.from('assets').upload(filePath, file);
                        if (error) throw error;
                        const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filePath);
                        setEditingLesson({...editingLesson, thumbnail_url: publicUrl});
                        toast({ title: "Upload concluído!" });
                      } catch (err: any) {
                        toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    className="bg-slate-950 border-slate-800"
                    onClick={() => document.getElementById('thumb-upload')?.click()}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {editingLesson?.thumbnail_url && (
                <div className="mt-2 relative w-full aspect-[1350/1080] rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                  <img src={editingLesson.thumbnail_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold">1350x1080 (Preview)</div>
                </div>
              )}
            </div>


            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Descrição Completa</label>
              <textarea 
                value={editingLesson?.description || ""} 
                onChange={e => setEditingLesson({...editingLesson, description: e.target.value})} 
                className="flex min-h-[120px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Detalhes da aula, links importantes e orientações..."
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Materiais (JSON: [&#123; "label": "Download", "url": "..." &#125;])</label>
              <textarea 
                value={typeof editingLesson?.buttons === 'string' ? editingLesson.buttons : JSON.stringify(editingLesson?.buttons || [], null, 2)} 
                onChange={e => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setEditingLesson({...editingLesson, buttons: parsed});
                  } catch (err) {
                    setEditingLesson({...editingLesson, buttons: e.target.value});
                  }
                }} 
                className="flex min-h-[80px] w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-mono text-blue-400"
                placeholder='[{"label": "PDF Aula", "url": "https://..."}]'
              />
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800">
              <Button type="submit" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"><Save className="h-4 w-4" /> Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
