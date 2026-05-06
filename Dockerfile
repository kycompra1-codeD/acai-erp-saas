# Estágio de Build
FROM node:20-alpine AS build

WORKDIR /app

# Copiar apenas os arquivos de dependências primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install

# Copiar o restante do código e gerar o build de produção
COPY . .
RUN npm run build

# Estágio de Produção (Nginx)
FROM nginx:stable-alpine

# Copiar os arquivos estáticos do estágio de build para o diretório do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração customizada para lidar com rotas do React (SPA)
# Redireciona todas as requisições para o index.html para que o React Router assuma
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    error_page 500 502 503 504 /50x.html; \
    location = /50x.html { \
        root /usr/share/nginx/html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
