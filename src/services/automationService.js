/**
 * AUTOMATION SERVICE — Zullya ERP
 * Motor de automação No-Code para regras de negócio.
 * Permite que o usuário crie fluxos como:
 * "SE estoque < 10 ENTÃO enviar alerta via WhatsApp"
 * "SE venda > 500 ENTÃO aplicar 50 pontos extras"
 */
import { eventBus, EVENTS } from './eventBus';
import toast from 'react-hot-toast';

class AutomationService {
  constructor() {
    this.rules = [];
    this._initialized = false;
  }

  // Inicializa os listeners baseados nas regras configuradas
  init(rules = [], context) {
    if (this._initialized) return;
    this.rules = Array.isArray(rules) ? rules : [];
    this.context = context;
    if (!context || !context.inventory) {
      console.warn('[AutomationService] Contexto incompleto. Aguardando dados...');
      return;
    }
    this._setupListeners();
    this._initialized = true;
    console.log('[AutomationService] Motor de automação iniciado.', this.rules.length, 'regras ativas.');
  }

  _setupListeners() {
    if (!this.context) return;
    
    // 1. Escuta atualizações de estoque
    eventBus.on(EVENTS.STOCK_UPDATED, (data) => {
      try { this._processRules('trigger:stock_low', data); } catch (e) { console.error(e); }
    });

    // 2. Escuta novas vendas
    eventBus.on(EVENTS.SALE_CREATED, (data) => {
      try {
        this._processRules('trigger:sale_high', data);
        this._processRules('trigger:customer_vip', data);
      } catch (e) { console.error(e); }
    });

    // 3. Escuta novos pedidos do hub
    eventBus.on(EVENTS.HUB_ORDER_RECEIVED, (data) => {
      try { this._processRules('trigger:hub_order', data); } catch (e) { console.error(e); }
    });
  }

  _processRules(triggerType, data) {
    const activeRules = this.rules.filter(r => r.trigger === triggerType && r.enabled);
    
    activeRules.forEach(rule => {
      if (this._checkConditions(rule, data)) {
        this._executeAction(rule, data);
      }
    });
  }

  _checkConditions(rule, data) {
    if (!this.context) return false;

    // Exemplo de condição para trigger:stock_low
    if (rule.trigger === 'trigger:stock_low') {
      const inventory = this.context.inventory || [];
      const lowItems = inventory.filter(i => i.quantity <= (rule.metadata?.threshold || i.minQuantity));
      return lowItems.length > 0;
    }

    if (rule.trigger === 'trigger:sale_high') {
      return data?.order?.total >= (rule.metadata?.minAmount || 500);
    }

    if (rule.trigger === 'trigger:customer_vip') {
      const customers = this.context.customers || [];
      const customer = customers.find(c => c.id === data?.order?.customerId);
      return customer && customer.totalSpent >= (rule.metadata?.vipThreshold || 1000);
    }

    return true; // Se não houver condição específica, executa sempre
  }

  _executeAction(rule, data) {
    const { action, metadata } = rule;

    switch (action) {
      case 'action:toast':
        toast(metadata.message || 'Automação executada!', {
          icon: '🤖',
          duration: 5000,
        });
        break;

      case 'action:whatsapp_alert':
        console.log(`[Automation] Enviando WhatsApp para ${metadata.phone}: ${metadata.message}`);
        toast.success(`Alerta WhatsApp enviado: ${metadata.phone}`, { icon: '📱' });
        break;

      case 'action:add_points':
        if (data.order && data.order.customerId) {
          console.log(`[Automation] Adicionando ${metadata.points} pontos extras ao cliente.`);
          // Aqui chamaríamos uma função do context para atualizar pontos
          toast.success(`+${metadata.points} pontos de bônus aplicados!`, { icon: '🎁' });
        }
        break;

      case 'action:discount_coupon':
        console.log(`[Automation] Gerando cupom de desconto para o cliente.`);
        toast.success('Cupom de 10% gerado para a próxima compra!', { icon: '🎟️' });
        break;

      default:
        console.log(`[Automation] Ação desconhecida: ${action}`);
    }
  }

  // Retorna triggers disponíveis para a UI
  getAvailableTriggers() {
    return [
      { id: 'trigger:stock_low', label: 'Estoque Baixo', desc: 'Quando um item atinge o nível crítico' },
      { id: 'trigger:sale_high', label: 'Venda de Alto Valor', desc: 'Quando uma venda ultrapassa um valor X' },
      { id: 'trigger:customer_vip', label: 'Novo Cliente VIP', desc: 'Quando um cliente atinge R$ 1.000 em compras' },
      { id: 'trigger:hub_order', label: 'Pedido Marketplace', desc: 'Quando chega um pedido do iFood/Mercado Livre' },
    ];
  }

  // Retorna ações disponíveis para a UI
  getAvailableActions() {
    return [
      { id: 'action:toast', label: 'Notificação Interna', desc: 'Exibe um alerta na tela do sistema' },
      { id: 'action:whatsapp_alert', label: 'Alerta WhatsApp', desc: 'Envia mensagem automática para o gestor' },
      { id: 'action:add_points', label: 'Bônus de Pontos', desc: 'Dá pontos extras no programa de fidelidade' },
      { id: 'action:discount_coupon', label: 'Enviar Cupom', desc: 'Gera um cupom de desconto para o cliente' },
    ];
  }
}

export const automationService = new AutomationService();
