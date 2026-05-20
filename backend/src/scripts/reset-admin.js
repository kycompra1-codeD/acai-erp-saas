const path = require('path');
const { query } = require(path.join(__dirname, '../db/connection'));
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    const email = 'admin@zullya.com.br';
    const password = 'ZullyaAdmin@2026';

    console.log(`🔄 Resetando admin: ${email}...`);

    try {
        const salt = await bcrypt.genSalt(12);
        const hash = await bcrypt.hash(password, salt);

        // Deleta se já existir para garantir um fresh start
        await query('DELETE FROM admins WHERE email = $1', [email]);

        // Insere novo admin
        await query(`
      INSERT INTO admins (nome, email, senha_hash, ativo, nivel_permissao)
      VALUES ($1, $2, $3, true, 'master')
    `, ['Admin Zullya', email, hash]);

        console.log('✅ Admin resetado com sucesso!');
        console.log(`Email: ${email}`);
        console.log(`Senha: ${password}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao resetar admin:', err.message);
        process.exit(1);
    }
}

resetAdmin();
