const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../db/connection');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// ── Mercado Pago SDK ─────────────────────────────────────────
let mpClient, Payment, Preference;
try {
  const mp = require('mercadopago');
  const { MercadoPagoConfig } = mp;
  Payment = mp.Payment;
  Preference = mp.Preference;
  if (process.env.MP_ACCESS_TOKEN) {
    mpClient = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
      options: { timeout: 5000 },
    });
  }
} catch {
  console.warn('⚠️  SDK mercadopago não instalado. Execute: cd backend && npm install mercadopago');
}

const APP_URL = process.env.FRONTEND_URL || 'https://app.zullya.com.br';

// ============================================================
// GET /api/pagamentos/planos — Lista pública de planos ativos
// ============================================================
router.get('/planos', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT id, nome, descricao, valor_mensal, valor_anual, trial_dias,
             max_usuarios, modulos, destaque, ativo
      FROM planos
      WHERE ativo = true
      ORDER BY valor_mensal
    `);
    return res.json({ sucesso: true, dados: rows });
  } catch (err) {
    console.error('❌ GET /pagamentos/planos:', err.message);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// GET /api/pagamentos/minha-assinatura — Assinatura do tenant logado
// ============================================================
router.get('/minha-assinatura', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT a.id, a.status, a.periodo, a.valor, a.proximo_vencimento,
             a.criado_em, a.mp_subscription_id,
             p.nome as plano_nome, p.valor_mensal, p.valor_anual,
             t.status as tenant_status, t.trial_expira_em
      FROM assinaturas a
      JOIN planos p ON p.id = a.plano_id
      JOIN tenants t ON t.id = a.tenant_id
      WHERE a.tenant_id = $1
      ORDER BY a.criado_em DESC
      LIMIT 1
    `, [req.tenant_id]);

    if (rows.length === 0) {
      return res.json({ sucesso: true, dados: null });
    }
    return res.json({ sucesso: true, dados: rows[0] });
  } catch (err) {
    console.error('❌ GET /minha-assinatura:', err.message);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// GET /api/pagamentos/faturas — Histórico de pagamentos
// ============================================================
router.get('/faturas', authMiddleware, async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT a.id, a.status, a.periodo, a.valor, a.criado_em,
             a.proximo_vencimento, a.mp_payment_id,
             p.nome as plano_nome
      FROM assinaturas a
      JOIN planos p ON p.id = a.plano_id
      WHERE a.tenant_id = $1
        AND a.status IN ('ativa','trial')
      ORDER BY a.criado_em DESC
      LIMIT 24
    `, [req.tenant_id]);

    return res.json({ sucesso: true, dados: rows });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno.' });
  }
});

// ============================================================
// POST /api/pagamentos/checkout — Iniciar pagamento no MP
// ============================================================
router.post('/checkout', authMiddleware, [
  body('plano_id').isUUID(),
  body('periodo').isIn(['mensal', 'anual']),
  body('metodo').isIn(['cartao', 'pix']),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ sucesso: false, erros: erros.array() });
  }

  if (!mpClient) {
    return res.status(503).json({
      sucesso: false,
      mensagem: 'Pagamentos temporariamente indisponíveis. Configure MP_ACCESS_TOKEN.',
    });
  }

  const { plano_id, periodo, metodo } = req.body;

  try {
    // Buscar plano
    const { rows: planos } = await query(
      'SELECT * FROM planos WHERE id = $1 AND ativo = true',
      [plano_id]
    );
    if (planos.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Plano não encontrado.' });
    }
    const plano = planos[0];

    // Buscar dados do tenant/usuário
    const { rows: usuarios } = await query(
      `SELECT u.nome, u.email, t.nome_empresa
       FROM usuarios u JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = $1`,
      [req.usuario_id]
    );
    const user = usuarios[0];

    const valor = periodo === 'anual'
      ? parseFloat(plano.valor_anual || plano.valor_mensal * 12 * 0.8)
      : parseFloat(plano.valor_mensal);

    const descricao = `Zullya ERP — Plano ${plano.nome} (${periodo})`;

    // ── PIX: cria pagamento direto ───────────────────────────
    if (metodo === 'pix') {
      const paymentApi = new Payment(mpClient);
      const payment = await paymentApi.create({
        body: {
          transaction_amount: valor,
          description: descricao,
          payment_method_id: 'pix',
          payer: { email: user.email, first_name: user.nome },
          external_reference: req.tenant_id,
          metadata: {
            tenant_id: req.tenant_id,
            plano_id,
            periodo,
          },
          notification_url: `${process.env.BACKEND_URL || 'https://api.zullya.com.br'}/api/webhooks/mercadopago`,
        },
      });

      return res.json({
        sucesso: true,
        tipo: 'pix',
        dados: {
          payment_id: payment.id,
          qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
          valor,
          expiracao: payment.date_of_expiration,
        },
      });
    }

    // ── Cartão: cria Checkout Pro (redirect) ─────────────────
    const preferenceApi = new Preference(mpClient);
    const preference = await preferenceApi.create({
      body: {
        items: [{
          title: descricao,
          quantity: 1,
          unit_price: valor,
          currency_id: 'BRL',
        }],
        payer: { email: user.email, name: user.nome },
        external_reference: req.tenant_id,
        metadata: { tenant_id: req.tenant_id, plano_id, periodo },
        back_urls: {
          success: `${APP_URL}/assinatura?pagamento=aprovado`,
          failure: `${APP_URL}/assinatura?pagamento=falhou`,
          pending: `${APP_URL}/assinatura?pagamento=pendente`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL || 'https://api.zullya.com.br'}/api/webhooks/mercadopago`,
        statement_descriptor: 'ZULLYA ERP',
      },
    });

    return res.json({
      sucesso: true,
      tipo: 'cartao',
      dados: {
        preference_id: preference.id,
        init_point: preference.init_point,
        valor,
      },
    });

  } catch (err) {
    console.error('❌ POST /checkout:', err.message);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao processar pagamento. Tente novamente.',
    });
  }
});

// ============================================================
// GET /api/pagamentos/status/:payment_id — Polling do PIX
// ============================================================
router.get('/status/:payment_id', authMiddleware, async (req, res) => {
  if (!mpClient) {
    return res.status(503).json({ sucesso: false, mensagem: 'Pagamentos indisponíveis.' });
  }

  try {
    const paymentApi = new Payment(mpClient);
    const payment = await paymentApi.get({ id: req.params.payment_id });

    return res.json({
      sucesso: true,
      dados: {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
      },
    });
  } catch (err) {
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao consultar status.' });
  }
});

module.exports = router;
