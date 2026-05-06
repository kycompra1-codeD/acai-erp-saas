import { eventBus, EVENTS } from './eventBus';

// Mock de Canais Disponíveis
export const CHANNELS = [
  { id: 'ifood', name: 'iFood', icon: '🍔', color: '#ea1d2c' },
  { id: 'mercado_livre', name: 'Mercado Livre', icon: '📦', color: '#ffe600' },
  { id: 'shopee', name: 'Shopee', icon: '🧡', color: '#ee4d2d' },
];

class MarketplaceService {
  /**
   * Simula a sincronização de um produto para todos os canais mapeados
   */
  async syncInventory(product, channels = []) {
    if (!product.mappings || Object.keys(product.mappings).length === 0) return;

    eventBus.emit(EVENTS.HUB_SYNC_START, { productId: product.id, name: product.name });

    for (const [channelId, externalSku] of Object.entries(product.mappings)) {
      if (!externalSku) continue;

      // Simula delay de rede
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 1000));

      const success = Math.random() > 0.05; // 95% de chance de sucesso

      if (success) {
        eventBus.emit(EVENTS.HUB_SYNC_SUCCESS, {
          channelId,
          productId: product.id,
          sku: externalSku,
          stock: product.stock,
          timestamp: new Date().toISOString()
        });
      } else {
        eventBus.emit(EVENTS.HUB_SYNC_ERROR, {
          channelId,
          productId: product.id,
          sku: externalSku,
          error: 'Timeout na API do Marketplace',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Simula a recepção de um pedido externo (Webhook)
   */
  simulateIncomingOrder(channelId) {
    const channel = CHANNELS.find(c => c.id === channelId);
    const orderId = `HUB-${Math.floor(Math.random() * 10000)}`;
    
    eventBus.emit(EVENTS.HUB_ORDER_RECEIVED, {
      id: orderId,
      channelId,
      channelName: channel?.name || 'Marketplace',
      total: (Math.random() * 50 + 20).toFixed(2),
      status: 'pending',
      timestamp: new Date().toISOString()
    });
  }
}

export const marketplaceService = new MarketplaceService();
