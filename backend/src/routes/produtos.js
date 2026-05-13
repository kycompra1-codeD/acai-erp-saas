const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../db/connection');
const { authMiddleware, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// ── CATEGORIAS ──────────────────────────────────────────────

router.get('/categorias', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM categorias WHERE tenant_id = $1 AND ativa = true ORDER BY nome',
      [req.usuario.tenant_id]
    );
    res.json({ sucesso: true, dados: rows });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar categorias.' }); }
});

router.post('/categorias', checkPermissao(['master','admin','gerente']), [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });
  const { nome, emoji = '📦', cor = '#8B5CF6' } = req.body;
  try {
    const { rows } = await query(
      'INSERT INTO categorias (tenant_id, nome, emoji, cor) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.usuario.tenant_id, nome, emoji, cor]
    );
    res.status(201).json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar categoria.' }); }
});

router.put('/categorias/:id', checkPermissao(['master','admin','gerente']), async (req, res) => {
  const { nome, emoji, cor, ativa } = req.body;
  try {
    const { rows } = await query(
      `UPDATE categorias SET nome=COALESCE($1,nome), emoji=COALESCE($2,emoji),
       cor=COALESCE($3,cor), ativa=COALESCE($4,ativa)
       WHERE id=$5 AND tenant_id=$6 RETURNING *`,
      [nome, emoji, cor, ativa, req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Categoria não encontrada.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar categoria.' }); }
});

router.delete('/categorias/:id', checkPermissao(['master','admin']), async (req, res) => {
  try {
    await query('UPDATE categorias SET ativa=false WHERE id=$1 AND tenant_id=$2', [req.params.id, req.usuario.tenant_id]);
    res.json({ sucesso: true, mensagem: 'Categoria desativada.' });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover categoria.' }); }
});

// ── PRODUTOS ────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { busca, categoria_id, ativo } = req.query;
  try {
    let sql = `
      SELECT p.*, c.nome AS categoria_nome, c.emoji AS categoria_emoji
      FROM produtos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      WHERE p.tenant_id = $1
    `;
    const params = [req.usuario.tenant_id];
    if (ativo !== undefined) { params.push(ativo === 'true'); sql += ` AND p.ativo = $${params.length}`; }
    if (categoria_id) { params.push(categoria_id); sql += ` AND p.categoria_id = $${params.length}`; }
    if (busca) { params.push(`%${busca}%`); sql += ` AND (p.nome ILIKE $${params.length} OR p.sku ILIKE $${params.length} OR p.ean ILIKE $${params.length})`; }
    sql += ' ORDER BY p.nome';
    const { rows } = await query(sql, params);
    res.json({ sucesso: true, dados: rows, total: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar produtos.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*, c.nome AS categoria_nome,
        COALESCE(
          (SELECT json_agg(json_build_object('id',f.id,'nome',f.nome))
           FROM produto_fornecedores pf JOIN fornecedores f ON f.id = pf.fornecedor_id
           WHERE pf.produto_id = p.id), '[]'
        ) AS fornecedores
       FROM produtos p LEFT JOIN categorias c ON c.id = p.categoria_id
       WHERE p.id = $1 AND p.tenant_id = $2`,
      [req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Produto não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar produto.' }); }
});

router.post('/', checkPermissao(['master','admin','gerente']), [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('preco').isFloat({ min: 0 }).withMessage('Preço inválido'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const {
    nome, descricao, sku, ean, categoria_id, preco, custo = 0,
    emoji = '🍇', imagem_url, identity_type = 'emoji', unidade = 'unid',
    peso, estoque_atual = 0, estoque_minimo = 0,
    ncm, cest, cfop, icms = 0, pis = 0, cofins = 0,
    observacoes_internas, fornecedores = [],
  } = req.body;

  try {
    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO produtos
          (tenant_id, nome, descricao, sku, ean, categoria_id, preco, custo,
           emoji, imagem_url, identity_type, unidade, peso,
           estoque_atual, estoque_minimo, ncm, cest, cfop, icms, pis, cofins, observacoes_internas)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         RETURNING *`,
        [req.usuario.tenant_id, nome, descricao, sku, ean, categoria_id || null, preco, custo,
         emoji, imagem_url, identity_type, unidade, peso || null,
         estoque_atual, estoque_minimo, ncm, cest, cfop, icms, pis, cofins, observacoes_internas]
      );
      const produto = rows[0];
      for (const fid of fornecedores) {
        await client.query('INSERT INTO produto_fornecedores (produto_id, fornecedor_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [produto.id, fid]);
      }
      return res.status(201).json({ sucesso: true, dados: produto });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar produto.' });
  }
});

router.put('/:id', checkPermissao(['master','admin','gerente']), async (req, res) => {
  const { fornecedores, ...campos } = req.body;
  const allowed = ['nome','descricao','sku','ean','categoria_id','preco','custo','emoji',
    'imagem_url','identity_type','unidade','peso','estoque_atual','estoque_minimo',
    'ncm','cest','cfop','icms','pis','cofins','observacoes_internas','ativo'];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (campos[k] !== undefined) { vals.push(campos[k]); sets.push(`${k}=$${vals.length}`); }
  }
  if (!sets.length && fornecedores === undefined) return res.status(400).json({ sucesso: false, mensagem: 'Nenhum campo para atualizar.' });

  try {
    await withTransaction(async (client) => {
      let produto;
      if (sets.length) {
        vals.push(req.params.id, req.usuario.tenant_id);
        const { rows } = await client.query(
          `UPDATE produtos SET ${sets.join(',')}, atualizado_em=NOW() WHERE id=$${vals.length-1} AND tenant_id=$${vals.length} RETURNING *`, vals
        );
        if (!rows.length) { res.status(404).json({ sucesso: false, mensagem: 'Produto não encontrado.' }); return; }
        produto = rows[0];
      }
      if (Array.isArray(fornecedores)) {
        await client.query('DELETE FROM produto_fornecedores WHERE produto_id=$1', [req.params.id]);
        for (const fid of fornecedores) {
          await client.query('INSERT INTO produto_fornecedores (produto_id, fornecedor_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, fid]);
        }
      }
      res.json({ sucesso: true, dados: produto });
    });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar produto.' }); }
});

router.delete('/:id', checkPermissao(['master','admin']), async (req, res) => {
  try {
    await query('UPDATE produtos SET ativo=false, atualizado_em=NOW() WHERE id=$1 AND tenant_id=$2', [req.params.id, req.usuario.tenant_id]);
    res.json({ sucesso: true, mensagem: 'Produto desativado.' });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover produto.' }); }
});

module.exports = router;
