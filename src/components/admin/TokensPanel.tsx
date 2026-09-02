import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, Trash2, RefreshCw, Loader2 } from 'lucide-react';

const ADMIN_PASSWORD = 'Ga145523@';

interface TokenRow {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

const SUGGESTED = ['openai', 'deepseek', 'gemini', 'lovable'];

/** Gestão dos tokens de IA usados pelas Edge Functions (tabela api_tokens). */
const TokensPanel: React.FC = () => {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [key, setKey] = useState('openai');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  const call = useCallback(async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('api-token', {
      body: { ...payload, admin_password: ADMIN_PASSWORD },
    });
    if (error) throw new Error(error.message || 'Falha na requisição');
    const result = data as { error?: string } | null;
    if (result?.error) throw new Error(result.error);
    return data as Record<string, unknown>;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call({ action: 'list' });
      setTokens((data?.tokens as TokenRow[]) || []);
    } catch (e) {
      toast({
        title: 'Erro ao carregar tokens',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [call, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!key.trim() || !value.trim()) {
      toast({ title: 'Informe a chave e o token', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await call({ key: key.trim().toLowerCase(), value: value.trim(), description: description.trim() || null });
      setValue('');
      setDescription('');
      toast({ title: 'Token salvo', description: 'As funções de IA já usam este token.' });
      await load();
    } catch (e) {
      toast({
        title: 'Não foi possível salvar',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tokenKey: string) => {
    try {
      await call({ action: 'delete', key: tokenKey });
      await load();
      toast({ title: 'Token removido' });
    } catch (e) {
      toast({
        title: 'Não foi possível remover',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-semibold">Tokens de IA</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Salve a chave <span className="font-semibold text-foreground">openai</span> (ChatGPT, leitura de imagem) ou{' '}
          <span className="font-semibold text-foreground">deepseek</span>. A análise do print no /instagram usa estes tokens.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="token-key">Chave</Label>
            <Input id="token-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="openai" />
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((s) => (
                <Button key={s} type="button" size="sm" variant="outline" onClick={() => setKey(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="token-value">Token</Label>
            <Input
              id="token-value"
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="token-desc">Descrição (opcional)</Label>
          <Textarea id="token-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Salvar token
          </Button>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} aria-hidden />
            Atualizar
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="mb-3 font-semibold">Tokens salvos ({tokens.length})</h4>
        {loading && tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum token cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((t) => (
              <li
                key={t.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{t.key}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.value ? `${t.value.slice(0, 6)}••••${t.value.slice(-4)}` : '—'}
                    {t.description ? ` — ${t.description}` : ''}
                  </p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => void remove(t.key)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default TokensPanel;
