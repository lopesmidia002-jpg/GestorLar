# Guia de Execução com Docker — GestorLar PWA

Este projeto está 100% conteinerizado utilizando **Docker** e **Docker Compose**, pronto para execução em produção com servidor web de alta performance (**Nginx**) ou em desenvolvimento com Hot Module Replacement (**Vite HMR**).

---

## 1. Estrutura dos Arquivos Docker

- **[`Dockerfile`](file:///c:/Users/Nilto/OneDrive/Documentos/App%20financeiro/Dockerfile)**: Multi-stage build (Node 22 Alpine para compilação + Nginx Alpine para servir os arquivos estáticos de produção com compressão Gzip e cabeçalhos de segurança).
- **[`docker-compose.yml`](file:///c:/Users/Nilto/OneDrive/Documentos/App%20financeiro/docker-compose.yml)**: Orquestração do container de produção na porta `3000` (ou customizável via variável `PORT`), com injeção automática das variáveis do [`.env`](file:///c:/Users/Nilto/OneDrive/Documentos/App%20financeiro/.env) e healthcheck nativo.
- **[`nginx.conf`](file:///c:/Users/Nilto/OneDrive/Documentos/App%20financeiro/nginx.conf)**: Configuração otimizada para Single Page Application (SPA), cache imutável de 1 ano para assets versionados do Vite, compressão gzip e endpoint `/healthz`.
- **[`Dockerfile.dev`](file:///c:/Users/Nilto/OneDrive/Documentos/App%20financeiro/Dockerfile.dev)** & **[`docker-compose.dev.yml`](file:///c:/Users/Nilto/OneDrive/Documentos/App%20financeiro/docker-compose.dev.yml)**: Ambiente conteinerizado de desenvolvimento com recarregamento ao vivo na porta `5173`.
- **[`.dockerignore`](file:///c:/Users/Nilto/OneDrive/Documentos/App%20financeiro/.dockerignore)**: Exclusão de `node_modules`, `dist`, logs e arquivos desnecessários para builds rápidos e leves.

---

## 2. Comandos Rápidos

### Modo Produção (Nginx de Alta Performance)
```bash
# Iniciar o container em segundo plano
docker compose up -d

# Visualizar logs em tempo real
docker compose logs -f

# Parar o container
docker compose down

# Reconstruir a imagem após alterações
docker compose build --no-cache
```

Ou via scripts do `npm`:
```bash
npm run docker:up
npm run docker:logs
npm run docker:down
npm run docker:build
```

Acesse a aplicação em: **`http://localhost:3000/`**

---

### Modo Desenvolvimento Conteinerizado (com Live Reload)
```bash
docker compose -f docker-compose.dev.yml up
```
Ou:
```bash
npm run docker:dev
```
Acesse a aplicação em: **`http://localhost:5173/`**

---

## 3. Conexão com o Supabase

O container consome as credenciais definidas no arquivo [`.env`](file:///c:/Users/Nilto/OneDrive/Documentos/App%20financeiro/.env):
```env
VITE_SUPABASE_URL=https://xgdzyqfalbibzelpdpvr.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_mlcPsXMP2mAeDT8peciIkQ_8167Spvk
```
As variáveis são injetadas durante o build do Vite e os dados persistem em modo **Local-First** no navegador, sincronizando com a nuvem do Supabase quando houver conexão ativa.
