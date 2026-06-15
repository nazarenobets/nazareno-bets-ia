# Nazareno Bets IA Web 3.4 — Checklist Final

## Etapa 1 — Supabase
1. Criar conta no Supabase.
2. Criar novo projeto.
3. Ir em SQL Editor.
4. Abrir o arquivo:
   `database/supabase_schema.sql`
5. Copiar tudo e executar.
6. Copiar:
   - Project URL
   - Service Role Key

## Etapa 2 — Render ou Railway
Recomendação inicial: **Render**.

Configuração:
- Build Command:
```bash
npm install
```

- Start Command:
```bash
npm start
```

Variáveis obrigatórias:
```env
NODE_ENV=production
APP_DOMAIN=nazarenobets.com
API_FOOTBALL_KEY=sua_chave_api_football
SPORTMONKS_TOKEN=seu_token_sportmonks
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
ADMIN_USER=admin
ADMIN_PASS=troque_essa_senha
```

## Etapa 3 — Testar link temporário
Antes do domínio:
- abrir link gerado pelo Render/Railway;
- testar login;
- testar buscar jogos;
- testar salvar banca;
- testar histórico.

## Etapa 4 — Domínio
No provedor onde comprou `nazarenobets.com`:
- adicionar os DNS mostrados pelo Render/Railway;
- aguardar propagação.

## Resultado
Depois disso:
- não precisa mais tela preta;
- não precisa localhost;
- acessa pelo celular;
- acessa pelo domínio.
