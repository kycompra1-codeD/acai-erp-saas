const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { query } = require('../db/connection');
const { authMiddleware, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas as rotas aqui requerem autenticação
router.use(authMiddleware);

// ============================================================
// GET /api/usuarios - Listar usuários da empresa (multi-tenant)
// ============================================================
router.get('/', checkPermissao(['master', 'admin', 'gerente']), async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, nome, email, nivel_permissao, ativo, ultimo_acesso, criado_em
       FROM usuarios
       WHERE tenant_id = $1
       ORDER BY criado_em DESC`,
      [req.usuario.tenant_id]  // ← ISOLAMENTO: só vê usuários da PRÓPRIA empresa
    );

    return res.json({ sucesso: true, dados: rows, total: rows.length });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar usuários.' });
  }
});

// ============================================================
// POST /api/usuarios - Criar novo usuário na empresa
// ============================================================
router.post('/', checkPermissao(['master', 'admin']), [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('E-mail inválido'),
  body('senha').isLength({ min: 8 }).withMessage('Senha deve ter ao menos 8 caracteres'),
  body('nivel_permissao').isIn(['admin', 'gerente', 'vendedor', 'caixa', 'estoque', 'financeiro', 'operador'])
    .withMessage('Nível de permissão inválido'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ sucesso: false, erros: erros.array() });
  }

  const { nome, email, senha, nivel_permissao } = req.body;
  const { tenant_id } = req.usuario;

  try {
    // Verificar se e-mail já existe NESTE tenant
    const { rows: check } = await query(
      'SELECT id FROM usuarios WHERE tenant_id = $1 AND email = $2',
      [tenant_id, email]
    );
    if (check.length > 0) {
      return res.status(409).json({ sucesso: false, mensagem: 'Este e-mail já está cadastrado na sua empresa.' });
    }

    // Verificar limite de usuários do plano
    const { rows: contagem } = await query(
      'SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = $1 AND ativo = true',
      [tenant_id]
    );
    const { rows: planoRows } = await query(
      'SELECT p.max_usuarios FROM planos p JOIN tenants t ON t.plano_id = p.id WHERE t.id = $1',
      [tenant_id]
    );
    if (planoRows.length > 0 && parseInt(contagem[0].total) >= planoRows[0].max_usuarios) {
      return res.status(403).json({
        sucesso: false,
        mensagem: `Limite de usuários do plano atingido (${planoRows[0].max_usuarios}). Faça upgrade para adicionar mais.`,
        codigo: 'LIMITE_USUARIOS',
      });
    }

    const senha_hash = await bcrypt.hash(senha, 12);

    const { rows } = await query(
      `INSERT INTO usuarios (tenant_id, nome, email, senha_hash, nivel_permissao)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, nivel_permissao, criado_em`,
      [tenant_id, nome, email, senha_hash, nivel_permissao]
    );

    return res.status(201).json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ Erro ao criar usuário:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar usuário.' });
  }
});

// ============================================================
// PUT /api/usuarios/:id - Editar usuário
// ============================================================
router.put('/:id', checkPermissao(['master', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { nome, nivel_permissao, ativo } = req.body;
  const { tenant_id } = req.usuario;

  try {
    const { rows } = await query(
      `UPDATE usuarios SET
        nome = COALESCE($1, nome),
        nivel_permissao = COALESCE($2, nivel_permissao),
        ativo = COALESCE($3, ativo),
        atualizado_em = NOW()
       WHERE id = $4 AND tenant_id = $5
       RETURNING id, nome, email, nivel_permissao, ativo`,
      [nome, nivel_permissao, ativo, id, tenant_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
    }

    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar usuário.' });
  }
});

// ============================================================
// DELETE /api/usuarios/:id - Desativar usuário (soft delete)
// ============================================================
router.delete('/:id', checkPermissao(['master', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { tenant_id, id: meu_id } = req.usuario;

  if (id === meu_id) {
    return res.status(400).json({ sucesso: false, mensagem: 'Você não pode desativar sua própria conta.' });
  }

  try {
    const { rows } = await query(
      `UPDATE usuarios SET ativo = false, atualizado_em = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING id, nome`,
      [id, tenant_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
    }

    return res.json({ sucesso: true, mensagem: `Usuário "${rows[0].nome}" desativado com sucesso.` });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao desativar usuário.' });
  }
});

// ============================================================
// POST /api/usuarios/:id/redefinir-senha - Master ou Admin redefine senha
// ============================================================
router.post('/:id/redefinir-senha', checkPermissao(['master', 'admin']), [
  body('nova_senha').isLength({ min: 8 }).withMessage('Nova senha deve ter ao menos 8 caracteres'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ sucesso: false, erros: erros.array() });
  }

  const { id } = req.params;
  const { nova_senha } = req.body;
  const { tenant_id } = req.usuario;

  try {
    const nova_hash = await bcrypt.hash(nova_senha, 12);

    const { rows } = await query(
      `UPDATE usuarios SET senha_hash = $1, refresh_token_hash = NULL, atualizado_em = NOW()
       WHERE id = $2 AND tenant_id = $3 RETURNING id, nome`,
      [nova_hash, id, tenant_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
    }

    return res.json({ sucesso: true, mensagem: `Senha de "${rows[0].nome}" redefinida. A sessão ativa foi encerrada.` });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao redefinir senha.' });
  }
});

module.exports = router;
