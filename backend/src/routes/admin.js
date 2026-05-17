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

    const usuarios = await query(
      `SELECT id, nome, email, nivel_permissao, ativo, ultimo_acesso, google_id IS NOT NULL as usa_google
       FROM usuarios WHERE tenant_id = $1 ORDER BY nivel_permissao, nome`,
      [req.params.id]
    );

    return res.json({ sucesso: true, dados: { ...rows[0], usuarios: usuarios.rows } });
  } catch (err) {
    console.error('❌ Admin tenant detalhe:', err);
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
// GET /api/admin/planos — Listar planos disponíveis
// ============================================================
router.get('/planos', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query('SELECT id, nome, valor_mensal, max_usuarios FROM planos WHERE ativo = true ORDER BY valor_mensal');
    return res.json({ sucesso: true, dados: rows });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

module.exports = router;
