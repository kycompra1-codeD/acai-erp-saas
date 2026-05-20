const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pgPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'zullya_erp',
    user: process.env.DB_USER || 'zullya_erp_user',
    password: process.env.DB_PASSWORD,
});

async function resetAdmin() {
    const email = 'admin@zullya.com.br';
    const password = 'ZullyaAdmin@2026';

    console.log(`🔄 Resetando admin STANDALONE: ${email}...`);

    try {
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(password, salt);

        await pgPool.query('DELETE FROM admins WHERE email = $1', [email]);

        await pgPool.query(`
      INSERT INTO admins (nome, email, senha_hash, ativo, nivel_permissao)
      VALUES ($1, $2, $3, true, 'master')
    `, ['Admin Zullya', email, hash]);

        console.log('✅ Admin resetado com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao resetar admin:', err.message);
        process.exit(1);
    }
}

resetAdmin();
