# Xtractify Security Checklist

## Corrigido nesta revisao

- Login e cadastro usam `method="post"` para evitar credenciais na URL.
- URLs com `email`, `password`, `senha`, `access_token` ou `refresh_token` sao limpas no Next proxy e no navegador.
- Sessoes do Supabase ficam em `sessionStorage`, nao em `localStorage`.
- Usuario nao desenvolvedor nao consegue alternar a visao para desenvolvedor no frontend.
- A policy que permitia usuario atualizar o proprio `user_profiles` foi removida.
- Perfis novos sao criados apenas pelo trigger de Auth e aprovados por desenvolvedor.
- Todas as tabelas publicas seguem com RLS ligado.
- Grants anonimos e grants herdados via `PUBLIC` foram removidos do schema `public`.
- Funcoes usadas por RLS receberam `search_path` fixo.
- Headers de seguranca foram adicionados no Next/Vercel.

## Pendente no painel do Supabase

Ativar protecao contra senhas vazadas:

1. Acesse Supabase.
2. Abra o projeto Xtractify.
3. Va em Authentication > Providers ou Authentication > Security.
4. Ative a opcao de leaked password protection / HaveIBeenPwned.

O Supabase Advisor ainda aponta esse item enquanto ele estiver desligado.

## Recomendacao operacional

Como uma senha chegou a aparecer na URL durante testes, altere a senha dessa conta no Supabase/Auth ou pelo fluxo de recuperacao de senha antes de usar o app com dados reais.
