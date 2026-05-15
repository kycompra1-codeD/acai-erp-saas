# Açaí ERP SaaS — Sistema de Gestão Completo

Sistema moderno de gestão para lojas de açaí e alimentação, focado em performance, design premium e escalabilidade SaaS.

## 🚀 Como Iniciar

### Usando Docker (Recomendado)

O projeto está totalmente containerizado para facilitar o desenvolvimento e deploy.

1. **Desenvolvimento (com Hot-Reload):**
   ```bash
   docker-compose up app-dev
   ```
   O sistema estará disponível em: `http://localhost:9999`

2. **Produção (Simulação):**
   ```bash
   docker-compose up app-prod
   ```
   O sistema estará disponível em: `http://localhost:8080`

### Desenvolvimento Local (Sem Docker)

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor:
   ```bash
   npm run dev
   ```

## 🛠️ Tecnologias

- **Frontend:** React 19 + Vite
- **Estilo:** Tailwind CSS 4
- **Ícones:** Lucide React
- **Gráficos:** Recharts
- **Container:** Docker + Docker Compose
- **CI/CD:** GitHub Actions

## 📦 Estrutura de Repositório

Para inicializar o repositório no seu GitHub:

```bash
git init
git add .
git commit -m "chore: setup infrastructure and branding"
git remote add origin https://github.com/kycompra1-codeD/zullya-erp.git
git push -u origin main
```
