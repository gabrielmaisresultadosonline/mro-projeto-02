# Corrigir uploads e ações administrativas

## Objetivo
Remover os bloqueios de criação, listagem e upload em `/admin` e `/adminusuario`, mantendo autenticação e proteção fora dos painéis administrativos.

## Implementação
1. Corrigir a ordem das rotas do storage local para que `list`, assinatura e operações administrativas não sejam confundidas com upload genérico.
2. Fazer o storage reconhecer a sessão administrativa (`mro_admin_session`) nas requisições e permitir aos admins autenticados criar/listar/enviar/remover arquivos em qualquer bucket necessário, sem abrir escrita pública.
3. Tornar uploads robustos para `multipart/form-data` e corpo binário, criar diretórios automaticamente e devolver erros claros; ajustar permissões do diretório de uploads no deploy para o usuário do PM2.
4. Corrigir a função `user-cloud-storage` no backend local e garantir que as ações administrativas enviem a sessão de admin, evitando o erro 500 ao carregar usuários PRO.
5. Normalizar URLs antigas de imagens de perfil nas telas administrativas para o storage local, eliminando referências a hosts Supabase desativados.
6. Adicionar uma migração idempotente para os buckets/tabelas necessários e validar rotas críticas no próprio `deploy.sh` antes de concluir o corte.

## Resultado esperado
- Listagem de `user-data` deixa de retornar 403.
- Upload em `assets/announcements` e demais gerenciadores administrativos funciona.
- Usuários PRO carregam sem erro 500.
- Avatares e capas antigas usam a URL local.
- Usuários comuns continuam sem permissão de escrita administrativa.
