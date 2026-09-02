import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { isAdminLoggedIn, loginAdmin, logoutAdmin } from '@/lib/adminConfig';
import { 
  UserPlus, 
  Users, 
  Mail, 
  RefreshCw, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Lock,
  Eye,
  EyeOff,
  LogOut,
  Search,
  Zap,
  TestTube,
  CheckCircle,
  XCircle,
  Copy,
  Settings,
  Save,
  Send,
  CheckSquare,
  Square,
  Download,
  Bell,
  AlertTriangle,
  Clock,
  MailOpen
} from 'lucide-react';

interface CreatedAccess {
  id: string;
  customer_email: string;
  customer_name: string | null;
  username: string;
  password: string;
  service_type: 'whatsapp' | 'instagram';
  access_type: 'annual' | 'lifetime' | 'monthly';
  days_access: number;
  api_created: boolean;
  email_sent: boolean;
  email_sent_at: string | null;
  notes: string | null;
  created_at: string;
  expiration_date: string | null;
  expiration_warning_sent: boolean;
  expiration_warning_sent_at: string | null;
  expired_notification_sent: boolean;
  expired_notification_sent_at: string | null;
  email_opened: boolean;
  email_opened_at: string | null;
}

interface AdminSettings {
  memberAreaLink: string;
  whatsappGroupLink: string;
  messageTemplateInstagram: string;
  messageTemplateWhatsapp: string;
}

const ACCESS_DAYS = {
  monthly: 30,
  annual: 365,
  lifetime: 999999,
  solo: 365,
  pro: 365,
  agencia: 365,
};

const DEFAULT_SETTINGS: AdminSettings = {
  memberAreaLink: 'https://maisresultadosonline.com.br',
  whatsappGroupLink: 'https://chat.whatsapp.com/JdEHa4jeLSUKTQFCNp7YXi',
  messageTemplateInstagram: `Obrigado por fazer parte do nosso sistema!✅

🚀🔥 *Ferramenta para Instagram Vip acesso!*

Preciso que assista os vídeos da área de membros com o link abaixo:

( {MEMBER_LINK} ) 

1 - Acesse Área Membros

2 - Acesse ferramenta para instagram

Para acessar a ferramenta e área de membros, utilize os acessos:

*usuário:* {USERNAME}

*senha:* {PASSWORD}

⚠ Assista todos os vídeos, por favor!

Participe também do nosso GRUPO DE AVISOS

{GROUP_LINK}`,
  messageTemplateWhatsapp: `Obrigado por fazer parte do nosso sistema!

🚀 ZAPMRO - Ferramenta para WhatsApp Vip acesso!

▪️ Vou colocar você no grupo de avisos sobre nossa ferramenta.

Preciso que assista os vídeos da área de membros com o link abaixo:

( {MEMBER_LINK} ) 

Para acessar a ferramenta, utilize os acessos:

usuário: {USERNAME}
senha: {PASSWORD}

⚠ Assista todos os vídeos, por favor!

Participe também do nosso GRUPO DE AVISOS
{GROUP_LINK}`,
};

export default function AdminUsuario() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accesses, setAccesses] = useState<CreatedAccess[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CreatedAccess>>({});
  const [lastCreatedAccess, setLastCreatedAccess] = useState<CreatedAccess | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);

  const [testEmail, setTestEmail] = useState('');
  const [testResults, setTestResults] = useState<{
    whatsapp?: { success: boolean; message: string };
    instagram?: { success: boolean; message: string };
    email?: { success: boolean; message: string };
  }>({});

  // Mass email state
  const [massEmailSubject, setMassEmailSubject] = useState('📢 Novidades do MRO!');
  const [massEmailMessage, setMassEmailMessage] = useState('');
  const [manualEmails, setManualEmails] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [useRegisteredEmails, setUseRegisteredEmails] = useState(true);
  const [massEmailSending, setMassEmailSending] = useState(false);
  const [massEmailResults, setMassEmailResults] = useState<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{ email: string; success: boolean }>;
  } | null>(null);

  // WhatsApp Migration
  const [whatsappUsers, setWhatsappUsers] = useState<Array<{ email: string; source: string; name?: string }>>([]);
  const [selectedWhatsappEmails, setSelectedWhatsappEmails] = useState<Set<string>>(new Set());
  const [loadingWhatsappUsers, setLoadingWhatsappUsers] = useState(false);
  const [waMigrationSending, setWaMigrationSending] = useState(false);
  const [waMigrationSubject, setWaMigrationSubject] = useState('🚨 Importante: Sua ferramenta ZapMRO foi migrada para API Oficial do WhatsApp');
  const [waMigrationResults, setWaMigrationResults] = useState<{ total: number; sent: number; failed: number } | null>(null);

  const [form, setForm] = useState({
    customerEmail: '',
    username: '',
    password: '',
    serviceType: 'instagram' as 'whatsapp' | 'instagram',
    accessType: 'annual' as 'annual' | 'lifetime' | 'monthly' | 'solo' | 'pro' | 'agencia',
    notes: '',
    createInApi: true, // Criar usuário na nossa API interna (mro_tool_users)
  });

  useEffect(() => {
    if (isAdminLoggedIn()) {
      setIsAuthenticated(true);
      loadAccesses();
      loadSettings();
    }
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'get_settings' },
      });
      if (!error && data?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      }
    } catch (e) {
      // Use defaults
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'save_settings', settings },
      });
      if (error) throw error;
      toast.success('Configurações salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const result = await loginAdmin(adminEmail, adminPassword);
    if (result.success) {
      setIsAuthenticated(true);
      loadAccesses();
      loadSettings();
      toast.success('Login realizado com sucesso!');
    } else {
      toast.error(result.error || 'Email ou senha incorretos!');
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    await logoutAdmin();
    setAdminPassword('');
  };

  const loadAccesses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'list_accesses' },
      });

      if (error) throw error;
      setAccesses(data.accesses || []);
    } catch (error: any) {
      toast.error('Erro ao carregar acessos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, password });
  };

  const generateCopyMessage = (access: CreatedAccess) => {
    const template = access.service_type === 'instagram' 
      ? settings.messageTemplateInstagram 
      : settings.messageTemplateWhatsapp;
    
    return template
      .replace(/{MEMBER_LINK}/g, settings.memberAreaLink)
      .replace(/{GROUP_LINK}/g, settings.whatsappGroupLink)
      .replace(/{USERNAME}/g, access.username)
      .replace(/{PASSWORD}/g, access.password);
  };

  const copyToClipboard = async (access: CreatedAccess) => {
    const message = generateCopyMessage(access);
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Mensagem copiada para área de transferência!');
    } catch (e) {
      toast.error('Erro ao copiar');
    }
  };

  const handleCreateAccess = async () => {
    if (!form.customerEmail || !form.username || !form.password) {
      toast.error('Preencha email, usuário e senha!');
      return;
    }

    try {
      setLoading(true);
      const daysAccess = ACCESS_DAYS[form.accessType];
      
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'create_access',
          customerEmail: form.customerEmail,
          customerName: '',
          username: form.username,
          password: form.password,
          serviceType: form.serviceType,
          accessType: form.accessType,
          daysAccess,
          notes: form.notes || null,
          createInApi: form.createInApi, // Nova opção
        },
      });

      if (error) throw error;

      toast.success(
        `Acesso criado! API: ${data.apiCreated ? '✅' : '❌'} | Email: ${data.emailSent ? '✅' : '❌'}`
      );

      // Store last created access for copy button
      setLastCreatedAccess(data.accessRecord);

      setForm({
        customerEmail: '',
        username: '',
        password: '',
        serviceType: 'instagram',
        accessType: 'annual',
        notes: '',
        createInApi: true,
      });

      loadAccesses();
    } catch (error: any) {
      toast.error('Erro ao criar acesso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'resend_email', id },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Email reenviado com sucesso!');
        loadAccesses();
      } else {
        toast.error('Erro ao reenviar email');
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccess = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este acesso?')) return;

    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'delete_access', id },
      });

      if (error) throw error;
      toast.success('Acesso excluído!');
      loadAccesses();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (access: CreatedAccess) => {
    setEditingId(access.id);
    setEditForm({
      customer_email: access.customer_email,
      notes: access.notes,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'update_access', id, updates: editForm },
      });

      if (error) throw error;
      toast.success('Acesso atualizado!');
      setEditingId(null);
      loadAccesses();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testWhatsAppAPI = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'test_whatsapp_api' },
      });

      if (error) throw error;
      setTestResults(prev => ({
        ...prev,
        whatsapp: { success: data.success, message: data.message || 'Conexão OK' }
      }));
      toast[data.success ? 'success' : 'error'](data.success ? 'WhatsApp API OK!' : 'WhatsApp API falhou');
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        whatsapp: { success: false, message: error.message }
      }));
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testInstagramAPI = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'test_instagram_api' },
      });

      if (error) throw error;
      setTestResults(prev => ({
        ...prev,
        instagram: { success: data.success, message: data.message || 'Conexão OK' }
      }));
      toast[data.success ? 'success' : 'error'](data.success ? 'Instagram API OK!' : 'Instagram API falhou');
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        instagram: { success: false, message: error.message }
      }));
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testEmailSending = async () => {
    if (!testEmail) {
      toast.error('Digite um email para teste!');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'test_email', email: testEmail },
      });

      if (error) throw error;
      setTestResults(prev => ({
        ...prev,
        email: { success: data.success, message: data.success ? `Email enviado para ${testEmail}` : 'Falha no envio' }
      }));
      toast[data.success ? 'success' : 'error'](data.success ? 'Email de teste enviado!' : 'Falha ao enviar email');
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        email: { success: false, message: error.message }
      }));
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccesses = accesses.filter(
    (a) =>
      a.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unique registered emails
  const registeredEmails = [...new Set(accesses.map(a => a.customer_email))];

  const toggleEmailSelection = (email: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedEmails(newSelected);
  };

  const selectAllEmails = () => {
    setSelectedEmails(new Set(registeredEmails));
  };

  const deselectAllEmails = () => {
    setSelectedEmails(new Set());
  };

  const getEmailsToSend = (): string[] => {
    const emails: string[] = [];
    
    if (useRegisteredEmails) {
      emails.push(...Array.from(selectedEmails));
    }
    
    if (manualEmails.trim()) {
      const manual = manualEmails
        .split('\n')
        .map(e => e.trim())
        .filter(e => e && e.includes('@'));
      emails.push(...manual);
    }
    
    return [...new Set(emails)]; // Remove duplicates
  };

  const handleMassEmail = async () => {
    const emails = getEmailsToSend();
    
    if (emails.length === 0) {
      toast.error('Selecione ou digite pelo menos um email!');
      return;
    }
    
    if (!massEmailSubject.trim() || !massEmailMessage.trim()) {
      toast.error('Preencha o assunto e a mensagem!');
      return;
    }

    if (!confirm(`Enviar email para ${emails.length} destinatário(s)?`)) return;

    try {
      setMassEmailSending(true);
      setMassEmailResults(null);
      
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'send_mass_email',
          emails,
          subject: massEmailSubject,
          message: massEmailMessage,
        },
      });

      if (error) throw error;

      setMassEmailResults(data);
      toast.success(`Enviados: ${data.sent}/${data.total}`);
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setMassEmailSending(false);
    }
  };

  const buildWhatsappMigrationEmail = () => `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 0;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#111827;border-radius:16px;overflow:hidden;border:1px solid #1f2937;">
  <tr><td style="background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);padding:34px 24px;text-align:center;">
    <div style="display:inline-block;background:#000;color:#25D366;padding:10px 22px;border-radius:10px;font-size:22px;font-weight:900;letter-spacing:2px;">ZAPMRO</div>
    <h1 style="color:#ffffff;font-size:26px;margin:20px 0 6px;font-weight:900;line-height:1.25;">Sua ferramenta do WhatsApp foi atualizada!</h1>
    <p style="color:#e6fffb;margin:0;font-size:15px;font-weight:600;">Agora com API Oficial do WhatsApp — sem banimentos, sem travas</p>
  </td></tr>
  <tr><td style="padding:32px 30px;color:#e5e7eb;">
    <p style="font-size:16px;margin:0 0 16px;color:#ffffff;">Olá,</p>
    <p style="font-size:15px;line-height:1.7;color:#d1d5db;margin:0 0 18px;">
      Um recado <strong style="color:#25D366;">muito importante</strong> sobre a sua ferramenta de WhatsApp da <strong style="color:#ffffff;">MRO / ZapMRO</strong>.
    </p>
    <div style="background:#0f172a;border-left:4px solid #25D366;padding:18px 20px;border-radius:10px;margin:22px 0;">
      <p style="margin:0 0 10px;font-size:15px;color:#ffffff;font-weight:700;">Migramos para a API Oficial do WhatsApp</p>
      <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.7;">
        Nos últimos meses passamos por <strong style="color:#facc15;">muitas travas no WhatsApp Web</strong> e <strong style="color:#facc15;">banimentos de números</strong> — muitas vezes apenas por vários usuários rodarem no mesmo IP. Por diversos motivos que estavam prejudicando você e nossa operação, decidimos <strong style="color:#ffffff;">migrar toda a ferramenta para a API Oficial do WhatsApp</strong>.
      </p>
    </div>
    <p style="font-size:15px;line-height:1.7;color:#d1d5db;margin:0 0 18px;">
      Com a API Oficial <strong style="color:#ffffff;">você nunca mais terá problemas de número bloqueado</strong>, é o próprio WhatsApp entregando as mensagens. Basta usar de maneira correta e aproveitar.
    </p>
    <div style="background:#0f172a;border:1px solid #1f2937;padding:18px 20px;border-radius:10px;margin:22px 0;">
      <p style="margin:0 0 10px;font-size:15px;color:#ffffff;font-weight:700;">Seu plano continua o mesmo</p>
      <ul style="margin:0;padding-left:20px;color:#cbd5e1;font-size:14px;line-height:1.8;">
        <li>Se você tinha <strong style="color:#ffffff;">plano anual</strong> — continua com o anual.</li>
        <li>Se você tinha <strong style="color:#ffffff;">vitalício</strong> — continua vitalício.</li>
        <li><strong style="color:#25D366;">Sem custo adicional</strong> para migrar para a API Oficial.</li>
      </ul>
    </div>
    <div style="background:#1f2937;padding:20px;border-radius:12px;margin:24px 0;">
      <p style="margin:0 0 12px;font-size:15px;color:#ffffff;font-weight:700;">Como ativar seu acesso:</p>
      <ol style="margin:0;padding-left:22px;color:#d1d5db;font-size:14px;line-height:1.8;">
        <li>Acesse <a href="https://zapmro.com.br" style="color:#25D366;text-decoration:underline;font-weight:700;">zapmro.com.br</a></li>
        <li>Faça seu cadastro na nova ferramenta.</li>
        <li>Avise nosso suporte para ativar seu acesso dentro do plano atual.</li>
      </ol>
    </div>
    <div style="text-align:center;margin:30px 0;">
      <a href="https://zapmro.com.br" style="display:inline-block;padding:18px 46px;background:linear-gradient(135deg,#25D366 0%,#128C7E 100%);color:#ffffff;font-weight:900;text-decoration:none;border-radius:14px;font-size:16px;letter-spacing:1px;box-shadow:0 6px 20px rgba(37,211,102,0.35);">🚀 ACESSAR ZAPMRO.COM.BR</a>
    </div>
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:20px 0 0;line-height:1.7;">
      Após o cadastro, chame nosso suporte no WhatsApp e informe seu e-mail cadastrado para liberarmos o acesso completo dentro do seu plano.
    </p>
    <p style="font-size:14px;color:#d1d5db;margin:26px 0 0;line-height:1.7;">
      Obrigado por continuar com a gente. Essa mudança é para <strong style="color:#ffffff;">te dar estabilidade total</strong> e você poder focar no que importa: <strong style="color:#25D366;">vender e atender melhor</strong>.
    </p>
    <p style="font-size:14px;color:#d1d5db;margin:18px 0 0;">Abraços,<br><strong style="color:#ffffff;">Equipe MRO / ZapMRO</strong></p>
  </td></tr>
  <tr><td style="background:#000;padding:18px;text-align:center;color:#6b7280;font-size:12px;">
    © ${new Date().getFullYear()} MRO - Mais Resultados Online · ZapMRO
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const loadWhatsappUsers = async () => {
    try {
      setLoadingWhatsappUsers(true);
      const { data, error } = await supabase.functions.invoke('manage-user-access', {
        body: { action: 'list_whatsapp_users' },
      });
      if (error) throw error;
      const users = data?.users || [];
      setWhatsappUsers(users);
      setSelectedWhatsappEmails(new Set(users.map((u: any) => u.email)));
      toast.success(`${users.length} usuários da ferramenta WhatsApp carregados`);
    } catch (error: any) {
      toast.error('Erro ao carregar usuários: ' + error.message);
    } finally {
      setLoadingWhatsappUsers(false);
    }
  };

  const toggleWaEmail = (email: string) => {
    setSelectedWhatsappEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  };

  const sendWhatsappMigrationEmails = async () => {
    const emails = Array.from(selectedWhatsappEmails);
    if (emails.length === 0) {
      toast.error('Selecione pelo menos um destinatário');
      return;
    }
    if (!confirm(`Enviar aviso de migração ZapMRO para ${emails.length} usuário(s)?`)) return;

    setWaMigrationSending(true);
    setWaMigrationResults(null);
    const html = buildWhatsappMigrationEmail();
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      try {
        const { data, error } = await supabase.functions.invoke('broadcast-email', {
          body: { to: email, subject: waMigrationSubject, body: html, rawHtml: true },
        });
        if (error || !data?.success) failed++; else sent++;
      } catch {
        failed++;
      }
      setWaMigrationResults({ total: emails.length, sent, failed });
      await new Promise((r) => setTimeout(r, 500));
    }

    setWaMigrationSending(false);
    toast.success(`Concluído: ${sent} enviados, ${failed} falhas`);
  };

  const checkExpirations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-expirations');

      if (error) throw error;

      toast.success(`Verificação concluída! Avisos: ${data.warningsSent}, Expirados: ${data.expiredSent}`);
      loadAccesses(); // Refresh the list
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Email',
      'Usuário',
      'Senha',
      'Serviço',
      'Tipo Acesso',
      'Data Criação',
      'Data Expiração',
      'Aviso Enviado',
      'Expirou Notificado',
      'Email Aberto',
      'Notas'
    ];

    const rows = accesses.map(a => [
      a.customer_email,
      a.username,
      a.password,
      a.service_type,
      a.access_type,
      new Date(a.created_at).toLocaleDateString('pt-BR'),
      a.expiration_date ? new Date(a.expiration_date).toLocaleDateString('pt-BR') : 'Vitalício',
      a.expiration_warning_sent ? 'Sim' : 'Não',
      a.expired_notification_sent ? 'Sim' : 'Não',
      a.email_opened ? 'Sim' : 'Não',
      a.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `acessos_mro_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('CSV exportado!');
  };

  // Get expiring/expired stats
  const expiringCount = accesses.filter(a => {
    if (a.access_type === 'lifetime' || !a.expiration_date) return false;
    const exp = new Date(a.expiration_date);
    const now = new Date();
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 0 && diff <= 7;
  }).length;

  const expiredCount = accesses.filter(a => {
    if (a.access_type === 'lifetime' || !a.expiration_date) return false;
    return new Date(a.expiration_date) < new Date();
  }).length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-yellow-500/30">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-white text-2xl">Admin Usuários</CardTitle>
            <CardDescription className="text-gray-400">
              Digite seu email e senha para acessar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Email</Label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Digite seu email..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <Label className="text-gray-300">Senha</Label>
              <Input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Digite a senha..."
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <Button
              onClick={handleLogin}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Usuários</h1>
            <p className="text-gray-400">Gerencie acessos WhatsApp e Instagram</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={checkExpirations} variant="outline" disabled={loading} className="border-orange-500 text-orange-500 hover:bg-orange-500/20 text-xs sm:text-sm">
              <Bell className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Verificar Expirações</span>
            </Button>
            <Button onClick={exportToCSV} variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/20 text-xs sm:text-sm">
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
            <Button onClick={loadAccesses} variant="outline" disabled={loading} className="text-xs sm:text-sm">
              <RefreshCw className={`w-4 h-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button onClick={handleLogout} variant="destructive" className="text-xs sm:text-sm">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        {(expiringCount > 0 || expiredCount > 0) && (
          <div className="flex gap-4 mb-6 flex-wrap">
            {expiringCount > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg px-4 py-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-400 text-sm font-medium">{expiringCount} expirando em 7 dias</span>
              </div>
            )}
            {expiredCount > 0 && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg px-4 py-2 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-400 text-sm font-medium">{expiredCount} expirados</span>
              </div>
            )}
          </div>
        )}

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="bg-gray-800 border-gray-700 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="create" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm">
              <UserPlus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Criar</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm">
              <Users className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Acessos</span> ({accesses.length})
            </TabsTrigger>
            <TabsTrigger value="test" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm">
              <TestTube className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Testar</span>
            </TabsTrigger>
            <TabsTrigger value="mass-email" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm">
              <Send className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Disparo</span>
            </TabsTrigger>
            <TabsTrigger value="wa-migration" className="data-[state=active]:bg-green-500 data-[state=active]:text-black text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Aviso WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-xs sm:text-sm">
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Create Access Tab */}
          <TabsContent value="create">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-yellow-500" />
                    Criar Novo Acesso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Email do Cliente *</Label>
                    <Input
                      type="email"
                      value={form.customerEmail}
                      onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                      placeholder="cliente@email.com"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Usuário *</Label>
                    <Input
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder="usuario"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Senha *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Senha"
                        className="bg-gray-700 border-gray-600 text-white flex-1"
                      />
                      <Button type="button" onClick={generatePassword} variant="outline" size="sm">
                        Gerar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Serviço</Label>
                    <Select
                      value={form.serviceType}
                      onValueChange={(value: 'whatsapp' | 'instagram') =>
                        setForm({ ...form, serviceType: value })
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Tipo de Acesso</Label>
                    <Select
                      value={form.accessType}
                      onValueChange={(value: 'annual' | 'lifetime' | 'monthly' | 'solo' | 'pro' | 'agencia') =>
                        setForm({ ...form, accessType: value })
                      }
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal (30d)</SelectItem>
                        <SelectItem value="annual">Anual (365d)</SelectItem>
                        <SelectItem value="lifetime">Vitalício</SelectItem>
                        <SelectItem value="solo" className="text-emerald-400 font-bold">Plano Solo (1 conta)</SelectItem>
                        <SelectItem value="pro" className="text-amber-400 font-bold">Plano Pro (4 contas) ⭐</SelectItem>
                        <SelectItem value="agencia" className="text-purple-400 font-bold">Plano Agência (10 contas)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Observações (opcional)</Label>
                    <Input
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Notas internas..."
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  {/* Opção para criar na API */}
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.createInApi}
                        onChange={(e) => setForm({ ...form, createInApi: e.target.checked })}
                        className="mt-1 w-5 h-5 rounded border-gray-500 bg-gray-700 text-yellow-500 focus:ring-yellow-500"
                      />
                      <div>
                        <span className="text-white font-medium">Criar na API interna (Ferramenta MRO)</span>
                        <p className="text-gray-400 text-xs mt-1">
                          {form.createInApi 
                            ? '✅ Usuário será criado na nossa API interna automaticamente'
                            : '⚠️ Apenas salvar no admin e enviar email (usuário já existe na API)'}
                        </p>

                      </div>
                    </label>
                  </div>

                  <Button
                    onClick={handleCreateAccess}
                    disabled={loading}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-6"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="w-5 h-5 mr-2" />
                    )}
                    {form.createInApi ? 'Criar Acesso e Enviar Email' : 'Salvar e Enviar Email'}
                  </Button>
                </CardContent>
              </Card>

              {/* Copy Message Card */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Copy className="w-5 h-5 text-green-500" />
                    Copiar Acesso
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {lastCreatedAccess ? 'Último acesso criado - clique para copiar' : 'Crie um acesso para copiar a mensagem'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lastCreatedAccess ? (
                    <div className="space-y-4">
                      <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className={lastCreatedAccess.service_type === 'instagram' ? 'bg-pink-600' : 'bg-green-600'}>
                            {lastCreatedAccess.service_type === 'instagram' ? 'Instagram' : 'WhatsApp'}
                          </Badge>
                          <span className="text-yellow-400 font-mono">{lastCreatedAccess.username}</span>
                        </div>
                        <pre className="text-gray-300 text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
                          {generateCopyMessage(lastCreatedAccess)}
                        </pre>
                      </div>
                      <Button
                        onClick={() => copyToClipboard(lastCreatedAccess)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4"
                      >
                        <Copy className="w-5 h-5 mr-2" />
                        Copiar Mensagem para WhatsApp
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      <Copy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Nenhum acesso criado ainda</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* List Accesses Tab */}
          <TabsContent value="list" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por email ou usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="grid gap-3">
              {filteredAccesses.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="py-10 text-center text-gray-400">
                    Nenhum acesso encontrado
                  </CardContent>
                </Card>
              ) : (
                filteredAccesses.map((access) => (
                  <Card key={access.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      {editingId === access.id ? (
                        <div className="space-y-4">
                          <Input
                            value={editForm.customer_email || ''}
                            onChange={(e) => setEditForm({ ...editForm, customer_email: e.target.value })}
                            placeholder="Email"
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                          <div className="flex gap-2 flex-wrap">
                            <Button onClick={() => handleSaveEdit(access.id)} className="bg-green-600 hover:bg-green-700">
                              <Check className="w-4 h-4 mr-2" /> Salvar
                            </Button>
                            <Button
                              onClick={async () => {
                                await handleSaveEdit(access.id);
                                await handleResendEmail(access.id);
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Mail className="w-4 h-4 mr-2" /> Salvar e Reenviar acesso
                            </Button>
                            <Button onClick={() => setEditingId(null)} variant="outline">
                              <X className="w-4 h-4 mr-2" /> Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Badges row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={access.service_type === 'instagram' ? 'bg-pink-600' : 'bg-green-600'}>
                              {access.service_type === 'instagram' ? 'Instagram' : 'WhatsApp'}
                            </Badge>
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs">
                              {access.access_type === 'lifetime' ? 'Vitalício' : access.access_type === 'annual' ? 'Anual' : 'Mensal'}
                            </Badge>
                            {access.api_created && <Badge className="bg-blue-600 text-xs">API✓</Badge>}
                            {access.email_sent && <Badge className="bg-purple-600 text-xs">Email✓</Badge>}
                            {access.email_opened && (
                              <Badge className="bg-cyan-600 text-xs flex items-center gap-1">
                                <MailOpen className="w-3 h-3" /> Lido
                              </Badge>
                            )}
                            {access.expiration_warning_sent && (
                              <Badge className="bg-orange-600 text-xs flex items-center gap-1">
                                <Bell className="w-3 h-3" /> Avisado
                              </Badge>
                            )}
                            {access.expired_notification_sent && (
                              <Badge className="bg-red-600 text-xs flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Expirou
                              </Badge>
                            )}
                            {access.expiration_date && access.access_type !== 'lifetime' && new Date(access.expiration_date) < new Date() && (
                              <Badge className="bg-red-900 text-red-300 text-xs">EXPIRADO</Badge>
                            )}
                          </div>

                          {/* Mobile: One field per line / Desktop: Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                            {/* Serviço */}
                            <div className="bg-gray-900/50 rounded-lg p-2">
                              <span className="text-gray-500 text-xs block">Serviço</span>
                              <span className="text-white font-medium">
                                {access.service_type === 'instagram' ? 'Instagram' : 'WhatsApp'}
                              </span>
                            </div>

                            {/* Email */}
                            <div className="bg-gray-900/50 rounded-lg p-2 md:col-span-2 lg:col-span-2">
                              <span className="text-gray-500 text-xs block">Email</span>
                              <span className="text-white font-medium break-all">{access.customer_email}</span>
                            </div>

                            {/* Usuário */}
                            <div className="bg-gray-900/50 rounded-lg p-2">
                              <span className="text-gray-500 text-xs block">Usuário</span>
                              <code className="text-yellow-400 font-medium">{access.username}</code>
                            </div>

                            {/* Senha */}
                            <div className="bg-gray-900/50 rounded-lg p-2">
                              <span className="text-gray-500 text-xs block">Senha</span>
                              <div className="flex items-center gap-2">
                                <code className="text-yellow-400 font-medium">
                                  {showPasswords[access.id] ? access.password : '••••••••'}
                                </code>
                                <button 
                                  onClick={() => setShowPasswords({ ...showPasswords, [access.id]: !showPasswords[access.id] })}
                                  className="text-gray-400 hover:text-white"
                                >
                                  {showPasswords[access.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {/* Tipo de Acesso */}
                            <div className="bg-gray-900/50 rounded-lg p-2">
                              <span className="text-gray-500 text-xs block">Tipo de Acesso</span>
                              <span className="text-white font-medium">
                                {access.access_type === 'lifetime' ? 'Vitalício' : access.access_type === 'annual' ? 'Anual (365d)' : 'Mensal (30d)'}
                              </span>
                            </div>

                            {/* Data de Criação */}
                            <div className="bg-gray-900/50 rounded-lg p-2">
                              <span className="text-gray-500 text-xs block">Criado em</span>
                              <span className="text-white font-medium">
                                {new Date(access.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>

                            {/* Data de Expiração */}
                            {access.access_type !== 'lifetime' && (
                              <div className="bg-gray-900/50 rounded-lg p-2">
                                <span className="text-gray-500 text-xs block">Expira em</span>
                                <span className={`font-medium ${access.expiration_date && new Date(access.expiration_date) < new Date() ? 'text-red-400' : 'text-orange-400'}`}>
                                  {access.expiration_date 
                                    ? new Date(access.expiration_date).toLocaleDateString('pt-BR')
                                    : 'N/A'}
                                </span>
                              </div>
                            )}

                            {/* Email Lido */}
                            {access.email_opened_at && (
                              <div className="bg-gray-900/50 rounded-lg p-2">
                                <span className="text-gray-500 text-xs block">Email Lido</span>
                                <span className="text-cyan-400 font-medium flex items-center gap-1">
                                  <MailOpen className="w-3 h-3" />
                                  {new Date(access.email_opened_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}

                            {/* Observações */}
                            {access.notes && (
                              <div className="bg-gray-900/50 rounded-lg p-2 col-span-1 md:col-span-2 lg:col-span-3">
                                <span className="text-gray-500 text-xs block">Observações</span>
                                <span className="text-gray-300">{access.notes}</span>
                              </div>
                            )}
                          </div>

                          {/* Action buttons - Always visible */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                            <Button 
                              onClick={() => copyToClipboard(access)} 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 flex-1 min-w-[100px]"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Copiar</span>
                            </Button>
                            <Button 
                              onClick={() => handleResendEmail(access.id)} 
                              size="sm" 
                              variant="outline" 
                              disabled={loading}
                              className="flex-1 min-w-[100px]"
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Email</span>
                            </Button>
                            <Button 
                              onClick={() => startEditing(access)} 
                              size="sm" 
                              variant="outline"
                              className="flex-1 min-w-[100px]"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Editar</span>
                            </Button>
                            <Button 
                              onClick={() => handleDeleteAccess(access.id)} 
                              size="sm" 
                              variant="destructive" 
                              disabled={loading}
                              className="flex-1 min-w-[100px]"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              <span className="hidden sm:inline">Excluir</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Test APIs Tab */}
          <TabsContent value="test">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-500" />
                    WhatsApp API
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={testWhatsAppAPI} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                    {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                    Testar
                  </Button>
                  {testResults.whatsapp && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${testResults.whatsapp.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                      {testResults.whatsapp.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {testResults.whatsapp.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-pink-500" />
                    Instagram API
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={testInstagramAPI} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-700">
                    {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                    Testar
                  </Button>
                  {testResults.instagram && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${testResults.instagram.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                      {testResults.instagram.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {testResults.instagram.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-purple-500" />
                    Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="email@teste.com"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Button onClick={testEmailSending} disabled={loading || !testEmail} className="w-full bg-purple-600 hover:bg-purple-700">
                    {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    Enviar
                  </Button>
                  {testResults.email && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${testResults.email.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                      {testResults.email.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {testResults.email.message}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Mass Email Tab */}
          <TabsContent value="mass-email">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Email Selection */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Destinatários
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Selecione emails cadastrados ou digite manualmente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Registered Emails */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={useRegisteredEmails}
                          onChange={(e) => setUseRegisteredEmails(e.target.checked)}
                          className="rounded"
                        />
                        Emails cadastrados ({registeredEmails.length})
                      </Label>
                      {useRegisteredEmails && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={selectAllEmails}>
                            Todos
                          </Button>
                          <Button size="sm" variant="outline" onClick={deselectAllEmails}>
                            Nenhum
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {useRegisteredEmails && (
                      <div className="max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-2 space-y-1">
                        {registeredEmails.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-2">Nenhum email cadastrado</p>
                        ) : (
                          registeredEmails.map((email) => (
                            <div
                              key={email}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                selectedEmails.has(email) ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-gray-800 hover:bg-gray-700'
                              }`}
                              onClick={() => toggleEmailSelection(email)}
                            >
                              {selectedEmails.has(email) ? (
                                <CheckSquare className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-500" />
                              )}
                              <span className="text-sm text-gray-300 truncate">{email}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Manual Emails */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">Emails manuais (um por linha)</Label>
                    <Textarea
                      value={manualEmails}
                      onChange={(e) => setManualEmails(e.target.value)}
                      placeholder="email1@exemplo.com&#10;email2@exemplo.com&#10;email3@exemplo.com"
                      className="bg-gray-700 border-gray-600 text-white min-h-[120px] font-mono text-sm"
                    />
                  </div>

                  <div className="bg-gray-900 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">
                      Total a enviar: <span className="text-yellow-400 font-bold">{getEmailsToSend().length}</span> emails
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Message Composition */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-purple-500" />
                    Mensagem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Assunto do Email</Label>
                    <Input
                      value={massEmailSubject}
                      onChange={(e) => setMassEmailSubject(e.target.value)}
                      placeholder="Assunto do email..."
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Mensagem (suporta HTML)</Label>
                    <Textarea
                      value={massEmailMessage}
                      onChange={(e) => setMassEmailMessage(e.target.value)}
                      placeholder="Digite sua mensagem aqui...&#10;&#10;Pode usar HTML para formatação:&#10;<b>negrito</b>, <i>itálico</i>, <a href='url'>link</a>"
                      className="bg-gray-700 border-gray-600 text-white min-h-[200px]"
                    />
                  </div>

                  <Button
                    onClick={handleMassEmail}
                    disabled={massEmailSending || getEmailsToSend().length === 0}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6"
                  >
                    {massEmailSending ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 mr-2" />
                    )}
                    Enviar para {getEmailsToSend().length} emails
                  </Button>

                  {/* Results */}
                  {massEmailResults && (
                    <div className="bg-gray-900 p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Total:</span>
                        <span className="text-white font-bold">{massEmailResults.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-400">Enviados:</span>
                        <span className="text-green-400 font-bold">{massEmailResults.sent}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-red-400">Falhas:</span>
                        <span className="text-red-400 font-bold">{massEmailResults.failed}</span>
                      </div>
                      
                      {massEmailResults.results.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <p className="text-xs text-gray-500 mb-2">Detalhes:</p>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {massEmailResults.results.map((r, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                {r.success ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                )}
                                <span className={r.success ? 'text-gray-400' : 'text-red-400'}>{r.email}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="wa-migration">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    Usuários da ferramenta WhatsApp
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Emails do <code>/adminusuario</code> (WhatsApp) + cadastros diretos na área de membros ZapMRO
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button onClick={loadWhatsappUsers} disabled={loadingWhatsappUsers} className="bg-green-600 hover:bg-green-700 text-white">
                      {loadingWhatsappUsers ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Carregar / Atualizar
                    </Button>
                    {whatsappUsers.length > 0 && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setSelectedWhatsappEmails(new Set(whatsappUsers.map(u => u.email)))}>Todos</Button>
                        <Button size="sm" variant="outline" onClick={() => setSelectedWhatsappEmails(new Set())}>Nenhum</Button>
                      </>
                    )}
                  </div>

                  {whatsappUsers.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-6">Clique em "Carregar" para buscar os usuários</p>
                  ) : (
                    <div className="max-h-[420px] overflow-y-auto bg-gray-900 rounded-lg p-2 space-y-1">
                      {whatsappUsers.map((u) => (
                        <div
                          key={u.email}
                          onClick={() => toggleWaEmail(u.email)}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                            selectedWhatsappEmails.has(u.email) ? 'bg-green-500/20 border border-green-500/50' : 'bg-gray-800 hover:bg-gray-700'
                          }`}
                        >
                          {selectedWhatsappEmails.has(u.email) ? (
                            <CheckSquare className="w-4 h-4 text-green-500 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-500 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-200 truncate">{u.email}</div>
                            {u.name && <div className="text-xs text-gray-500 truncate">{u.name}</div>}
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {u.source === 'zapmro_users' ? 'ZapMRO' : 'Cadastro'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-gray-900 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">
                      Selecionados: <span className="text-green-400 font-bold">{selectedWhatsappEmails.size}</span> de {whatsappUsers.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-green-500" />
                    Aviso de Migração ZapMRO → API Oficial
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Email pronto e formatado com botão para zapmro.com.br
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Assunto</Label>
                    <Input
                      value={waMigrationSubject}
                      onChange={(e) => setWaMigrationSubject(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Pré-visualização</Label>
                    <div className="bg-white rounded-lg overflow-hidden border border-gray-600">
                      <iframe
                        title="preview"
                        srcDoc={buildWhatsappMigrationEmail()}
                        className="w-full h-[380px] bg-white"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={sendWhatsappMigrationEmails}
                    disabled={waMigrationSending || selectedWhatsappEmails.size === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6"
                  >
                    {waMigrationSending ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 mr-2" />
                    )}
                    Enviar para {selectedWhatsappEmails.size} usuário(s)
                  </Button>

                  {waMigrationResults && (
                    <div className="bg-gray-900 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between"><span className="text-gray-400">Total:</span><span className="text-white font-bold">{waMigrationResults.total}</span></div>
                      <div className="flex justify-between"><span className="text-green-400">Enviados:</span><span className="text-green-400 font-bold">{waMigrationResults.sent}</span></div>
                      <div className="flex justify-between"><span className="text-red-400">Falhas:</span><span className="text-red-400 font-bold">{waMigrationResults.failed}</span></div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-yellow-500" />
                  Configurações da Mensagem
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure os links e a mensagem que será copiada/enviada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Link da Área de Membros</Label>
                    <Input
                      value={settings.memberAreaLink}
                      onChange={(e) => setSettings({ ...settings, memberAreaLink: e.target.value })}
                      placeholder="https://maisresultadosonline.com.br"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Link do Grupo WhatsApp</Label>
                    <Input
                      value={settings.whatsappGroupLink}
                      onChange={(e) => setSettings({ ...settings, whatsappGroupLink: e.target.value })}
                      placeholder="https://chat.whatsapp.com/..."
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Mensagem para Instagram (use {'{USERNAME}'}, {'{PASSWORD}'}, {'{MEMBER_LINK}'}, {'{GROUP_LINK}'})</Label>
                  <Textarea
                    value={settings.messageTemplateInstagram}
                    onChange={(e) => setSettings({ ...settings, messageTemplateInstagram: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white min-h-[200px] font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Mensagem para WhatsApp (use {'{USERNAME}'}, {'{PASSWORD}'}, {'{MEMBER_LINK}'}, {'{GROUP_LINK}'})</Label>
                  <Textarea
                    value={settings.messageTemplateWhatsapp}
                    onChange={(e) => setSettings({ ...settings, messageTemplateWhatsapp: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white min-h-[200px] font-mono text-sm"
                  />
                </div>

                <Button onClick={saveSettings} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
