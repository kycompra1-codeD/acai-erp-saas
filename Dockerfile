# Estágio de Build
FROM node:20-alpine AS build

# Definir o diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
# Usar curinga para garantir que package.json e package-lock.json sejam copiados
COPY package*.json ./

# Instalar dependências (usando install em vez de ci para maior flexibilidade com legacy-peer-deps)
RUN npm install --legacy-peer-deps

# Copiar o restante do código-fonte
COPY . .

# Variáveis de build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Gerar o build de produção
RUN npm run build

# Estágio de Produção (Nginx)
FROM nginx:stable-alpine

# Metadados da imagem
LABEL maintainer="Zullya ERP Team"
LABEL version="1.0.0"

# Copiar os arquivos estáticos do estágio de build para o diretório do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração customizada para o Nginx (SPA handling)
RUN printf "server { \n\
    listen 80; \n\
    location / { \n\
        root /usr/share/nginx/html; \n\
        index index.html index.htm; \n\
        try_files \$uri \$uri/ /index.html; \n\
    } \n\
    location ~* \\.html\$ { \n\
        root /usr/share/nginx/html; \n\
        try_files \$uri /index.html; \n\
        add_header Cache-Control \"no-store, no-cache, must-revalidate\"; \n\
        add_header Pragma \"no-cache\"; \n\
        expires 0; \n\
    } \n\
    location /assets/ { \n\
        root /usr/share/nginx/html; \n\
        add_header Cache-Control \"public, max-age=31536000, immutable\"; \n\
    } \n\
    error_page 500 502 503 504 /50x.html; \n\
    location = /50x.html { \n\
        root /usr/share/nginx/html; \n\
    } \n\
}" > /etc/nginx/conf.d/default.conf

# Expor a porta padrão do Nginx
EXPOSE 80

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
