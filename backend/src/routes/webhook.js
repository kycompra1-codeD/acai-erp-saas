const express = require('express');
const crypto = require('crypto');
const { query, withTransaction } = require('../db/connection');

const router = express.Router();

// ============================================================
// Verificação de assinatura HMAC do RRPay
// ============================================================
const verificarAssinaturaRRPay = (req, rawBody) => {
  const secret = process.env.RRPAY_WEBHOOK_SECRET;
  if (!secret) return true; // Em dev, pular verificação

  const assinatura = req.headers['x-rrpay-signature'] || req.headers['x-webhook-signature'];
  if (!assinatura) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const calculado = 'sha256=' + hmac.digest('hex');

  return crypto.timingSafeEqual(Buffer.from(calculado), Buffer.from(assinatura));
};

// Middleware para capturar o body raw para verificação HMAC
router.use(express.raw({ type: 'application/json' }));

// ============================================================
// POST /api/webhooks/rrpay - Receber eventos do RRPay
// ============================================================
router.post('/rrpay', async (req, res) => {
  const rawBody = req.body;
  let payload;

  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ erro: 'Payload inválido.' });
  }

  // Verificar autenticidade do webhook
  if (!verificarAssinaturaRRPay(req, rawBody)) {
    console.warn('⚠️  Webhook RRPay rejeitado: assinatura inválida');
    return res.status(401).json({ erro: 'Assinatura inválida.' });
  }

  const evento = payload.event || payload.tipo || 'desconhecido';
  const dados = payload.data || payload.dados || payload;

  // Salvar o log do webhook ANTES de processar
  let logId;
  try {
    const { rows } = await query(
      `INSERT INTO webhook_logs (gateway, evento, payload) VALUES ('rrpay', $1, $2) RETURNING id`,
      [evento, payload]
    );
    logId = rows[0].id;
  } catch (err) {
    console.error('❌ Falha ao salvar log do webhook:', err.message);
  }

  // Responder imediatamente ao RRPay (evitar timeout)
  res.status(200).json({ recebido: true, evento });

  // Processar em background (não bloqueante)
  processarEvento(evento, dados, logId).catch((err) => {
    console.error(`❌ Erro ao processar evento "${evento}":`, err.message);
  });
});

// ============================================================
// Processador de eventos
// ============================================================
const processarEvento = async (evento, dados, logId) => {
  console.log(`📩 Processando webhook RRPay: ${evento}`);

  try {
    switch (evento) {
      // ---- PAGAMENTO APROVADO ----
      case 'payment.approved':
      case 'payment_approved':
      case 'pagamento.aprovado':
        await handlePagamentoAprovado(dados);
        break;

      // ---- ASSINATURA RENOVADA ----
      case 'subscription.renewed':
      case 'subscription_renewed':
        await handleAssinaturaRenovada(dados);
        break;

      // ---- ASSINATURA CANCELADA ----
      case 'subscription.cancelled':
      case 'subscription_cancelled':
      case 'assinatura.cancelada':
        await handleAssinaturaCancelada(dados);
        break;

      // ---- PAGAMENTO VENCIDO / INADIMPLÊNCIA ----
      case 'payment.overdue':
      case 'payment_overdue':
      case 'pagamento.vencido':
        await handlePagamentoVencido(dados);
        break;

      // ---- CHARGEBACK ----
      case 'payment.chargeback':
        await handleChargeback(dados);
        break;

      default:
        console.log(`ℹ️  Evento não mapeado ignorado: ${evento}`);
    }

    // Marcar webhook como processado
    if (logId) {
      await query('UPDATE webhook_logs SET processado = true WHERE id = $1', [logId]);
    }
  } catch (err) {
    if (logId) {
      await query(
        'UPDATE webhook_logs SET erro = $1 WHERE id = $2',
        [err.message, logId]
      );
    }
    throw err;
  }
};

// ============================================================
// Handlers de eventos
// ============================================================

const handlePagamentoAprovado = async (dados) => {
  const { tenant_id, plano_id, gateway_subscription_id, periodo, valor } = extrairDados(dados);
  if (!tenant_id && !gateway_subscription_id) return;

  await withTransaction(async (client) => {
    // Atualizar ou criar assinatura ativa
    await client.query(
      `INSERT INTO assinaturas (tenant_id, plano_id, status, periodo, valor, gateway_subscription_id, proximo_vencimento)
       VALUES ($1, $2, 'ativa', $3, $4, $5, NOW() + INTERVAL '1 month')
       ON CONFLICT (tenant_id, gateway_subscription_id) DO UPDATE
       SET status = 'ativa', proximo_vencimento = NOW() + INTERVAL '1 month', atualizado_em = NOW()`,
      [tenant_id, plano_id, periodo || 'mensal', valor || 0, gateway_subscription_id]
    );

    // Ativar o tenant
    await client.query(
      `UPDATE tenants SET status = 'ativo', plano_id = COALESCE($2, plano_id) WHERE id = $1`,
      [tenant_id, plano_id]
    );
  });

  console.log(`✅ Tenant ${tenant_id} ativado — pagamento aprovado.`);
};

const handleAssinaturaRenovada = async (dados) => {
  await handlePagamentoAprovado(dados);
};

const handleAssinaturaCancelada = async (dados) => {
  const { tenant_id, gateway_subscription_id } = extrairDados(dados);
  if (!tenant_id) return;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE assinaturas SET status = 'cancelada', cancelado_em = NOW() 
       WHERE tenant_id = $1 AND (gateway_subscription_id = $2 OR $2 IS NULL)`,
      [tenant_id, gateway_subscription_id]
    );
    await client.query(
      `UPDATE tenants SET status = 'cancelado' WHERE id = $1`,
      [tenant_id]
    );
  });

  console.log(`🚫 Tenant ${tenant_id} cancelado.`);
};

const handlePagamentoVencido = async (dados) => {
  const { tenant_id } = extrairDados(dados);
  if (!tenant_id) return;

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE assinaturas SET status = 'vencida' WHERE tenant_id = $1 AND status = 'ativa'`,
      [tenant_id]
    );
    await client.query(
      `UPDATE tenants SET status = 'inadimplente' WHERE id = $1`,
      [tenant_id]
    );
  });

  console.log(`⚠️  Tenant ${tenant_id} marcado como inadimplente.`);
};

const handleChargeback = async (dados) => {
  const { tenant_id } = extrairDados(dados);
  if (!tenant_id) return;

  await query(`UPDATE tenants SET status = 'suspenso' WHERE id = $1`, [tenant_id]);
  console.log(`🔴 Tenant ${tenant_id} suspenso por chargeback.`);
};

// Helper para extrair campos de diferentes formatos do RRPay
const extrairDados = (dados) => ({
  tenant_id: dados.tenant_id || dados.customer?.external_id || dados.metadata?.tenant_id,
  plano_id: dados.plano_id || dados.metadata?.plano_id,
  gateway_subscription_id: dados.subscription_id || dados.id,
  periodo: dados.periodo || dados.interval || 'mensal',
  valor: dados.amount ? dados.amount / 100 : dados.valor,
});

// ============================================================
// GET /api/webhooks/status - Health check do webhook
// ============================================================
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    mensagem: 'Endpoint de webhook RRPay ativo.',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
