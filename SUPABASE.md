# Configurando o Supabase (contas + mesas)

Sem estas envs o app roda em **modo local** (sem login, mesa única `/mesa/demo`).

## Passo a passo (~5 min)

1. Crie a conta/projeto em [supabase.com](https://supabase.com) → **New project**
   - Region: **South America (São Paulo)**
   - Guarde a senha do banco (não vamos precisar dela no app)
2. No painel do projeto: **SQL Editor → New query** → cole o conteúdo de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → **Run**
   - Deve terminar com "Success. No rows returned"
3. **Project Settings → API** e copie:
   - `Project URL`
   - `anon public` key
4. Crie o arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SYNC_URL=ws://localhost:1234
```

5. Reinicie o `npm run dev` → a rota `/` agora exige login.

## E-mail de confirmação (opcional, recomendado deixar ligado)

Por padrão o Supabase exige confirmação por e-mail no cadastro. Para desligar
em desenvolvimento: **Authentication → Providers → Email → Confirm email** (off).

## No deploy (Vercel)

Configure as mesmas variáveis em **Settings → Environment Variables** do projeto,
trocando `VITE_SYNC_URL` pela URL `wss://` do servidor de produção.
