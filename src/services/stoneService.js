export const stoneService = {
  async sendPayment(token, amount, description) {
    if (!token || token.includes('DEMO') || token === 'TEST_TOKEN') {
      console.log('[STONE MOCK] Enviando transação para o terminal Stone', { amount, description });
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: `mock_stone_intent_${Date.now()}`,
            status: 'PROCESSING',
            provider: 'stone'
          });
        }, 800);
      });
    }

    // Chamada real para Stone API
    try {
      const res = await fetch(`https://api.stone.com.br/v1/terminals/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          description: description || 'Venda PDV',
          print_receipt: true
        })
      });

      if (!res.ok) {
        throw new Error('Erro ao enviar para a maquininha Stone.');
      }

      return await res.json(); 
    } catch (err) {
      throw err;
    }
  },

  async checkIntentStatus(token, intentId) {
    // Modo Demonstração
    if (intentId.startsWith('mock_stone_intent_')) {
      console.log('[STONE MOCK] Checando status...', intentId);
      return new Promise((resolve) => {
        const timePassed = Date.now() - parseInt(intentId.replace('mock_stone_intent_', ''));
        if (timePassed > 3000) {
          resolve({ state: 'FINISHED' });
        } else {
          resolve({ state: 'PROCESSING' });
        }
      });
    }

    try {
      const res = await fetch(`https://api.stone.com.br/v1/terminals/payments/${intentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao checar status na Stone.');
      return await res.json();
    } catch (err) {
      throw err;
    }
  },

  async cancelIntent(token, intentId) {
    if (intentId && intentId.startsWith('mock_stone_intent_')) {
      console.log('[STONE MOCK] Cancelando intent', intentId);
      return;
    }

    try {
      await fetch(`https://api.stone.com.br/v1/terminals/payments/${intentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Falha ao cancelar intent Stone', err);
    }
  }
};
