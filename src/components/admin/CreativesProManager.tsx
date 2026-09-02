import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { 
  Sparkles, 
  UserPlus, 
  Trash2, 
  Loader2,
  Crown,
  RefreshCw
} from 'lucide-react';

interface CreativeProUser {
  squarecloud_username: string;
  activated_at: string;
  days_remaining?: number;
}

const CreativesProManager = () => {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [activatedUsers, setActivatedUsers] = useState<CreativeProUser[]>([]);

  // Load activated users on mount
  useEffect(() => {
    loadActivatedUsers();
  }, []);

  const loadActivatedUsers = async () => {
    setIsLoadingList(true);
    try {
      // Load from cloud via edge function
      const { data, error } = await supabase.functions.invoke('user-cloud-storage', {
        body: {
          action: 'get_creatives_pro_users'
        }
      });

      if (error) {
        console.error('Error loading PRO users:', error);
        toast({
          title: 'Erro ao carregar',
          description: 'Falha ao buscar usuários PRO da nuvem',
          variant: 'destructive'
        });
        return;
      }

      if (data?.success && data.users) {
        setActivatedUsers(data.users);
        console.log(`✅ Loaded ${data.users.length} PRO users from cloud`);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const activateUser = async () => {
    if (!username.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o nome de usuário SquareCloud',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const normalizedUsername = username.trim();

      // Activate via cloud edge function
      const { data, error } = await supabase.functions.invoke('user-cloud-storage', {
        body: {
          action: 'set_creatives_pro',
          username: normalizedUsername,
          activate: true
        }
      });

      if (error) {
        console.error('Error activating user:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao ativar usuário na nuvem',
          variant: 'destructive'
        });
        return;
      }

      if (data?.success) {
        // Refresh the list from cloud
        await loadActivatedUsers();

        toast({
          title: 'Usuário Ativado! ✨',
          description: `${normalizedUsername} agora tem acesso PRO aos criativos (6 créditos/mês como anual). Salvo na nuvem!`
        });

        setUsername('');
      } else {
        toast({
          title: 'Erro',
          description: data?.error || 'Falha ao ativar usuário',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Error activating user:', err);
      toast({
        title: 'Erro',
        description: 'Falha ao ativar usuário',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateUser = async (userToRemove: string) => {
    try {
      // Deactivate via cloud edge function
      const { data, error } = await supabase.functions.invoke('user-cloud-storage', {
        body: {
          action: 'set_creatives_pro',
          username: userToRemove,
          activate: false
        }
      });

      if (error) {
        console.error('Error deactivating user:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao desativar usuário na nuvem',
          variant: 'destructive'
        });
        return;
      }

      if (data?.success) {
        // Remove from local list immediately
        setActivatedUsers(prev => prev.filter(u => u.squarecloud_username !== userToRemove));

        toast({
          title: 'Acesso Removido',
          description: `${userToRemove} não tem mais acesso PRO aos criativos`
        });
      }
    } catch (err) {
      console.error('Error deactivating user:', err);
      toast({
        title: 'Erro',
        description: 'Falha ao desativar usuário',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysLabel = (days?: number) => {
    if (!days) return '';
    if (days > 365) return 'Vitalício';
    return `${days} dias`;
  };

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Criativos PRO - Liberação Vitalício</h3>
            <p className="text-sm text-muted-foreground">
              Ativar acesso completo a criativos (6 créditos/mês) para usuários vitalícios
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadActivatedUsers}
          disabled={isLoadingList}
          className="cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingList ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Activation Form */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Label htmlFor="username" className="sr-only">Usuário SquareCloud</Label>
          <Input
            id="username"
            placeholder="Digite o nome de usuário SquareCloud (ex: 124555)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && activateUser()}
            className="bg-secondary/50"
          />
        </div>
        <Button
          type="button"
          onClick={activateUser}
          disabled={isLoading || !username.trim()}
          className="cursor-pointer bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Ativar PRO Criativos
            </>
          )}
        </Button>
      </div>

      {/* Activated Users List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Usuários com Criativos PRO ({activatedUsers.length})
          </h4>
          <span className="text-xs text-muted-foreground">☁️ Dados salvos na nuvem</span>
        </div>

        {isLoadingList ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : activatedUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum usuário com criativos PRO ativado</p>
            <p className="text-sm">Adicione um usuário acima para liberar acesso</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {activatedUsers.map((user) => (
              <div
                key={user.squarecloud_username}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border hover:border-amber-500/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      {user.squarecloud_username}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                        PRO
                      </span>
                      {user.days_remaining && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          {getDaysLabel(user.days_remaining)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ativado em: {formatDate(user.activated_at)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deactivateUser(user.squarecloud_username)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <p className="text-sm text-amber-200">
          💡 Usuários vitalícios com PRO ativado recebem <strong>6 créditos mensais</strong> para gerar criativos, 
          igual aos usuários anuais. Sem ativação, vitalícios têm apenas 1 criativo gratuito/mês. 
          <strong> ☁️ Dados salvos na nuvem - funciona em qualquer dispositivo!</strong>
        </p>
      </div>
    </div>
  );
};

export default CreativesProManager;
