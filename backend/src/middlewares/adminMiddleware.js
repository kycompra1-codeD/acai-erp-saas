const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');

async function adminMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ sucesso: false, mensagem: 'Token de admin não fornecido.' });
  }

  const token = auth.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.is_admin) {
      return res.status(403).json({ sucesso: false, mensagem: 'Acesso restrito a administradores.' });
    }

    const { rows } = await query(
      'SELECT id, nome, email, ativo FROM admins WHERE id = $1',
      [decoded.admin_id]
    );

    if (rows.length === 0 || !rows[0].ativo) {
      return res.status(401).json({ sucesso: false, mensagem: 'Admin não encontrado ou inativo.' });
    }

    req.admin = rows[0];
    next();
  } catch {
    return res.status(401).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
  }
}

module.exports = { adminMiddleware };
