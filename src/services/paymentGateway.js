import { mercadoPagoService } from './mercadoPagoService';
import { stoneService } from './stoneService';
import { pagSeguroService } from './pagSeguroService';

export const paymentGateway = {
  async sendToTerminal(amount, description, config) {
    const provider = config?.defaultTerminalProvider || 'mercadopago';

    switch (provider) {
      case 'stone':
        if (!config.stoneEnabled) throw new Error('Stone não está habilitada nas configurações.');
        return await stoneService.sendPayment(config.stoneCode, amount, description);

      case 'pagseguro':
        if (!config.pagSeguroEnabled) throw new Error('PagSeguro não está habilitado nas configurações.');
        return await pagSeguroService.sendPayment(config.pagSeguroToken, config.pagSeguroDeviceId, amount, description);

      case 'mercadopago':
      default:
        if (!config.mercadoPagoEnabled) throw new Error('Mercado Pago não está habilitado nas configurações.');
        return await mercadoPagoService.sendPayment(config.mercadoPagoToken, config.mercadoPagoDeviceId, amount, description);
    }
  },

  async checkTerminalStatus(intentId, config) {
    const provider = config?.defaultTerminalProvider || 'mercadopago';

    switch (provider) {
      case 'stone':
        return await stoneService.checkIntentStatus(config.stoneCode, intentId);

      case 'pagseguro':
        return await pagSeguroService.checkIntentStatus(config.pagSeguroToken, intentId);

      case 'mercadopago':
      default:
        return await mercadoPagoService.checkIntentStatus(config.mercadoPagoToken, intentId);
    }
  },

  async cancelTerminalPayment(intentId, config) {
    const provider = config?.defaultTerminalProvider || 'mercadopago';

    switch (provider) {
      case 'stone':
        return await stoneService.cancelIntent(config.stoneCode, intentId);

      case 'pagseguro':
        return await pagSeguroService.cancelIntent(config.pagSeguroToken, config.pagSeguroDeviceId, intentId);

      case 'mercadopago':
      default:
        return await mercadoPagoService.cancelIntent(config.mercadoPagoToken, config.mercadoPagoDeviceId, intentId);
    }
  },

  // PIX Dinâmico geralmente tem um provedor específico que o lojista usa
  // Aqui mantemos via Mercado Pago para simplificar, mas a estrutura permite evoluir.
  async createPixPayment(amount, description, config) {
    if (!config?.pixEnabled) throw new Error('PIX Dinâmico não está habilitado.');
    return await mercadoPagoService.createPixPayment(config.mercadoPagoToken, amount, description);
  },

  async checkPixStatus(paymentId, config) {
    return await mercadoPagoService.checkPixStatus(config.mercadoPagoToken, paymentId);
  }
};
