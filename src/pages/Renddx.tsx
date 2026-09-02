import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView, trackInitiateCheckout, trackLead } from "@/lib/facebookTracking";
import { toast } from "sonner";
import { 
  ArrowRight,
  Shield,
  Clock,
  Heart,
  Eye,
  UserPlus,
  Video,
  Users,
  Zap,
  Star,
  Target,
  Mail,
  User,
  CreditCard,
  Loader2,
  Phone,
  AlertTriangle,
  Laptop,
  Rocket,
  X,
  Monitor,
  Check,
  MousePointer2
} from "lucide-react";
const DiscountVideoPlayer = lazy(() => import("@/components/DiscountVideoPlayer"));
const PromoToolVideoSection = lazy(() => import("@/components/PromoToolVideoSection"));
import logoMro from "@/assets/logo-mro.png";


const Renddx = () => {
  const [showLeadQuiz, setShowLeadQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0); // 0: Start, 1: Name, 2: Email, 3: WhatsApp
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadWhatsApp, setLeadWhatsApp] = useState("");
  const [isLeadSaved, setIsLeadSaved] = useState(true);

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [isDiscountActive, setIsDiscountActive] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [showDiscountEndedPopup, setShowDiscountEndedPopup] = useState(false);
  const [promoTimeLeft, setPromoTimeLeft] = useState({ hours: 8, minutes: 0, seconds: 0, expired: false });
  const pricingRef = useRef<HTMLDivElement>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para order bumps
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedBumps, setSelectedBumps] = useState<string[]>([]);

  const planConfig = {
    label: 'MRO para Empresas',
    amount: 67,
    planType: 'monthly',
    priceDisplay: 'R$67',
    durationDisplay: '30 dias de acesso',
  };

  useEffect(() => {
    trackPageView('Sales Page - Renddx Promo');
    
    // Skip quiz and show site directly
    setIsLeadSaved(true);
    setShowLeadQuiz(false);

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from("desconto_alunos_settings").select("is_active").single();
        if (!error && data) { setIsDiscountActive(data.is_active); if (!data.is_active) setShowDiscountEndedPopup(false); }
      } catch (err) { console.error("Error fetching settings:", err); } finally { setIsSettingsLoading(false); }
    };
    fetchSettings();
  }, []);

  const handleLeadSubmit = async () => {
    if (!leadName || !leadEmail || !leadWhatsApp) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('renddx_leads').insert([
        { 
          name: leadName, 
          email: leadEmail, 
          whatsapp: leadWhatsApp,
          user_agent: navigator.userAgent
        }
      ]);

      if (error) throw error;

      trackLead("Renddx - Quiz Registration", {
        email: leadEmail,
        phone: leadWhatsApp.replace(/\D/g, ""),
        content_name: leadName
      });
      localStorage.setItem('renddx_lead_submitted', 'true');
      setIsLeadSaved(true);
      setShowLeadQuiz(false);
      toast.success("Cadastro realizado com sucesso!");
    } catch (err) {
      console.error("Error saving lead:", err);
      toast.error("Erro ao salvar cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await supabase
          .from("hub_products")
          .select("*")
          .eq("is_active", true)
          .order("order_index", { ascending: true });
        
        const hubProducts = data || [];
        
        // Mapear produtos do HUB e adicionar o bump de Suporte
        const allProducts = [
          {
            id: "suporte-wa",
            slug: "suporte-whatsapp",
            title: "Suporte exclusivo Whatsapp",
            description: "Acesso direto ao time de especialistas",
            price: 19,
            plan_type: "mensal"
          },
          ...hubProducts
            .filter(p => p.slug === 'segredo-vender-mais' || p.slug === 'postscomia')
            .map(p => ({
              ...p,
              title: p.slug === 'segredo-vender-mais' ? 'O SEGREDO PARA VENDER MAIS !' : p.title,
              description: p.slug === 'segredo-vender-mais' ? 'Liberado - Acesso exclusivo aos 4 Audibooks que vão transformar seus resultados.' : p.description
            }))
        ];
        
        setProducts(allProducts);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const totalAmount = planConfig.amount + selectedBumps.reduce((acc, slug) => {
    const prod = products.find(p => p.slug === slug);
    return acc + (Number(prod?.price) || 0);
  }, 0);

  const validateUsername = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z]/g, "");
    setUsername(cleaned);
    if (value !== cleaned) setUsernameError("Apenas letras minúsculas, sem espaços ou números");
    else if (cleaned.length < 4) setUsernameError("Mínimo de 4 caracteres");
    else if (cleaned.length > 20) setUsernameError("Máximo de 20 caracteres");
    else setUsernameError("");
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) { toast.error("Por favor, insira um email válido"); return; }
    if (!phone || phone.replace(/\D/g, "").length < 10) { toast.error("Por favor, insira um celular válido com DDD"); return; }
    if (!username || username.length < 4) { toast.error("Nome de usuário deve ter no mínimo 4 caracteres"); return; }
    if (usernameError) { toast.error(usernameError); return; }
    // Lead: cadastro válido preenchido (intenção de compra confirmada)
    trackLead("Renddx - Cadastro Checkout");
    setLoading(true);
    try {
      const { data: checkData, error: checkError } = await supabase.functions.invoke("create-mro-checkout", {
        body: { 
          email: email.toLowerCase().trim(), 
          username: username.toLowerCase().trim(), 
          phone: phone.replace(/\D/g, "").trim(), 
          planType: planConfig.planType, 
          amount: totalAmount, 
          checkUserExists: true,
          source: "renddx",
          selectedBumps: selectedBumps 
        }
      });
      if (checkError) { toast.error("Erro ao criar link de pagamento. Tente novamente."); return; }
      if (checkData.userExists) { toast.error("Este nome de usuário já está em uso. Escolha outro."); setUsernameError("Usuário já existe, escolha outro"); return; }
      if (!checkData.success) { toast.error(checkData.error || "Erro ao criar pagamento"); return; }
      trackInitiateCheckout(`MRO para Empresas - 30 dias - R$67`, totalAmount);
      window.location.href = checkData.payment_link;
    } catch (error) { toast.error("Erro ao processar. Tente novamente."); } finally { setLoading(false); }
  };

  useEffect(() => {
    const PROMO_DURATION = 7 * 60 * 60 * 1000;
    const STORAGE_KEY = 'renddx-promo:end-time';
    let promoEndTime: number;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      promoEndTime = stored ? parseInt(stored, 10) : Date.now() + PROMO_DURATION;
      if (!stored) localStorage.setItem(STORAGE_KEY, String(promoEndTime));
    } catch { promoEndTime = Date.now() + PROMO_DURATION; }
    const updateCountdown = () => {
      const diff = promoEndTime - Date.now();
      if (diff <= 0) { setPromoTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true }); return; }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setPromoTimeLeft({ hours, minutes, seconds, expired: false });
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleBump = (slug: string) => {
    setSelectedBumps(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden animate-in fade-in duration-1000">
      <style>{`
        .btn-pulse-yellow { background: linear-gradient(to right, #facc15, #eab308) !important; border: none; color: black !important; font-weight: 900 !important; animation: pulse-yellow 2s infinite; }
        @keyframes pulse-yellow { 0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(234, 179, 8, 0); } 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); } }
        .btn-pulse-green { position: relative; overflow: hidden; animation: pulse-green 2s infinite; transition: all 0.3s ease; }
        .btn-pulse-green::after { content: ""; position: absolute; top: -50%; left: -60%; width: 20%; height: 200%; background: rgba(255, 255, 255, 0.4); transform: rotate(30deg); animation: light-sweep 3s infinite; filter: blur(5px); }
        @keyframes light-sweep { 0% { left: -60%; } 30% { left: 150%; } 100% { left: 150%; } }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); } 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }
        @keyframes bounceArrowRight { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(8px); } }
        .arrow-bounce-right { animation: bounceArrowRight 1s ease-in-out infinite; }
      `}</style>
      
      {/* Lead Quiz Modal */}
      {showLeadQuiz && !isLeadSaved && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-xl p-4 overflow-hidden">
          <div className="max-w-xl w-full relative animate-in zoom-in-95 duration-500">
            {quizStep === 0 && (
              <div className="text-center space-y-8 p-6 sm:p-10">
                <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/40 rounded-full px-5 py-2 mb-2">
                  <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" /></span>
                  <span className="text-sm font-black tracking-widest text-green-400 uppercase">NOVA OPORTUNIDADE</span>
                </div>
                <h1 className="text-4xl sm:text-6xl font-black leading-tight">OFEREÇA SERVIÇOS PARA EMPRESAS</h1>
                <p className="text-xl sm:text-2xl text-zinc-300 font-medium">Utilize a MRO para empresas! Uma ferramenta profissional para otimizar sua rotina de trabalho.</p>
                <Button 
                  onClick={() => setQuizStep(1)}
                  className="w-full btn-pulse-yellow py-10 rounded-2xl text-2xl"
                >
                  AVANÇAR <ArrowRight className="ml-2 w-8 h-8 arrow-bounce-right" />
                </Button>
              </div>
            )}

            {quizStep === 1 && (
              <div className="space-y-8 p-6 sm:p-10">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Passo 01/03</span>
                  <User className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black">Qual o seu nome?</h2>
                <Input 
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="bg-zinc-900/50 border-zinc-800 h-20 text-xl sm:text-2xl rounded-2xl px-6 focus:border-green-500 transition-all"
                  autoFocus
                />
                <Button 
                  disabled={!leadName}
                  onClick={() => setQuizStep(2)}
                  className="w-full btn-pulse-yellow py-10 rounded-2xl text-2xl"
                >
                  AVANÇAR <ArrowRight className="ml-2 w-8 h-8 arrow-bounce-right" />
                </Button>
              </div>
            )}

            {quizStep === 2 && (
              <div className="space-y-8 p-6 sm:p-10">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Passo 02/03</span>
                  <Mail className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black">Qual o seu melhor e-mail?</h2>
                <Input 
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-zinc-900/50 border-zinc-800 h-20 text-xl sm:text-2xl rounded-2xl px-6 focus:border-green-500 transition-all"
                  autoFocus
                />
                <Button 
                  disabled={!leadEmail || !leadEmail.includes('@')}
                  onClick={() => setQuizStep(3)}
                  className="w-full btn-pulse-yellow py-10 rounded-2xl text-2xl"
                >
                  AVANÇAR <ArrowRight className="ml-2 w-8 h-8 arrow-bounce-right" />
                </Button>
              </div>
            )}

            {quizStep === 3 && (
              <div className="space-y-8 p-6 sm:p-10">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Passo 03/03</span>
                  <Phone className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black">Qual seu WhatsApp?</h2>
                <Input 
                  type="tel"
                  value={leadWhatsApp}
                  onChange={(e) => setLeadWhatsApp(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-zinc-900/50 border-zinc-800 h-20 text-xl sm:text-2xl rounded-2xl px-6 focus:border-green-500 transition-all"
                  autoFocus
                />
                <Button 
                  disabled={!leadWhatsApp || leadWhatsApp.length < 8 || loading}
                  onClick={handleLeadSubmit}
                  className="w-full btn-pulse-yellow py-10 rounded-2xl text-2xl"
                >
                  {loading ? <Loader2 className="animate-spin w-8 h-8 mx-auto" /> : (
                    <>
                      FINALIZAR E ENTRAR <Rocket className="ml-2 w-8 h-8 arrow-bounce-right" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {showDiscountEndedPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-2 border-red-500 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center relative animate-in zoom-in-95 duration-300 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2"><div className="bg-red-600 text-white font-bold px-4 py-1.5 rounded-full text-sm">⚠️ AVISO</div></div>
            <div className="mt-4 mb-6">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">ESSE DESCONTO ENCERROU!</h2>
              <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-2">ENTRE EM CONTATO COM WHATSAPP</p>
            </div>
            <Button onClick={() => window.location.href = 'https://maisresultadosonline.com.br/whatsapp'} className="w-full btn-pulse-yellow text-lg py-5 rounded-xl border border-gray-600">
              Falar com Suporte <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      <section className="relative pt-8 sm:pt-14 pb-12 sm:pb-20 px-3 sm:px-4 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-green-500/5 blur-[80px] sm:blur-[120px] rounded-full" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <img src={logoMro} alt="MRO" className="h-16 sm:h-20 md:h-28 mx-auto mb-6 sm:mb-8 object-contain drop-shadow-[0_0_30px_rgba(34,197,94,0.35)]" />
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md border border-green-500/30 rounded-full px-4 py-1.5 mb-5">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>
            <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-green-300 uppercase">Oferta liberada • Vagas limitadas</span>
          </div>
          <div className="relative mb-8 sm:mb-12">
            <h1 className="relative text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black mb-3 leading-tight tracking-tight text-white uppercase">UTILIZE A MRO PARA <span className="text-yellow-300">EMPRESAS!</span></h1>
            <p className="relative mt-4 text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">Software profissional de gestão e automação de marketing para <span className="text-green-300 font-semibold">empresas, agências e prestadores de serviço</span>. Organize processos, ganhe produtividade e atenda mais clientes.</p>
          </div>

          {/* Vídeo Principal e CTA R$97 / 30 dias */}
          <div className="max-w-4xl mx-auto mb-10 sm:mb-16 space-y-8">
            <div className="bg-zinc-900/40 border border-green-500/20 rounded-3xl p-4 sm:p-6 backdrop-blur-sm">
              <Suspense fallback={<div className="aspect-video w-full bg-zinc-900 animate-pulse rounded-xl" />}>
                <DiscountVideoPlayer email="public@renddx.com" nome="Visitante Renddx" />
              </Suspense>
              
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-zinc-400 text-sm uppercase font-bold tracking-widest">30 DIAS DE ACESSO COM SUPORTE INCLUSO</span>
                  <span className="text-zinc-500 text-base font-bold line-through">De R$147</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-green-500">R$</span>
                    <span className="text-6xl font-black text-green-500">67</span>
                    <span className="text-zinc-400 text-sm font-bold">/30 dias</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => pricingRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                  className="w-full sm:w-auto btn-pulse-yellow px-12 py-8 rounded-2xl text-xl shadow-[0_0_30px_rgba(234,179,8,0.4)] transition-all hover:scale-105 active:scale-95 group"
                >
                  QUERO CONHECER O MRO
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <p className="text-zinc-500 text-xs font-medium flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Pagamento 100% seguro via InfinitePay
                </p>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 sm:gap-3 bg-green-600/20 backdrop-blur-sm border border-green-500/40 rounded-full px-4 py-2.5">
            <Laptop className="w-4 h-4 text-green-300" />
            <span className="text-white font-semibold text-[11px] sm:text-sm tracking-wide">AUTOMATIZE TAREFAS E TENHA MAIS TEMPO PARA SEUS CLIENTES</span>
            <Rocket className="w-4 h-4 text-green-300" />
          </div>
        </div>
      </section>

      {/* Vídeo de Funcionamento */}
      <div className="py-10">
        <Suspense fallback={<div className="aspect-video w-full bg-zinc-900 animate-pulse rounded-xl" />}>
          <PromoToolVideoSection />
        </Suspense>
      </div>


      <section className="py-16 sm:py-20 px-3 sm:px-4 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-5xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2 mb-4">
            <Rocket className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-bold text-xs uppercase">Teste por 30 dias</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-4 uppercase">COMO FUNCIONA O <span className="text-green-400">MODELO DE SERVIÇO</span></h2>
          <p className="text-gray-300 text-sm sm:text-lg max-w-3xl mx-auto">Utilize a MRO para empresas: organize atendimentos, automatize tarefas e profissionalize sua operação.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800"><Monitor className="w-10 h-10 text-blue-500 mb-4" /><h3 className="font-bold mb-2">Instale no seu computador</h3><p className="text-gray-400 text-sm">Utilize o MRO no seu notebook ou desktop.</p></div>
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800"><Zap className="w-10 h-10 text-purple-500 mb-4" /><h3 className="font-bold mb-2">Aprenda a utilizar</h3><p className="text-gray-400 text-sm">Siga o treinamento e conheça os principais recursos da ferramenta.</p></div>
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800"><Users className="w-10 h-10 text-green-500 mb-4" /><h3 className="font-bold mb-2">Ofereça serviços</h3><p className="text-gray-400 text-sm">Utilize a ferramenta para criar e gerenciar serviços para empresas e clientes.</p></div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-3 sm:px-4 bg-black">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-6 uppercase">UMA FERRAMENTA PARA QUEM QUER TRABALHAR COM <span className="text-yellow-300">SERVIÇOS DIGITAIS</span></h2>
          <p className="text-gray-300 text-sm sm:text-lg max-w-3xl mx-auto mb-8">
            Com o MRO, você tem acesso a recursos que podem ajudar na execução de tarefas e no atendimento de empresas.
            Você decide como utilizar a ferramenta, quais serviços oferecer e quanto cobrar pelos seus serviços.
          </p>
          <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 inline-block text-left max-w-md mx-auto">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-green-500" /> Construa sua carteira de clientes</h3>
            <p className="text-gray-400 text-sm">Defina seus próprios preços e condições comerciais de acordo com os serviços que oferecer.</p>
          </div>
        </div>
      </section>

      {/* CTA Adicional Superior */}
      <section className="py-10 text-center">
          <Button onClick={() => pricingRef.current?.scrollIntoView({ behavior: 'smooth' })} className="btn-pulse-yellow px-10 py-8 rounded-2xl text-xl">
            COMECE A UTILIZAR A FERRAMENTA <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
      </section>

      <section ref={pricingRef} className="py-16 sm:py-24 px-3 sm:px-4 bg-zinc-950">
        <div className="max-w-md mx-auto bg-zinc-900 border-2 border-green-500 rounded-3xl p-8 text-center relative shadow-[0_0_40px_rgba(34,197,94,0.2)]">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-black font-black px-6 py-1 rounded-full text-xs">OFERTA EXCLUSIVA</div>
          <h3 className="text-2xl font-bold mb-4">ACESSO COMPLETO AO MRO</h3>
          <div className="text-zinc-400 text-sm font-bold mb-2 uppercase tracking-widest">Plano 30 Dias</div>
          <div className="flex flex-col items-center mb-2">
            <span className="text-zinc-500 text-sm line-through">De R$147</span>
            <div className="text-5xl font-black text-green-400">R$67</div>
          </div>
          <p className="text-zinc-400 mb-6">30 dias de acesso • suporte já incluso</p>
          <ul className="text-left space-y-3 mb-8 text-zinc-300 text-sm">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 12 contas fixas + 5 testes (Total 17)</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Passo a passo completo de uso</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Treinamento de gestão para empresas</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Suporte incluso via WhatsApp</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Acesso imediato (30 dias)</li>
          </ul>
          <Button onClick={() => setShowCheckoutModal(true)} className="w-full bg-green-500 hover:bg-green-600 text-black font-black py-6 rounded-xl text-lg btn-pulse-green shadow-[0_0_20px_rgba(34,197,94,0.2)]">QUERO ACESSAR O MRO</Button>
        </div>
      </section>

      {/* CTA Adicional Inferior */}
      <section className="pb-20 text-center">
          <Button onClick={() => pricingRef.current?.scrollIntoView({ behavior: 'smooth' })} className="btn-pulse-yellow px-10 py-8 rounded-2xl text-xl">
            VEJA COMO A FERRAMENTA FUNCIONA NA PRÁTICA <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
      </section>

      {showCheckoutModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowCheckoutModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Finalize seu Cadastro</h3>
              <p className="text-zinc-400 text-sm">Resumo do pedido: <span className="text-green-400 font-bold">R$ {totalAmount.toFixed(2).replace('.', ',')}</span></p>
            </div>

            <form onSubmit={handleCheckout} className="space-y-6">
              <div className="space-y-4">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="bg-zinc-900 border-zinc-800 h-12" required />
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp" className="bg-zinc-900 border-zinc-800 h-12" required />
                <Input type="text" value={username} onChange={(e) => validateUsername(e.target.value)} placeholder="Usuário (login)" className="bg-zinc-900 border-zinc-800 h-12" required />
                {usernameError && <p className="text-red-400 text-xs">{usernameError}</p>}
              </div>

              {/* Order Bumps Section */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h4 className="text-xs font-black text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
                  Aproveite as ofertas
                </h4>
                
                {loadingProducts ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-700" />
                  </div>
                ) : products.map((prod) => (
                  <div 
                    key={prod.id}
                    onClick={() => toggleBump(prod.slug)}
                    className={`group relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer p-3 ${
                      selectedBumps.includes(prod.slug) 
                        ? 'border-green-500 bg-green-500/5' 
                        : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-sm leading-tight">{prod.title}</h5>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors relative ${
                            selectedBumps.includes(prod.slug) ? 'bg-green-500 border-green-500' : 'border-zinc-700'
                          }`}>
                            {selectedBumps.includes(prod.slug) ? (
                              <Check className="w-3 h-3 text-black font-bold" />
                            ) : (
                              <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                                <MousePointer2 className="w-4 h-4 text-green-400 animate-pulse opacity-50" />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">{prod.description}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <p className="text-green-400 font-black text-xs">
                            + R$ {Number(prod.price).toFixed(2).replace('.', ',')}
                          </p>
                          <span className="text-[8px] text-red-500 font-bold uppercase px-1 py-0.5 bg-red-500/10 rounded">
                            {prod.plan_type === 'anual' ? 'Anual' : prod.plan_type === 'mensal' ? 'Mensal' : 'Vitalício'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-black font-black py-7 text-lg rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] btn-checkout-green">
                {loading ? <Loader2 className="animate-spin w-6 h-6" /> : `COMPRAR AGORA`}
              </Button>
            </form>
          </div>
        </div>
      )}

      <footer className="py-12 px-4 text-center text-zinc-600 text-[10px] sm:text-xs border-t border-zinc-900 space-y-4">
        <p>© 2025 MRO - Mais Resultados Online. Todos os direitos reservados.</p>
        <div className="max-w-4xl mx-auto leading-relaxed opacity-50">
          <p>
            ESTE SITE NÃO É DO FACEBOOK: Este site não faz parte do site do Facebook ou do Facebook Inc. 
            Além disso, este site NÃO é endossado pelo Facebook de forma alguma. FACEBOOK é uma marca comercial da FACEBOOK, Inc.
          </p>
          <p className="mt-2">
            Os resultados podem variar e não são garantidos. As informações fornecidas nesta página são apenas para fins educacionais. 
            Não garantimos ganhos financeiros e qualquer investimento é de inteira responsabilidade do usuário.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Renddx;
