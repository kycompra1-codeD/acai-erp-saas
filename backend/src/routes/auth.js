const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../db/connection');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// ============================================================
// Helpers
// ============================================================
const gerarTokens = (usuario_id, tenant_id, nivel_permissao) => {
  const payload = { usuario_id, tenant_id, nivel_permissao };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

  return { accessToken, refreshToken };
};

// ============================================================
// POST /api/auth/registro - Criar nova empresa + usuário master
// ============================================================
router.post('/registro', [
  body('nome_empresa').notEmpty().withMessage('Nome da empresa é obrigatório'),
  body('email').isEmail().withMessage('E-mail inválido'),
  body('senha').isLength({ min: 8 }).withMessage('Senha deve ter ao menos 8 caracteres'),
  body('nome').notEmpty().withMessage('Seu nome é obrigatório'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ sucesso: false, erros: erros.array() });
  }

  const { nome_empresa, cnpj, email, senha, nome, telefone } = req.body;

  try {
    await withTransaction(async (client) => {
      // Verificar se e-mail já existe
      const { rows: emailCheck } = await client.query(
        'SELECT id FROM usuarios WHERE email = $1 LIMIT 1',
        [email]
      );
      if (emailCheck.length > 0) {
        throw { status: 409, mensagem: 'Este e-mail já está cadastrado.' };
      }

      // Buscar plano Starter
      const { rows: planos } = await client.query(
        "SELECT id FROM planos WHERE nome = 'Starter' LIMIT 1"
      );
      const plano_id = planos[0]?.id || null;

      // Criar o Tenant (empresa)
      const { rows: tenantRows } = await client.query(
        `INSERT INTO tenants (nome_empresa, cnpj, email_contato, telefone, plano_id, status)
         VALUES ($1, $2, $3, $4, $5, 'trial') RETURNING id`,
        [nome_empresa, cnpj || null, email, telefone || null, plano_id]
      );
      const tenant_id = tenantRows[0].id;

      // Hash da senha
      const senha_hash = await bcrypt.hash(senha, 12);

      // Criar usuário MASTER da empresa
      const { rows: userRows } = await client.query(
        `INSERT INTO usuarios (tenant_id, nome, email, senha_hash, nivel_permissao)
         VALUES ($1, $2, $3, $4, 'master') RETURNING id`,
        [tenant_id, nome, email, senha_hash]
      );
      const usuario_id = userRows[0].id;

      // Criar assinatura trial
      await client.query(
        `INSERT INTO assinaturas (tenant_id, plano_id, status, periodo, valor, proximo_vencimento)
         VALUES ($1, $2, 'trial', 'mensal', 0, NOW() + INTERVAL '14 days')`,
        [tenant_id, plano_id]
      );

      // Gerar tokens
      const { accessToken, refreshToken } = gerarTokens(usuario_id, tenant_id, 'master');

      // Salvar hash do refresh token
      const refreshHash = await bcrypt.hash(refreshToken, 10);
      await client.query(
        'UPDATE usuarios SET refresh_token_hash = $1 WHERE id = $2',
        [refreshHash, usuario_id]
      );

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Empresa criada com sucesso! Seu período de trial de 14 dias começou.',
        dados: {
          access_token: accessToken,
          refresh_token: refreshToken,
          usuario: { id: usuario_id, nome, email, nivel_permissao: 'master' },
          empresa: { id: tenant_id, nome_empresa, status: 'trial' },
        },
      });
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, mensagem: err.mensagem });
    }
    console.error('❌ Erro no registro:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
  }
});

// ============================================================
// POST /api/auth/login - Login do usuário
// ============================================================
router.post('/login', [
  body('email').isEmail().withMessage('E-mail inválido'),
  body('senha').notEmpty().withMessage('Senha é obrigatória'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ sucesso: false, erros: erros.array() });
  }

  const { email, senha, tenant_id } = req.body;

  try {
    // Buscar usuário
    let queryText = `
      SELECT u.id, u.nome, u.email, u.senha_hash, u.nivel_permissao, u.ativo,
             u.tenant_id, t.nome_empresa, t.status as tenant_status
      FROM usuarios u
      JOIN tenants t ON t.id = u.tenant_id
      WHERE u.email = $1 AND u.ativo = true
    `;
    const queryParams = [email];

    // Se informou tenant_id (login por empresa), filtrar
    if (tenant_id) {
      queryText += ' AND u.tenant_id = $2';
      queryParams.push(tenant_id);
    }

    queryText += ' LIMIT 1';

    const { rows } = await query(queryText, queryParams);

    if (rows.length === 0) {
      return res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha incorretos.' });
    }

    const usuario = rows[0];

    // Verificar senha
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha incorretos.' });
    }

    // Verificar status do tenant
    const statusPermitidos = ['ativo', 'trial'];
    if (!statusPermitidos.includes(usuario.tenant_status)) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso suspenso. Renove sua assinatura para continuar.',
        codigo: 'TENANT_SUSPENSO',
      });
    }

    // Gerar tokens
    const { accessToken, refreshToken } = gerarTokens(
      usuario.id, usuario.tenant_id, usuario.nivel_permissao
    );

    // Salvar hash do refresh token
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await query(
      'UPDATE usuarios SET refresh_token_hash = $1, ultimo_acesso = NOW() WHERE id = $2',
      [refreshHash, usuario.id]
    );

    return res.json({
      sucesso: true,
      dados: {
        access_token: accessToken,
        refresh_token: refreshToken,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          nivel_permissao: usuario.nivel_permissao,
        },
        empresa: {
          id: usuario.tenant_id,
          nome_empresa: usuario.nome_empresa,
          status: usuario.tenant_status,
        },
      },
    });
  } catch (err) {
    console.error('❌ Erro no login:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
  }
});

// ============================================================
// POST /api/auth/refresh - Renovar o access token
// ============================================================
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ sucesso: false, mensagem: 'Refresh token não informado.' });
  }

  try {
    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);

    const { rows } = await query(
      'SELECT id, refresh_token_hash, nivel_permissao, tenant_id, ativo FROM usuarios WHERE id = $1',
      [decoded.usuario_id]
    );

    if (rows.length === 0 || !rows[0].ativo) {
      return res.status(401).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
    }

    const usuario = rows[0];

    // Verificar se o refresh token bate com o salvo
    const tokenValido = await bcrypt.compare(refresh_token, usuario.refresh_token_hash || '');
    if (!tokenValido) {
      return res.status(401).json({ sucesso: false, mensagem: 'Refresh token inválido ou expirado.' });
    }

    // Gerar novos tokens
    const { accessToken, refreshToken: novoRefreshToken } = gerarTokens(
      usuario.id, usuario.tenant_id, usuario.nivel_permissao
    );

    const novoRefreshHash = await bcrypt.hash(novoRefreshToken, 10);
    await query('UPDATE usuarios SET refresh_token_hash = $1 WHERE id = $2', [novoRefreshHash, usuario.id]);

    return res.json({
      sucesso: true,
      dados: { access_token: accessToken, refresh_token: novoRefreshToken },
    });
  } catch {
    return res.status(401).json({ sucesso: false, mensagem: 'Refresh token inválido ou expirado.' });
  }
});

// ============================================================
// POST /api/auth/logout - Revogar sessão
// ============================================================
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await query('UPDATE usuarios SET refresh_token_hash = NULL WHERE id = $1', [req.usuario.id]);
    return res.json({ sucesso: true, mensagem: 'Logout realizado com sucesso.' });
  } catch {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao realizar logout.' });
  }
});

// ============================================================
// GET /api/auth/me - Dados do usuário logado
// ============================================================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.nome, u.email, u.nivel_permissao, u.ultimo_acesso, u.avatar_url,
              t.id as tenant_id, t.nome_empresa, t.status as tenant_status, t.logo_url,
              p.nome as plano_nome, p.modulos
       FROM usuarios u
       JOIN tenants t ON t.id = u.tenant_id
       LEFT JOIN planos p ON p.id = t.plano_id
       WHERE u.id = $1`,
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
    }

    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

module.exports = router;
