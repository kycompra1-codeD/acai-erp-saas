# 🚀 Guia Completo de Deploy - Açaí ERP na VPS Hostinger

## Pré-requisitos

- VPS Hostinger com **Ubuntu 24.04 LTS**
- Mínimo: **4 GB RAM, 2 vCPUs, 80 GB SSD**
- Acesso SSH à VPS
- Domínio apontando para o IP da VPS (ex: `app.seudominio.com.br`)

---

## Passo 1: Acessar a VPS via SSH

No seu computador (Windows), abra o **PowerShell** ou **Terminal** e conecte:

```bash
ssh root@SEU_IP_VPS
# Ex: ssh root@168.119.123.45
```

> A senha SSH está no painel da Hostinger → VPS → "Credenciais de acesso"

---

## Passo 2: Atualizar o sistema e instalar utilitários

```bash
apt update && apt upgrade -y
apt install -y git curl wget ufw fail2ban htop
```

---

## Passo 3: Instalar Docker e Docker Compose

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verificar instalação
docker --version
docker compose version

# Permitir Docker rodar sem sudo (opcional)
usermod -aG docker $USER
```

---

## Passo 4: Configurar Firewall (UFW)

```bash
# Configurar firewall - permite apenas o necessário
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh          # Porta 22 (SSH)
ufw allow 80/tcp       # HTTP
ufw allow 443/tcp      # HTTPS
ufw allow 81/tcp       # Nginx Proxy Manager (painel)
ufw allow 9000/tcp     # Portainer (painel Docker)
ufw allow 3002/tcp     # Uptime Kuma (monitoramento)
ufw enable

# Verificar regras
ufw status
```

---

## Passo 5: Instalar Fail2Ban (Proteção Brute Force)

```bash
systemctl enable fail2ban
systemctl start fail2ban
fail2ban-client status
```

---

## Passo 6: Clonar o Repositório

```bash
# Criar pasta de projetos
mkdir -p /opt/zullya-erp
cd /opt/zullya-erp

# Clonar do GitHub
git clone https://github.com/SEU_USUARIO/zullya-erp.git .

# Ou fazer upload via SFTP e descompactar
```

---

## Passo 7: Configurar as Variáveis de Ambiente

```bash
# Criar o arquivo .env a partir do template
cp .env.example .env

# Editar o arquivo com suas senhas e chaves
nano .env
```

### Gerar senhas JWT seguras (execute no terminal):

```bash
# Gerar JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Gerar JWT_REFRESH_SECRET (execute de novo)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Preencha no `.env`:
- `DB_PASSWORD` → Senha forte para o PostgreSQL
- `REDIS_PASSWORD` → Senha forte para o Redis
- `JWT_SECRET` → Cole o resultado do primeiro comando acima
- `JWT_REFRESH_SECRET` → Cole o resultado do segundo comando acima
- `FRONTEND_URL` → `https://app.seudominio.com.br`
- `RRPAY_WEBHOOK_SECRET` → Chave do painel do RRPay
- `BACKUP_*` → Credenciais do Backblaze B2 ou AWS S3

---

## Passo 8: Fazer o Deploy com Docker Compose

```bash
# Subir todos os containers (primeiro build — pode demorar 3-5 min)
docker compose up -d --build

# Ver se todos estão rodando
docker compose ps

# Ver logs em tempo real (Ctrl+C para sair)
docker compose logs -f

# Ver log de um serviço específico
docker compose logs -f backend
docker compose logs -f postgres
```

**Saída esperada** (todos com status "running"):
```
NAME                STATUS
acai-backend        running
acai-postgres       running (healthy)
acai-redis          running (healthy)
acai-frontend       running
acai-nginx-proxy    running
acai-portainer      running
acai-backup         running
acai-monitor        running
```

---

## Passo 9: Configurar Nginx Proxy Manager (SSL + Domínios)

### 9.1. Acessar o painel

Abra no navegador: `http://SEU_IP_VPS:81`

**Login padrão (primeira vez):**
- Email: `admin@example.com`
- Senha: `changeme`

> ⚠️ **TROQUE A SENHA imediatamente após o primeiro login!**

### 9.2. Criar Proxy Hosts (Domínios)

Clique em **"Proxy Hosts"** → **"Add Proxy Host"**:

#### Para o Frontend (app principal):
| Campo | Valor |
|-------|-------|
| Domain Names | `app.seudominio.com.br` |
| Scheme | `http` |
| Forward Hostname/IP | `acai-frontend` |
| Forward Port | `80` |
| SSL Certificate | Request a new SSL Certificate (Let's Encrypt) |
| Force SSL | ✅ Sim |
| HTTP/2 Support | ✅ Sim |

#### Para o Backend (API):
| Campo | Valor |
|-------|-------|
| Domain Names | `api.seudominio.com.br` |
| Scheme | `http` |
| Forward Hostname/IP | `acai-backend` |
| Forward Port | `3001` |
| SSL Certificate | Request a new SSL Certificate |
| Force SSL | ✅ Sim |

> O Nginx Proxy Manager vai gerar certificados HTTPS gratuitos automaticamente via Let's Encrypt!

---

## Passo 10: Configurar Portainer

Acesse: `http://SEU_IP_VPS:9000`

- Na primeira vez, defina uma senha de administrador.
- Selecione **"Local"** → **"Connect"**
- Agora você tem um painel visual para:
  - Ver e reiniciar containers
  - Monitorar CPU/RAM
  - Ver logs
  - Atualizar imagens

---

## Passo 11: Configurar Uptime Kuma (Monitoramento)

Acesse: `http://SEU_IP_VPS:3002`

- Crie uma conta
- Adicione monitores para:
  - `https://app.seudominio.com.br` (Frontend)
  - `https://api.seudominio.com.br/health` (Backend)
  - Configure notificações por e-mail ou Telegram

---

## Passo 12: Testar o Deploy

```bash
# Testar se o backend está respondendo
curl https://api.seudominio.com.br/health

# Resposta esperada:
# {"status":"ok","servico":"Açaí ERP Backend","versao":"1.0.0",...}
```

---

## Passo 13: Configurar o Webhook do RRPay

No painel do **RRPay**:
1. Vá em **Configurações → Webhooks**
2. Adicione a URL: `https://api.seudominio.com.br/api/webhooks/rrpay`
3. Copie o `Webhook Secret` e cole no seu `.env` como `RRPAY_WEBHOOK_SECRET`
4. Reinicie o backend: `docker compose restart backend`

---

## Comandos Úteis do Dia a Dia

```bash
# Ver status de todos os containers
docker compose ps

# Reiniciar um serviço
docker compose restart backend
docker compose restart frontend

# Atualizar código após commit no GitHub
git pull origin main
docker compose up -d --build backend frontend

# Ver logs de um serviço
docker compose logs -f backend

# Parar tudo
docker compose down

# Parar e apagar dados (CUIDADO!)
docker compose down -v

# Ver uso de recursos
docker stats

# Entrar dentro de um container (debug)
docker compose exec backend sh
docker compose exec postgres psql -U zullya_erp_user -d zullya_erp
```

---

## Verificar Backups

```bash
# Ver logs do serviço de backup
docker compose logs pg-backup

# O backup roda todo dia à meia-noite automaticamente
# Verifique no painel do Backblaze/S3 se os arquivos estão chegando
```

---

## Arquitetura Final na VPS

```
INTERNET
    │
    ▼
[Nginx Proxy Manager]  :80/:443
    │
    ├── app.seudominio.com.br ──► [Frontend Container] (React + Nginx)
    │
    └── api.seudominio.com.br ──► [Backend Container] (Node.js :3001)
                                        │
                                   [Redis Container]
                                        │
                                  [PostgreSQL Container]
                                        │
                                  [Backup Container] ──► [Backblaze/S3 Cloud]

[Portainer]  :9000  (Gerenciamento Docker)
[Uptime Kuma] :3002 (Monitoramento)
```

---

## Segurança: Pontos Importantes

- ✅ **Nunca** exponha as portas do PostgreSQL (5432) e Redis (6379) na internet
- ✅ Use senhas fortes e únicas para cada serviço
- ✅ Faça backup dos seus arquivos `.env` em local seguro (jamais no Git)
- ✅ O Fail2Ban bloqueia automaticamente tentativas de brute force no SSH
- ✅ Troque a porta SSH padrão (22) por uma porta alta (ex: 2222):
  ```bash
  nano /etc/ssh/sshd_config
  # Mude: Port 22 → Port 2222
  systemctl restart sshd
  # Atualize o UFW: ufw allow 2222/tcp && ufw delete allow ssh
  ```

---

## Deploy Automático com GitHub Actions (CD)

O workflow `.github/workflows/main.yml` inclui um job `deploy` que faz SSH na VPS e executa o deploy automaticamente a cada push na branch `main`.

### Pré-requisitos no GitHub

Vá em **GitHub → Settings → Secrets and variables → Actions** e adicione:

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | IP da sua VPS (ex: `168.119.123.45`) |
| `VPS_USER` | Usuário SSH (ex: `root`) |
| `VPS_SSH_KEY` | Conteúdo da chave privada SSH (ver abaixo) |
| `VPS_SSH_PORT` | Porta SSH (ex: `2222`, ou omitir para usar `22`) |

### Gerar chave SSH para o Deploy

Na VPS, execute:

```bash
# Gerar chave SSH dedicada para deploy
ssh-keygen -t ed25519 -C "github-actions-deploy" -f /root/.ssh/deploy_key -N ""

# Autorizar a chave pública
cat /root/.ssh/deploy_key.pub >> /root/.ssh/authorized_keys

# Exibir a chave PRIVADA (copie tudo — incluindo as linhas BEGIN/END)
cat /root/.ssh/deploy_key
```

Cole o conteúdo da chave privada no secret `VPS_SSH_KEY` no GitHub.

### Configurar environment "production" no GitHub

1. Vá em **GitHub → Settings → Environments → New environment**
2. Nome: `production`
3. Opcional: configure "Required reviewers" para aprovar antes do deploy

### Fluxo de CD

```
git push origin main
    │
    ▼
GitHub Actions: build + lint + teste de build
    │
    ▼ (se tudo OK)
SSH na VPS → git pull → docker compose up --build
    │
    ▼
Deploy concluído automaticamente
```

### Primeiro Deploy (manual)

Antes do CD automático funcionar, faça o primeiro deploy manualmente seguindo os Passos 1-12 acima. Após isso, todos os deploys seguintes são automáticos via GitHub Actions.
