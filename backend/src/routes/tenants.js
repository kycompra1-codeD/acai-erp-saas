const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/connection');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

const CAMPOS_PERFIL = [
  'nome_empresa', 'razao_social', 'cnpj', 'inscricao_estadual', 'inscricao_municipal',
  'cnae', 'ie_isento', 'website', 'tipo_pessoa',
  'regime_tributario', 'telefone', 'email_contato', 'email_comercial',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
  'responsavel_nome', 'responsavel_email', 'responsavel_celular',
];

// GET /api/tenants/perfil
router.get('/perfil', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, nome_empresa, razao_social, cnpj, inscricao_estadual, inscricao_municipal,
              cnae, ie_isento, website, tipo_pessoa,
              regime_tributario, telefone, email_contato, email_comercial, logo_url,
              cep, logradouro, numero, complemento, bairro, cidade, estado,
              responsavel_nome, responsavel_email, responsavel_celular,
              status, plano_id, trial_expira_em, modulos_override, criado_em, atualizado_em
       FROM tenants WHERE id = $1`,
      [req.usuario.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ sucesso: false });
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ GET perfil empresa:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// PATCH /api/tenants/perfil
router.patch('/perfil', authMiddleware, [
  body('nome_empresa').optional({ values: 'falsy' }).trim(),
  body('razao_social').optional().trim(),
  body('cnpj').optional().trim(),
  body('inscricao_estadual').optional().trim(),
  body('regime_tributario').optional({ values: 'falsy' }).isIn(['Simples Nacional', 'Lucro Presumido', 'Lucro Real']),
  body('telefone').optional().trim(),
  body('email_contato').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('email_comercial').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('cep').optional().trim(),
  body('logradouro').optional().trim(),
  body('numero').optional().trim(),
  body('complemento').optional().trim(),
  body('bairro').optional().trim(),
  body('cidade').optional().trim(),
  body('estado').optional({ values: 'falsy' }).isLength({ min: 2, max: 2 }).trim(),
  body('inscricao_municipal').optional().trim(),
  body('cnae').optional().trim(),
  body('ie_isento').optional({ values: 'falsy' }).isBoolean(),
  body('website').optional().trim(),
  body('tipo_pessoa').optional({ values: 'falsy' }).isIn(['PF', 'PJ']),
  body('responsavel_nome').optional().trim(),
  body('responsavel_email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('responsavel_celular').optional().trim(),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const updates = [];
  const values = [];
  CAMPOS_PERFIL.forEach(campo => {
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
  values.push(req.usuario.tenant_id);

  try {
    const { rows } = await query(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ PATCH perfil empresa:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

module.exports = router;
