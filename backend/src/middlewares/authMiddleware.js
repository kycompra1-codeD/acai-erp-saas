const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');

/**
 * Middleware de Autenticação JWT + Multi-tenant
 * 
 * Valida o token JWT, extrai o usuario_id e o tenant_id,
 * e injeta as informações no req para uso nas rotas protegidas.
 * 
 * Uso: router.get('/rota-protegida', authMiddleware, (req, res) => {})
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 1. Extrair o token do header Authorization
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token de acesso não fornecido.',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verificar e decodificar o token JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          sucesso: false,
          mensagem: 'Sessão expirada. Por favor, faça login novamente.',
          codigo: 'TOKEN_EXPIRADO',
        });
      }
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token inválido.',
      });
    }

    // 3. Buscar o usuário no banco e verificar status
    const { rows } = await query(
      `SELECT u.id, u.nome, u.email, u.nivel_permissao, u.ativo,
              u.tenant_id, t.status as tenant_status, t.nome_empresa,
              t.plano_id, a.status as assinatura_status
       FROM usuarios u
       JOIN tenants t ON t.id = u.tenant_id
       LEFT JOIN assinaturas a ON a.tenant_id = t.id AND a.status = 'ativa'
       WHERE u.id = $1 AND u.ativo = true
       LIMIT 1`,
      [decoded.usuario_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Usuário não encontrado ou desativado.',
      });
    }

    const usuario = rows[0];

    // 4. Verificar se o tenant (empresa) está ativo
    const statusPermitidos = ['ativo', 'trial'];
    if (!statusPermitidos.includes(usuario.tenant_status)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso suspenso. Entre em contato com o suporte ou renove sua assinatura.',
        codigo: 'TENANT_SUSPENSO',
        tenant_status: usuario.tenant_status,
      });
    }

    // 5. Injetar dados no req para uso nas rotas
    req.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      nivel_permissao: usuario.nivel_permissao,
      tenant_id: usuario.tenant_id,
      nome_empresa: usuario.nome_empresa,
      plano_id: usuario.plano_id,
      tenant_status: usuario.tenant_status,
    };

    // 6. Atualizar último acesso (não bloqueante)
    query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [usuario.id]).catch(() => {});

    next();
  } catch (err) {
    console.error('❌ authMiddleware error:', err.message);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno no servidor.',
    });
  }
};

/**
 * Middleware de Verificação de Permissão
 * 
 * Uso: router.delete('/rota', authMiddleware, checkPermissao(['master', 'admin']), handler)
 */
const checkPermissao = (niveisPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ sucesso: false, mensagem: 'Não autenticado.' });
    }

    if (!niveisPermitidos.includes(req.usuario.nivel_permissao)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: `Acesso negado. Permissão necessária: ${niveisPermitidos.join(' ou ')}.`,
        sua_permissao: req.usuario.nivel_permissao,
      });
    }

    next();
  };
};

module.exports = { authMiddleware, checkPermissao };
