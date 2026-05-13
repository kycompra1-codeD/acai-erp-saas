const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../db/connection');
const { authMiddleware, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// GET /api/pedidos
router.get('/', async (req, res) => {
  const { status, tipo, busca, data_inicio, data_fim, limit = 50, offset = 0 } = req.query;
  try {
    let sql = `
      SELECT p.*, c.nome AS nome_cliente_cadastrado,
        (SELECT json_agg(ip ORDER BY ip.id) FROM itens_pedido ip WHERE ip.pedido_id = p.id) AS itens,
        (SELECT json_agg(pp ORDER BY pp.id) FROM pagamentos_pedido pp WHERE pp.pedido_id = p.id) AS pagamentos
      FROM pedidos p
      LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE p.tenant_id = $1
    `;
    const params = [req.usuario.tenant_id];
    if (status) { params.push(status); sql += ` AND p.status = $${params.length}`; }
    if (tipo) { params.push(tipo); sql += ` AND p.tipo = $${params.length}`; }
    if (data_inicio) { params.push(data_inicio); sql += ` AND p.criado_em >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); sql += ` AND p.criado_em <= $${params.length}::date + interval '1 day'`; }
    if (busca) { params.push(`%${busca}%`); sql += ` AND (p.nome_cliente ILIKE $${params.length} OR p.numero::text ILIKE $${params.length})`; }
    sql += ` ORDER BY p.criado_em DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const { rows } = await query(sql, params);

    const { rows: count } = await query(
      'SELECT COUNT(*) FROM pedidos WHERE tenant_id=$1' + (status ? ' AND status=$2' : ''),
      status ? [req.usuario.tenant_id, status] : [req.usuario.tenant_id]
    );
    res.json({ sucesso: true, dados: rows, total: parseInt(count[0].count) });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar pedidos.' }); }
});

// GET /api/pedidos/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*,
        (SELECT json_agg(ip ORDER BY ip.id) FROM itens_pedido ip WHERE ip.pedido_id=p.id) AS itens,
        (SELECT json_agg(pp ORDER BY pp.id) FROM pagamentos_pedido pp WHERE pp.pedido_id=p.id) AS pagamentos
       FROM pedidos p WHERE p.id=$1 AND p.tenant_id=$2`,
      [req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Pedido não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar pedido.' }); }
});

// POST /api/pedidos — criar pedido (PDV)
router.post('/', [
  body('itens').isArray({ min: 1 }).withMessage('Pedido deve ter ao menos 1 item'),
  body('itens.*.nome_produto').notEmpty(),
  body('itens.*.quantidade').isFloat({ min: 0.001 }),
  body('itens.*.preco_unitario').isFloat({ min: 0 }),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const {
    cliente_id, nome_cliente, tipo = 'balcao',
    itens, pagamentos = [], desconto = 0, taxa_entrega = 0,
    origem = 'balcao', observacoes,
  } = req.body;

  try {
    await withTransaction(async (client) => {
      // Número sequencial por tenant
      const { rows: numRows } = await client.query(
        'SELECT COALESCE(MAX(numero),0)+1 AS proximo FROM pedidos WHERE tenant_id=$1',
        [req.usuario.tenant_id]
      );
      const numero = numRows[0].proximo;

      // Calcular total
      const total = itens.reduce((acc, i) => acc + (parseFloat(i.quantidade) * parseFloat(i.preco_unitario)), 0);
      const totalFinal = parseFloat(total) - parseFloat(desconto) + parseFloat(taxa_entrega);

      const { rows: pedidoRows } = await client.query(
        `INSERT INTO pedidos (tenant_id, numero, cliente_id, nome_cliente, tipo, total, desconto, taxa_entrega, origem, observacoes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [req.usuario.tenant_id, numero, cliente_id || null, nome_cliente, tipo, totalFinal, desconto, taxa_entrega, origem, observacoes]
      );
      const pedido = pedidoRows[0];

      // Inserir itens + baixar estoque
      for (const item of itens) {
        const subtotal = parseFloat(item.quantidade) * parseFloat(item.preco_unitario);
        await client.query(
          'INSERT INTO itens_pedido (pedido_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal) VALUES ($1,$2,$3,$4,$5,$6)',
          [pedido.id, item.produto_id || null, item.nome_produto, item.quantidade, item.preco_unitario, subtotal]
        );
        // Baixar estoque do produto se informado
        if (item.produto_id) {
          await client.query(
            'UPDATE produtos SET estoque_atual = GREATEST(estoque_atual - $1, 0) WHERE id=$2 AND tenant_id=$3',
            [item.quantidade, item.produto_id, req.usuario.tenant_id]
          );
        }
      }

      // Inserir pagamentos
      for (const pag of pagamentos) {
        await client.query(
          'INSERT INTO pagamentos_pedido (pedido_id, metodo, valor, troco) VALUES ($1,$2,$3,$4)',
          [pedido.id, pag.metodo, pag.valor, pag.troco || 0]
        );
      }

      // Atualizar stats do cliente
      if (cliente_id) {
        await client.query(
          'UPDATE clientes SET total_gasto = total_gasto + $1, total_pedidos = total_pedidos + 1, pontos = pontos + $2, atualizado_em=NOW() WHERE id=$3',
          [totalFinal, Math.floor(totalFinal), cliente_id]
        );
      }

      // Lançamento financeiro automático
      await client.query(
        `INSERT INTO lancamentos_financeiros (tenant_id, tipo, categoria, descricao, valor, status, pedido_id)
         VALUES ($1,'receita','Vendas',$2,$3,'pago',$4)`,
        [req.usuario.tenant_id, `Pedido #${numero}`, totalFinal, pedido.id]
      );

      return res.status(201).json({ sucesso: true, dados: pedido });
    });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar pedido.' }); }
});

// PATCH /api/pedidos/:id/status — avançar status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const statusValidos = ['pendente','preparando','pronto','entregue','cancelado'];
  if (!statusValidos.includes(status)) return res.status(400).json({ sucesso: false, mensagem: 'Status inválido.' });

  const campoTimestamp = {
    preparando: 'preparando_em',
    pronto: 'pronto_em',
    entregue: 'entregue_em',
    cancelado: 'cancelado_em',
  };

  try {
    const campo = campoTimestamp[status];
    const { rows } = await query(
      `UPDATE pedidos SET status=$1, ${campo ? `${campo}=NOW(),` : ''} atualizado_em=NOW()
       WHERE id=$2 AND tenant_id=$3 RETURNING *`,
      [status, req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Pedido não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar status.' }); }
});

// DELETE /api/pedidos/:id — cancelar
router.delete('/:id', checkPermissao(['master','admin','gerente']), async (req, res) => {
  try {
    await query("UPDATE pedidos SET status='cancelado', cancelado_em=NOW(), atualizado_em=NOW() WHERE id=$1 AND tenant_id=$2", [req.params.id, req.usuario.tenant_id]);
    res.json({ sucesso: true, mensagem: 'Pedido cancelado.' });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao cancelar pedido.' }); }
});

module.exports = router;
