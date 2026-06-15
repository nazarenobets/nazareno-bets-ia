# Passo a passo Render

1. Acesse https://render.com
2. Crie uma conta.
3. Clique em New +.
4. Escolha Web Service.
5. Suba o projeto pelo GitHub ou upload.
6. Configure:

Build Command:
```bash
npm install
```

Start Command:
```bash
npm start
```

7. Em Environment, adicione as variáveis do arquivo:
   `VARIAVEIS_DE_AMBIENTE.txt`

8. Clique em Deploy.
9. Abra o link temporário gerado.
10. Teste a plataforma.

Depois disso, adicione o domínio:
- Settings
- Custom Domains
- nazarenobets.com
