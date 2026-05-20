const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../db/connection');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { enviarBoasVindas, enviarRedefinicaoSenha } = require('../services/emailService');

const { OAuth2Client } = require('google-auth-library');

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

      // Enviar e-mail de boas-vindas (não bloqueia a resposta)
      enviarBoasVindas({ email, nome, nomeEmpresa: nome_empresa }).catch(() => { });

      // Buscar dados do plano para retornar na resposta
      const { rows: planoInfo } = await client.query(
        'SELECT id, nome, modulos, max_usuarios, max_produtos FROM planos WHERE id = $1',
        [plano_id]
      );
      const plano = planoInfo[0] || {};

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Empresa criada com sucesso! Seu período de trial de 14 dias começou.',
        dados: {
          access_token: accessToken,
          refresh_token: refreshToken,
          usuario: { id: usuario_id, nome, email, nivel_permissao: 'master' },
          empresa: {
            id: tenant_id,
            nome_empresa,
            status: 'trial',
            trial_expira_em: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            plano_id: plano.id || null,
            plano_nome: plano.nome || 'Starter',
            modulos: plano.modulos || [],
            max_usuarios: plano.max_usuarios || 3,
            max_produtos: plano.max_produtos || 500,
          },
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
    // Buscar usuário com dados completos do plano
    let queryText = `
      SELECT u.id, u.nome, u.email, u.senha_hash, u.nivel_permissao, u.ativo,
             u.tenant_id, t.nome_empresa, t.status as tenant_status, t.trial_expira_em,
             p.id as plano_id, p.nome as plano_nome, p.modulos, p.max_usuarios, p.max_produtos
      FROM usuarios u
      JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN planos p ON p.id = t.plano_id
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
    if (!usuario.senha_hash) {
      return res.status(401).json({ sucesso: false, mensagem: 'Esta conta usa login com Google. Clique em "Entrar com Google".' });
    }
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
          trial_expira_em: usuario.trial_expira_em,
          plano_id: usuario.plano_id,
          plano_nome: usuario.plano_nome,
          modulos: usuario.modulos,
          max_usuarios: usuario.max_usuarios,
          max_produtos: usuario.max_produtos,
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
              t.id as tenant_id, t.nome_empresa, t.status as tenant_status,
              t.trial_expira_em, t.logo_url,
              p.id as plano_id, p.nome as plano_nome, p.modulos,
              p.max_usuarios, p.max_produtos
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

// ============================================================
// POST /api/auth/esqueci-senha - Solicitar redefinição de senha
// ============================================================
router.post('/esqueci-senha', [
  body('email').isEmail().withMessage('E-mail inválido'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ sucesso: false, erros: erros.array() });
  }

  const { email } = req.body;

  // Resposta genérica para não revelar se o e-mail existe
  const resposta = { sucesso: true, mensagem: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' };

  try {
    const { rows } = await query(
      'SELECT id, nome FROM usuarios WHERE email = $1 AND ativo = true LIMIT 1',
      [email]
    );
    if (rows.length === 0) return res.json(resposta);

    const usuario = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await query(
      'UPDATE usuarios SET reset_senha_token_hash = $1, reset_senha_expiry = $2 WHERE id = $3',
      [tokenHash, expiry.toISOString(), usuario.id]
    );

    await enviarRedefinicaoSenha({ email, nome: usuario.nome, token });

    return res.json(resposta);
  } catch (err) {
    console.error('❌ Erro em esqueci-senha:', err);
    return res.json(resposta); // nunca expõe o erro
  }
});

// ============================================================
// POST /api/auth/redefinir-senha - Usar o token para trocar a senha
// ============================================================
router.post('/redefinir-senha', [
  body('token').notEmpty().withMessage('Token é obrigatório'),
  body('nova_senha').isLength({ min: 8 }).withMessage('Senha deve ter ao menos 8 caracteres'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ sucesso: false, erros: erros.array() });
  }

  const { token, nova_senha, email } = req.body;

  try {
    const { rows } = await query(
      `SELECT id, reset_senha_token_hash, reset_senha_expiry
       FROM usuarios WHERE email = $1 AND ativo = true AND reset_senha_expiry > NOW() LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
    }

    const usuario = rows[0];
    const tokenValido = await bcrypt.compare(token, usuario.reset_senha_token_hash || '');
    if (!tokenValido) {
      return res.status(400).json({ sucesso: false, mensagem: 'Token inválido ou expirado.' });
    }

    const senhaHash = await bcrypt.hash(nova_senha, 12);
    await query(
      'UPDATE usuarios SET senha_hash = $1, reset_senha_token_hash = NULL, reset_senha_expiry = NULL WHERE id = $2',
      [senhaHash, usuario.id]
    );

    return res.json({ sucesso: true, mensagem: 'Senha redefinida com sucesso. Faça login com sua nova senha.' });
  } catch (err) {
    console.error('❌ Erro em redefinir-senha:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
  }
});

// ============================================================
// POST /api/auth/google - Login / registro via Google OAuth
// ============================================================
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ sucesso: false, mensagem: 'Credential Google não informado.' });
  }

  try {
    // Verificar token via Google tokeninfo — mais confiável que OAuth2Client local
    // (evita problemas de cache de certificados rotativos do Google)
    let googleId, email, name, picture;
    try {
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      const payload = await tokenInfoRes.json();

      if (payload.error || !payload.sub) {
        console.error('❌ Google tokeninfo erro:', payload.error, payload.error_description || '');
        return res.status(401).json({
          sucesso: false,
          mensagem: 'Sessão Google expirada. Clique novamente no botão "Entrar com Google".',
        });
      }

      if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        console.error('❌ Google audience mismatch:', { payload: payload.aud, env: process.env.GOOGLE_CLIENT_ID });
        return res.status(401).json({
          sucesso: false,
          mensagem: 'Erro de configuração Google. Contate o suporte.',
          debug: process.env.NODE_ENV !== 'production' ? `AUD mismatch: ${payload.aud} vs ${process.env.GOOGLE_CLIENT_ID}` : undefined
        });
      }

      googleId = payload.sub;
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    } catch (fetchErr) {
      // Fallback: tentar via SDK local (nova instância por request = sem cache stale)
      console.warn('⚠️  tokeninfo falhou, tentando SDK:', fetchErr.message);
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const p = ticket.getPayload();
      googleId = p.sub;
      email = p.email;
      name = p.name;
      picture = p.picture;
    }

    const googleUserSelect = `
      SELECT u.id, u.nome, u.email, u.nivel_permissao, u.ativo,
             u.tenant_id, t.nome_empresa, t.status as tenant_status, t.trial_expira_em,
             p.id as plano_id, p.nome as plano_nome, p.modulos, p.max_usuarios, p.max_produtos
      FROM usuarios u
      JOIN tenants t ON t.id = u.tenant_id
      LEFT JOIN planos p ON p.id = t.plano_id
    `;

    // Buscar usuário por google_id
    let { rows } = await query(
      `${googleUserSelect} WHERE u.google_id = $1 AND u.ativo = true LIMIT 1`,
      [googleId]
    );

    // Não encontrou pelo google_id → tentar vincular pelo email
    if (rows.length === 0) {
      const byEmail = await query(
        `${googleUserSelect} WHERE u.email = $1 AND u.ativo = true LIMIT 1`,
        [email]
      );

      if (byEmail.rows.length > 0) {
        // Vincular google_id à conta existente
        await query(
          'UPDATE usuarios SET google_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3',
          [googleId, picture, byEmail.rows[0].id]
        );
        rows = byEmail.rows;
      } else {
        // Conta não existe → retornar dados para o frontend completar o cadastro
        return res.status(200).json({
          sucesso: true,
          precisa_completar_cadastro: true,
          google_dados: { google_id: googleId, email, nome: name, avatar_url: picture },
        });
      }
    }

    const usuario = rows[0];

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
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, nivel_permissao: usuario.nivel_permissao },
        empresa: {
          id: usuario.tenant_id,
          nome_empresa: usuario.nome_empresa,
          status: usuario.tenant_status,
          trial_expira_em: usuario.trial_expira_em,
          plano_id: usuario.plano_id,
          plano_nome: usuario.plano_nome,
          modulos: usuario.modulos,
          max_usuarios: usuario.max_usuarios,
          max_produtos: usuario.max_produtos,
        },
      },
    });
  } catch (err) {
    console.error('❌ Erro no login Google:', err.message);
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Erro ao verificar conta Google. Tente novamente.',
    });
  }
});

// ============================================================
// POST /api/auth/registro-google - Finalizar cadastro via Google
// ============================================================
router.post('/registro-google', [
  body('google_id').notEmpty(),
  body('email').isEmail(),
  body('nome').notEmpty(),
  body('nome_empresa').notEmpty().withMessage('Nome da empresa é obrigatório'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ sucesso: false, erros: erros.array() });
  }

  const { google_id, email, nome, nome_empresa, avatar_url, telefone, cnpj } = req.body;

  try {
    await withTransaction(async (client) => {
      const { rows: emailCheck } = await client.query(
        'SELECT id FROM usuarios WHERE email = $1 LIMIT 1', [email]
      );
      if (emailCheck.length > 0) {
        throw { status: 409, mensagem: 'Este e-mail já está cadastrado. Faça login normalmente.' };
      }

      const { rows: planos } = await client.query(
        "SELECT id, nome, modulos, max_usuarios, max_produtos FROM planos WHERE nome = 'Starter' LIMIT 1"
      );
      const plano = planos[0] || {};
      const plano_id = plano.id || null;

      const { rows: tenantRows } = await client.query(
        `INSERT INTO tenants (nome_empresa, cnpj, email_contato, telefone, plano_id, status)
         VALUES ($1, $2, $3, $4, $5, 'trial') RETURNING id`,
        [nome_empresa, cnpj || null, email, telefone || null, plano_id]
      );
      const tenant_id = tenantRows[0].id;

      const { rows: userRows } = await client.query(
        `INSERT INTO usuarios (tenant_id, nome, email, google_id, avatar_url, nivel_permissao)
         VALUES ($1, $2, $3, $4, $5, 'master') RETURNING id`,
        [tenant_id, nome, email, google_id, avatar_url || null]
      );
      const usuario_id = userRows[0].id;

      await client.query(
        `INSERT INTO assinaturas (tenant_id, plano_id, status, periodo, valor, proximo_vencimento)
         VALUES ($1, $2, 'trial', 'mensal', 0, NOW() + INTERVAL '14 days')`,
        [tenant_id, plano_id]
      );

      const { accessToken, refreshToken } = gerarTokens(usuario_id, tenant_id, 'master');
      const refreshHash = await bcrypt.hash(refreshToken, 10);
      await client.query('UPDATE usuarios SET refresh_token_hash = $1 WHERE id = $2', [refreshHash, usuario_id]);

      enviarBoasVindas({ email, nome, nomeEmpresa: nome_empresa }).catch(() => { });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Conta criada! Seu trial de 14 dias começou.',
        dados: {
          access_token: accessToken,
          refresh_token: refreshToken,
          usuario: { id: usuario_id, nome, email, nivel_permissao: 'master' },
          empresa: {
            id: tenant_id,
            nome_empresa,
            status: 'trial',
            trial_expira_em: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            plano_id: plano.id || null,
            plano_nome: plano.nome || 'Starter',
            modulos: plano.modulos || [],
            max_usuarios: plano.max_usuarios || 3,
            max_produtos: plano.max_produtos || 500,
          },
        },
      });
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ sucesso: false, mensagem: err.mensagem });
    console.error('❌ Erro no registro Google:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor.' });
  }
});

module.exports = router;
