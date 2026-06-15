# Publicar Nazareno Bets IA Web 3.3 no Render

## 1. Criar conta no Render
Acesse render.com e crie sua conta.

## 2. Criar novo Web Service
- New +
- Web Service
- Upload/ligar este projeto por GitHub

## 3. Configurações
Build Command:
```bash
npm install
```

Start Command:
```bash
npm start
```

## 4. Variáveis de ambiente
Configure no Render:

```env
NODE_ENV=production
APP_DOMAIN=nazarenobets.com
API_FOOTBALL_KEY=sua_chave
SPORTMONKS_TOKEN=seu_token
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
ADMIN_USER=admin
ADMIN_PASS=troque_essa_senha
```

## 5. Domínio
Depois que o Render gerar o link, vá em:
Settings > Custom Domains

Adicione:
```text
nazarenobets.com
www.nazarenobets.com
```

O Render vai mostrar os registros DNS que você precisa colocar no local onde comprou o domínio.

## 6. Depois de publicar
Você acessa pelo navegador, sem tela preta.
