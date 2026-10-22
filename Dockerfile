# ========================================================
# GESTORLAR - DOCKERFILE MULTI-STAGE DE ALTA PERFORMANCE
# ========================================================

# Etapa 1: Compilação dos Assets (Node.js)
FROM node:22-alpine AS builder

WORKDIR /app

# Instalação de dependências limpa
COPY package.json package-lock.json ./
RUN npm ci

# Cópia do código fonte
COPY . .

# Argumentos de Build para injeção de variáveis de ambiente do Supabase
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Compilação de Produção
RUN npm run build

# ========================================================
# Etapa 2: Servidor Nginx Otimizado de Produção
# ========================================================
FROM nginx:alpine AS runner

# Remover configuração padrão
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copiar configuração customizada de SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar bundle de produção do Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Exposição da porta HTTP
EXPOSE 80

# Healthcheck nativo
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
