FROM node:20-alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Instalar dependências primeiro (camada de cache otimizada)
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Copiar código fonte
COPY src/ ./src/

# Usuário sem privilégios de root (segurança)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "src/app.js"]
