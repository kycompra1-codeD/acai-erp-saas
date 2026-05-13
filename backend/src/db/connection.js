const { Pool } = require('pg');
const { createClient } = require('redis');

// ============================================================
// Pool de Conexões PostgreSQL
// ============================================================
const pgPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'acai_erp',
  user: process.env.DB_USER || 'acai_erp_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pgPool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ PostgreSQL: Nova conexão estabelecida');
  }
});

pgPool.on('error', (err) => {
  console.error('❌ PostgreSQL Pool Error:', err.message);
});

// ============================================================
// Cliente Redis (OPCIONAL - não trava o servidor se indisponível)
// ============================================================
let redisReady = false;
let redisErrorShown = false;

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    // Limita tentativas de reconexão — evita spam infinito de erros
    reconnectStrategy: (retries) => {
      if (retries >= 3) {
        if (!redisErrorShown) {
          redisErrorShown = true;
          console.warn('⚠️  Redis indisponível. Continuando sem cache (modo dev).');
          console.warn('   Para ativar: docker compose up -d redis');
        }
        return false; // Para de tentar reconectar
      }
      return Math.min(retries * 500, 2000);
    },
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', () => {
  // Suprimir erros repetidos — o reconnectStrategy já avisa
});

redisClient.on('ready', () => {
  redisReady = true;
  console.log('✅ Redis: Conectado com sucesso');
});

redisClient.on('end', () => {
  redisReady = false;
});

// Conectar Redis na inicialização (não bloqueia o servidor se falhar)
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch {
    // Silencioso — aviso já mostrado pelo reconnectStrategy
  }
};

// ============================================================
// Funções utilitárias do banco
// ============================================================

const query = async (text, params) => {
  const start = Date.now();
  const res = await pgPool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development' && duration > 200) {
    console.warn(`⚠️  Query lenta (${duration}ms): ${text}`);
  }
  return res;
};

const getClient = () => pgPool.connect();

const withTransaction = async (callback) => {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const testConnection = async () => {
  try {
    const { rows } = await query('SELECT NOW() as agora, current_database() as banco');
    console.log(`✅ PostgreSQL: Conectado ao banco "${rows[0].banco}"`);
    return true;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  PostgreSQL indisponível: ' + err.message);
      console.warn('   Para ativar: docker compose up -d postgres');
      console.warn('   Servidor rodando sem banco (funcionalidade limitada em dev).');
      return false;
    }
    console.error('❌ Falha ao conectar no PostgreSQL:', err.message);
    return false;
  }
};

module.exports = {
  query,
  getClient,
  withTransaction,
  testConnection,
  connectRedis,
  redisClient,
  redisReady: () => redisReady,
  pgPool,
};
