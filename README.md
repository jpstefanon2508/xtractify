# Xtractify Next.js

Versao online do Xtractify preparada para Vercel, GitHub e Supabase.

## Estado atual

- App Next.js com App Router.
- Interface e logica do prototipo local preservadas em `public/assets`.
- Tela de login/cadastro, dashboard, apropriacao, cadastros, usuarios e perfil disponiveis como primeira versao online.
- Migrations Supabase preparadas em `supabase/migrations`.
- Cliente Supabase preparado em `lib/supabase`.

Nesta primeira etapa, a UI ainda usa a logica local existente para preservar o funcionamento. A proxima etapa e trocar a persistencia do navegador por Supabase Auth + Postgres.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Variaveis de ambiente

Copie `.env.example` para `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=server-only-never-expose-in-browser
```

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no cliente.

## Supabase

1. Crie um projeto Supabase.
2. Execute as migrations em ordem:
   - `supabase/migrations/0001_core_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/migrations/0003_storage_policies.sql`
3. Crie o primeiro usuario no Supabase Auth.
4. Rode `supabase/bootstrap_first_developer.sql` com o UUID do usuario criado.

Depois disso, novos usuarios poderao ficar pendentes e o desenvolvedor podera aprovar/cancelar e definir o perfil.

## Deploy Vercel + GitHub

Fluxo recomendado:

1. Criar repositorio no GitHub.
2. Enviar a pasta `xtractify-next`.
3. Importar o repositorio na Vercel.
4. Configurar as variaveis de ambiente no projeto Vercel.
5. Usar branch `main` para producao e branches/PRs para previews.

Vercel detecta Next.js automaticamente. O arquivo `vercel.json` deixa os comandos explicitos.

## Checagem

Endpoint de saude:

```text
/api/health
```
