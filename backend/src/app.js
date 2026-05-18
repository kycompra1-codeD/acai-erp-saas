require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { testConnection, connectRedis } = require('./db/connection');

// ============================================================
// Inicialização do Express
// ============================================================
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// Middlewares de Segurança
// ============================================================
app.use(helmet());

// CORS: permite apenas o frontend autorizado
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:9999',
    'https://app.zullya.com.br',
    'https://zullya.com.br',
    'https://www.zullya.com.br',
    'http://localhost:9999',
    'http://localhost:8080',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate Limiting: máximo de 100 requisições por 15 minutos por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { sucesso: false, mensagem: 'Muitas requisições. Tente novamente em 15 minutos.' },
});
app.use(limiter);

// Rate limit mais agressivo para rotas de auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { sucesso: false, mensagem: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

// ============================================================
// Middlewares de Parse
// ============================================================
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ATENÇÃO: webhooks têm parsers próprios — excluir do express.json global
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks')) return next();
  express.json({ limit: '10mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Rotas
// ============================================================
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const webhookRoutes = require('./routes/webhook');
const produtosRoutes = require('./routes/produtos');
const clientesRoutes = require('./routes/clientes');
const fornecedoresRoutes = require('./routes/fornecedores');
const funcionariosRoutes = require('./routes/funcionarios');
const pedidosRoutes = require('./routes/pedidos');
const estoqueRoutes = require('./routes/estoque');
const comprasRoutes = require('./routes/compras');
const financeiroRoutes = require('./routes/financeiro');
const dashboardRoutes = require('./routes/dashboard');
const relatoriosRoutes = require('./routes/relatorios');
const adminRoutes = require('./routes/admin');
const pagamentosRoutes = require('./routes/pagamentos');
const crmRoutes = require('./routes/crm');
const fiscalRoutes = require('./routes/fiscal');
const biRoutes = require('./routes/bi');
const automacoesRoutes = require('./routes/automacoes');

// Health check (ambos os paths por compatibilidade)
const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    servico: 'Zullya ERP Backend',
    versao: '1.0.0',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV,
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pagamentos', pagamentosRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/fiscal', fiscalRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/relatorios/bi', biRoutes);
app.use('/api/automacoes', automacoesRoutes);

// ============================================================
// Rota 404
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: `Rota "${req.method} ${req.path}" não encontrada.`,
  });
});

// ============================================================
// Handler de erros global
// ============================================================
app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err);
  res.status(err.status || 500).json({
    sucesso: false,
    mensagem: process.env.NODE_ENV === 'production' ? 'Erro interno no servidor.' : err.message,
  });
});

// ============================================================
// Inicialização
// ============================================================
const start = async () => {
  console.log('🚀 Iniciando Zullya ERP Backend...');

  // Conectar Redis (opcional — não trava se indisponível)
  await connectRedis();

  // Iniciar crons (trial expiry + lembretes)
  try {
    const { iniciarCrons } = require('./services/cronService');
    iniciarCrons();
  } catch (err) {
    console.warn('⚠️  Crons não iniciados (node-cron ausente?):', err.message);
  }

  // Testar conexão com PostgreSQL
  const dbOk = await testConnection();
  if (!dbOk && process.env.NODE_ENV === 'production') {
    console.error('❌ Falha crítica: PostgreSQL indisponível. Encerrando...');
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   ⚡ Zullya ERP Backend - Online!      ║');
    console.log(`║   Porta: ${PORT}                          ║`);
    console.log(`║   Ambiente: ${process.env.NODE_ENV || 'development'}               ║`);
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
    console.log('📡 Endpoints disponíveis:');
    console.log(`   GET    http://localhost:${PORT}/health`);
    console.log(`   POST   http://localhost:${PORT}/api/auth/registro`);
    console.log(`   POST   http://localhost:${PORT}/api/auth/login`);
    console.log(`   POST   http://localhost:${PORT}/api/webhooks/rrpay`);
    console.log('');
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido. Encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido. Encerrando servidor...');
  process.exit(0);
});

start().catch((err) => {
  console.error('❌ Falha ao iniciar o servidor:', err);
  process.exit(1);
});
