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
    'http://localhost:3000',
    'http://localhost:8080',
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

// ATENÇÃO: O webhook usa express.raw(), então precisa vir ANTES do express.json()
// O arquivo webhook.js já define seu próprio parser

// Parser JSON para rotas normais
app.use((req, res, next) => {
  if (req.path.startsWith('/api/webhooks')) return next(); // webhooks têm parser próprio
  express.json({ limit: '10mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Rotas
// ============================================================
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuarios');
const webhookRoutes = require('./routes/webhook');

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    servico: 'Açaí ERP Backend',
    versao: '1.0.0',
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV,
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/webhooks', webhookRoutes);

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
  console.log('🚀 Iniciando Açaí ERP Backend...');

  // Conectar Redis (opcional — não trava se indisponível)
  await connectRedis();

  // Testar conexão com PostgreSQL
  const dbOk = await testConnection();
  if (!dbOk && process.env.NODE_ENV === 'production') {
    console.error('❌ Falha crítica: PostgreSQL indisponível. Encerrando...');
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   🍇 Açaí ERP Backend - Online!       ║');
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
