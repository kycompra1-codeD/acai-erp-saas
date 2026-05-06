export const pagSeguroService = {
  async sendPayment(token, deviceId, amount, description) {
    if (!token || token.includes('DEMO') || token === 'TEST_TOKEN') {
      console.log('[PAGSEGURO MOCK] Enviando transação para o terminal PlugPag', { amount, description });
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: `mock_pagseguro_intent_${Date.now()}`,
            status: 'PROCESSING',
            provider: 'pagseguro'
          });
        }, 800);
      });
    }

    // Chamada real para PagSeguro PlugPag API
    try {
      const res = await fetch(`https://sandbox.api.pagseguro.com/plugpag/v1/terminals/${deviceId}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: { value: Math.round(amount * 100), currency: 'BRL' },
          description: description || 'Venda PDV',
          print_receipt: true
        })
      });

      if (!res.ok) {
        throw new Error('Erro ao enviar para a maquininha PagSeguro.');
      }

      return await res.json(); 
    } catch (err) {
      throw err;
    }
  },

  async checkIntentStatus(token, intentId) {
    // Modo Demonstração
    if (intentId.startsWith('mock_pagseguro_intent_')) {
      console.log('[PAGSEGURO MOCK] Checando status...', intentId);
      return new Promise((resolve) => {
        const timePassed = Date.now() - parseInt(intentId.replace('mock_pagseguro_intent_', ''));
        if (timePassed > 3000) {
          resolve({ state: 'FINISHED' });
        } else {
          resolve({ state: 'PROCESSING' });
        }
      });
    }

    try {
      const res = await fetch(`https://sandbox.api.pagseguro.com/plugpag/v1/payments/${intentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao checar status no PagSeguro.');
      const data = await res.json();
      return { state: data.status === 'APPROVED' ? 'FINISHED' : 'PROCESSING' };
    } catch (err) {
      throw err;
    }
  },

  async cancelIntent(token, deviceId, intentId) {
    if (intentId && intentId.startsWith('mock_pagseguro_intent_')) {
      console.log('[PAGSEGURO MOCK] Cancelando intent', intentId);
      return;
    }

    try {
      await fetch(`https://sandbox.api.pagseguro.com/plugpag/v1/terminals/${deviceId}/payments/${intentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Falha ao cancelar intent PagSeguro', err);
    }
  }
};
