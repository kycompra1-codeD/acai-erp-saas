export const mercadoPagoService = {
  async createPixPayment(token, amount, description) {
    if (!token || token.includes('DEMO') || token === 'TEST_TOKEN') {
      console.log('[MP MOCK] Iniciando PIX mockado:', { amount, description });
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: `mock_pix_${Date.now()}`,
            qr_code: `00020101021126360014br.gov.bcb.pix0114+5511999999999520400005303986540${amount.toFixed(2).replace('.', '')}5802BR5915MERCADO PAGO SA6009SAO PAULO62070503***6304ABCD`,
            qr_code_base64: '', // Em prod retornaria um base64
            status: 'pending'
          });
        }, 800);
      });
    }

    // Chamada real para PIX via MP
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Idempotency-Key': `pix-${Date.now()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: description || 'Venda PDV (PIX)',
          payment_method_id: 'pix',
          payer: { email: 'cliente@email.com' }
        })
      });
      if (!res.ok) throw new Error('Erro ao gerar PIX');
      const data = await res.json();
      return {
        id: data.id,
        qr_code: data.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
        status: data.status
      };
    } catch (err) {
      throw err;
    }
  },

  async sendPayment(token, deviceId, amount, description) {

    try {
      const res = await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          description: description || 'Venda PDV',
          additional_info: {
            external_reference: `POS-${Date.now()}`,
            print_on_terminal: true
          }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao enviar para a maquininha.');
      }

      return await res.json(); 
    } catch (err) {
      throw err;
    }
  },

  async checkPixStatus(token, paymentId) {
    if (String(paymentId).startsWith('mock_pix_')) {
      console.log('[MP MOCK] Checando status PIX...', paymentId);
      return new Promise((resolve) => {
        const timePassed = Date.now() - parseInt(paymentId.replace('mock_pix_', ''));
        if (timePassed > 3000) {
          resolve({ status: 'approved' });
        } else {
          resolve({ status: 'pending' });
        }
      });
    }

    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao checar status do PIX.');
      return await res.json();
    } catch (err) {
      throw err;
    }
  },

  async checkIntentStatus(token, intentId) {
    // Modo Demonstração
    if (intentId.startsWith('mock_intent_')) {
      console.log('[MP MOCK] Checando status...', intentId);
      return new Promise((resolve) => {
        // Simula 3 segundos antes de aprovar
        const timePassed = Date.now() - parseInt(intentId.replace('mock_intent_', ''));
        if (timePassed > 3000) {
          resolve({ state: 'FINISHED' });
        } else {
          resolve({ state: 'PROCESSING' });
        }
      });
    }

    try {
      const res = await fetch(`https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Erro ao checar status do pagamento.');
      return await res.json();
    } catch (err) {
      throw err;
    }
  },

  async cancelIntent(token, deviceId, intentId) {
    if (intentId && intentId.startsWith('mock_intent_')) {
      console.log('[MP MOCK] Cancelando intent', intentId);
      return;
    }

    try {
      await fetch(`https://api.mercadopago.com/point/integration-api/devices/${deviceId}/payment-intents/${intentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Falha ao cancelar intent', err);
    }
  }
};
