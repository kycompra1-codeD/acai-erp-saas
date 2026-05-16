// ============================================================
// EVENT BUS — Zullya ERP
// Comunicação desacoplada entre serviços via eventos
// Eventos: weight:update | sale:created | payment:approved
//          print:requested | stock:updated | kitchen:refresh
// ============================================================

class EventBus {
  constructor() {
    this._listeners = {};
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    // Retorna função de cleanup
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(cb => {
      try { cb(data); } catch (e) { console.error(`[EventBus] Error in "${event}" handler:`, e); }
    });
  }

  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}

// Singleton global
export const eventBus = new EventBus();

// Constantes de eventos
export const EVENTS = {
  WEIGHT_UPDATE:      'weight:update',
  SALE_CREATED:       'sale:created',
  PAYMENT_APPROVED:   'payment:approved',
  PRINT_REQUESTED:    'print:requested',
  STOCK_UPDATED:      'stock:updated',
  KITCHEN_REFRESH:    'kitchen:refresh',
  SCALE_CONNECTED:    'scale:connected',
  SCALE_DISCONNECTED: 'scale:disconnected',
  HUB_SYNC_START:     'hub:sync_start',
  HUB_SYNC_SUCCESS:   'hub:sync_success',
  HUB_SYNC_ERROR:     'hub:sync_error',
  HUB_ORDER_RECEIVED: 'hub:order_received',
};
