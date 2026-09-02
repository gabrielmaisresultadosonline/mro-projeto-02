import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Users, X, ChevronRight, Loader2, Camera, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { storageAssetUrl } from '@/lib/assetUrl';

interface ActiveClient {
  username: string;
  profilePicture: string;
  followers: number;
}

interface ActiveClientsResponse {
  success: boolean;
  clients: ActiveClient[];
  total: number;
  hasMore: boolean;
  error?: string;
}

interface ActiveClientsSectionProps {
  title?: string;
  maxClients?: number;
  className?: string;
  showRegistration?: boolean;
}

const formatFollowers = (count: number): string => {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toLocaleString('pt-BR');
};

const PAGE_SIZE = 96;

export default function ActiveClientsSection({
  title = 'Clientes Ativos',
  maxClients = 15,
  className = '',
  showRegistration = true
}: ActiveClientsSectionProps) {
  const navigate = useNavigate();
  const [previewClients, setPreviewClients] = useState<ActiveClient[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalClients, setModalClients] = useState<ActiveClient[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const remaining = useMemo(() => Math.max(0, total - previewClients.length), [total, previewClients.length]);

  const handleImageError = (username: string) => {
    setImageErrors(prev => {
      const next = new Set(prev);
      next.add(username);
      return next;
    });
  };

  const fetchPage = async (limit: number, offset: number) => {
    const { data, error } = await supabase.functions.invoke<ActiveClientsResponse>('get-active-clients', {
      body: { limit, offset }
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Falha ao carregar clientes');
    return data;
  };

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchPage(maxClients, 0);
        setPreviewClients(data.clients);
        setTotal(data.total);
      } catch (e) {
        console.error('Error fetching active clients:', e);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [maxClients]);

  const openModal = async () => {
    setShowModal(true);
    if (modalClients.length > 0) return;

    setIsLoadingMore(true);
    try {
      const data = await fetchPage(PAGE_SIZE, 0);
      setModalClients(data.clients);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (e) {
      console.error('Error fetching active clients (modal):', e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const data = await fetchPage(PAGE_SIZE, modalClients.length);
      setModalClients(prev => [...prev, ...data.clients]);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (e) {
      console.error('Error loading more clients:', e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const onModalScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) {
      loadMore();
    }
  };

  const renderAvatarInner = (client: ActiveClient) => {
    const hasError = imageErrors.has(client.username);

    // If image is from our cache and hasn't errored, always show it
    const isCached = client.profilePicture?.includes('profile-cache/profiles/');
    
    if (hasError || !client.profilePicture) {
      return (
        <div className="w-full h-full rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-black font-bold text-lg">
          {client.username.substring(0, 2).toUpperCase()}
        </div>
      );
    }

    // For cached images, append timestamp to bypass browser cache issues
    const normalizedPicture = storageAssetUrl(client.profilePicture);
    const imgSrc = isCached
      ? `${normalizedPicture}?t=${Date.now() % 86400000}` // Cache bust daily
      : normalizedPicture;

    return (
      <img
        src={imgSrc}
        alt={`@${client.username}`}
        className="w-full h-full object-cover"
        loading="lazy"
        crossOrigin="anonymous"
        onError={() => handleImageError(client.username)}
      />
    );
  };

  if (isLoading) {
    return (
      <div className={`py-8 ${className}`}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Users className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl md:text-2xl font-bold text-white">{title}</h3>
        </div>
        <div className="flex justify-center">
          <div className="animate-pulse flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-16 h-16 bg-gray-700 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (total === 0) return null;

  return (
    <>
      <div className={`py-8 ${className}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Users className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl md:text-2xl font-bold text-white">{title}</h3>
          <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-sm font-medium">
            {total}
          </span>
        </div>

        <p className="text-center text-gray-400 text-xs mb-6">
          Mostrando {previewClients.length} de {total} perfis{remaining > 0 ? ` (+${remaining})` : ''}
        </p>

        <div className="overflow-hidden">
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-5xl mx-auto px-4">
            {previewClients.map((client, index) => (
              <div
                key={client.username}
                className="flex flex-col items-center group"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="relative">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-yellow-400/50 group-hover:border-yellow-400 transition-all duration-300 group-hover:scale-110">
                    {renderAvatarInner(client)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-gray-900" title="Ativo" />
                </div>

                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-300 truncate max-w-[70px] md:max-w-[90px]">
                    @{client.username}
                  </p>
                  <p className="text-xs text-yellow-400 font-semibold">
                    {formatFollowers(client.followers)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {total > previewClients.length && (
          <div className="flex justify-center mt-6">
            <Button
              onClick={openModal}
              variant="outline"
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-400"
            >
              Ver todos ({total})
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {showRegistration && (
          <div className="mt-8 flex flex-col items-center gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 rounded-2xl p-6 max-w-2xl mx-auto shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3 text-amber-400">
              <Camera className="w-5 h-5" />
              <p className="text-sm font-medium">📸 Após cadastrar, envie um print do perfil para análise completa com I.A.</p>
            </div>
            <Button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold px-8 py-6 rounded-xl text-lg transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20"
            >
              <Instagram className="w-5 h-5 mr-2" />
              Cadastrar Instagram
            </Button>
          </div>
        )}

        {showRegistration && (
          <p className="text-center text-gray-400 text-sm mt-6">
            Perfis utilizando nossa inteligência artificial
          </p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl max-h-[82vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-bold text-white">Todos os Clientes Ativos</h3>
                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full text-sm font-medium">
                  {total}
                </span>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div
              ref={scrollRef}
              onScroll={onModalScroll}
              className="p-4 overflow-y-auto max-h-[66vh]"
            >
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {modalClients.map((client) => (
                  <div key={client.username} className="flex flex-col items-center group">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-yellow-400/50 group-hover:border-yellow-400 transition-all duration-300">
                        {renderAvatarInner(client)}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-gray-900" />
                    </div>

                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-300 truncate max-w-[90px]">@{client.username}</p>
                      <p className="text-xs text-yellow-400 font-semibold">{formatFollowers(client.followers)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {isLoadingMore && (
                <div className="flex items-center justify-center gap-2 mt-6 text-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Carregando mais...</span>
                </div>
              )}

              {!isLoadingMore && hasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    onClick={loadMore}
                    variant="outline"
                    className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-400"
                  >
                    Carregar mais
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
