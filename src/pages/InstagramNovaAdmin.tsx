import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackPurchase } from "@/lib/facebookTracking";

import { 
  Loader2, 
  Lock, 
  LogOut, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  XCircle,
  Mail,
  User,
  Calendar,
  DollarSign,
  Copy,
  Phone,
  AlertTriangle,
  Trash2,
  ChevronDown,
  ChevronRight,
  Settings,
  Save,
  Users,
  Power,
  PowerOff,
  Image,
  Send,
  X,
  Filter,
  Upload,
  Clipboard,
  Pencil,
  Plus,
  Link,
  Eye,
  EyeOff,
  FileText,
  Key,
  Smartphone,
  QrCode,
  MessageCircle,
  Target
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, differenceInDays, addDays } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import AccessReminderPanel from "@/components/admin/AccessReminderPanel";
import WhatsAppMigrationBroadcast from "@/components/admin/WhatsAppMigrationBroadcast";
import WppBotPanel from "@/components/admin/WppBotPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_SESSION_STORAGE_KEY = "mro_instagram_admin_session";
const ORDERS_CACHE_STORAGE_KEY = "mro_instagram_admin_orders_cache_v1";

// Configurações do template de mensagem
const MEMBER_LINK = "https://maisresultadosonline.com.br/instagram";
const GROUP_LINK = "https://chat.whatsapp.com/JdEHa4jeLSUKTQFCNp7YXi";

interface MROOrder {
  id: string;
  email: string;
  username: string;
  phone: string | null;
  plan_type: string;
  amount: number;
  status: string;
  nsu_order: string;
  infinitepay_link: string | null;
  api_created: boolean | null;
  email_sent: boolean | null;
  whatsapp_sent?: boolean | null; // Novo campo para rastrear envio de WhatsApp
  paid_at: string | null;
  completed_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Affiliate {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  active: boolean;
  createdAt: string;
  commissionNotified: string[]; // NSU orders that have been notified
  promoStartDate?: string; // YYYY-MM-DD
  promoEndDate?: string;   // YYYY-MM-DD
  promoStartTime?: string; // HH:mm
  promoEndTime?: string;   // HH:mm
  isLifetime?: boolean;    // true = afiliado vitalício, recebe comissão na hora
  showPromoBanner?: boolean; // true = exibir foto e nome na página de vendas
  squarecloudUsername?: string; // usuário MRO (SquareCloud) dono desse afiliado — permite auto-login em /afiliadosx
  source?: string; // "afiliadosx" quando criado pelo próprio afiliado
}

export default function InstagramNovaAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [adminSessionToken, setAdminSessionToken] = useState("");
  
  const [orders, setOrders] = useState<MROOrder[]>([]);
  const ordersRef = useRef<MROOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid" | "completed" | "expired">("all");
  
  const autoCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsAutoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);
  const [lastAutoCheck, setLastAutoCheck] = useState<Date | null>(null);

  // CRM Webhook States
  const [isSendingWebhook, setIsSendingWebhook] = useState<string | null>(null);
  const [isSavingWebhookConfig, setIsSavingWebhookConfig] = useState(false);
  const [kanbanLabels, setKanbanLabels] = useState<Record<string, string>>({
    completed: "Completos",
    paid: "Pagos",
    pending: "Pendentes",
    expired: "Expirados"
  });
  const [webhookConfig, setWebhookConfig] = useState({
    enabled: true,
    webhook_id: "0c578c9d-4e33-48be-91dd-63f98d7ff430",
    token: "qnf3vbusrbs105v96afj2r8",
    default_status: "pending",
    message_template: `Obrigado por fazer parte do nosso sistema!✅

🚀🔥 *Ferramenta para Instagram Vip acesso!*

Preciso que assista os vídeos da área de membros com o link abaixo:

( {member_link} ) 

1 - Acesse Área Membros

2 - Acesse ferramenta para instagram

Para acessar a ferramenta e área de membros, utilize os acessos:

*usuário:* {username}
*senha:* {username}

⚠ Assista todos os vídeos, por favor!

Participe também do nosso GRUPO DE AVISOS
{group_link}`
  });
  const [showWebhookSettings, setShowWebhookSettings] = useState(false);
  const [showWppConnection, setShowWppConnection] = useState(false);
  const [whatsappMode, setWhatsappMode] = useState<"api" | "qrcode" | "none">("api");
  const [useGlobalWpp, setUseGlobalWpp] = useState(true);
  const [slowSendEnabled, setSlowSendEnabled] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [nextQueueRun, setNextQueueRun] = useState<Date | null>(null);
  const [processedInSession, setProcessedInSession] = useState<Set<string>>(new Set());



  // Importante: manter sempre a lista mais recente para o auto-check (intervalo não recria quando orders muda)
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  
  // State para seções colapsáveis
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    completed: true,
    paid: true,
    pending: true,
    expired: true
  });

  // Configuração de afiliado - sistema expandido
  const [showAffiliateConfig, setShowAffiliateConfig] = useState(false);
  const [showRemarketingDashboard, setShowRemarketingDashboard] = useState(false);
  const [showAvisosWhatsapp, setShowAvisosWhatsapp] = useState(false);
  const [showAccessReminder, setShowAccessReminder] = useState(false);
  const [activeTab, setActiveTab] = useState<"config" | "affiliates" | "sales" | "attempts" | "email-preview">("config");
  
  // Afiliado atual sendo editado
  const [affiliateId, setAffiliateId] = useState("");
  const [affiliateName, setAffiliateName] = useState("");
  const [affiliateEmail, setAffiliateEmail] = useState("");
  const [affiliatePhotoUrl, setAffiliatePhotoUrl] = useState("");
  const [affiliateActive, setAffiliateActive] = useState(true);
  const [savingAffiliate, setSavingAffiliate] = useState(false);
  const [promoStartDate, setPromoStartDate] = useState("");
  const [promoEndDate, setPromoEndDate] = useState("");
  const [promoStartTime, setPromoStartTime] = useState("");
  const [promoEndTime, setPromoEndTime] = useState("");
  const [isLifetimeAffiliate, setIsLifetimeAffiliate] = useState(false);
  const [affiliateSquarecloudUsername, setAffiliateSquarecloudUsername] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isEditingAffiliate, setIsEditingAffiliate] = useState(false);
  const [editingAffiliateOriginalId, setEditingAffiliateOriginalId] = useState<string | null>(null);
  
  // Histórico de afiliados
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selectedAffiliateFilter, setSelectedAffiliateFilter] = useState<string>("all");
  const [mainAffiliateFilter, setMainAffiliateFilter] = useState<string>("all");
  const [affiliatesLoaded, setAffiliatesLoaded] = useState(false);
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);
  
  // Envio de emails
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWelcomeEmail, setSendingWelcomeEmail] = useState<string | null>(null);
  
  // Modal de resumo com email adicional
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryModalAffiliate, setSummaryModalAffiliate] = useState<Affiliate | null>(null);
  const [additionalEmail, setAdditionalEmail] = useState("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState("");
  
  // Configuração de WhatsApp para emails de afiliados
  const [affiliateWhatsApp, setAffiliateWhatsApp] = useState("");
  
  // Link de acompanhamento - senha por afiliado
  const [affiliatePasswords, setAffiliatePasswords] = useState<Record<string, string>>({});
  const [showPasswordInput, setShowPasswordInput] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswordVisible, setShowPasswordVisible] = useState<Record<string, boolean>>({});
  
  // Comissões pagas por afiliado - Record<affiliateId, nsu_order[]>
  const [paidCommissions, setPaidCommissions] = useState<Record<string, string[]>>({});
  const [selectedSalesForPayment, setSelectedSalesForPayment] = useState<Set<string>>(new Set());
  const [savingCommissions, setSavingCommissions] = useState(false);

  // Webhook Logs
  interface WebhookLog {
    id: string;
    created_at: string;
    event_type: string;
    order_nsu: string | null;
    transaction_nsu: string | null;
    email: string | null;
    username: string | null;
    affiliate_id: string | null;
    amount: number | null;
    status: string;
    result_message: string | null;
    order_found: boolean | null;
  }
  const [showWebhookLogs, setShowWebhookLogs] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // CRM Webhook Delivery Logs
  interface CRMLog {
    id: string;
    created_at: string;
    webhook_id: string;
    to_number: string;
    message: string;
    status: string;
    error_message: string | null;
    order_id: string | null;
    crm_webhooks?: {
      name: string;
    }
  }
  const [showCRMWebhookLogs, setShowCRMWebhookLogs] = useState(false);
  const [crmWebhookLogs, setCrmWebhookLogs] = useState<CRMLog[]>([]);
  const [loadingCRMLogs, setLoadingCRMLogs] = useState(false);
  const crmLogsAutoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reenvio de email e edição de email
  const [resendingEmail, setResendingEmail] = useState<string | null>(null);
  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<MROOrder | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Remarketing states removed (Focus on Approved Sales)

  const getAdminSessionToken = (tokenOverride?: string) => {
    return tokenOverride || adminSessionToken || localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
  };

  const clearAdminSession = () => {
    localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    localStorage.removeItem("mro_admin_auth");
    setAdminSessionToken("");
    setIsAuthenticated(false);
  };

  const loadWebhookLogs = async (tokenOverride?: string) => {
    const token = getAdminSessionToken(tokenOverride);
    if (!token) return;

    setLoadingLogs(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("instagram-admin", {
        body: { action: "listLogs", token }
      });

      if (error || !response?.success) {
        if (response?.error?.includes("Sessão expirada")) {
          clearAdminSession();
        }
        throw new Error(response?.error || error?.message || "Erro ao carregar logs");
      }

      setWebhookLogs(response.logs || []);
    } catch (error) {
      console.error("Error loading webhook logs:", error);
      toast.error("Erro ao carregar logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (!showWebhookLogs) {
      if (logsAutoRefreshIntervalRef.current) {
        clearInterval(logsAutoRefreshIntervalRef.current);
        logsAutoRefreshIntervalRef.current = null;
      }
      return;
    }

    // Carregar imediatamente e manter atualizando enquanto o modal estiver aberto
    loadWebhookLogs();
    logsAutoRefreshIntervalRef.current = setInterval(() => {
      loadWebhookLogs();
    }, 5000);

    return () => {
      if (logsAutoRefreshIntervalRef.current) {
        clearInterval(logsAutoRefreshIntervalRef.current);
        logsAutoRefreshIntervalRef.current = null;
      }
    };
  }, [showWebhookLogs]);

  const loadCRMWebhookLogs = async (tokenOverride?: string) => {
    const token = getAdminSessionToken(tokenOverride);
    if (!token) return;

    setLoadingCRMLogs(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("instagram-admin", {
        body: { action: "listCrmWebhookLogs", token }
      });

      if (error || !response?.success) {
        if (response?.error?.includes("Sessão expirada")) {
          clearAdminSession();
        }
        throw new Error(response?.error || error?.message || "Erro ao carregar histórico");
      }

      setCrmWebhookLogs(response.logs || []);
    } catch (error) {
      console.error("Error loading CRM logs:", error);
      toast.error("Erro ao carregar histórico do CRM");
    } finally {
      setLoadingCRMLogs(false);
    }
  };

  useEffect(() => {
    if (!showCRMWebhookLogs) {
      if (crmLogsAutoRefreshIntervalRef.current) {
        clearInterval(crmLogsAutoRefreshIntervalRef.current);
        crmLogsAutoRefreshIntervalRef.current = null;
      }
      return;
    }

    loadCRMWebhookLogs();
    crmLogsAutoRefreshIntervalRef.current = setInterval(() => {
      loadCRMWebhookLogs();
    }, 5000);

    return () => {
      if (crmLogsAutoRefreshIntervalRef.current) {
        clearInterval(crmLogsAutoRefreshIntervalRef.current);
        crmLogsAutoRefreshIntervalRef.current = null;
      }
    };
  }, [showCRMWebhookLogs]);

  // Efeito para gerenciar o envio lento de mensagens (Drip Feed / Queue)
  useEffect(() => {
    if (!slowSendEnabled || isProcessingQueue || whatsappMode === "none" || !isAuthenticated) return;

    const processQueue = async () => {
      // 1. Verificar se há pedidos que precisam ser enviados
      // Filtramos pedidos pagos ou completos que ainda não foram marcados como whatsapp_sent
      // Para garantir que não enviamos históricos antigos ou remarketing, 
      // filtramos apenas pedidos pagos/completos criados nas últimas 6 horas
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      const pendingWhatsAppOrders = orders.filter(o => 
        (o.status === "paid" || o.status === "completed") && 
        o.whatsapp_sent !== true &&
        o.phone &&
        !processedInSession.has(o.id) &&
        new Date(o.created_at) > sixHoursAgo
      );

      if (pendingWhatsAppOrders.length === 0) {
        if (isProcessingQueue) setIsProcessingQueue(false);
        return;
      }

      setIsProcessingQueue(true);
      
      // Pegar o mais antigo (orders está desc por padrão)
      const orderToSend = pendingWhatsAppOrders[pendingWhatsAppOrders.length - 1];
      
      console.log(`[QUEUE] Processando envio lento para: ${orderToSend.username}`);
      
      try {
        // Marcar como processado nesta sessão ANTES do envio para evitar reentrância em re-renders
        setProcessedInSession(prev => new Set(prev).add(orderToSend.id));
        
        await sendToCRMWebhook(orderToSend);
        
        // Calcular próximo intervalo (mínimo 3 min, máximo 5 min randomizado conforme pedido)
        const minDelay = 3 * 60 * 1000; // 3 minutos
        const randomExtra = Math.floor(Math.random() * 2 * 60 * 1000); // 0-2 minutos extras (total 3-5m)
        const totalDelay = minDelay + randomExtra;
        
        const nextRun = new Date(Date.now() + totalDelay);
        setNextQueueRun(nextRun);
        
        // Recarregar pedidos para atualizar o estado visual
        await loadOrders();
        
        console.log(`[QUEUE] Mensagem enviada. Próximo envio em ${Math.round(totalDelay/1000)}s (${nextRun.toLocaleTimeString()})`);
        
        // Aguardar o intervalo antes de liberar para o próximo
        setTimeout(() => {
          setIsProcessingQueue(false);
          setNextQueueRun(null);
        }, totalDelay);
        
      } catch (error) {
        console.error("[QUEUE] Erro ao processar fila (tentará novamente em 1 min):", error);
        setTimeout(() => {
          setIsProcessingQueue(false);
        }, 60000);
      }
    };

    if (!nextQueueRun) {
      processQueue();
    }
  }, [slowSendEnabled, orders, isProcessingQueue, nextQueueRun, whatsappMode, isAuthenticated, processedInSession]);


  const loadWebhookConfig = async () => {
    const token = getAdminSessionToken();
    if (!token) return;

    try {
      const { data: response, error } = await supabase.functions.invoke("instagram-admin", {
        body: { action: "getCrmWebhook", token }
      });

      if (!error && response?.success && response.config) {
        const config = response.config;
        setWebhookConfig({
          enabled: config.is_active,
          webhook_id: config.id,
          token: config.secret_token,
          default_status: config.default_status || "pending",
          message_template: config.message_template || webhookConfig.message_template
        });
        
        if (config.metadata && typeof config.metadata === 'object') {
          setKanbanLabels(prev => ({
            ...prev,
            ...config.metadata
          }));
          
          // Modo QR Code fixo conforme solicitado
          setWhatsappMode("qrcode");
          if (config.metadata.use_global_wpp !== undefined) setUseGlobalWpp(config.metadata.use_global_wpp);
          if (config.metadata.slow_send_enabled !== undefined) setSlowSendEnabled(config.metadata.slow_send_enabled);
        }
        console.log("Loaded webhook config:", config);
      }
    } catch (error) {
      console.error("Error loading webhook config:", error);
    }
  };

  const saveWebhookConfigToDB = async () => {
    const token = getAdminSessionToken();
    if (!token) return;

    setIsSavingWebhookConfig(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("instagram-admin", {
        body: { 
          action: "updateCrmWebhook", 
          token,
          webhookId: webhookConfig.webhook_id,
          config: {
            ...webhookConfig,
            kanban_labels: {
              ...kanbanLabels,
              whatsapp_mode: "qrcode",
              use_global_wpp: useGlobalWpp,
              slow_send_enabled: slowSendEnabled
            }
          }
        }
      });

      if (error || !response?.success) {
        throw new Error(response?.error || error?.message || "Erro ao salvar na nuvem");
      }

      toast.success("Configurações salvas permanentemente!");
      // Recarregar após salvar para garantir sincronia
      loadWebhookConfig();
    } catch (error) {
      console.error("Error saving webhook config:", error);
      toast.error("Salvo localmente, mas houve erro ao sincronizar com a nuvem");
    } finally {
      setIsSavingWebhookConfig(false);
    }
  };

  // Carregar afiliados da nuvem via edge function - funciona de qualquer dispositivo
  const loadAffiliatesFromCloud = async (forceRefresh = false) => {
    if (loadingAffiliates) return;
    setLoadingAffiliates(true);
    
    try {
      console.log("[AFFILIATES] Loading from cloud...", { forceRefresh });
      
      const { data: response, error } = await supabase.functions.invoke('affiliate-storage', {
        body: { action: 'load', key: 'affiliates' }
      });
      
      if (error || !response?.success) {
        console.log("[AFFILIATES] No cloud data yet or error:", error?.message || response?.error);
        if (!affiliatesLoaded) {
          const savedAffiliates = localStorage.getItem("mro_affiliates_history");
          if (savedAffiliates) {
            try {
              const parsed = JSON.parse(savedAffiliates);
              setAffiliates(parsed);
              console.log("[AFFILIATES] Loaded from localStorage:", parsed.length);
            } catch (e) {
              console.error("[AFFILIATES] Error parsing localStorage:", e);
            }
          }
        }
        setAffiliatesLoaded(true);
        setLoadingAffiliates(false);
        return;
      }
      
      const cloudAffiliates: Affiliate[] = response.data || [];
      console.log("[AFFILIATES] Loaded from cloud:", cloudAffiliates.length, cloudAffiliates.map(a => a.id));
      
      setAffiliates(cloudAffiliates);
      setAffiliatesLoaded(true);
      localStorage.setItem("mro_affiliates_history", JSON.stringify(cloudAffiliates));
      
      const activeAffiliate = cloudAffiliates.find(a => a.active);
      if (activeAffiliate) {
        setAffiliateId(activeAffiliate.id);
        setAffiliateName(activeAffiliate.name);
      }
      
      if (forceRefresh) {
        toast.success(`${cloudAffiliates.length} afiliado(s) sincronizado(s) da nuvem!`);
      }
    } catch (e) {
      console.error("[AFFILIATES] Error loading from cloud:", e);
      if (!affiliatesLoaded) {
        const savedAffiliates = localStorage.getItem("mro_affiliates_history");
        if (savedAffiliates) {
          try {
            setAffiliates(JSON.parse(savedAffiliates));
          } catch (parseError) {
            console.error("Error parsing localStorage affiliates:", parseError);
          }
        }
      }
      setAffiliatesLoaded(true);
    } finally {
      setLoadingAffiliates(false);
    }
  };

  // Carregar configurações globais de afiliados
  const loadAffiliateSettings = async () => {
    try {
      const { data: response, error } = await supabase.functions.invoke('affiliate-storage', {
        body: { action: 'load', key: 'settings' }
      });
      
      if (!error && response?.success && response.data) {
        setAffiliateWhatsApp(response.data.whatsapp || "");
        console.log("[AFFILIATES] Loaded settings:", response.data);
      } else {
        // Fallback localStorage
        const saved = localStorage.getItem("mro_affiliate_whatsapp");
        if (saved) setAffiliateWhatsApp(saved);
      }
    } catch (e) {
      console.error("[AFFILIATES] Error loading settings:", e);
    }
  };

  // Salvar configurações globais de afiliados
  const saveAffiliateSettings = async (whatsapp: string) => {
    try {
      const settings = { whatsapp };
      await supabase.functions.invoke('affiliate-storage', {
        body: { action: 'save', key: 'settings', data: settings }
      });
      localStorage.setItem("mro_affiliate_whatsapp", whatsapp);
      console.log("[AFFILIATES] Settings saved");
    } catch (e) {
      console.error("[AFFILIATES] Error saving settings:", e);
    }
  };

  useEffect(() => {
    loadAffiliatesFromCloud();
    loadAffiliateSettings();
    loadPaidCommissions();
    
    // Carregar configuração do webhook do localStorage
    const savedWebhook = localStorage.getItem("mro_crm_webhook_config");
    if (savedWebhook) {
      try {
        setWebhookConfig(prev => ({ ...prev, ...JSON.parse(savedWebhook) }));
      } catch (e) {
        console.error("Error parsing webhook config:", e);
      }
    }

    // Carregar etiquetas do Kanban
    const savedLabels = localStorage.getItem("mro_kanban_labels");
    if (savedLabels) {
      try {
        setKanbanLabels(JSON.parse(savedLabels));
      } catch (e) {
        console.error("Error parsing kanban labels:", e);
      }
    }
  }, []);

  // Salvar etiquetas do Kanban no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem("mro_kanban_labels", JSON.stringify(kanbanLabels));
  }, [kanbanLabels]);

  // Salvar configuração do webhook no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem("mro_crm_webhook_config", JSON.stringify(webhookConfig));
  }, [webhookConfig]);

  // Carregar comissões pagas da nuvem (via edge function com service role)
  const loadPaidCommissions = async () => {
    try {
      const { data: response, error } = await supabase.functions.invoke('affiliate-storage', {
        body: { action: 'load', key: 'commissions' }
      });

      if (error || !response?.success) {
        console.error("[COMMISSIONS] Load error:", error || response?.error);
        return;
      }

      const commissions = (response.data && typeof response.data === 'object' && !Array.isArray(response.data))
        ? response.data as Record<string, string[]>
        : {};
      setPaidCommissions(commissions);
      console.log("[COMMISSIONS] Loaded paid commissions:", commissions);
    } catch (e) {
      console.error("[COMMISSIONS] Load exception:", e);
    }
  };
  
  // Salvar comissões pagas na nuvem (via edge function com service role)
  const savePaidCommissions = async (commissions: Record<string, string[]>) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('affiliate-storage', {
        body: { action: 'save', key: 'commissions', data: commissions }
      });

      if (error || !response?.success) {
        console.error("[COMMISSIONS] Error saving:", error || response?.error);
        return false;
      }
      console.log("[COMMISSIONS] Saved successfully");
      return true;
    } catch (e) {
      console.error("[COMMISSIONS] Error:", e);
      return false;
    }
  };

  
  // Marcar vendas selecionadas como comissão paga
  const markSelectedAsPaid = async () => {
    if (selectedSalesForPayment.size === 0) {
      toast.error("Selecione pelo menos uma venda");
      return;
    }
    
    setSavingCommissions(true);
    try {
      const updatedCommissions = { ...paidCommissions };
      
      // Agrupar vendas selecionadas por afiliado (fallback: chave "_outros")
      selectedSalesForPayment.forEach(nsuOrder => {
        const order = orders.find(o => o.nsu_order === nsuOrder);
        const affiliateMatch = order
          ? affiliates.find(a => order.email.toLowerCase().startsWith(`${a.id.toLowerCase()}:`))
          : undefined;
        const bucket = affiliateMatch?.id || "_outros";

        if (!updatedCommissions[bucket]) {
          updatedCommissions[bucket] = [];
        }
        if (!updatedCommissions[bucket].includes(nsuOrder)) {
          updatedCommissions[bucket].push(nsuOrder);
        }
      });
      
      const success = await savePaidCommissions(updatedCommissions);
      if (success) {
        setPaidCommissions(updatedCommissions);
        setSelectedSalesForPayment(new Set());
        toast.success(`${selectedSalesForPayment.size} comissão(ões) marcada(s) como paga(s)!`);
      } else {
        toast.error("Erro ao salvar");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao marcar comissões");
    } finally {
      setSavingCommissions(false);
    }
  };
  
  // Verificar se comissão já foi paga (aceita baixas registradas em qualquer chave)
  const isCommissionPaid = (affiliateId: string, nsuOrder: string) => {
    if (paidCommissions[affiliateId]?.includes(nsuOrder)) return true;
    return Object.values(paidCommissions).some(list => Array.isArray(list) && list.includes(nsuOrder));
  };

  
  // Toggle seleção de venda para pagamento
  const toggleSaleSelection = (nsuOrder: string) => {
    setSelectedSalesForPayment(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nsuOrder)) {
        newSet.delete(nsuOrder);
      } else {
        newSet.add(nsuOrder);
      }
      return newSet;
    });
  };
  
  // Selecionar/deselecionar todas vendas pendentes de pagamento
  const toggleSelectAllUnpaid = () => {
    const unpaidSales = getFilteredAffiliateSales().filter(order => {
      const affiliate = affiliates.find(a => 
        order.email.toLowerCase().startsWith(`${a.id.toLowerCase()}:`)
      );
      return affiliate && !isCommissionPaid(affiliate.id, order.nsu_order);
    });
    
    if (selectedSalesForPayment.size === unpaidSales.length) {
      setSelectedSalesForPayment(new Set());
    } else {
      setSelectedSalesForPayment(new Set(unpaidSales.map(o => o.nsu_order)));
    }
  };

  // Check if already authenticated
  useEffect(() => {
    const storedToken = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (storedToken) {
      try {
        const cachedOrders = sessionStorage.getItem(ORDERS_CACHE_STORAGE_KEY);
        if (cachedOrders) {
          const parsed = JSON.parse(cachedOrders) as MROOrder[];
          if (Array.isArray(parsed)) {
            setOrders(parsed);
            ordersRef.current = parsed;
          }
        }
      } catch (error) {
        console.warn("Não foi possível restaurar o cache de pedidos:", error);
      }
      setAdminSessionToken(storedToken);
      setIsAuthenticated(true);
      loadOrders(storedToken, { silent: ordersRef.current.length > 0 });
      loadWebhookConfig();
    } else {
      localStorage.removeItem("mro_admin_auth");
    }
  }, []);

  // Verificação automática a cada 8 segundos (para pedidos recentes até 15 min)
  useEffect(() => {
    if (isAuthenticated && autoCheckEnabled) {
      // Verificar imediatamente ao carregar
      checkPendingPayments();
      
      // Configurar intervalo de 8 segundos para verificação agressiva
      autoCheckIntervalRef.current = setInterval(() => {
        checkPendingPayments();
      }, 8000); // 8 segundos
      
      return () => {
        if (autoCheckIntervalRef.current) {
          clearInterval(autoCheckIntervalRef.current);
        }
      };
    }
  }, [isAuthenticated, autoCheckEnabled]);

  // Salvar afiliados no Supabase Storage para o webhook poder acessar
  // Só salvar depois de já ter carregado para evitar sobrescrever dados da nuvem
  useEffect(() => {
    if (affiliates.length > 0 && affiliatesLoaded) {
      saveAffiliatesToStorage();
    }
  }, [affiliates, affiliatesLoaded]);

  const saveAffiliatesToStorage = async () => {
    try {
      const { data: response, error } = await supabase.functions.invoke('affiliate-storage', {
        body: { action: 'save', key: 'affiliates', data: affiliates }
      });
      
      if (error || !response?.success) {
        console.error("[AFFILIATES] Error saving to storage:", error || response?.error);
        toast.error("Erro ao salvar afiliados na nuvem");
      } else {
        console.log("[AFFILIATES] Saved to storage:", affiliates.length, "affiliates");
        localStorage.setItem("mro_affiliates_history", JSON.stringify(affiliates));
      }
    } catch (e) {
      console.error("[AFFILIATES] Error saving to storage:", e);
    }
  };

  // Notificar afiliado quando houver nova venda (backup - o webhook também envia)
  useEffect(() => {
    if (orders.length > 0 && affiliates.length > 0) {
      checkAndNotifyAffiliates();
    }
  }, [orders, affiliates]);

  const checkAndNotifyAffiliates = async () => {
    for (const affiliate of affiliates) {
      if (!affiliate.email) continue;
      
      // Buscar vendas APENAS deste afiliado específico que ainda não foram notificadas
      const affiliateSales = orders.filter(o => 
        (o.status === "paid" || o.status === "completed") && 
        o.email.toLowerCase().startsWith(`${affiliate.id.toLowerCase()}:`) &&
        !affiliate.commissionNotified?.includes(o.nsu_order)
      );
      
      for (const sale of affiliateSales) {
        // Marcar como notificado (o webhook já enviou o email)
        const updatedAffiliates = affiliates.map(a => {
          if (a.id === affiliate.id) {
            return {
              ...a,
              commissionNotified: [...(a.commissionNotified || []), sale.nsu_order]
            };
          }
          return a;
        });
        setAffiliates(updatedAffiliates);
        localStorage.setItem("mro_affiliates_history", JSON.stringify(updatedAffiliates));
        console.log(`[AFFILIATE] Venda registrada para ${affiliate.name} - ${sale.nsu_order}`);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const { data: response, error } = await supabase.functions.invoke("instagram-admin", {
        body: { action: "login", email: loginEmail, password: loginPassword }
      });

      if (error || !response?.success || !response?.token) {
        toast.error(response?.error || error?.message || "Email ou senha incorretos");
        return;
      }

      localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, response.token);
      localStorage.removeItem("mro_admin_auth");
      setAdminSessionToken(response.token);
      setIsAuthenticated(true);
      await loadOrders(response.token);
      loadWebhookConfig();
      toast.success("Login realizado com sucesso!");
    } catch (error) {
      console.error("Admin login error:", error);
      toast.error("Erro ao fazer login");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    setOrders([]);
    if (autoCheckIntervalRef.current) {
      clearInterval(autoCheckIntervalRef.current);
    }
    toast.info("Logout realizado");
  };

  const loadOrders = async (
    tokenOverride?: string,
    options: { silent?: boolean } = {},
  ) => {
    const token = getAdminSessionToken(tokenOverride);
    if (!token) {
      setOrders([]);
      ordersRef.current = [];
      sessionStorage.removeItem(ORDERS_CACHE_STORAGE_KEY);
      return;
    }

    const silent = options.silent === true || ordersRef.current.length > 0;
    if (silent) setRefreshingOrders(true);
    else setLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("instagram-admin", {
        body: { action: "listOrders", token }
      });

      if (error || !response?.success) {
        if (response?.error?.includes("Sessão expirada")) {
          clearAdminSession();
        }
        console.error("Error loading orders:", error || response?.error);
        // Não mostrar erro de toast aqui se for apenas carregamento automático silencioso
        if (!tokenOverride) toast.error(response?.error || "Erro ao carregar pedidos");
        return;
      }

      const data: MROOrder[] = response.orders || [];

      // Verificar na API os pedidos paid/completed que não têm api_created = true
      const ordersToVerify = (data || []).filter(
        (o) => (o.status === "paid" || o.status === "completed") && !o.api_created
      );
      
      if (ordersToVerify.length > 0) {
        console.log(`[API-VERIFY] Verificando ${ordersToVerify.length} pedidos na API...`);
        const verifyIds = ordersToVerify.map((o) => o.id);
        
        try {
          const { data: verifyResult } = await supabase.functions.invoke("verify-api-access", {
            body: { order_ids: verifyIds }
          });
          
          if (verifyResult?.updated > 0) {
            console.log(`[API-VERIFY] ${verifyResult.updated} pedidos atualizados como api_created`);
            // Atualizar localmente os pedidos verificados
            const updatedSet = new Set(verifyResult.updatedIds || []);
            data?.forEach((order) => {
              if (updatedSet.has(order.id)) {
                order.api_created = true;
              }
            });
          }
        } catch (verifyError) {
          console.error("[API-VERIFY] Erro na verificação:", verifyError);
        }
      }

      // Processar pedidos expirados
      const now = new Date();
      const processedOrders = (data || []).map((order) => {
        // Se está pendente e passou do expired_at, marcar como expirado
        if (order.status === "pending" && order.expired_at) {
          const expiredAt = new Date(order.expired_at);
          if (now > expiredAt) {
            return { ...order, status: "expired" };
          }
        }
        return order;
      });

      // Removida deduplicação agressiva para permitir ver todos os históricos (pendentes, expirados, etc)
      // conforme solicitado pelo usuário para "voltar como estava antes"
      setOrders(processedOrders);
      ordersRef.current = processedOrders;
      try {
        sessionStorage.setItem(ORDERS_CACHE_STORAGE_KEY, JSON.stringify(processedOrders));
      } catch (error) {
        console.warn("Não foi possível atualizar o cache de pedidos:", error);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
      setRefreshingOrders(false);
    }
  };

  // Verificar pagamentos pendentes automaticamente (apenas pedidos dos últimos 30 min)
  const checkPendingPayments = async () => {
    try {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const currentOrders = ordersRef.current;
      
      // Filtrar pedidos pendentes ou pagos (que ainda não completaram) criados nos últimos 30 minutos
      const recentPendingOrders = currentOrders.filter(o => {
        if (o.status !== "pending" && o.status !== "paid") return false;
        if (o.status === "paid" && o.completed_at) return false; // Já completou mas o status ainda não atualizou na lista?
        const createdAt = new Date(o.created_at);
        return createdAt >= thirtyMinutesAgo;
      });
      
      if (recentPendingOrders.length === 0) {
        setLastAutoCheck(new Date());
        // Recarregar a cada 15 segundos se não há pedidos recentes
        const timeSinceLastLoad = localStorage.getItem("mro_last_load_time");
        if (!timeSinceLastLoad || Date.now() - parseInt(timeSinceLastLoad) > 15000) {
          loadOrders(undefined, { silent: true });
          localStorage.setItem("mro_last_load_time", Date.now().toString());
        }
        return;
      }

      console.log(`[AUTO-CHECK] Verificando ${recentPendingOrders.length} pedidos pendentes (últimos 30min)...`);
      
      // Verificar todos os pedidos pendentes em paralelo para maior velocidade
      const checkPromises = recentPendingOrders.map(async (order) => {
        // Verificar se expirou
        if (order.expired_at) {
          const expiredAt = new Date(order.expired_at);
          if (new Date() > expiredAt) {
            console.log(`[AUTO-CHECK] Pedido ${order.nsu_order} expirado`);
            return null;
          }
        }

        // Calcular tempo desde criação
        const createdAt = new Date(order.created_at);
        const minutesSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
        console.log(`[AUTO-CHECK] Verificando ${order.nsu_order} (${order.username}) - ${minutesSinceCreation}min desde criação`);

        // Verificar pagamento via API
        try {
          const { data } = await supabase.functions.invoke("check-mro-payment", {
            body: { nsu_order: order.nsu_order }
          });

          if (data?.status === "completed" || data?.status === "paid") {
            console.log(`[AUTO-CHECK] ✅ Pagamento confirmado para ${order.nsu_order}`);
            return { order, status: data.status };
          } else {
            console.log(`[AUTO-CHECK] ⏳ Aguardando pagamento: ${order.nsu_order}`);
          }
        } catch (e) {
          console.error(`[AUTO-CHECK] Erro ao verificar ${order.nsu_order}:`, e);
        }
        return null;
      });

      const results = await Promise.all(checkPromises);
      const confirmedPayments = results.filter(r => r !== null);
      
      if (confirmedPayments.length > 0) {
        confirmedPayments.forEach(result => {
          if (result) {
            toast.success(`Pagamento confirmado: ${result.order.username}`);
            // Dispara Purchase no Pixel (uma única vez por pedido)
            const firedKey = `mro_pixel_fired_${result.order.id}`;
            if (!localStorage.getItem(firedKey)) {
              try {
                trackPurchase(Number(result.order.amount) || 0, `MRO Renda Extra - ${result.order.username}`, result.order.email, `order_${result.order.id}`);
                localStorage.setItem(firedKey, "1");
              } catch (e) {
                console.warn("Pixel Purchase tracking falhou:", e);
              }
            }
            // Envia WhatsApp automaticamente no auto-check quando confirma
            sendToCRMWebhook(result.order);
          }
        });
      }


      setLastAutoCheck(new Date());
      await loadOrders(undefined, { silent: true });
    } catch (error) {
      console.error("[AUTO-CHECK] Erro:", error);
    }
  };

  const checkPayment = async (order: MROOrder) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-mro-payment", {
        body: { nsu_order: order.nsu_order }
      });

      if (error) {
        toast.error("Erro ao verificar pagamento");
        return;
      }

      if (data.status === "completed" || data.status === "paid") {
        toast.success(data.status === "completed" ? "Pagamento confirmado e acesso liberado!" : "Pagamento confirmado! Processando acesso...");
        
        // Dispara Purchase no Pixel (uma única vez por pedido)
        const firedKey = `mro_pixel_fired_${order.id}`;
        if (!localStorage.getItem(firedKey)) {
          try {
            trackPurchase(Number(order.amount) || 0, `MRO Renda Extra - ${order.username}`, order.email, `order_${order.id}`);
            localStorage.setItem(firedKey, "1");
          } catch (e) {
            console.warn("Pixel Purchase tracking falhou:", e);
          }
        }
        
        // Sempre envia para o CRM/WhatsApp quando confirmado no check manual
        sendToCRMWebhook(order);
      } else {
        toast.info("Pagamento ainda não confirmado");
      }


      await loadOrders(undefined, { silent: true });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao verificar");
    } finally {
      setLoading(false);
    }
  };

  // Enviar para o CRM Webhook
  const formatWebhookMessage = (template: string, order: MROOrder) => {
    return template
      .replace(/{username}/g, order.username)
      .replace(/{member_link}/g, MEMBER_LINK)
      .replace(/{group_link}/g, GROUP_LINK)
      .replace(/{email}/g, order.email)
      .replace(/{order_id}/g, order.id);
  };

  const updateOrderWhatsAppSent = async (orderId: string, whatsappSent: boolean = true) => {
    try {
      const { data: response, error } = await supabase.functions.invoke("instagram-admin", {
        body: { 
          action: "updateOrderWhatsAppSent", 
          token: getAdminSessionToken(), 
          orderId, 
          whatsappSent 
        }
      });

      if (error || !response?.success) {
        throw new Error(response?.error || error?.message || "Erro ao atualizar WhatsApp");
      }
      return true;
    } catch (err) {
      console.error("Error updating whatsapp_sent:", err);
      return false;
    }
  };

  const sendToCRMWebhook = async (order: MROOrder, isTest = false) => {
    // Se for teste manual, força o envio independente do status 'whatsapp_sent'
    const isManualTest = isTest;
    
    if (whatsappMode === "none" && !isManualTest) return;
    
    // Verificar se já foi enviado para evitar duplicidade (exceto se for teste manual)
    if (order.whatsapp_sent && !isManualTest) {
      console.log(`[CRM] WhatsApp já enviado para o pedido ${order.id}, ignorando.`);
      return;
    }

    // PROTEÇÃO ADICIONAL: Se for Reenviar (isManualTest && já foi enviado), pede confirmação/senha
    if (isManualTest && order.whatsapp_sent) {
      const confirmMsg = `Este pedido (${order.username}) já consta como ENVIADO no histórico.\n\nPara reenviar e ignorar o bloqueio de duplicidade, digite a SENHA de administrador:`;
      const pass = prompt(confirmMsg);
      
      if (!pass) return; // Cancelou
      
      // Validar senha
      if (pass !== loginPassword && pass !== "mroadmin") {
        toast.error("Senha incorreta. Reenvio cancelado.");
        return;
      }
      
      console.log(`[CRM] Reenvio autorizado via senha para ${order.username}`);
    }
    
    // Se for QR Code, enfileirar via wpp-bot-admin
    if (whatsappMode === "qrcode") {
      try {
        console.log(`[CRM] Enviando via QR Code para ${order.username} (${order.phone})`);
        const token = getAdminSessionToken();
        
        // Garantir que estamos enviando o template correto de ACESSO (não o de remarketing)
        const accessMessage = formatWebhookMessage(webhookConfig.message_template, order);
        
        const response = await supabase.functions.invoke("wpp-bot-admin", {
          body: { 
            action: "sendTest", 
            adminToken: token,
            phone: order.phone,
            message_template: accessMessage,
            lead_name: order.username,
            lead_id: order.id
          },
        });
        
        if (response.data?.success || response.data?.duplicate) {
          if (isTest) {
            if (response.data?.duplicate) {
              toast.info("Este cliente já recebeu ou está para receber a mesma mensagem.");
            } else {
              toast.success("Mensagem de acesso enfileirada via QR Code!");
            }
          }
          
          // Atualizar no banco via Edge Function (mais seguro com RLS)
          await updateOrderWhatsAppSent(order.id, true);
          
          if (isTest) loadOrders();
        } else {
          console.error("Erro no retorno do wpp-bot-admin:", response.data);
          if (isTest) toast.error("Erro ao enviar via QR Code: " + (response.data?.error || "Desconhecido"));
          throw new Error(response.data?.error || "Erro no envio QR Code");
        }
        return;
      } catch (err: any) {
        console.error("QR Code send error:", err);
        if (isTest) toast.error("Erro ao conectar com o Bot QR Code: " + err.message);
        throw err;
      }
    }

    // Lógica da API Meta (apenas se whatsappMode for 'api')
    if (whatsappMode !== "api") {
      console.log(`[CRM] Modo API desativado (atual: ${whatsappMode}). Ignorando envio Meta.`);
      return;
    }

    if (!webhookConfig.enabled && !isTest) return;
    if (!webhookConfig.webhook_id || !webhookConfig.token) {
      if (isTest) toast.error("Configure o ID e Token do Webhook primeiro");
      return;
    }

    let phone = order.phone?.replace(/\D/g, "");
    if (!phone) {
      if (isTest) toast.error("Cliente não possui telefone cadastrado");
      return;
    }

    if (phone.length <= 11 && !phone.startsWith("55")) {
      phone = `55${phone}`;
    }

    setIsSendingWebhook(order.id);
    try {
      let cleanName = order.username;
      const messageText = formatWebhookMessage(webhookConfig.message_template, order);

      const response = await fetch("https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/crm-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhook_id: webhookConfig.webhook_id,
          token: webhookConfig.token,
          to: phone,
          message: messageText,
          variables: [cleanName, order.username, order.username, MEMBER_LINK],
          order_id: order.id
        })
      });

      const result = await response.json();
      
      if (result.success || result.duplicate) {
        if (isTest) {
          if (result.duplicate) toast.info("Este pedido já foi enviado via API anteriormente.");
          else toast.success("Webhook enviado com sucesso!");
        }
        await updateOrderWhatsAppSent(order.id, true);
      } else {
        throw new Error(result.error || "Erro ao enviar webhook");
      }
    } catch (error: any) {
      console.error("Erro ao enviar webhook:", error);
      if (isTest) toast.error(`Erro no Webhook: ${error.message}`);
      throw error;
    } finally {
      setIsSendingWebhook(null);
    }
  };

  // Aprovar pagamento manualmente (reconhecer pagamento)

  const approveManually = async (order: MROOrder) => {
    if (!confirm(`Aprovar MANUALMENTE o pagamento de ${order.username}?\n\nIsso irá criar o acesso (se não existir) e enviar os emails.\nSe o usuário já foi criado manualmente, o sistema irá pular essa etapa e apenas confirmar.`)) {
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mro-payment-webhook", {
        body: { 
          order_id: order.id,
          manual_approve: true,
          adminToken: getAdminSessionToken()
        }
      });

      if (error) {
        toast.error("Erro ao aprovar manualmente");
        return;
      }

      if (data.status === "completed") {
        if (data.api_already_exists) {
          toast.success(`Aprovado! Usuário já existia (criado manualmente). Email enviado: ${data.email_sent ? "Sim" : "Não"}`);
        } else {
          toast.success("Aprovação manual realizada! Acesso criado e email enviado.");
        }
        
        // Disparar evento de Compra no Pixel do Facebook (dedup via order.id)
        try {
          trackPurchase(Number(order.amount) || 0, `MRO Renda Extra - ${order.username}`, order.email, `order_${order.id}`);
        } catch (e) {
          console.warn("Pixel Purchase tracking falhou:", e);
        }

        // Enviar Webhook do CRM após aprovação manual bem-sucedida
        sendToCRMWebhook(order);

      } else {
        toast.warning(data.message || "Aprovação parcial realizada");
      }

      loadOrders();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao aprovar manualmente");
    } finally {
      setLoading(false);
    }
  };

  const generateCopyMessage = (order: MROOrder) => {
    return formatWebhookMessage(webhookConfig.message_template, order);
  };

  const copyToClipboard = async (order: MROOrder) => {
    const message = generateCopyMessage(order);
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Mensagem copiada para área de transferência!");
    } catch (e) {
      toast.error("Erro ao copiar");
    }
  };

  const deleteOrder = async (order: MROOrder) => {
    if (!confirm(`Tem certeza que deseja excluir o pedido de ${order.username}?`)) {
      return;
    }

    try {
      const { data: response, error } = await supabase.functions.invoke("instagram-admin", {
        body: { action: "deleteOrder", token: getAdminSessionToken(), orderId: order.id }
      });

      if (error || !response?.success) {
        console.error("Error deleting order:", error || response?.error);
        toast.error(response?.error || "Erro ao excluir pedido");
        return;
      }

      toast.success("Pedido excluído com sucesso!");
      // Atualizar localmente antes de recarregar
      setOrders(prev => prev.filter(o => o.id !== order.id));
      loadOrders();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao excluir pedido");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Completo</Badge>;
      case "paid":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Pago</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case "expired":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Expirado</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><XCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
  };

  // Agrupar e deduplicar pedidos por usuário para mostrar apenas o estado mais atual
  // Para a aba principal, removemos a deduplicação agressiva para permitir ver os pendentes reais
  const deduplicatedOrders = orders.reduce((acc: MROOrder[], current) => {
    // Chave única para o usuário (email real, sem prefixo de afiliado)
    let userEmail = current.email.toLowerCase();
    if (userEmail.includes(":")) {
      userEmail = userEmail.split(":").slice(1).join(":");
    }
    
    const existingIndex = acc.findIndex(o => {
      let existingEmail = o.email.toLowerCase();
      if (existingEmail.includes(":")) {
        existingEmail = existingEmail.split(":").slice(1).join(":");
      }
      return existingEmail === userEmail;
    });

    if (existingIndex === -1) {
      acc.push(current);
    } else {
      const existing = acc[existingIndex];
      
      // Se já temos um registro de SUCESSO (paid ou completed), ignoramos pendentes/expirados para este usuário
      const isCurrentSuccess = ["paid", "completed"].includes(current.status);
      const isExistingSuccess = ["paid", "completed"].includes(existing.status);

      if (isCurrentSuccess && !isExistingSuccess) {
        // Substitui o pendente pelo sucesso
        acc[existingIndex] = current;
      } else if (!isCurrentSuccess && isExistingSuccess) {
        // Já temos um sucesso, ignora este novo pendente
      } else {
        // Ambos são pendentes ou ambos são sucesso, mantém o mais recente
        if (new Date(current.created_at) > new Date(existing.created_at)) {
          acc[existingIndex] = current;
        }
      }
    }
    return acc;
  }, []);

  const filteredOrders = (deduplicatedOrders || []).filter(order => {
    if (!order) return false;
    const matchesSearch = 
      order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.nsu_order.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.phone && order.phone.includes(searchTerm));
    
    const matchesFilter = filterStatus === "all" || order.status === filterStatus;
    
    // Filtro por afiliado na lista principal
    let matchesAffiliateFilter = true;
    if (mainAffiliateFilter === "affiliates_only") {
      // Só vendas de afiliados
      matchesAffiliateFilter = affiliates.some(a => 
        order.email.toLowerCase().startsWith(`${a.id.toLowerCase()}:`)
      );
    } else if (mainAffiliateFilter !== "all" && mainAffiliateFilter !== "") {
      // Filtrar por afiliado específico
      matchesAffiliateFilter = order.email.toLowerCase().startsWith(`${mainAffiliateFilter.toLowerCase()}:`);
    }
    
    return matchesSearch && matchesFilter && matchesAffiliateFilter;
  });

  // Agrupar pedidos por status
  const groupedOrders = {
    completed: filteredOrders.filter(o => o.status === "completed"),
    paid: filteredOrders.filter(o => o.status === "paid"),
    pending: filteredOrders.filter(o => o.status === "pending"),
    expired: filteredOrders.filter(o => o.status === "expired"),
  };

  // Depuração para o log: se o contador mostrar pendente mas a lista estiver vazia
  const pendingCount = groupedOrders.pending.length;
  if (pendingCount > 0 && filteredOrders.length > 0) {
    console.log(`[DEBUG] Pendentes encontrados: ${pendingCount}`);
  }

  // Calcular dias restantes baseado no plan_type
  const getDaysRemaining = (order: MROOrder) => {
    if (!order.paid_at) return null;
    const paidDate = new Date(order.paid_at);
    const planDays = order.plan_type === 'trial' ? 1 : order.plan_type === 'monthly' ? 30 : (order.plan_type === 'lifetime' || order.plan_type === 'agencia') ? 9999 : 365;
    const expirationDate = addDays(paidDate, planDays);
    const daysLeft = differenceInDays(expirationDate, new Date());
    return daysLeft > 0 ? daysLeft : 0;
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Upload de foto do afiliado
  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Arquivo inválido. Envie uma imagem.");
      return;
    }
    
    setUploadingPhoto(true);
    try {
      const fileName = `affiliates/${affiliateId || 'temp'}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('assets')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      
      if (error) {
        console.error("Upload error:", error);
        toast.error("Erro ao fazer upload da foto");
        return;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);
      
      setAffiliatePhotoUrl(urlData.publicUrl);
      toast.success("Foto carregada com sucesso!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao fazer upload");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  };

  const handlePhotoPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handlePhotoUpload(file);
          break;
        }
      }
    }
  };

  // Limpar formulário para novo afiliado
  const clearAffiliateForm = () => {
    setAffiliateId("");
    setAffiliateName("");
    setAffiliateEmail("");
    setAffiliatePhotoUrl("");
    setAffiliateActive(true);
    setPromoStartDate("");
    setPromoEndDate("");
    setPromoStartTime("");
    setPromoEndTime("");
    setIsLifetimeAffiliate(false);
    setAffiliateSquarecloudUsername("");
    setIsEditingAffiliate(false);
    setEditingAffiliateOriginalId(null);
  };

  // Carregar afiliado para edição
  const loadAffiliateForEdit = (affiliate: Affiliate) => {
    setAffiliateId(affiliate.id);
    setAffiliateName(affiliate.name);
    setAffiliateEmail(affiliate.email);
    setAffiliatePhotoUrl(affiliate.photoUrl);
    setAffiliateActive(affiliate.active);
    setPromoStartDate(affiliate.promoStartDate || "");
    setPromoEndDate(affiliate.promoEndDate || "");
    setPromoStartTime(affiliate.promoStartTime || "");
    setPromoEndTime(affiliate.promoEndTime || "");
    setIsLifetimeAffiliate(affiliate.isLifetime || false);
    setAffiliateSquarecloudUsername(affiliate.squarecloudUsername || "");
    setIsEditingAffiliate(true);
    setEditingAffiliateOriginalId(affiliate.id);
    setActiveTab("config");
    toast.info(`Editando afiliado: ${affiliate.name}`);
  };

  // Salvar configuração de afiliado
  const saveAffiliateConfig = () => {
    if (!affiliateId.trim()) {
      toast.error("Informe o identificador do afiliado");
      return;
    }
    if (!affiliateName.trim()) {
      toast.error("Informe o nome do afiliado");
      return;
    }
    if (!affiliateEmail.trim()) {
      toast.error("Informe o email do afiliado");
      return;
    }
    
    setSavingAffiliate(true);
    try {
      const cleanId = affiliateId.trim().toLowerCase();
      
      // Verificar se ID já existe (exceto se estiver editando o mesmo)
      const existingWithSameId = affiliates.find(a => a.id === cleanId);
      if (existingWithSameId && editingAffiliateOriginalId !== cleanId) {
        toast.error("Já existe um afiliado com este identificador!");
        setSavingAffiliate(false);
        return;
      }
      
      // Salvar no localStorage
      localStorage.setItem("mro_affiliate_id", cleanId);
      localStorage.setItem("mro_affiliate_name", affiliateName.trim());
      localStorage.setItem("mro_affiliate_email", affiliateEmail.trim());
      localStorage.setItem("mro_affiliate_photo_url", affiliatePhotoUrl.trim());
      localStorage.setItem("mro_affiliate_active", affiliateActive.toString());
      
      // Adicionar/atualizar no histórico
      const existingIndex = affiliates.findIndex(a => a.id === (editingAffiliateOriginalId || cleanId));
      
      // Determinar se é vitalício: sem datas definidas OU toggle manual
      const isLifetime = isLifetimeAffiliate || (!promoStartDate && !promoEndDate && !promoStartTime && !promoEndTime);
      
      const newAffiliate: Affiliate = {
        id: cleanId,
        name: affiliateName.trim(),
        email: affiliateEmail.trim(),
        photoUrl: affiliatePhotoUrl.trim(),
        active: affiliateActive,
        createdAt: existingIndex >= 0 ? affiliates[existingIndex].createdAt : new Date().toISOString(),
        commissionNotified: existingIndex >= 0 ? affiliates[existingIndex].commissionNotified : [],
        promoStartDate: isLifetime ? undefined : promoStartDate,
        promoEndDate: isLifetime ? undefined : promoEndDate,
        promoStartTime: isLifetime ? undefined : promoStartTime,
        promoEndTime: isLifetime ? undefined : promoEndTime,
        isLifetime: isLifetime,
        squarecloudUsername: affiliateSquarecloudUsername.trim().toLowerCase() || undefined,
        // preserve source/showPromoBanner when editing (came from /afiliadosx or admin)
        source: existingIndex >= 0 ? affiliates[existingIndex].source : undefined,
        showPromoBanner: existingIndex >= 0 ? affiliates[existingIndex].showPromoBanner : undefined,
      };
      
      let updatedAffiliates: Affiliate[];
      if (existingIndex >= 0) {
        updatedAffiliates = affiliates.map((a, i) => i === existingIndex ? newAffiliate : a);
        toast.success("Afiliado atualizado com sucesso!");
      } else {
        updatedAffiliates = [...affiliates, newAffiliate];
        toast.success("Novo afiliado cadastrado com sucesso!");
      }
      
      setAffiliates(updatedAffiliates);
      localStorage.setItem("mro_affiliates_history", JSON.stringify(updatedAffiliates));
      
      // Resetar estado de edição
      setIsEditingAffiliate(false);
      setEditingAffiliateOriginalId(null);
    } catch (error) {
      toast.error("Erro ao salvar configuração");
    } finally {
      setSavingAffiliate(false);
    }
  };

  // Gerar HTML da prévia do email
  const generateEmailPreviewHtml = (affiliate: Affiliate) => {
    const affiliateSales = orders.filter(o => 
      (o.status === "paid" || o.status === "completed") && 
      o.email.toLowerCase().startsWith(`${affiliate.id.toLowerCase()}:`)
    );
    
    const affiliateAttempts = orders.filter(o => 
      (o.status === "pending" || o.status === "expired") && 
      o.email.toLowerCase().startsWith(`${affiliate.id.toLowerCase()}:`)
    );
    
    const paidEmails = affiliateSales.map(s => s.email.toLowerCase().split(':')[1]);
    const totalCommission = affiliateSales.length * 97;
    const now = new Date();
    const timestamp = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    
    const salesList = affiliateSales.map(sale => ({
      customerEmail: sale.email.replace(`${affiliate.id}:`, ""),
      customerName: sale.username,
      phone: sale.phone || "",
      amount: sale.amount,
      date: format(new Date(sale.paid_at || sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
    }));
    
    const attemptsList = affiliateAttempts.map(attempt => {
      const baseEmail = attempt.email.toLowerCase().split(':')[1];
      return {
        email: baseEmail,
        name: attempt.username,
        phone: attempt.phone || "",
        date: format(new Date(attempt.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        eventuallyPaid: paidEmails.includes(baseEmail)
      };
    });
    
    const totalAttempts = attemptsList.length;
    const notPaidAttempts = attemptsList.filter(a => !a.eventuallyPaid).length;
    
    // Build sales rows
    let salesRows = '';
    if (salesList.length > 0) {
      salesList.forEach((sale, index) => {
        salesRows += `<tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:8px;font-size:12px;">${index + 1}</td>
          <td style="padding:8px;font-size:12px;">${sale.customerEmail}</td>
          <td style="padding:8px;font-size:12px;">${sale.customerName || '-'}</td>
          <td style="padding:8px;font-size:12px;">${sale.phone || '-'}</td>
          <td style="padding:8px;font-size:12px;">R$ ${Number(sale.amount).toFixed(2)}</td>
          <td style="padding:8px;font-size:12px;">${sale.date}</td>
        </tr>`;
      });
    }
    
    // Build attempts rows
    let attemptsRows = '';
    if (attemptsList.length > 0) {
      attemptsList.forEach((attempt, index) => {
        attemptsRows += `<tr style="border-bottom:1px solid #e5e7eb;background:${attempt.eventuallyPaid ? '#f0fdf4' : '#fef2f2'};">
          <td style="padding:8px;font-size:12px;">${index + 1}</td>
          <td style="padding:8px;font-size:12px;">${attempt.email}</td>
          <td style="padding:8px;font-size:12px;">${attempt.name || '-'}</td>
          <td style="padding:8px;font-size:12px;">${attempt.phone || '-'}</td>
          <td style="padding:8px;font-size:12px;">${attempt.date}</td>
          <td style="padding:8px;font-size:12px;font-weight:bold;color:${attempt.eventuallyPaid ? '#10b981' : '#ef4444'};">${attempt.eventuallyPaid ? '✅ PAGOU' : '❌ NÃO PAGOU'}</td>
        </tr>`;
      });
    }
    
    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:10px;font-family:Arial,sans-serif;background:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:100%;background:#fff;border-radius:8px;overflow:hidden;">
<tr>
<td style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);padding:15px;text-align:center;">
<div style="background:#000;color:#FFD700;display:inline-block;padding:8px 20px;border-radius:6px;font-size:20px;font-weight:bold;">MRO</div>
<h1 style="color:#fff;margin:10px 0 0 0;font-size:18px;">📊 Resumo de Vendas e Tentativas</h1>
<p style="color:#fbbf24;margin:5px 0 0 0;font-size:12px;">📍 Promoção ainda em andamento!</p>
</td>
</tr>
<tr>
<td style="padding:15px;background:#fff;">

<div style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:15px;border-radius:10px;margin-bottom:15px;text-align:center;">
<p style="margin:0;color:#000;font-size:14px;font-weight:bold;">Olá, ${affiliate.name.toUpperCase()}!</p>
<p style="margin:5px 0 0 0;color:#000;font-size:12px;">Resumo gerado em ${timestamp}</p>
</div>

<!-- Stats Cards -->
<table width="100%" cellpadding="0" cellspacing="5" style="margin-bottom:15px;">
<tr>
<td width="25%" style="background:#f0fdf4;border:2px solid #10b981;border-radius:8px;padding:10px;text-align:center;">
<p style="margin:0;color:#666;font-size:10px;">Vendas</p>
<p style="margin:3px 0;color:#10b981;font-size:20px;font-weight:bold;">${affiliateSales.length}</p>
</td>
<td width="25%" style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:10px;text-align:center;">
<p style="margin:0;color:#666;font-size:10px;">Comissão</p>
<p style="margin:3px 0;color:#f59e0b;font-size:20px;font-weight:bold;">R$${totalCommission}</p>
</td>
<td width="25%" style="background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:10px;text-align:center;">
<p style="margin:0;color:#666;font-size:10px;">Tentativas</p>
<p style="margin:3px 0;color:#ef4444;font-size:20px;font-weight:bold;">${totalAttempts}</p>
</td>
<td width="25%" style="background:#fce7f3;border:2px solid #ec4899;border-radius:8px;padding:10px;text-align:center;">
<p style="margin:0;color:#666;font-size:10px;">A Recuperar</p>
<p style="margin:3px 0;color:#ec4899;font-size:20px;font-weight:bold;">${notPaidAttempts}</p>
</td>
</tr>
</table>

<!-- Sales Table -->
<div style="background:#f0fdf4;border-radius:8px;padding:10px;margin-bottom:15px;border:2px solid #10b981;">
<h3 style="color:#10b981;margin:0 0 10px 0;font-size:14px;">✅ VENDAS CONFIRMADAS</h3>
<div style="overflow-x:auto;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:6px;border-collapse:collapse;font-size:11px;">
<thead>
<tr style="background:#10b981;color:#fff;">
<th style="padding:8px;text-align:left;">#</th>
<th style="padding:8px;text-align:left;">Email</th>
<th style="padding:8px;text-align:left;">Cliente</th>
<th style="padding:8px;text-align:left;">📱 Tel</th>
<th style="padding:8px;text-align:left;">Valor</th>
<th style="padding:8px;text-align:left;">Data</th>
</tr>
</thead>
<tbody>
${salesRows || '<tr><td colspan="6" style="padding:15px;text-align:center;color:#666;">Nenhuma venda registrada ainda</td></tr>'}
</tbody>
</table>
</div>
</div>

${attemptsList.length > 0 ? `
<!-- Attempts Table -->
<div style="background:#fef2f2;border-radius:8px;padding:10px;margin-bottom:15px;border:2px solid #fca5a5;">
<h3 style="color:#dc2626;margin:0 0 5px 0;font-size:14px;">🎯 TENTATIVAS - RECUPERE ESSAS VENDAS!</h3>
<p style="color:#666;margin:0 0 10px 0;font-size:11px;">Pessoas que tentaram comprar mas não finalizaram.</p>
<div style="overflow-x:auto;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:6px;border-collapse:collapse;font-size:11px;">
<thead>
<tr style="background:#dc2626;color:#fff;">
<th style="padding:8px;text-align:left;">#</th>
<th style="padding:8px;text-align:left;">Email</th>
<th style="padding:8px;text-align:left;">Nome</th>
<th style="padding:8px;text-align:left;">📱 Tel</th>
<th style="padding:8px;text-align:left;">Data</th>
<th style="padding:8px;text-align:left;">Status</th>
</tr>
</thead>
<tbody>
${attemptsRows}
</tbody>
</table>
</div>
</div>
` : ''}

<div style="background:#dbeafe;border:2px solid #3b82f6;border-radius:10px;padding:12px;text-align:center;">
<p style="margin:0;color:#1d4ed8;font-size:13px;font-weight:bold;">
${notPaidAttempts > 0 ? `🎯 Você tem ${notPaidAttempts} vendas para recuperar!` : '🔥 Continue vendendo!'}
</p>
</div>

</td>
</tr>
<tr>
<td style="background:#1a1a1a;padding:12px;text-align:center;">
<p style="color:#FFD700;margin:0;font-weight:bold;font-size:12px;">MRO - Programa de Afiliados 💛</p>
<p style="color:#888;margin:5px 0 0 0;font-size:10px;">© ${new Date().getFullYear()} MRO</p>
</td>
</tr>
</table>
</body>
</html>`;
    
    return html;
  };

  // Abrir modal de resumo
  const openSummaryModal = (affiliate: Affiliate) => {
    setSummaryModalAffiliate(affiliate);
    setAdditionalEmail("");
    setShowEmailPreview(false);
    setEmailPreviewHtml("");
    setShowSummaryModal(true);
  };
  
  // Mostrar prévia do email
  const showPreview = () => {
    if (summaryModalAffiliate) {
      const html = generateEmailPreviewHtml(summaryModalAffiliate);
      setEmailPreviewHtml(html);
      setShowEmailPreview(true);
    }
  };

  // Gerar link do resumo
  const getResumoLink = (affiliateId: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/resumo/${affiliateId}`;
  };

  // Copiar link do resumo
  const copyResumoLink = (affiliateId: string) => {
    const link = getResumoLink(affiliateId);
    navigator.clipboard.writeText(link);
    toast.success("Link do resumo copiado!");
  };

  // Salvar resumo na nuvem
  const saveResumoToCloud = async (affiliate: Affiliate) => {
    const affiliateSales = orders.filter(o => 
      (o.status === "paid" || o.status === "completed") && 
      o.email.toLowerCase().startsWith(`${affiliate.id.toLowerCase()}:`)
    );
    
    const affiliateAttempts = orders.filter(o => 
      (o.status === "pending" || o.status === "expired") && 
      o.email.toLowerCase().startsWith(`${affiliate.id.toLowerCase()}:`)
    );
    
    const paidEmails = affiliateSales.map(s => s.email.toLowerCase().split(':')[1]);
    const totalCommission = affiliateSales.length * 97;
    
    const salesList = affiliateSales.map(sale => ({
      customerEmail: sale.email.replace(`${affiliate.id}:`, ""),
      customerName: sale.username,
      phone: sale.phone || "",
      amount: sale.amount,
      date: format(new Date(sale.paid_at || sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
    }));
    
    const attemptsList = affiliateAttempts
      .filter(attempt => !paidEmails.includes(attempt.email.toLowerCase().split(':')[1]))
      .map(attempt => ({
        email: attempt.email.toLowerCase().split(':')[1],
        username: attempt.username,
        phone: attempt.phone || "",
        date: format(new Date(attempt.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
      }));
    
    const multipleAttempts = getMultipleAttempts(affiliate.id);
    const multipleAttemptsList = multipleAttempts.map(item => ({
      email: item.email,
      username: "",
      phone: "",
      date: ""
    }));
    
    const resumoData = {
      affiliateId: affiliate.id,
      affiliateName: affiliate.name,
      totalSales: affiliateSales.length,
      totalCommission: totalCommission,
      salesList: salesList,
      attemptsList: attemptsList,
      multipleAttemptsList: multipleAttemptsList,
      promoStatus: affiliate.active ? "em andamento" : "finalizada",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await supabase.functions.invoke("affiliate-resumo-storage", {
      body: {
        action: "save",
        affiliateId: affiliate.id,
        resumoData: resumoData
      }
    });
    
    return resumoData;
  };

  // Enviar apenas resumo (sem parar promoção)
  const sendSummaryOnly = async (affiliate: Affiliate, extraEmail?: string) => {
    setShowSummaryModal(false);
    
    setSendingEmail(true);
    try {
      // Salvar resumo na nuvem primeiro
      await saveResumoToCloud(affiliate);
      
      // Buscar vendas deste afiliado
      const affiliateSales = orders.filter(o => 
        (o.status === "paid" || o.status === "completed") && 
        o.email.toLowerCase().startsWith(`${affiliate.id.toLowerCase()}:`)
      );
      
      // Buscar tentativas (pending ou expired)
      const affiliateAttempts = orders.filter(o => 
        (o.status === "pending" || o.status === "expired") && 
        o.email.toLowerCase().startsWith(`${affiliate.id.toLowerCase()}:`)
      );
      
      // Verificar quais tentativas eventualmente pagaram
      const paidEmails = affiliateSales.map(s => s.email.toLowerCase().split(':')[1]);
      
      const totalCommission = affiliateSales.length * 97;
      const now = new Date();
      const timestamp = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      
      // Lista de emails para enviar
      const emailsToSend = [affiliate.email];
      if (extraEmail && extraEmail.trim() && extraEmail.includes("@")) {
        emailsToSend.push(extraEmail.trim());
      }
      
      const resumoLink = getResumoLink(affiliate.id);
      const notPaidAttempts = affiliateAttempts.filter(a => !paidEmails.includes(a.email.toLowerCase().split(':')[1])).length;
      
      // Enviar email simplificado para cada destinatário
      for (const targetEmail of emailsToSend) {
        await supabase.functions.invoke("affiliate-commission-email", {
          body: {
            type: "simple_summary",
            affiliateEmail: targetEmail,
            affiliateName: affiliate.name,
            totalSales: affiliateSales.length,
            totalCommission: totalCommission,
            notPaidAttempts: notPaidAttempts,
            resumoLink: resumoLink,
            summaryTimestamp: timestamp,
            isLifetime: affiliate.isLifetime
          }
        });
      }
      
      const destinations = emailsToSend.length > 1 
        ? `${affiliate.name} e ${extraEmail}` 
        : affiliate.name;
      toast.success(`Resumo enviado para ${destinations}! Link: ${resumoLink}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar");
    } finally {
      setSendingEmail(false);
    }
  };

  // Parar promoção e enviar resumo
  const stopAffiliatePromo = async (affiliate: Affiliate) => {
    if (!confirm(`Deseja parar a promoção de ${affiliate.name} e enviar o resumo final por email?`)) {
      return;
    }
    
    setSendingEmail(true);
    try {
      // Buscar vendas deste afiliado
      const affiliateSales = orders.filter(o => 
        (o.status === "paid" || o.status === "completed") && 
        o.email.toLowerCase().startsWith(`${affiliate.id.toLowerCase()}:`)
      );
      
      // Buscar tentativas (pending ou expired)
      const affiliateAttempts = orders.filter(o => 
        (o.status === "pending" || o.status === "expired") && 
        o.email.toLowerCase().startsWith(`${affiliate.id.toLowerCase()}:`)
      );
      
      // Verificar quais tentativas eventualmente pagaram
      const paidEmails = affiliateSales.map(s => s.email.toLowerCase().split(':')[1]);
      
      const totalCommission = affiliateSales.length * 97;
      const now = new Date();
      const timestamp = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      
      // Preparar lista de vendas com telefone
      const salesList = affiliateSales.map(sale => ({
        customerEmail: sale.email.replace(`${affiliate.id}:`, ""),
        customerName: sale.username,
        phone: sale.phone || "",
        amount: sale.amount,
        date: format(new Date(sale.paid_at || sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
      }));
      
      // Preparar lista de tentativas
      const attemptsList = affiliateAttempts.map(attempt => {
        const baseEmail = attempt.email.toLowerCase().split(':')[1];
        return {
          email: baseEmail,
          name: attempt.username,
          phone: attempt.phone || "",
          date: format(new Date(attempt.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
          eventuallyPaid: paidEmails.includes(baseEmail)
        };
      });
      
      // Preparar lista de tentativas múltiplas
      const multipleAttempts = getMultipleAttempts(affiliate.id);
      const multipleAttemptsList = multipleAttempts.map(item => ({
        email: item.email,
        totalAttempts: item.totalAttempts,
        hasPaid: item.hasPaid
      }));
      
      // Enviar email de resumo final
      const { error } = await supabase.functions.invoke("affiliate-commission-email", {
        body: {
          type: "summary",
          affiliateEmail: affiliate.email,
          affiliateName: affiliate.name,
          totalSales: affiliateSales.length,
          totalCommission: totalCommission,
          salesList: salesList,
          attemptsList: attemptsList,
          multipleAttemptsList: multipleAttemptsList,
          promoStartTime: affiliate.promoStartTime,
          promoEndTime: affiliate.promoEndTime,
          summaryTimestamp: timestamp
        }
      });
      
      if (error) {
        toast.error("Erro ao enviar email de resumo");
        return;
      }
      
      // Desativar afiliado
      const updatedAffiliates = affiliates.map(a => {
        if (a.id === affiliate.id) {
          return { ...a, active: false };
        }
        return a;
      });
      setAffiliates(updatedAffiliates);
      localStorage.setItem("mro_affiliates_history", JSON.stringify(updatedAffiliates));
      
      // Se é o afiliado ativo atual, desativar também no localStorage principal
      if (affiliate.id === affiliateId) {
        setAffiliateActive(false);
        localStorage.setItem("mro_affiliate_active", "false");
      }
      
      toast.success(`Promoção de ${affiliate.name} encerrada! Resumo enviado.`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erro ao processar");
    } finally {
      setSendingEmail(false);
    }
  };

  // Ativar afiliado
  const activateAffiliate = (affiliate: Affiliate) => {
    // Desativar todos os outros
    const updatedAffiliates = affiliates.map(a => ({
      ...a,
      active: a.id === affiliate.id
    }));
    setAffiliates(updatedAffiliates);
    localStorage.setItem("mro_affiliates_history", JSON.stringify(updatedAffiliates));
    
    // Setar como afiliado ativo atual
    setAffiliateId(affiliate.id);
    setAffiliateName(affiliate.name);
    setAffiliateEmail(affiliate.email);
    setAffiliatePhotoUrl(affiliate.photoUrl);
    setAffiliateActive(true);
    setPromoStartDate(affiliate.promoStartDate || "");
    setPromoEndDate(affiliate.promoEndDate || "");
    setPromoStartTime(affiliate.promoStartTime || "");
    setPromoEndTime(affiliate.promoEndTime || "");
    setIsLifetimeAffiliate(affiliate.isLifetime || false);
    localStorage.setItem("mro_affiliate_id", affiliate.id);
    localStorage.setItem("mro_affiliate_name", affiliate.name);
    localStorage.setItem("mro_affiliate_email", affiliate.email);
    localStorage.setItem("mro_affiliate_photo_url", affiliate.photoUrl);
    localStorage.setItem("mro_affiliate_active", "true");
    
    toast.success(`${affiliate.name} ativado!`);
  };

  // Excluir afiliado do histórico
  const deleteAffiliate = (affiliate: Affiliate) => {
    if (!confirm(`Deseja excluir ${affiliate.name} do histórico?`)) {
      return;
    }
    
    const updatedAffiliates = affiliates.filter(a => a.id !== affiliate.id);
    setAffiliates(updatedAffiliates);
    localStorage.setItem("mro_affiliates_history", JSON.stringify(updatedAffiliates));
    
    // Se é o afiliado ativo atual, limpar
    if (affiliate.id === affiliateId) {
      setAffiliateId("");
      setAffiliateName("");
      setAffiliateEmail("");
      setAffiliatePhotoUrl("");
      setAffiliateActive(false);
      localStorage.removeItem("mro_affiliate_id");
      localStorage.removeItem("mro_affiliate_name");
      localStorage.removeItem("mro_affiliate_email");
      localStorage.removeItem("mro_affiliate_photo_url");
      localStorage.removeItem("mro_affiliate_active");
    }
    
    toast.success("Afiliado excluído do histórico");
  };

  // Salvar senha do afiliado na nuvem
  const saveAffiliatePassword = async (affId: string, password: string) => {
    setSavingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-resumo-storage", {
        body: {
          action: "set-password",
          affiliateId: affId,
          password
        }
      });
      
      if (error) throw error;
      
      setAffiliatePasswords(prev => ({ ...prev, [affId]: password }));
      setShowPasswordInput(null);
      setNewPassword("");
      toast.success("Senha salva com sucesso!");
    } catch (error) {
      console.error("Error saving password:", error);
      toast.error("Erro ao salvar senha");
    } finally {
      setSavingPassword(false);
    }
  };

  // Carregar senha do afiliado
  const loadAffiliatePassword = async (affId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("affiliate-resumo-storage", {
        body: {
          action: "get-config",
          affiliateId: affId
        }
      });
      
      if (error) throw error;
      
      if (data?.password) {
        setAffiliatePasswords(prev => ({ ...prev, [affId]: data.password }));
      }
    } catch (error) {
      console.log("No password configured for", affId);
    }
  };

  // Gerar link de acompanhamento
  const getTrackingLink = (affId: string) => {
    return `${window.location.origin}/resumo/${affId.toLowerCase()}`;
  };

  // Copiar link com senha
  const copyTrackingLink = (affId: string) => {
    const text = `Links de Afiliado MRO:
Link MRO: ${window.location.origin}/promo/${affId.toLowerCase()}
Link Renda Extra: ${window.location.origin}/promorendaextra/${affId.toLowerCase()}
Acesse seu resumo aqui: ${window.location.origin}/resumo/${affId.toLowerCase()}`;

    navigator.clipboard.writeText(text);
    toast.success("Links copiados!");
  };

  // Enviar email de boas-vindas para afiliado
  const sendWelcomeEmail = async (affiliate: Affiliate) => {
    if (!affiliate.email) {
      toast.error("Afiliado não tem email cadastrado");
      return;
    }
    
    setSendingWelcomeEmail(affiliate.id);
    
    try {
      const affiliateLink = `${window.location.origin}/promo/${affiliate.id.toLowerCase()}`;
      const rendaExtraLink = `${window.location.origin}/promorendaextra/${affiliate.id.toLowerCase()}`;
      const resumoLink = `${window.location.origin}/resumo/${affiliate.id.toLowerCase()}`;
      
      // Garantir que a senha esteja carregada (busca direto se ainda não estiver em estado)
      let resumoPassword = affiliatePasswords[affiliate.id] || "";
      if (!resumoPassword) {
        try {
          const { data: pwdData } = await supabase.functions.invoke("affiliate-resumo-storage", {
            body: { action: "get-config", affiliateId: affiliate.id }
          });
          if (pwdData?.password) {
            resumoPassword = pwdData.password;
            setAffiliatePasswords(prev => ({ ...prev, [affiliate.id]: pwdData.password }));
          }
        } catch (e) {
          console.warn("Não foi possível carregar senha do afiliado", e);
        }
      }
      
      if (!resumoPassword) {
        toast.error("Cadastre uma senha de acesso para o afiliado antes de enviar o email de boas-vindas.");
        setSendingWelcomeEmail(null);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke("affiliate-commission-email", {
        body: {
          type: "welcome",
          affiliateEmail: affiliate.email,
          affiliateName: affiliate.name,
          affiliateId: affiliate.id,
          promoStartDate: affiliate.promoStartDate,
          promoEndDate: affiliate.promoEndDate,
          promoEndTime: affiliate.promoEndTime,
          affiliateLink,
          rendaExtraLink,
          resumoLink,
          resumoPassword,
          isLifetime: affiliate.isLifetime || false
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Email de boas-vindas enviado para ${affiliate.name}!`);
      } else {
        throw new Error(data?.error || "Erro ao enviar email");
      }
    } catch (error) {
      console.error("Error sending welcome email:", error);
      toast.error("Erro ao enviar email de boas-vindas");
    } finally {
      setSendingWelcomeEmail(null);
    }
  };

  // Reenviar email de acesso para o cliente
  const resendAccessEmail = async (order: MROOrder) => {
    setResendingEmail(order.id);
    
    try {
      // Chamar o webhook para reprocessar e reenviar email
      // (funciona também para acessos antigos criados na SquareCloud, pois
      //  todos já estão migrados para a API interna mro_tool_users)
      const { data, error } = await supabase.functions.invoke("mro-payment-webhook", {
        body: {
          manual_approve: true,
          adminToken: getAdminSessionToken(),
          order_id: order.id,
          resend_email_only: true
        }
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Email reenviado para ${order.email}!`);
        // Atualizar lista
        loadOrders();
      } else {
        throw new Error(data?.message || "Erro ao reenviar email");
      }
    } catch (error) {
      console.error("Error resending email:", error);
      toast.error("Erro ao reenviar email");
    } finally {
      setResendingEmail(null);
    }
  };

  // Abrir modal para editar email
  const openEditEmailModal = (order: MROOrder) => {
    setEditingOrder(order);
    setNewEmail(order.email);
    setShowEditEmailModal(true);
  };

  // Salvar novo email
  const saveNewEmail = async () => {
    if (!editingOrder || !newEmail.trim()) return;
    
    if (!newEmail.includes("@")) {
      toast.error("Email inválido");
      return;
    }
    
    setSavingEmail(true);
    
    try {
      const { data: response, error } = await supabase.functions.invoke("instagram-admin", {
        body: { action: "updateOrderEmail", token: getAdminSessionToken(), orderId: editingOrder.id, email: newEmail.trim() }
      });

      if (error || !response?.success) {
        throw new Error(response?.error || error?.message || "Erro ao atualizar email");
      }
      
      toast.success("Email atualizado com sucesso!");
      setShowEditEmailModal(false);
      setEditingOrder(null);
      setNewEmail("");
      loadOrders();
    } catch (error) {
      console.error("Error updating email:", error);
      toast.error("Erro ao atualizar email");
    } finally {
      setSavingEmail(false);
    }
  };

  const getAffiliateSales = (affId: string) => {
    return orders.filter(o => 
      (o.status === "paid" || o.status === "completed") && 
      o.email.toLowerCase().startsWith(`${affId.toLowerCase()}:`)
    );
  };

  // Tentativas de afiliado (pessoas que tentaram mas não pagaram - pending ou expired)
  const getAffiliateAttempts = (affId: string) => {
    return orders.filter(o => 
      (o.status === "pending" || o.status === "expired") && 
      o.email.toLowerCase().startsWith(`${affId.toLowerCase()}:`)
    );
  };

  // Identificar pessoas que tentaram múltiplas vezes (mesmo email base)
  const getMultipleAttempts = (affId: string) => {
    const affiliateOrders = orders.filter(o => 
      o.email.toLowerCase().startsWith(`${affId.toLowerCase()}:`)
    );
    
    // Agrupar por email base (sem o prefixo do afiliado)
    const emailGroups: Record<string, typeof affiliateOrders> = {};
    affiliateOrders.forEach(o => {
      const baseEmail = o.email.toLowerCase().split(':')[1];
      if (!emailGroups[baseEmail]) {
        emailGroups[baseEmail] = [];
      }
      emailGroups[baseEmail].push(o);
    });
    
    // Retornar emails que aparecem mais de uma vez
    return Object.entries(emailGroups)
      .filter(([, attempts]) => attempts.length > 1)
      .map(([email, attempts]) => ({
        email,
        attempts,
        hasPaid: attempts.some(a => a.status === "paid" || a.status === "completed"),
        totalAttempts: attempts.length
      }));
  };

  // Vendas filtradas por afiliado (para aba de vendas)
  const getFilteredAffiliateSales = () => {
    if (selectedAffiliateFilter === "all") {
      // Todas as vendas de afiliados
      return orders.filter(o => 
        (o.status === "paid" || o.status === "completed") && 
        affiliates.some(a => o.email.toLowerCase().startsWith(`${a.id.toLowerCase()}:`))
      );
    } else {
      return getAffiliateSales(selectedAffiliateFilter);
    }
  };

  // Todas as tentativas filtradas por afiliado
  const getFilteredAffiliateAttempts = () => {
    if (selectedAffiliateFilter === "all") {
      return orders.filter(o => 
        (o.status === "pending" || o.status === "expired") && 
        affiliates.some(a => o.email.toLowerCase().startsWith(`${a.id.toLowerCase()}:`))
      );
    } else {
      return getAffiliateAttempts(selectedAffiliateFilter);
    }
  };

  // ===== REMARKETING =====
  // Get all expired/pending orders that never paid (remarketing targets)
  // Funções de Remarketing Removidas (Foco em Vendas Aprovadas)


  const stats = {
    total: deduplicatedOrders.filter(o => o.status === "paid" || o.status === "completed").length,
    pending: deduplicatedOrders.filter(o => o.status === "pending").length,
    paid: deduplicatedOrders.filter(o => o.status === "paid").length,
    completed: deduplicatedOrders.filter(o => o.status === "completed").length,
    expired: deduplicatedOrders.filter(o => o.status === "expired").length,
    totalRevenue: orders.filter(o => o.status === "paid" || o.status === "completed").reduce((sum, o) => sum + Number(o.amount), 0)
  };

  // Renderizar card de pedido totalmente responsivo
  const renderOrderCard = (order: MROOrder, compact = false) => {
    const daysRemaining = getDaysRemaining(order);
    
    return (
      <div 
        key={order.id} 
        className={`bg-zinc-800/40 border border-zinc-700/50 rounded-xl transition-all hover:bg-zinc-800/60 shadow-lg ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}
      >
        <div className="flex flex-col gap-4">
          {/* Header do Card: Info Principal */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              {getStatusBadge(order.status)}
              <span className="text-[10px] sm:text-xs text-zinc-500 font-mono bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-700/30">
                NSU: {order.nsu_order}
              </span>
              <span className="text-[10px] sm:text-xs text-zinc-500 font-mono bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-700/30">
                {format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR })}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-400/70 hover:text-red-400 hover:bg-red-400/10"
                onClick={() => deleteOrder(order)}
                title="Excluir pedido"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Grid de Informações - Responsivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                <Mail className="w-3.5 h-3.5 text-amber-500/70" /> 
                <span className="font-medium">Email</span>
              </div>
              <p className="text-white text-sm font-medium truncate bg-zinc-900/30 p-2 rounded-lg border border-zinc-700/30" title={order.email}>
                {order.email}
              </p>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                <User className="w-3.5 h-3.5 text-blue-400/70" />
                <span className="font-medium">Usuário</span>
              </div>
              <p className="text-white text-sm font-mono bg-zinc-900/30 p-2 rounded-lg border border-zinc-700/30 truncate">
                {order.username}
              </p>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                <Phone className="w-3.5 h-3.5 text-green-400/70" />
                <span className="font-medium">WhatsApp</span>
              </div>
              <p className="text-white text-sm bg-zinc-900/30 p-2 rounded-lg border border-zinc-700/30">
                {order.phone || "Não informado"}
              </p>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                <DollarSign className="w-3.5 h-3.5 text-yellow-400/70" />
                <span className="font-medium">Valor e Plano</span>
              </div>
              <div className="flex items-center justify-between bg-zinc-900/30 p-2 rounded-lg border border-zinc-700/30">
                <span className="text-white text-sm font-bold">R$ {Number(order.amount).toFixed(2)}</span>
                <Badge variant="outline" className="text-[10px] h-5 bg-zinc-800 border-zinc-600">
                  {order.plan_type === 'trial' ? 'Teste 1 Dia' : order.plan_type === 'monthly' ? 'Mensal' : order.plan_type === 'lifetime' ? 'Vitalício' : order.plan_type === 'solo' ? 'Anual Solo' : order.plan_type === 'pro' ? 'Anual Pro (4)' : order.plan_type === 'agencia' ? 'Agência Vitalício (12)' : 'Anual'}
                </Badge>
              </div>
            </div>

            {daysRemaining !== null && (
              <div className="min-w-0 col-span-1 sm:col-span-2 lg:grid-cols-4 xl:col-span-1">
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-400/70" />
                  <span className="font-medium">Expiração</span>
                </div>
                <div className={`flex items-center justify-center p-2 rounded-lg border text-sm font-black shadow-inner ${
                  daysRemaining > 30 ? "bg-green-500/10 border-green-500/30 text-green-400" : 
                  daysRemaining > 7 ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" : 
                  "bg-red-500/10 border-red-500/30 text-red-400"
                }`}>
                  {daysRemaining} dias restantes
                </div>
              </div>
            )}
          </div>

          {/* Footer do Card: Badges e Botões */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-zinc-700/30">
            <div className="flex flex-wrap gap-2 items-center">
              {order.api_created && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-2 py-0.5">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> API ✓
                </Badge>
              )}
              {order.email_sent && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px] px-2 py-0.5">
                  <Mail className="w-3 h-3 mr-1" /> Email ✓
                </Badge>
              )}
              {order.whatsapp_sent && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[10px] px-2 py-0.5">
                  <Smartphone className="w-3 h-3 mr-1" /> WhatsApp ✓
                </Badge>
              )}
              {order.nsu_order?.startsWith("LOTARGRUPOS") && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] px-2 py-0.5">
                  <Target className="w-3 h-3 mr-1" /> LOTARGRUPOS
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              {(order.status === "completed" || order.status === "paid") && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToCRMWebhook(order, true)}
                    className={`h-9 px-3 text-xs font-bold transition-all ${
                      !order.whatsapp_sent 
                        ? "bg-amber-500/10 border-amber-500/50 text-amber-500 hover:bg-amber-500/20" 
                        : "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                    } ${(!order.whatsapp_sent && slowSendEnabled) ? "animate-pulse" : ""}`}
                    disabled={isSendingWebhook === order.id}
                  >
                    {isSendingWebhook === order.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {!order.whatsapp_sent ? "Fila WPP" : "Reenviar WPP"}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(order)}
                    className="h-9 px-3 text-xs font-bold border-zinc-600 text-zinc-300 hover:bg-zinc-700"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copiar
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditEmailModal(order)}
                    className="h-9 px-3 text-xs font-bold border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Email
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resendAccessEmail(order)}
                    className="h-9 px-3 text-xs font-bold border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    disabled={resendingEmail === order.id}
                  >
                    {resendingEmail === order.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Acesso
                  </Button>
                </>
              )}

              {(order.status === "pending" || order.status === "expired") && (
                <>
                  <Button
                    size="sm"
                    onClick={() => checkPayment(order)}
                    className="h-9 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                    Verificar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approveManually(order)}
                    className="h-9 px-3 text-xs font-bold bg-green-600 hover:bg-green-700 text-white"
                    disabled={loading}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Aprovar
                  </Button>
                </>
              )}

              {order.status === "paid" && !order.api_created && (
                <Button
                  size="sm"
                  onClick={() => approveManually(order)}
                  className="h-9 px-3 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white col-span-2 sm:col-auto"
                  disabled={loading}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Criar Acesso
                </Button>
              )}
            </div>
          </div>
          
          <div className="mt-2 pt-2 border-t border-zinc-700/30 flex items-center gap-3 text-[10px] text-zinc-500 flex-wrap">
            {order.paid_at && (
              <span className="text-green-500">
                Pago: {format(new Date(order.paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            )}
            {order.status === "pending" && order.expired_at && (
              <span className="text-yellow-500">
                Expira: {format(new Date(order.expired_at), "dd/MM HH:mm", { locale: ptBR })}
              </span>
            )}
            {order.status === "expired" && (
              <span className="text-red-400">
                Tentativa: {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Configuração das seções - Incluindo Pendentes e Expirados conforme solicitado
  const sections = [
    { key: "completed", label: kanbanLabels.completed, color: "green", icon: CheckCircle, orders: groupedOrders.completed },
    { key: "paid", label: kanbanLabels.paid, color: "blue", icon: CheckCircle, orders: groupedOrders.paid },
    { key: "pending", label: kanbanLabels.pending, color: "yellow", icon: Clock, orders: groupedOrders.pending },
    { key: "expired", label: kanbanLabels.expired, color: "red", icon: AlertTriangle, orders: groupedOrders.expired },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-zinc-800/80 border-zinc-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <CardTitle className="text-xl text-white">Admin MRO Instagram</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-zinc-700/50 border-zinc-600 text-white"
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Senha"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-zinc-700/50 border-zinc-600 text-white"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                disabled={loginLoading}
              >
                {loginLoading ? <Loader2 className="animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg hidden sm:block">
                <Settings className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white whitespace-nowrap">Admin MRO Instagram</h1>
                <p className="text-zinc-400 text-xs md:text-sm">Gerenciamento /instagram-nova</p>
                {lastAutoCheck && (
                  <p className="text-zinc-500 text-[10px] md:text-xs mt-0.5">
                    Última verificação: {format(lastAutoCheck, "HH:mm:ss", { locale: ptBR })}
                    {autoCheckEnabled && " (auto: 8s)"}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setShowWebhookSettings(true)}
                variant="outline"
                size="sm"
                className="h-9 px-2 md:px-3 border-amber-500/50 text-amber-400 hover:bg-amber-500/10 text-xs md:text-sm"
                title="Configurar envio automático de acessos via WhatsApp"
              >
                <Settings className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">WhatsApp</span> (API)
              </Button>
              <Button
                onClick={() => setShowWppConnection(true)}
                variant="outline"
                size="sm"
                className="h-9 px-2 md:px-3 border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs md:text-sm"
                title="Conectar WhatsApp via QR Code (VPS)"
              >
                <QrCode className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Conectar</span> QR Code
              </Button>
              <Button
                onClick={() => setShowWebhookLogs(true)}
                variant="outline"
                size="sm"
                className="h-9 px-2 md:px-3 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 text-xs md:text-sm"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                Logs
              </Button>
              {/* Botão de Histórico Wpp removido a pedido do usuário */}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => { setShowAffiliateConfig(!showAffiliateConfig); }}
              variant="outline"
              size="sm"
              className={`h-9 px-2 md:px-3 border-zinc-600 text-xs md:text-sm ${showAffiliateConfig ? "text-purple-400 border-purple-500/50" : "text-zinc-400"}`}
            >
              <Users className="w-4 h-4 mr-1.5" />
              Afiliados
            </Button>
            <Button
              onClick={() => setShowRemarketingDashboard(!showRemarketingDashboard)}
              variant="outline"
              size="sm"
              className={`h-9 px-2 md:px-3 border-zinc-600 text-xs md:text-sm ${showRemarketingDashboard ? "text-orange-400 border-orange-500/50" : "text-zinc-400"}`}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Remarketing
            </Button>
            <Button
              onClick={() => setShowAccessReminder(!showAccessReminder)}
              variant="outline"
              size="sm"
              className={`h-9 px-2 md:px-3 border-zinc-600 text-xs md:text-sm ${showAccessReminder ? "text-cyan-400 border-cyan-500/50" : "text-zinc-400"}`}
            >
              <Clock className="w-4 h-4 mr-1.5" />
              Lembretes
            </Button>
            <Button
              onClick={() => setShowAvisosWhatsapp(!showAvisosWhatsapp)}
              variant="outline"
              size="sm"
              className={`h-9 px-2 md:px-3 border-zinc-600 text-xs md:text-sm ${showAvisosWhatsapp ? "text-green-400 border-green-500/50" : "text-zinc-400"}`}
            >
              <MessageCircle className="w-4 h-4 mr-1.5" />
              Avisos WhatsApp
            </Button>
            <Button
              onClick={() => setAutoCheckEnabled(!autoCheckEnabled)}
              variant="outline"
              size="sm"
              className={`h-9 px-2 md:px-3 border-zinc-600 text-xs md:text-sm ${autoCheckEnabled ? "text-green-400 border-purple-500/50" : "text-zinc-400"}`}
            >
              {autoCheckEnabled ? "Auto ✓" : "Auto ✗"}
            </Button>
            <Button
              onClick={() => { loadOrders(); checkPendingPayments(); }}
              variant="outline"
              size="sm"
              className="h-9 px-2 md:px-3 border-zinc-600 text-zinc-300 text-xs md:text-sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="h-9 px-2 md:px-3 border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs md:text-sm"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sair
            </Button>
          </div>
        </div>

        {/* Avisos WhatsApp - Migração de número */}
        {showAvisosWhatsapp && (
          <div className="mb-6">
            <WhatsAppMigrationBroadcast />
          </div>
        )}

        {/* Configuração de Afiliados Expandida */}
        {showAffiliateConfig && (
          <Card className="bg-purple-500/10 border-purple-500/30 mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-purple-400 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Sistema de Afiliados
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAffiliateConfig(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                <TabsList className="bg-zinc-800/50 mb-4 flex-wrap">
                  <TabsTrigger value="config" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                    Configuração
                  </TabsTrigger>
                  <TabsTrigger value="affiliates" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                    Histórico ({affiliates.length})
                  </TabsTrigger>
                  <TabsTrigger value="sales" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                    Histórico de Envios
                  </TabsTrigger>
                  <TabsTrigger value="attempts" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
                    Tentativas ({getFilteredAffiliateAttempts().length})
                  </TabsTrigger>
                  <TabsTrigger value="email-preview" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                    📧 Preview Email
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Configuração */}
                <TabsContent value="config">
                  {/* Cabeçalho com botões */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-500/20">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">
                        {isEditingAffiliate ? `Editando: ${affiliateName || editingAffiliateOriginalId}` : "Novo Afiliado"}
                      </h3>
                      {isEditingAffiliate && (
                        <Badge className="bg-blue-500/20 text-blue-400">Modo Edição</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {isEditingAffiliate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={clearAffiliateForm}
                          className="border-zinc-600 text-zinc-300"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancelar Edição
                        </Button>
                      )}
                      {!isEditingAffiliate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={clearAffiliateForm}
                          className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Novo Afiliado
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-zinc-400 mb-1 block">Identificador do Afiliado *</label>
                      <Input
                        placeholder="ex: mila"
                        value={affiliateId}
                        onChange={(e) => setAffiliateId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                        className="bg-zinc-800/50 border-zinc-600 text-white"
                      />
                      <p className="text-xs text-zinc-500 mt-1">
                        Usado como prefixo: {affiliateId || "id"}:email@exemplo.com
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 mb-1 block">Nome do Afiliado *</label>
                      <Input
                        placeholder="Ex: Milla Souza"
                        value={affiliateName}
                        onChange={(e) => setAffiliateName(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-600 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 mb-1 block">Email do Afiliado *</label>
                      <Input
                        type="email"
                        placeholder="email@afiliado.com"
                        value={affiliateEmail}
                        onChange={(e) => setAffiliateEmail(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-600 text-white"
                      />
                      <p className="text-xs text-zinc-500 mt-1">
                        Receberá emails de comissão
                      </p>
                    </div>
                  </div>

                  {/* Dono do afiliado — vincula usuário MRO (SquareCloud) para auto-login em /afiliadosx */}
                  <div className="mb-4 bg-yellow-500/5 border border-yellow-500/30 rounded-lg p-4">
                    <label className="text-sm text-yellow-400 font-medium mb-1 block flex items-center gap-2">
                      🔗 Dono do afiliado (usuário MRO)
                    </label>
                    <Input
                      placeholder="ex: joaosilva (usuário do /instagram)"
                      value={affiliateSquarecloudUsername}
                      onChange={(e) => setAffiliateSquarecloudUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                      className="bg-zinc-800/50 border-zinc-600 text-white"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      Quando esse usuário fizer login em <strong className="text-yellow-400">/afiliadosx</strong>, o painel dele abre automaticamente com este cadastro de afiliado e todo histórico de vendas.
                    </p>
                  </div>




                  
                  {/* Linha 2: Foto e Horários */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-zinc-400 mb-1 block">Foto do Afiliado</label>
                      <div 
                        className="bg-zinc-800/50 border-2 border-dashed border-zinc-600 rounded-lg p-3 text-center cursor-pointer hover:border-purple-500 transition-colors"
                        onClick={() => photoInputRef.current?.click()}
                        onPaste={handlePhotoPaste}
                        tabIndex={0}
                      >
                        <input
                          ref={photoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileChange}
                          className="hidden"
                        />
                        {uploadingPhoto ? (
                          <div className="flex items-center justify-center gap-2 py-2">
                            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                            <span className="text-sm text-purple-400">Carregando...</span>
                          </div>
                        ) : affiliatePhotoUrl ? (
                          <div className="flex items-center gap-3">
                            <img 
                              src={affiliatePhotoUrl} 
                              alt={affiliateName} 
                              className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="text-left flex-1">
                              <p className="text-xs text-green-400">Foto carregada ✓</p>
                              <p className="text-xs text-zinc-500 truncate max-w-[150px]">{affiliatePhotoUrl.split('/').pop()}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="py-2">
                            <div className="flex items-center justify-center gap-2 text-zinc-400 mb-1">
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">Clique ou Ctrl+V</span>
                            </div>
                            <p className="text-xs text-zinc-500">Arraste, cole ou selecione uma imagem</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Toggle Vitalício */}
                    <div className="col-span-2 lg:col-span-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm text-amber-400 font-medium flex items-center gap-2">
                            ⭐ Afiliado Vitalício
                          </label>
                          <p className="text-xs text-zinc-500 mt-1">
                            Sem data definida - Recebe comissão <strong className="text-green-400">na hora</strong> que vender
                          </p>
                        </div>
                        <Switch
                          checked={isLifetimeAffiliate}
                          onCheckedChange={(checked) => {
                            setIsLifetimeAffiliate(checked);
                            if (checked) {
                              setPromoStartDate("");
                              setPromoEndDate("");
                              setPromoStartTime("");
                              setPromoEndTime("");
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Datas da promoção - só mostra se NÃO for vitalício */}
                  {!isLifetimeAffiliate && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Data Início</label>
                        <Input
                          type="date"
                          value={promoStartDate}
                          onChange={(e) => setPromoStartDate(e.target.value)}
                          className="bg-zinc-800/50 border-zinc-600 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Data Fim</label>
                        <Input
                          type="date"
                          value={promoEndDate}
                          onChange={(e) => setPromoEndDate(e.target.value)}
                          className="bg-zinc-800/50 border-zinc-600 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm text-zinc-400 mb-1 block">Hora Fim</label>
                        <Input
                          type="time"
                          value={promoEndTime}
                          onChange={(e) => setPromoEndTime(e.target.value)}
                          className="bg-zinc-800/50 border-zinc-600 text-white"
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                          Horário de expiração (comissões repassadas após)
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Link do afiliado */}
                  {affiliateId && (
                    <div className="space-y-4">
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <label className="text-sm text-green-400 mb-1 block font-medium">Link Página MRO:</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm text-green-300 bg-zinc-800 px-3 py-2 rounded font-mono">
                            {window.location.origin}/promo/{affiliateId.toLowerCase()}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/promo/${affiliateId.toLowerCase()}`);
                              toast.success("Link copiado!");
                            }}
                            className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <label className="text-sm text-blue-400 mb-1 block font-medium">Link Renda Extra:</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm text-blue-300 bg-zinc-800 px-3 py-2 rounded font-mono">
                            {window.location.origin}/promorendaextra/{affiliateId.toLowerCase()}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/promorendaextra/${affiliateId.toLowerCase()}`);
                              toast.success("Link copiado!");
                            }}
                            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Configurações Globais de Afiliados */}
                  <div className="mb-4 p-4 bg-zinc-800/50 border border-zinc-600 rounded-lg">
                    <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-green-400" />
                      Configurações Globais (Emails)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-zinc-400 mb-1 block">WhatsApp para Contato (Comissões)</label>
                        <Input
                          placeholder="5511999999999"
                          value={affiliateWhatsApp}
                          onChange={(e) => setAffiliateWhatsApp(e.target.value.replace(/\D/g, ""))}
                          className="bg-zinc-800/50 border-zinc-600 text-white"
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                          Número de referência. O link nos emails direcionará para /whatsapp automaticamente
                        </p>
                      </div>
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            saveAffiliateSettings(affiliateWhatsApp);
                            toast.success("Configurações de WhatsApp salvas!");
                          }}
                          className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Salvar WhatsApp
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 pt-4 border-t border-purple-500/20">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={affiliateActive}
                          onCheckedChange={setAffiliateActive}
                        />
                        <span className={`text-sm ${affiliateActive ? "text-green-400" : "text-red-400"}`}>
                          {affiliateActive ? (
                            <><Power className="w-4 h-4 inline mr-1" /> Promoção Ativa</>
                          ) : (
                            <><PowerOff className="w-4 h-4 inline mr-1" /> Promoção Parada</>
                          )}
                        </span>
                      </div>
                      
                    </div>
                    
                    <Button
                      onClick={saveAffiliateConfig}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                      disabled={savingAffiliate}
                    >
                      {savingAffiliate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Salvar Configuração
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab: Histórico de Afiliados */}
                <TabsContent value="affiliates">
                  {/* Botão novo afiliado no topo */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-500/20">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 text-sm">
                        {affiliates.length} afiliado(s) cadastrado(s)
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadAffiliatesFromCloud(true)}
                        disabled={loadingAffiliates}
                        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                      >
                        {loadingAffiliates ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        <span className="ml-1">Sincronizar</span>
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { clearAffiliateForm(); setActiveTab("config"); }}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Novo Afiliado
                    </Button>
                  </div>
                  {affiliates.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum afiliado cadastrado</p>
                      <p className="text-sm">Clique em "+ Novo Afiliado" para começar</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {affiliates.map((affiliate) => {
                        const sales = getAffiliateSales(affiliate.id);
                        const attempts = getAffiliateAttempts(affiliate.id);
                        const multipleAttempts = getMultipleAttempts(affiliate.id);
                        const revenue = sales.reduce((sum, o) => sum + Number(o.amount), 0);
                        const commission = sales.length * 97;
                        
                        return (
                          <div 
                            key={affiliate.id}
                            className={`bg-zinc-800/50 border rounded-lg p-4 ${affiliate.active ? "border-green-500/50" : "border-zinc-700/50"}`}
                          >
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  {affiliate.photoUrl ? (
                                    <img 
                                      src={affiliate.photoUrl} 
                                      alt={affiliate.name}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                      <User className="w-6 h-6 text-purple-400" />
                                    </div>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); sendWelcomeEmail(affiliate); }}
                                    disabled={sendingWelcomeEmail === affiliate.id}
                                    className="absolute -right-1 -bottom-1 text-blue-400 hover:bg-blue-500/20 bg-zinc-800 border border-blue-500/50 h-6 w-6 p-0 rounded-full"
                                    title="Enviar email de boas-vindas"
                                  >
                                    {sendingWelcomeEmail === affiliate.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Mail className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-white">{affiliate.name}</h4>
                                    <Badge className={affiliate.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                                      {affiliate.active ? "Ativo" : "Inativo"}
                                    </Badge>
                                    {affiliate.isLifetime && (
                                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                        ⭐ Vitalício
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-zinc-400">{affiliate.email}</p>
                                  <p className="text-xs text-zinc-500 font-mono">ID: {affiliate.id}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="text-center px-3 py-1 bg-purple-500/10 rounded-lg">
                                  <p className="text-xs text-zinc-400">Vendas</p>
                                  <p className="text-xl font-bold text-purple-400">{sales.length}</p>
                                </div>
                                <div className="text-center px-3 py-1 bg-green-500/10 rounded-lg">
                                  <p className="text-xs text-zinc-400">Comissão</p>
                                  <p className="text-xl font-bold text-green-400">R$ {commission}</p>
                                </div>
                                <div className="text-center px-3 py-1 bg-yellow-500/10 rounded-lg">
                                  <p className="text-xs text-zinc-400">Tentativas</p>
                                  <p className="text-xl font-bold text-yellow-400">{attempts.length}</p>
                                </div>
                                {multipleAttempts.length > 0 && (
                                  <div className="text-center px-3 py-1 bg-orange-500/10 rounded-lg" title="Pessoas que tentaram mais de uma vez">
                                    <p className="text-xs text-zinc-400">Múltiplas</p>
                                    <p className="text-xl font-bold text-orange-400">{multipleAttempts.length}</p>
                                  </div>
                                )}
                                
                                <div className="flex gap-2 flex-wrap">
                                  {!affiliate.active ? (
                                    <Button
                                      size="sm"
                                      onClick={() => activateAffiliate(affiliate)}
                                      className="bg-green-500 hover:bg-green-600"
                                    >
                                      <Power className="w-4 h-4 mr-1" />
                                      Ativar
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openSummaryModal(affiliate)}
                                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                                        disabled={sendingEmail}
                                        title="Enviar resumo parcial sem parar a promoção"
                                      >
                                        {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                                        Resumir
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => stopAffiliatePromo(affiliate)}
                                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                        disabled={sendingEmail}
                                        title="Parar promoção e enviar resumo final"
                                      >
                                        {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4 mr-1" />}
                                        Parar + Resumo
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      const next = !(affiliate.showPromoBanner ?? true);
                                      const updated = affiliates.map(a => a.id === affiliate.id ? { ...a, showPromoBanner: next } : a);
                                      setAffiliates(updated);
                                      try {
                                        // Salva via edge function (service role - única forma confiável de gravar admin/affiliates.json)
                                        const { data: resp, error: fnErr } = await supabase.functions.invoke('affiliate-storage', {
                                          body: { action: 'save', key: 'affiliates', data: updated }
                                        });
                                        if (fnErr || !resp?.success) throw new Error(fnErr?.message || resp?.error || 'Falha ao salvar na nuvem');
                                        localStorage.setItem("mro_affiliates_history", JSON.stringify(updated));
                                        // Também atualiza a tabela partners (fonte primária usada pela /promo quando o afiliado é partner oficial)
                                        await supabase.from('partners').update({ show_promo_banner: next } as any).eq('slug', affiliate.id.toLowerCase());
                                        toast.success(next ? "Foto e nome ATIVADOS na página de vendas" : "Foto e nome OCULTADOS na página de vendas");
                                      } catch (e: any) {
                                        toast.error("Erro ao salvar: " + e.message);
                                        setAffiliates(affiliates);
                                      }
                                    }}
                                    className={(affiliate.showPromoBanner ?? true)
                                      ? "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                                      : "border-zinc-600 text-zinc-400 hover:bg-zinc-700/30"}
                                    title="Ativar/desativar exibição da foto e nome na página /promo"
                                  >
                                    {(affiliate.showPromoBanner ?? true) ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                                    {(affiliate.showPromoBanner ?? true) ? "Foto ON" : "Foto OFF"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => loadAffiliateForEdit(affiliate)}
                                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                  >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteAffiliate(affiliate)}
                                    className="text-red-400 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Link de Acompanhamento */}
                            <div className="mt-3 pt-3 border-t border-zinc-700/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Link className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-blue-400 font-medium">Link de Acompanhamento</span>
                              </div>
                              <div className="flex flex-col md:flex-row md:items-center gap-2">
                                <code className="flex-1 text-xs text-green-300 bg-zinc-900 px-3 py-2 rounded font-mono truncate">
                                  {getTrackingLink(affiliate.id)}
                                </code>
                                <div className="flex items-center gap-2">
                                  {/* Senha */}
                                  {showPasswordInput === affiliate.id ? (
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="text"
                                        placeholder="Nova senha"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="h-8 w-28 text-xs bg-zinc-800 border-zinc-600"
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => saveAffiliatePassword(affiliate.id, newPassword)}
                                        disabled={savingPassword || !newPassword}
                                        className="h-8 bg-green-500 hover:bg-green-600"
                                      >
                                        {savingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => { setShowPasswordInput(null); setNewPassword(""); }}
                                        className="h-8 text-zinc-400"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded text-xs">
                                        <span className="text-zinc-400">Senha:</span>
                                        <span className={`font-mono ${showPasswordVisible[affiliate.id] ? 'text-amber-400' : 'text-zinc-500'}`}>
                                          {showPasswordVisible[affiliate.id] 
                                            ? (affiliatePasswords[affiliate.id] || affiliate.id.toLowerCase())
                                            : '••••••'
                                          }
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setShowPasswordVisible(prev => ({ ...prev, [affiliate.id]: !prev[affiliate.id] }));
                                            if (!affiliatePasswords[affiliate.id]) {
                                              loadAffiliatePassword(affiliate.id);
                                            }
                                          }}
                                          className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                                        >
                                          {showPasswordVisible[affiliate.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        </Button>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowPasswordInput(affiliate.id)}
                                        className="h-7 px-2 text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                                        title="Alterar senha"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyTrackingLink(affiliate.id)}
                                    className="h-7 px-2 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                    title="Copiar link + senha"
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copiar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(getTrackingLink(affiliate.id), '_blank')}
                                    className="h-7 px-2 border-green-500/50 text-green-400 hover:bg-green-500/10"
                                    title="Abrir link"
                                  >
                                    <Link className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Links públicos de divulgação */}
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {(() => {
                                  const slug = affiliate.id.toLowerCase();
                                  const igUrl = `${window.location.origin}/promo/${slug}`;
                                  const reUrl = `${window.location.origin}/promorendaextra/${slug}`;
                                  return (
                                    <>
                                      <div className="flex items-center gap-2 bg-zinc-900/60 border border-purple-500/30 rounded px-2 py-1.5">
                                        <span className="text-[10px] font-bold text-purple-300 px-1.5 py-0.5 bg-purple-500/20 rounded">IG</span>
                                        <code className="flex-1 text-xs text-purple-200 font-mono truncate">{igUrl}</code>
                                        <Button size="sm" variant="outline" className="h-7 px-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/10" onClick={() => { navigator.clipboard.writeText(igUrl); toast.success("Link IG copiado"); }} title="Copiar link IG">
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7 px-2 border-purple-500/50 text-purple-300 hover:bg-purple-500/10" onClick={() => window.open(igUrl, '_blank')} title="Abrir link IG">
                                          <Link className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <div className="flex items-center gap-2 bg-zinc-900/60 border border-emerald-500/30 rounded px-2 py-1.5">
                                        <span className="text-[10px] font-bold text-emerald-300 px-1.5 py-0.5 bg-emerald-500/20 rounded">RE</span>
                                        <code className="flex-1 text-xs text-emerald-200 font-mono truncate">{reUrl}</code>
                                        <Button size="sm" variant="outline" className="h-7 px-2 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10" onClick={() => { navigator.clipboard.writeText(reUrl); toast.success("Link Renda Extra copiado"); }} title="Copiar link Renda Extra">
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-7 px-2 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10" onClick={() => window.open(reUrl, '_blank')} title="Abrir link Renda Extra">
                                          <Link className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Vendas por Afiliado */}
                <TabsContent value="sales">
                  <div className="mb-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <Filter className="w-4 h-4 text-zinc-400" />
                      <select
                        value={selectedAffiliateFilter}
                        onChange={(e) => setSelectedAffiliateFilter(e.target.value)}
                        className="bg-zinc-800 border border-zinc-600 text-white rounded-lg px-3 py-2"
                      >
                        <option value="all">Todos os Afiliados</option>
                        {affiliates.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                        ))}
                      </select>
                      <span className="text-sm text-zinc-400">
                        {getFilteredAffiliateSales().length} vendas
                      </span>
                    </div>
                    
                    {/* Ações em massa */}
                    {getFilteredAffiliateSales().length > 0 && (
                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={toggleSelectAllUnpaid}
                          className="h-8 border-zinc-600 text-zinc-300"
                        >
                          {selectedSalesForPayment.size > 0 ? "Desmarcar Todas" : "Selecionar Pendentes"}
                        </Button>
                        {selectedSalesForPayment.size > 0 && (
                          <Button
                            size="sm"
                            onClick={markSelectedAsPaid}
                            disabled={savingCommissions}
                            className="h-8 bg-green-600 hover:bg-green-700 text-white"
                          >
                            {savingCommissions ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-1" />
                            )}
                            Dar Baixa ({selectedSalesForPayment.size})
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {getFilteredAffiliateSales().length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                      <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma venda de afiliados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getFilteredAffiliateSales().map(order => {
                        // Encontrar qual afiliado
                        const affiliate = affiliates.find(a => 
                          order.email.toLowerCase().startsWith(`${a.id.toLowerCase()}:`)
                        );
                        const commissionIsPaid = affiliate && isCommissionPaid(affiliate.id, order.nsu_order);
                        const isSelected = selectedSalesForPayment.has(order.nsu_order);
                        
                        return (
                          <div 
                            key={order.id} 
                            className={`bg-zinc-800/30 border rounded-lg p-3 transition-colors ${
                              commissionIsPaid 
                                ? 'border-green-500/50 bg-green-500/5' 
                                : isSelected 
                                  ? 'border-blue-500/50 bg-blue-500/5' 
                                  : 'border-zinc-700/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                {/* Checkbox para selecionar */}
                                {!commissionIsPaid && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSaleSelection(order.nsu_order)}
                                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500 cursor-pointer"
                                  />
                                )}
                                {commissionIsPaid && (
                                  <div className="w-5 h-5 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  </div>
                                )}
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                  {affiliate?.name || "Afiliado"}
                                </Badge>
                                <div>
                                  <p className="text-sm text-white">{order.email.split(":")[1]}</p>
                                  <p className="text-xs text-zinc-400">{order.username}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm font-bold text-green-400">R$ {Number(order.amount).toFixed(2)}</p>
                                  <p className="text-xs text-zinc-400">
                                    {format(new Date(order.paid_at || order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </p>
                                </div>
                                {commissionIsPaid ? (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                    ✅ Comissão Paga
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-500/20 text-yellow-400">
                                    💰 R$ 97 pendente
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Total */}
                      <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-400 font-bold">Total de Comissões</span>
                          <span className="text-2xl font-bold text-purple-400">
                            R$ {getFilteredAffiliateSales().length * 97},00
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="attempts">
                  {getFilteredAffiliateAttempts().length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 bg-zinc-800/50 rounded-lg border border-zinc-700">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhuma tentativa (pendente/expirada) encontrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getFilteredAffiliateAttempts().map((order) => (
                        <div key={order.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <Badge className={order.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}>
                                {order.status === "pending" ? "Pendente" : "Expirado"}
                              </Badge>
                              <div>
                                <p className="text-sm text-white">{order.email.includes(":") ? order.email.split(":")[1] : order.email}</p>
                                <p className="text-xs text-zinc-400 font-mono">{order.username} ({order.phone || "Sem tel"})</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-zinc-300">R$ {Number(order.amount).toFixed(2)}</p>
                              <p className="text-[10px] text-zinc-500">
                                {format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Preview do Email */}
                <TabsContent value="email-preview">
                  <div className="mb-4">
                    <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Preview dos Emails Enviados aos Afiliados
                    </h4>
                    <p className="text-sm text-zinc-400 mb-4">
                      Veja como os emails chegam para os afiliados em diferentes situações.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Email de Boas-Vindas */}
                    <div className="border border-blue-500/30 rounded-lg overflow-hidden">
                      <div className="bg-blue-500/10 px-4 py-2 flex items-center justify-between">
                        <span className="text-blue-400 font-medium">📧 Email de Boas-Vindas</span>
                        <Badge className="bg-blue-500/20 text-blue-400">Enviado ao cadastrar afiliado</Badge>
                      </div>
                      <div className="p-4 bg-zinc-900/50 max-h-96 overflow-y-auto">
                        <div className="text-center mb-4">
                          <div className="bg-black text-yellow-400 inline-block px-6 py-3 rounded-xl font-bold text-2xl border-2 border-yellow-400 mb-2">MRO</div>
                          <h3 className="text-xl text-white font-bold">🎉 Bem-vindo(a)!</h3>
                        </div>
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-4 rounded-xl text-center mb-4">
                          <p className="text-black font-bold">🤝 Estamos felizes em ter você conosco em parceria!</p>
                          <p className="text-zinc-800">Olá, <strong>[Nome do Afiliado]</strong>!</p>
                        </div>
                        <div className="bg-zinc-800 border-2 border-green-500 rounded-xl p-4 text-center mb-4">
                          <p className="text-green-400 font-medium">💰 Sua Comissão por Venda:</p>
                          <p className="text-green-400 text-4xl font-bold my-2">R$ 97</p>
                          <p className="text-zinc-400 text-sm">Suporte todo é nosso!</p>
                        </div>
                        <div className="bg-zinc-800 border-l-4 border-yellow-400 p-4 rounded-r-xl mb-4">
                          <p className="text-white text-sm">
                            <strong className="text-yellow-400">📅 Afiliado com prazo:</strong> Comissões serão passadas ao final da promoção.
                          </p>
                          <p className="text-green-400 text-sm mt-2">
                            <strong>⚡ Afiliado Vitalício:</strong> Recebe imediatamente quando cada venda é aprovada!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Email de Comissão */}
                    <div className="border border-green-500/30 rounded-lg overflow-hidden">
                      <div className="bg-green-500/10 px-4 py-2 flex items-center justify-between">
                        <span className="text-green-400 font-medium">💰 Email de Comissão</span>
                        <Badge className="bg-green-500/20 text-green-400">Enviado a cada venda aprovada</Badge>
                      </div>
                      <div className="p-4 bg-zinc-900/50 max-h-96 overflow-y-auto">
                        <div className="text-center mb-4">
                          <div className="bg-black text-yellow-400 inline-block px-6 py-3 rounded-xl font-bold text-2xl border-2 border-yellow-400 mb-2">MRO</div>
                          <h3 className="text-xl text-green-400 font-bold">💰 Comissão Confirmada!</h3>
                        </div>
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-4 rounded-xl text-center mb-4">
                          <p className="text-black font-bold">🎉 PARABÉNS, [NOME]!</p>
                          <p className="text-zinc-800">Você tem uma nova comissão!</p>
                        </div>
                        <div className="bg-zinc-800 border-2 border-green-500 rounded-xl p-4 text-center mb-4">
                          <p className="text-zinc-400 text-sm">Valor da sua comissão:</p>
                          <p className="text-green-400 text-4xl font-bold my-2">R$ 97,00</p>
                          <p className="text-green-400 font-medium">🚀 Vamos para cima!</p>
                        </div>
                        <div className="bg-zinc-800 rounded-xl p-4 mb-4">
                          <h4 className="text-yellow-400 font-medium mb-2">📋 Detalhes da Venda:</h4>
                          <div className="bg-zinc-900 rounded p-2 mb-2">
                            <span className="text-xs text-zinc-400 block">Cliente:</span>
                            <span className="text-white font-medium">[Nome do Cliente]</span>
                          </div>
                          <div className="bg-zinc-900 rounded p-2">
                            <span className="text-xs text-zinc-400 block">Email do cliente:</span>
                            <span className="text-white font-mono text-sm">[email@cliente.com]</span>
                          </div>
                        </div>
                        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-center">
                          <p className="text-white font-bold">⚡ RECEBA AGORA!</p>
                          <p className="text-white/90 text-sm mt-1">
                            Para afiliados vitalícios: Entre em contato pelo WhatsApp e envie seu PIX!
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Email de Resumo */}
                    <div className="border border-purple-500/30 rounded-lg overflow-hidden">
                      <div className="bg-purple-500/10 px-4 py-2 flex items-center justify-between">
                        <span className="text-purple-400 font-medium">📊 Email de Resumo Final</span>
                        <Badge className="bg-purple-500/20 text-purple-400">Enviado ao parar promoção</Badge>
                      </div>
                      <div className="p-4 bg-zinc-900/50 max-h-96 overflow-y-auto">
                        <div className="text-center mb-4">
                          <div className="bg-black text-yellow-400 inline-block px-6 py-3 rounded-xl font-bold text-2xl border-2 border-yellow-400 mb-2">MRO</div>
                          <h3 className="text-xl text-purple-400 font-bold">📊 Resumo Final de Vendas</h3>
                        </div>
                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-center mb-4">
                          <p className="text-white font-bold text-lg">🎉 Parabéns, [Nome]!</p>
                          <p className="text-white/90">Aqui está o resumo completo das suas vendas!</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-zinc-800 border-2 border-purple-500 rounded-xl p-4 text-center">
                            <p className="text-zinc-400 text-sm">Total de Vendas:</p>
                            <p className="text-purple-400 text-3xl font-bold">[X]</p>
                          </div>
                          <div className="bg-zinc-800 border-2 border-green-500 rounded-xl p-4 text-center">
                            <p className="text-zinc-400 text-sm">Total de Comissões:</p>
                            <p className="text-green-400 text-3xl font-bold">R$ [Y]</p>
                          </div>
                        </div>
                        <div className="bg-zinc-800 rounded-xl p-4">
                          <h4 className="text-yellow-400 font-medium mb-3">📋 Lista de Vendas:</h4>
                          <div className="bg-zinc-900 rounded p-2 text-sm">
                            <div className="grid grid-cols-4 gap-2 text-zinc-400 font-medium border-b border-zinc-700 pb-2 mb-2">
                              <span>#</span>
                              <span>Email</span>
                              <span>Valor</span>
                              <span>Data</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-zinc-300">
                              <span>1</span>
                              <span>cliente@...</span>
                              <span>R$ 297</span>
                              <span>01/01</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {showAccessReminder && (
          <AccessReminderPanel 
            adminSessionToken={getAdminSessionToken()} 
            onClose={() => setShowAccessReminder(false)} 
          />
        )}

        {showRemarketingDashboard && (
          <Card className="bg-orange-500/10 border-orange-500/30 mb-6">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-orange-400 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Dashboard de Remarketing (Pendentes/Expirados)
                </CardTitle>
                <p className="text-sm text-zinc-400">Visualize leads que não finalizaram a compra</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowRemarketingDashboard(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Pendentes: {stats.pending}
                  </h4>
                  <p className="text-xs text-zinc-500">Aguardando pagamento ou em processamento</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Expirados: {stats.expired}
                  </h4>
                  <p className="text-xs text-zinc-500">Tempo limite de pagamento excedido</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-orange-500/5 rounded border border-orange-500/20 text-xs text-orange-300/70 italic">
                Nota: O envio automático de remarketing está desativado conforme solicitado. Use a lista abaixo para acompanhamento manual.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-4">
              <p className="text-zinc-400 text-sm">Vendas Total</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4">
              <p className="text-yellow-400 text-sm">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <p className="text-blue-400 text-sm">Pagos</p>
              <p className="text-2xl font-bold text-blue-400">{stats.paid}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4">
              <p className="text-green-400 text-sm">Completos</p>
              <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4">
              <p className="text-red-400 text-sm">Expirados</p>
              <p className="text-2xl font-bold text-red-400">{stats.expired}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4">
              <p className="text-amber-400 text-sm">Receita</p>
              <p className="text-2xl font-bold text-amber-400">R$ {stats.totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por email, usuário, telefone ou NSU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-800/50 border-zinc-700 text-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {["all", "pending", "paid", "completed", "expired"].map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(status as typeof filterStatus)}
                className={filterStatus === status 
                  ? "bg-amber-500 text-black" 
                  : "border-zinc-600 text-zinc-300"
                }
              >
                {status === "all" ? "Todos" : status === "pending" ? "Pendentes" : status === "paid" ? "Pagos" : status === "completed" ? "Completos" : "Expirados"}
              </Button>
            ))}
            
            {/* Filtro por Afiliado */}
            {affiliates.length > 0 && (
              <select
                value={mainAffiliateFilter}
                onChange={(e) => setMainAffiliateFilter(e.target.value)}
                className="bg-zinc-800/50 border border-purple-500/50 text-purple-300 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="all">Todos</option>
                <option value="affiliates_only">Só Afiliados</option>
                {affiliates.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Botão de Configurações Webhook / Kanban mais visível */}
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/20">
              <Settings className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Gestão de Etiquetas e Webhook</h2>
              <p className="text-zinc-400 text-sm">Configure o status inicial e nomes das etapas do Kanban.</p>
            </div>
          </div>
          <Button
            onClick={() => setShowWebhookSettings(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-black px-6 h-12 rounded-lg shadow-xl shadow-amber-500/20 transition-all hover:scale-105"
          >
            ABRIR EDITOR DE ETAPAS KANBAN
          </Button>
        </div>

        {/* Orders List - Collapsible Sections */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardContent className="p-8 text-center">
              <p className="text-zinc-400">Nenhum pedido encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sections.map(({ key, label, color, icon: Icon, orders: sectionOrders }) => {
              if (sectionOrders.length === 0) return null;
              
              const isOpen = openSections[key];
              const colorClasses: Record<string, string> = {
                green: "bg-green-500/10 border-green-500/40 hover:bg-green-500/20",
                blue: "bg-blue-500/10 border-blue-500/40 hover:bg-blue-500/20",
                yellow: "bg-yellow-500/10 border-yellow-500/40 hover:bg-yellow-500/20",
                red: "bg-red-500/10 border-red-500/40 hover:bg-red-500/20",
              };
              const textClasses: Record<string, string> = {
                green: "text-green-400",
                blue: "text-blue-400",
                yellow: "text-yellow-400",
                red: "text-red-400",
              };
              
              return (
                <Collapsible key={key} open={isOpen} onOpenChange={() => toggleSection(key)}>
                  <CollapsibleTrigger asChild>
                    <div 
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${colorClasses[color]}`}
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className={`w-5 h-5 ${textClasses[color]}`} />
                        ) : (
                          <ChevronRight className={`w-5 h-5 ${textClasses[color]}`} />
                        )}
                        <Icon className={`w-5 h-5 ${textClasses[color]}`} />
                        <span className={`font-semibold ${textClasses[color]}`}>{label}</span>
                        <Badge className={`${colorClasses[color]} ${textClasses[color]} border-none`}>
                          {sectionOrders.length}
                        </Badge>
                      </div>
                      <span className="text-zinc-400 text-sm">
                        {isOpen ? "Clique para ocultar" : "Clique para expandir"}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 space-y-2 pl-2 border-l-2 border-zinc-700/50 ml-4">
                      {sectionOrders.map((order) => renderOrderCard(order, true))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Resumo com Email Adicional e Prévia */}
      <Dialog open={showSummaryModal} onOpenChange={(open) => {
        setShowSummaryModal(open);
        if (!open) {
          setShowEmailPreview(false);
          setEmailPreviewHtml("");
        }
      }}>
        <DialogContent className={`bg-zinc-900 border-zinc-700 text-white ${showEmailPreview ? 'max-w-4xl max-h-[90vh]' : 'max-w-md'}`}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-400" />
              {showEmailPreview ? 'Prévia do Email' : 'Enviar Resumo'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {showEmailPreview 
                ? 'Veja como o email vai aparecer para o destinatário' 
                : `Enviar resumo de vendas e tentativas para ${summaryModalAffiliate?.name}`
              }
            </DialogDescription>
          </DialogHeader>
          
          {showEmailPreview ? (
            <div className="space-y-4">
              {/* Prévia do email em iframe */}
              <div className="bg-white rounded-lg overflow-hidden" style={{ height: '60vh' }}>
                <iframe
                  srcDoc={emailPreviewHtml}
                  className="w-full h-full border-0"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
              
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setShowEmailPreview(false)}
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                >
                  <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
                  Voltar
                </Button>
                <Button
                  onClick={() => summaryModalAffiliate && sendSummaryOnly(summaryModalAffiliate, additionalEmail)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Confirmar e Enviar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50">
                  <p className="text-sm text-zinc-400 mb-1">Destino principal:</p>
                  <p className="text-white font-medium">{summaryModalAffiliate?.email}</p>
                </div>
                
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">
                    Email adicional (opcional)
                  </label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={additionalEmail}
                    onChange={(e) => setAdditionalEmail(e.target.value)}
                    className="bg-zinc-800/50 border-zinc-600 text-white placeholder:text-zinc-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Digite um email extra para receber uma cópia do resumo
                  </p>
                </div>
              </div>
              
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSummaryModal(false)}
                  className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </Button>
                <Button
                  variant="outline"
                  onClick={showPreview}
                  className="border-blue-600 text-blue-400 hover:bg-blue-900/30"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Ver Prévia
                </Button>
                <Button
                  onClick={() => summaryModalAffiliate && sendSummaryOnly(summaryModalAffiliate, additionalEmail)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar Resumo
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Histórico CRM Webhook */}
      <Dialog open={showCRMWebhookLogs} onOpenChange={setShowCRMWebhookLogs}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 flex items-center gap-2">
              <Send className="w-5 h-5" />
              Histórico de Envios - CRM
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Logs detalhados dos envios automáticos e manuais para o WhatsApp via CRM
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 mb-4">
            <Button
              size="sm"
              onClick={() => loadCRMWebhookLogs()}
              disabled={loadingCRMLogs}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingCRMLogs ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <span className="text-xs text-zinc-500">
              {crmWebhookLogs.length > 0 && `Último envio: ${format(new Date(crmWebhookLogs[0]?.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`}
            </span>
          </div>
          
          <ScrollArea className="h-[500px]">
            {loadingCRMLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : crmWebhookLogs.filter(log => !!log.order_id).length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                Nenhum envio de venda aprovada registrado
              </div>
            ) : (
              <div className="space-y-2">
                {crmWebhookLogs.filter(log => !!log.order_id).map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border text-sm ${
                      log.status === 'success' 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${
                          log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {log.status === 'success' ? 'Sucesso' : 'Erro'}
                        </Badge>
                        <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                          {log.crm_webhooks?.name || 'Webhook'}
                        </Badge>
                        <span className="text-xs text-zinc-300 font-mono">{log.to_number}</span>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </span>
                    </div>
                    
                    <div className="text-xs text-zinc-400 mb-2 italic">
                      {log.message}
                    </div>

                    {log.error_message && (
                      <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">
                        <strong>Erro:</strong> {log.error_message}
                      </div>
                    )}

                    {log.order_id && (
                      <div className="mt-2 text-[10px] text-zinc-500">
                        ID do Pedido: {log.order_id}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog de Webhook Logs */}
      <Dialog open={showWebhookLogs} onOpenChange={setShowWebhookLogs}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Logs - InfiniPay
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Últimos 50 eventos (webhook + auto_check)
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 mb-4">
            <Button
              size="sm"
              onClick={() => loadWebhookLogs()}
              disabled={loadingLogs}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingLogs ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <span className="text-xs text-zinc-500">
              {webhookLogs.length > 0 && `Último log: ${format(new Date(webhookLogs[0]?.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}`}
            </span>
          </div>
          
          <ScrollArea className="h-[500px]">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : webhookLogs.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                Nenhum log encontrado
              </div>
            ) : (
              <div className="space-y-2">
                {webhookLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border text-sm ${
                      log.status === 'success' 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : log.status === 'error'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-zinc-800/50 border-zinc-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${
                          log.status === 'success' ? 'bg-green-500/20 text-green-400' :
                          log.status === 'error' ? 'bg-red-500/20 text-red-400' :
                          'bg-zinc-700 text-zinc-300'
                        }`}>
                          {log.status}
                        </Badge>
                        <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                          {log.event_type}
                        </Badge>
                        {log.order_found !== null && (
                          <Badge className={`text-xs ${log.order_found ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {log.order_found ? 'Order Found' : 'Order Not Found'}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {log.order_nsu && (
                        <div><span className="text-zinc-500">NSU Order:</span> <span className="text-white">{log.order_nsu}</span></div>
                      )}
                      {log.transaction_nsu && (
                        <div><span className="text-zinc-500">Transaction NSU:</span> <span className="text-white">{log.transaction_nsu}</span></div>
                      )}
                      {log.email && (
                        <div><span className="text-zinc-500">Email:</span> <span className="text-white">{log.email}</span></div>
                      )}
                      {log.username && (
                        <div><span className="text-zinc-500">Username:</span> <span className="text-white">{log.username}</span></div>
                      )}
                      {log.affiliate_id && (
                        <div><span className="text-zinc-500">Afiliado:</span> <span className="text-purple-400">{log.affiliate_id}</span></div>
                      )}
                      {log.amount && (
                        <div><span className="text-zinc-500">Valor:</span> <span className="text-green-400">R$ {log.amount.toFixed(2)}</span></div>
                      )}
                    </div>
                    
                    {log.result_message && (
                      <div className="mt-2 pt-2 border-t border-zinc-700/50 text-xs">
                        <span className="text-zinc-500">Resultado:</span> <span className="text-zinc-300">{log.result_message}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Email */}
      <Dialog open={showEditEmailModal} onOpenChange={setShowEditEmailModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Editar Email
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Altere o email do cliente antes de reenviar o acesso
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {editingOrder && (
              <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-400">Usuário:</span>
                  <span className="text-white font-mono">{editingOrder.username}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-400">Celular:</span>
                  <span className="text-white">{editingOrder.phone || "-"}</span>
                </div>
              </div>
            )}
            
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">
                Novo Email
              </label>
              <Input
                type="email"
                placeholder="novoemail@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-zinc-800/50 border-zinc-600 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditEmailModal(false);
                setEditingOrder(null);
                setNewEmail("");
              }}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveNewEmail}
              className="bg-amber-500 hover:bg-amber-600 text-black"
              disabled={savingEmail || !newEmail.trim()}
            >
              {savingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração do Webhook */}
      <Dialog open={showWebhookSettings} onOpenChange={setShowWebhookSettings}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 flex items-center gap-2">
              <Send className="w-5 h-5" />
              Configurações do Webhook CRM
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configure o envio automático de mensagens via WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4 overflow-y-auto max-h-[70vh] px-1">
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Status do Webhook</p>
                <p className="text-xs text-zinc-400">Ativar ou desativar o envio automático</p>
              </div>
              <Switch 
                checked={webhookConfig.enabled}
                onCheckedChange={(checked) => setWebhookConfig(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            {/* Configuração de Método de Envio WhatsApp */}
            <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-green-400" />
                Método de Envio WhatsApp
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded border border-zinc-700/30">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-white font-medium">Conexão por QR Code</span>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between p-2 bg-zinc-900/10 rounded border border-zinc-700/10 opacity-50 grayscale pointer-events-none">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs text-zinc-500">API WhatsApp (Indisponível)</span>
                  </div>
                  <Switch 
                    disabled={true}
                    checked={false}
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded border border-zinc-700/30">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-white">WhatsApp Global (Todos)</span>
                  </div>
                  <Switch 
                    checked={useGlobalWpp}
                  onCheckedChange={setUseGlobalWpp}
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-zinc-900/50 rounded border border-zinc-700/30">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <div>
                      <span className="text-xs text-white block">Envio Lento (Contingência)</span>
                      <p className="text-[10px] text-zinc-500">Mínimo 3min entre mensagens acumuladas</p>
                    </div>
                  </div>
                  <Switch 
                    checked={slowSendEnabled}
                    onCheckedChange={setSlowSendEnabled}
                  />
                </div>
                
                {isProcessingQueue && nextQueueRun && (
                  <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
                    <span className="text-[10px] text-orange-200">
                      Envio Automático (Vendas): Próximo em {nextQueueRun.toLocaleTimeString()}
                    </span>
                  </div>
                )}
                
                <p className="text-[10px] text-zinc-500 italic">
                  * Ative apenas um método. Se desativar ambos, o envio automático de WhatsApp será interrompido.
                </p>
              </div>
            </div>

            {/* Configuração das Etiquetas do Kanban */}
            <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-400" />
                Etiquetas do Kanban (Colunas)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-zinc-500 font-bold">Pendentes</label>
                  <Input 
                    value={kanbanLabels.pending}
                    onChange={(e) => setKanbanLabels(prev => ({ ...prev, pending: e.target.value }))}
                    className="bg-zinc-900/50 border-zinc-700 h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-zinc-500 font-bold">Pagos</label>
                  <Input 
                    value={kanbanLabels.paid}
                    onChange={(e) => setKanbanLabels(prev => ({ ...prev, paid: e.target.value }))}
                    className="bg-zinc-900/50 border-zinc-700 h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-zinc-500 font-bold">Completos</label>
                  <Input 
                    value={kanbanLabels.completed}
                    onChange={(e) => setKanbanLabels(prev => ({ ...prev, completed: e.target.value }))}
                    className="bg-zinc-900/50 border-zinc-700 h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-zinc-500 font-bold">Expirados</label>
                  <Input 
                    value={kanbanLabels.expired}
                    onChange={(e) => setKanbanLabels(prev => ({ ...prev, expired: e.target.value }))}
                    className="bg-zinc-900/50 border-zinc-700 h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm text-amber-400 font-bold mb-2 block">Etiqueta de Entrada do Webhook</label>
                  <select 
                    value={webhookConfig.default_status}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, default_status: e.target.value }))}
                    className="w-full bg-zinc-800/50 border border-zinc-600 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  >
                    <option value="pending">{kanbanLabels.pending}</option>
                    <option value="paid">{kanbanLabels.paid}</option>
                    <option value="completed">{kanbanLabels.completed}</option>
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Novos contatos do webhook entrarão nesta etiqueta.
                  </p>
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm text-zinc-400 mb-2 block">ID do Webhook</label>
                  <Input 
                    value={webhookConfig.webhook_id}
                    onChange={(e) => setWebhookConfig(prev => ({ ...prev, webhook_id: e.target.value }))}
                    placeholder="ID do seu Webhook"
                    className="bg-zinc-800/50 border-zinc-600 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Token de Acesso</label>
                <Input 
                  value={webhookConfig.token}
                  onChange={(e) => setWebhookConfig(prev => ({ ...prev, token: e.target.value }))}
                  placeholder="Token do seu Webhook"
                  type="password"
                  className="bg-zinc-800/50 border-zinc-600 font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-zinc-400 block">Template da Mensagem</label>
                  <Badge variant="outline" className="text-[10px] bg-zinc-800 border-zinc-700 text-cyan-400">WhatsApp</Badge>
                </div>
                <Textarea 
                  value={webhookConfig.message_template}
                  onChange={(e) => setWebhookConfig(prev => ({ ...prev, message_template: e.target.value }))}
                  placeholder="Escreva a mensagem aqui..."
                  className="bg-zinc-800/50 border-zinc-600 text-sm min-h-[150px] leading-relaxed resize-none"
                />
                <div className="mt-2 p-2 bg-zinc-800/30 rounded border border-zinc-700/50">
                  <p className="text-[10px] text-zinc-500 font-medium mb-1 uppercase tracking-wider">Variáveis Disponíveis:</p>
                  <div className="flex flex-wrap gap-2">
                    {['{username}', '{email}', '{member_link}', '{group_link}'].map(v => (
                      <code key={v} className="text-[10px] text-cyan-500/80 bg-cyan-500/5 px-1 rounded">{v}</code>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
              <p className="text-xs text-blue-300 leading-relaxed">
                <strong>Dica:</strong> Quando ativo, o sistema usará o template acima caso nenhuma mensagem seja enviada no corpo do webhook.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={saveWebhookConfigToDB}
              className="bg-cyan-600 hover:bg-cyan-700 text-white w-full"
              disabled={isSavingWebhookConfig}
            >
              {isSavingWebhookConfig ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Configurações na Nuvem
            </Button>
            
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => {
                  const lastOrder = orders[0];
                  if (lastOrder) sendToCRMWebhook(lastOrder, true);
                  else toast.error("Nenhum pedido encontrado para testar");
                }}
                variant="outline"
                className="border-zinc-700 text-zinc-300 flex-1"
                disabled={isSendingWebhook !== null || orders.length === 0}
              >
                {isSendingWebhook ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Testar
              </Button>
              <Button
                onClick={() => setShowWebhookSettings(false)}
                variant="outline"
                className="border-zinc-700 text-zinc-300 flex-1"
              >
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Connection Modal */}
      <Dialog open={showWppConnection} onOpenChange={setShowWppConnection}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conexão WhatsApp (QR Code)</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Gerencie a conexão do WhatsApp via QR Code para o envio de acessos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <WppBotPanel 
              adminToken={getAdminSessionToken()} 
              onUnauthorized={() => {
                setShowWppConnection(false);
                clearAdminSession();
              }} 
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWppConnection(false)} className="bg-zinc-800 border-zinc-700 text-white">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
