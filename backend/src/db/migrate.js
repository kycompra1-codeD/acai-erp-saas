const fs = require('fs');
const path = require('path');
const { query, testConnection } = require('./connection');

/**
 * Executa o schema.sql para criar todas as tabelas
 */
const migrate = async () => {
  console.log('🔄 Iniciando migração do banco de dados...');

  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Migração cancelada: sem conexão com o banco.');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await query(schemaSql);
    console.log('✅ Migração concluída! Tabelas criadas/atualizadas com sucesso.');
    console.log('✅ Planos padrão inseridos (Starter, Pro, Enterprise).');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro durante a migração:', err.message);
    process.exit(1);
  }
};

migrate();
