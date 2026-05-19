const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/connection');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

const router = express.Router();

// ============================================================
// POST /api/admin/auth/login
// ============================================================
router.post('/auth/login', [
  body('email').isEmail(),
  body('senha').notEmpty(),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ sucesso: false, erros: erros.array() });
  }

  const { email, senha } = req.body;

  try {
    const { rows } = await query(
      'SELECT id, nome, email, senha_hash, ativo FROM admins WHERE email = $1 LIMIT 1',
      [email]
    );

    if (rows.length === 0 || !rows[0].ativo) {
      return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas.' });
    }

    const admin = rows[0];
    const senhaCorreta = await bcrypt.compare(senha, admin.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ sucesso: false, mensagem: 'Credenciais inválidas.' });
    }

    await query('UPDATE admins SET ultimo_acesso = NOW() WHERE id = $1', [admin.id]);

    const token = jwt.sign(
      { admin_id: admin.id, is_admin: true },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.json({
      sucesso: true,
      dados: {
        token,
        admin: { id: admin.id, nome: admin.nome, email: admin.email },
      },
    });
  } catch (err) {
    console.error('❌ Admin login:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// GET /api/admin/stats — Resumo da plataforma
// ============================================================
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('ativo', 'trial'))                       AS total_ativos,
        COUNT(*) FILTER (WHERE status = 'trial')                                   AS em_trial,
        COUNT(*) FILTER (WHERE status = 'ativo')                                   AS pagantes,
        COUNT(*) FILTER (WHERE status IN ('inadimplente', 'suspenso', 'cancelado'))AS churned,
        COUNT(*)                                                                    AS total_geral,
        COALESCE(SUM(
          CASE WHEN status = 'ativo' AND NOT acesso_gratuito THEN
            (SELECT valor_mensal * (1 - t.desconto_percentual/100)
             FROM planos p WHERE p.id = t.plano_id)
          ELSE 0 END
        ), 0) AS mrr
      FROM tenants t
    `);

    const stats = rows[0];
    return res.json({ sucesso: true, dados: stats });
  } catch (err) {
    console.error('❌ Admin stats:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// GET /api/admin/tenants — Listar todos os clientes
// ============================================================
router.get('/tenants', adminMiddleware, async (req, res) => {
  const { status, busca, pagina = 1, limite = 50 } = req.query;
  const offset = (parseInt(pagina) - 1) * parseInt(limite);

  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      where += ` AND t.status = $${params.length}`;
    }
    if (busca) {
      params.push(`%${busca}%`);
      where += ` AND (t.nome_empresa ILIKE $${params.length} OR t.email_contato ILIKE $${params.length})`;
    }

    params.push(parseInt(limite), offset);
    const limitParam = params.length - 1;
    const offsetParam = params.length;

    const { rows } = await query(`
      SELECT
        t.id, t.nome_empresa, t.email_contato, t.telefone, t.status,
        t.trial_expira_em, t.criado_em, t.desconto_percentual,
        t.acesso_gratuito, t.notas_internas, t.bloqueado_em, t.motivo_bloqueio,
        p.nome as plano_nome, p.valor_mensal,
        COUNT(u.id) as total_usuarios,
        MAX(u.ultimo_acesso) as ultimo_acesso
      FROM tenants t
      LEFT JOIN planos p ON p.id = t.plano_id
      LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.ativo = true
      ${where}
      GROUP BY t.id, p.nome, p.valor_mensal
      ORDER BY t.criado_em DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, params);

    const countResult = await query(
      `SELECT COUNT(*) FROM tenants t ${where}`,
      params.slice(0, params.length - 2)
    );

    return res.json({
      sucesso: true,
      dados: rows,
      total: parseInt(countResult.rows[0].count),
      pagina: parseInt(pagina),
      limite: parseInt(limite),
    });
  } catch (err) {
    console.error('❌ Admin tenants:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// GET /api/admin/tenants/:id — Detalhe de um cliente
// ============================================================
router.get('/tenants/:id', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT t.*, p.nome as plano_nome, p.valor_mensal,
             COUNT(u.id) as total_usuarios
      FROM tenants t
      LEFT JOIN planos p ON p.id = t.plano_id
      LEFT JOIN usuarios u ON u.tenant_id = t.id AND u.ativo = true
      WHERE t.id = $1
      GROUP BY t.id, p.nome, p.valor_mensal
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado.' });
    }

    const [usuarios, uso, assinatura] = await Promise.all([
      query(
        `SELECT id, nome, email, nivel_permissao, ativo, ultimo_acesso, criado_em,
                google_id IS NOT NULL AS usa_google
         FROM usuarios WHERE tenant_id = $1 ORDER BY nivel_permissao, nome`,
        [req.params.id]
      ),
      query(
        `SELECT
           (SELECT COUNT(*) FROM pedidos       WHERE tenant_id = $1)                                           AS total_pedidos,
           (SELECT COUNT(*) FROM pedidos       WHERE tenant_id = $1 AND criado_em >= NOW() - INTERVAL '30d')   AS pedidos_30d,
           (SELECT COUNT(*) FROM produtos      WHERE tenant_id = $1)                                           AS total_produtos,
           (SELECT COUNT(*) FROM clientes      WHERE tenant_id = $1)                                           AS total_clientes`,
        [req.params.id]
      ),
      query(
        `SELECT id, status, periodo, valor, proximo_vencimento, criado_em
         FROM assinaturas WHERE tenant_id = $1 ORDER BY criado_em DESC LIMIT 1`,
        [req.params.id]
      ),
    ]);

    return res.json({
      sucesso: true,
      dados: {
        ...rows[0],
        usuarios: usuarios.rows,
        uso: uso.rows[0] || {},
        assinatura: assinatura.rows[0] || null,
      },
    });
  } catch (err) {
    console.error('❌ Admin tenant detalhe:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// PATCH /api/admin/tenants/:id/modulos — Override de módulos
// ============================================================
router.patch('/tenants/:id/modulos', adminMiddleware, [
  body('modulos').isArray(),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  try {
    const { rows } = await query(
      `UPDATE tenants SET modulos_override = $1, atualizado_em = NOW()
       WHERE id = $2 RETURNING id, nome_empresa, modulos_override`,
      [JSON.stringify(req.body.modulos), req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrado.' });
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ Admin modulos:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// PATCH /api/admin/tenants/:id/status — Alterar status
// ============================================================
router.patch('/tenants/:id/status', adminMiddleware, [
  body('status').isIn(['trial', 'ativo', 'suspenso', 'cancelado', 'inadimplente']),
  body('motivo').optional().isString(),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const { status, motivo } = req.body;
  const bloqueado_em = ['suspenso', 'cancelado', 'inadimplente'].includes(status) ? new Date() : null;

  try {
    const { rows } = await query(
      `UPDATE tenants SET status = $1, bloqueado_em = $2, motivo_bloqueio = $3
       WHERE id = $4 RETURNING id, nome_empresa, status`,
      [status, bloqueado_em, motivo || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrado.' });
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ Admin status:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// PATCH /api/admin/tenants/:id/plano — Trocar plano
// ============================================================
router.patch('/tenants/:id/plano', adminMiddleware, [
  body('plano_id').isUUID(),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  try {
    const { rows } = await query(
      'UPDATE tenants SET plano_id = $1 WHERE id = $2 RETURNING id, nome_empresa, plano_id',
      [req.body.plano_id, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrado.' });
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ Admin plano:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// PATCH /api/admin/tenants/:id/desconto — Desconto individual
// ============================================================
router.patch('/tenants/:id/desconto', adminMiddleware, [
  body('desconto_percentual').isFloat({ min: 0, max: 100 }),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  try {
    const { rows } = await query(
      'UPDATE tenants SET desconto_percentual = $1 WHERE id = $2 RETURNING id, nome_empresa, desconto_percentual',
      [req.body.desconto_percentual, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrado.' });
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// PATCH /api/admin/tenants/:id/acesso-gratuito — Liberar grátis
// ============================================================
router.patch('/tenants/:id/acesso-gratuito', adminMiddleware, [
  body('acesso_gratuito').isBoolean(),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  try {
    const novoStatus = req.body.acesso_gratuito ? 'ativo' : 'trial';
    const { rows } = await query(
      `UPDATE tenants SET acesso_gratuito = $1, status = $2
       WHERE id = $3 RETURNING id, nome_empresa, acesso_gratuito, status`,
      [req.body.acesso_gratuito, novoStatus, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrado.' });
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// PATCH /api/admin/tenants/:id/notas — Salvar nota interna
// ============================================================
router.patch('/tenants/:id/notas', adminMiddleware, [
  body('notas_internas').isString(),
], async (req, res) => {
  try {
    await query(
      'UPDATE tenants SET notas_internas = $1 WHERE id = $2',
      [req.body.notas_internas, req.params.id]
    );
    return res.json({ sucesso: true });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// PATCH /api/admin/tenants/:id/perfil — Admin edita dados cadastrais
// ============================================================
const CAMPOS_PERFIL_TENANT = [
  'nome_empresa', 'razao_social', 'cnpj', 'inscricao_estadual', 'inscricao_municipal',
  'cnae', 'ie_isento', 'website', 'tipo_pessoa',
  'regime_tributario', 'telefone', 'email_contato', 'email_comercial',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
  'responsavel_nome', 'responsavel_email', 'responsavel_celular',
];
router.patch('/tenants/:id/perfil', adminMiddleware, async (req, res) => {
  const updates = [];
  const values = [];
  CAMPOS_PERFIL_TENANT.forEach(campo => {
    if (req.body[campo] !== undefined) {
      values.push(req.body[campo]);
      updates.push(`${campo} = $${values.length}`);
    }
  });
  if (updates.length === 0) {
    return res.status(400).json({ sucesso: false, mensagem: 'Nenhum campo para atualizar.' });
  }
  values.push(new Date());
  updates.push(`atualizado_em = $${values.length}`);
  values.push(req.params.id);
  try {
    const { rows } = await query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Não encontrado.' });
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ Admin perfil empresa:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// PATCH /api/admin/usuarios/:id/credenciais — Admin atualiza email/senha de usuário
// ============================================================
router.patch('/usuarios/:id/credenciais', adminMiddleware, [
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('senha').optional({ values: 'falsy' }).isLength({ min: 6 }),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const { email, senha } = req.body;
  if (!email && !senha) {
    return res.status(400).json({ sucesso: false, mensagem: 'Informe email ou senha para atualizar.' });
  }

  const updates = [];
  const values = [];

  if (email) {
    const { rows: exist } = await query(
      'SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, req.params.id]
    );
    if (exist.length > 0) {
      return res.status(409).json({ sucesso: false, mensagem: 'Este e-mail já está em uso por outro usuário.' });
    }
    values.push(email);
    updates.push(`email = $${values.length}`);
  }

  if (senha) {
    const hash = await bcrypt.hash(senha, 12);
    values.push(hash);
    updates.push(`senha_hash = $${values.length}`);
  }

  values.push(req.params.id);

  try {
    const { rows } = await query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING id, nome, email`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ Admin credenciais:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// GET /api/admin/planos — Listar todos os planos (admin)
// ============================================================
router.get('/planos', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT p.*,
        COUNT(t.id) FILTER (WHERE t.status IN ('ativo','trial')) AS total_tenants_ativos,
        COUNT(t.id) AS total_tenants
      FROM planos p
      LEFT JOIN tenants t ON t.plano_id = p.id
      GROUP BY p.id
      ORDER BY p.valor_mensal
    `);
    return res.json({ sucesso: true, dados: rows });
  } catch (err) {
    console.error('❌ GET planos:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// POST /api/admin/planos — Criar novo plano
// ============================================================
router.post('/planos', adminMiddleware, [
  body('nome').notEmpty().trim(),
  body('descricao').optional().trim(),
  body('valor_mensal').isFloat({ min: 0 }),
  body('valor_anual').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('trial_dias').optional({ values: 'falsy' }).isInt({ min: 0 }),
  body('max_usuarios').isInt({ min: 1 }),
  body('max_filiais').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('max_produtos').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('modulos').isArray(),
  body('ativo').optional({ values: 'falsy' }).isBoolean(),
  body('destaque').optional({ values: 'falsy' }).isBoolean(),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const {
    nome, descricao, valor_mensal, valor_anual, trial_dias = 14,
    max_usuarios, max_filiais = 1, max_produtos = 500,
    modulos = [], ativo = true, destaque = false,
  } = req.body;

  try {
    const { rows } = await query(`
      INSERT INTO planos (
        nome, descricao, valor_mensal, valor_anual, trial_dias,
        max_usuarios, max_filiais, max_produtos, modulos, ativo, destaque
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [nome, descricao || null, valor_mensal, valor_anual || null, trial_dias,
        max_usuarios, max_filiais, max_produtos, JSON.stringify(modulos), ativo, destaque]);

    return res.status(201).json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ POST planos:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// PUT /api/admin/planos/:id — Atualizar plano
// ============================================================
router.put('/planos/:id', adminMiddleware, [
  body('nome').notEmpty().trim(),
  body('descricao').optional({ nullable: true }).trim(),
  body('valor_mensal').isFloat({ min: 0 }),
  body('valor_anual').optional({ values: 'falsy' }).isFloat({ min: 0 }),
  body('trial_dias').optional({ values: 'falsy' }).isInt({ min: 0 }),
  body('max_usuarios').isInt({ min: 1 }),
  body('max_filiais').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('max_produtos').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('modulos').isArray(),
  body('ativo').optional({ values: 'falsy' }).isBoolean(),
  body('destaque').optional({ values: 'falsy' }).isBoolean(),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const {
    nome, descricao, valor_mensal, valor_anual, trial_dias,
    max_usuarios, max_filiais, max_produtos, modulos, ativo, destaque,
  } = req.body;

  try {
    const { rows } = await query(`
      UPDATE planos SET
        nome         = COALESCE($1, nome),
        descricao    = $2,
        valor_mensal = COALESCE($3, valor_mensal),
        valor_anual  = $4,
        trial_dias   = COALESCE($5, trial_dias),
        max_usuarios = COALESCE($6, max_usuarios),
        max_filiais  = COALESCE($7, max_filiais),
        max_produtos = COALESCE($8, max_produtos),
        modulos      = COALESCE($9, modulos),
        ativo        = COALESCE($10, ativo),
        destaque     = COALESCE($11, destaque),
        atualizado_em = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      nome, descricao ?? null, valor_mensal, valor_anual ?? null,
      trial_dias ?? null, max_usuarios ?? null, max_filiais ?? null,
      max_produtos ?? null, modulos ? JSON.stringify(modulos) : null,
      ativo ?? null, destaque ?? null, req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Plano não encontrado.' });
    }
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ PUT planos:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// DELETE /api/admin/planos/:id — Desativar plano (soft delete)
// ============================================================
router.delete('/planos/:id', adminMiddleware, async (req, res) => {
  try {
    // Verificar se há tenants ativos neste plano
    const { rows: check } = await query(
      `SELECT COUNT(*) FROM tenants WHERE plano_id = $1 AND status IN ('ativo','trial')`,
      [req.params.id]
    );
    if (parseInt(check[0].count) > 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: `Não é possível desativar: ${check[0].count} cliente(s) ativo(s) neste plano.`,
      });
    }

    const { rows } = await query(
      `UPDATE planos SET ativo = false, atualizado_em = NOW()
       WHERE id = $1 RETURNING id, nome, ativo`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Plano não encontrado.' });
    }
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ DELETE planos:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

module.exports = router;
