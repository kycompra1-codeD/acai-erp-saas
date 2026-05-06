// PRINT SERVICE — Açaí ERP SaaS
// Lê configurações salvas no AppContext (localStorage)
// Impressão via window.print() em janela popup 80mm
// ============================================================

import { eventBus, EVENTS } from './eventBus';

function fmt(v) {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return new Date().toLocaleString('pt-BR');
  }
}

/** Lê as configurações salvas no localStorage pelo AppContext */
function loadSettings() {
  try {
    const raw = localStorage.getItem('acai_system_data');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const activeCompanyId = parsed.activeCompanyId;
    const settings = parsed.settings?.[activeCompanyId] || {};
    const company = parsed.companies?.find(c => c.id === activeCompanyId) || {};
    return {
      ...settings,
      storeName: company.name || settings.storeName || '',
      storeCnpj: company.document || settings.storeCnpj || '',
      storeAddress: company.address || settings.storeAddress || '',
      storePhone: company.phone || settings.storePhone || ''
    };
  } catch {
    return {};
  }
}

function generateCouponHTML(order, overrideSettings = {}) {
  const cfg = { ...loadSettings(), ...overrideSettings };

  const storeName   = cfg.storeName   || 'Açaí ERP SaaS';
  const storePhone  = cfg.storePhone  || '';
  const storeAddress= cfg.storeAddress|| '';
  const storeCnpj   = cfg.storeCnpj   || '';

  const printHeader       = cfg.printHeader       || '';
  const printFooter       = cfg.printFooter       || 'Obrigado pela preferência! Volte sempre!';
  const printLoyaltyMsg   = cfg.printLoyaltyMsg   || '';
  const printPixKey       = cfg.printPixKey        || '';
  const printShowQr       = cfg.printShowQr        === true;
  const printShowCnpj     = cfg.printShowCnpj      !== false; // default true
  const printShowAddress  = cfg.printShowAddress   !== false;
  const printShowOrderNumber = cfg.printShowOrderNumber !== false;
  const printShowTime     = cfg.printShowTime      !== false;
  const printSeparator    = cfg.printSeparator     || 'linha';
  const printCupomWidth   = cfg.printCupomWidth    || '80mm';
  const printFont         = cfg.printFont          || 'normal';
  const printFontWeight   = cfg.printFontWeight    || 'normal';
  const printLogo         = cfg.printLogo          || null;

  const fontSize    = printFont === 'compacta' ? '11px' : '12px';
  const separatorEl = printSeparator === 'linha'  ? '<div class="divider"></div>'
                    : printSeparator === 'espaco' ? '<br/>'
                    : '';

  const itemsRows = (order.items || []).map(item => `
    <tr>
      <td>${item.quantity}x ${item.name}</td>
      <td class="right">${fmt(item.price * item.quantity)}</td>
    </tr>
  `).join('');

  const getEmoji = (method) => ({ pix: '🔑', credito: '💳', debito: '💳', dinheiro: '💵' }[method] || '💳');
  const paymentRows = (order.payments || [{ method: order.payment || 'Dinheiro', amount: order.total }]).map(p => `
    <tr><td>${p.method.toUpperCase()}</td><td class="right">${getEmoji(p.method)} ${fmt(p.amount)}</td></tr>
  `).join('');

  const logoHTML = printLogo
    ? `<div class="center"><img src="${printLogo}" alt="logo" style="max-width:80px;max-height:48px;object-fit:contain;" /></div>`
    : `<div class="logo">🍇 ${storeName.toUpperCase()}</div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Cupom #${order.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: ${fontSize};
      font-weight: ${printFontWeight};
      width: ${printCupomWidth};
      padding: 8px;
      color: #000 !important;
      background: #fff;
      -webkit-font-smoothing: none;
      text-shadow: 0 0 1px rgba(0,0,0,0.5);
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .big { font-size: 16px; font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; vertical-align: top; }
    .total-row td { font-size: 14px; font-weight: bold; }
    .logo { font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-bottom: 2px; text-align: center; }
    .italic { font-style: italic; }
    .small { font-size: 10px; font-weight: bold; }
    .qr-box { width: 60px; height: 60px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; margin: 4px auto; font-size: 10px; }
    @media print {
      body { width: ${printCupomWidth}; }
      @page { margin: 0; size: ${printCupomWidth} auto; }
    }
  </style>
</head>
<body>
  <div class="center">
    ${logoHTML}
    ${printShowCnpj && storeCnpj ? `<div class="small">CNPJ: ${storeCnpj}</div>` : ''}
    ${printShowAddress && storeAddress ? `<div class="small">${storeAddress}</div>` : ''}
    ${storePhone ? `<div class="small">${storePhone}</div>` : ''}
    <div class="divider"></div>
    <div class="bold">CUPOM NÃO FISCAL</div>
    ${printHeader ? `<div class="italic small" style="margin-top:3px">${printHeader}</div>` : ''}
  </div>

  <div class="divider"></div>

  <table>
    ${printShowOrderNumber ? `<tr><td><span class="bold">Pedido:</span></td><td class="right bold">#${String(order.number).padStart(4, '0')}</td></tr>` : ''}
    <tr><td><span class="bold">Cliente:</span></td><td class="right">${order.customerName || 'Balcão'}</td></tr>
    <tr><td><span class="bold">Tipo:</span></td><td class="right" style="text-transform:capitalize">${order.type || 'balcão'}</td></tr>
    ${printShowTime ? `<tr><td><span class="bold">Data:</span></td><td class="right">${formatDateTime(order.createdAt || new Date().toISOString())}</td></tr>` : ''}
  </table>

  <div class="divider"></div>

  <table>
    <thead>
      <tr><td class="bold">Item</td><td class="bold right">Valor</td></tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  ${separatorEl}

  <table>
    ${order.weightKg ? `<tr><td>Peso</td><td class="right">${Number(order.weightKg).toFixed(3)} kg</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td class="right">${fmt(order.total)}</td></tr>
    ${paymentRows}
    ${order.troco ? `<tr><td>Troco</td><td class="right">${fmt(order.troco)}</td></tr>` : ''}
  </table>

  ${order.notes ? `<div class="divider"></div><div><span class="bold">Obs:</span> ${order.notes}</div>` : ''}

  <div class="divider"></div>
  <div class="center">
    ${printLoyaltyMsg ? `<div class="italic small" style="margin-bottom:4px">${printLoyaltyMsg}</div>` : ''}
    ${printShowQr && printPixKey ? `
    <div style="margin:6px 0">
      <div class="qr-box">QR<br/>PIX</div>
      <div class="small">Pix: ${printPixKey}</div>
    </div>` : ''}
    <div>${printFooter}</div>
    <div class="small" style="margin-top:4px">${new Date().toLocaleString('pt-BR')}</div>
  </div>
</body>
</html>`;
}

class PrintService {
  constructor() {
    this._config = {
      enabled: true,
      mode: 'browser',
    };
  }

  configure(config) {
    this._config = { ...this._config, ...config };
  }

  /** Testa impressão com um pedido fictício */
  printTest() {
    const testOrder = {
      id: 'TEST',
      number: 9999,
      customerName: 'Cliente Teste',
      type: 'balcão',
      payments: [
        { method: 'dinheiro', amount: 20 },
        { method: 'pix', amount: 11.9 }
      ],
      createdAt: new Date().toISOString(),
      items: [
        { name: 'Açaí 500ml', price: 22.9, quantity: 1 },
        { name: 'Granola Extra', price: 3.5, quantity: 2 },
        { name: 'Morango', price: 2.0, quantity: 1 },
      ],
      total: 31.9,
    };
    this._printBrowser(testOrder);
  }

  printOrder(order) {
    if (!this._config.enabled) return;
    eventBus.emit(EVENTS.PRINT_REQUESTED, { type: 'order', orderId: order.id, orderNumber: order.number });
    this._printBrowser(order);
  }

  printKitchenTicket(order) {
    const cfg = loadSettings();
    if (cfg.kitchenPrinterEnabled === false) return;
    
    eventBus.emit(EVENTS.PRINT_REQUESTED, { type: 'kitchen', orderId: order.id });
    this._printBrowser(order, false, true);
  }

  _printBrowser(order, _unused = false, kitchenMode = false) {
    const html = kitchenMode ? this._generateKitchenHTML(order) : generateCouponHTML(order);
    const win = window.open('', '_blank', 'width=600,height=800,scrollbars=yes');
    if (!win) {
      alert('Pop-up bloqueado!\nPermita pop-ups para este site e tente novamente.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      setTimeout(() => win.close(), 1500);
    }, 400);
  }

  _generateKitchenHTML(order) {
    const cfg = loadSettings();
    
    // Configurações da Cozinha
    const enabled    = cfg.kitchenPrinterEnabled !== false;
    const paperWidth = cfg.kitchenPaperWidth || '80mm';
    const font       = cfg.kitchenFont === 'Mono' ? "'Courier New', monospace" 
                     : cfg.kitchenFont === 'Serif' ? "Georgia, serif" 
                     : "Arial, sans-serif";
    const fontSize   = cfg.kitchenFontSize || '13px';
    const fontWeight = cfg.kitchenFontWeight || 'normal';

    if (!enabled) {
      console.warn('Impressora de cozinha desativada nas configurações.');
      // Opcional: retornar um HTML de aviso ou vazio
    }

    const itemsRows = (order.items || []).map(i => `
      <li style="margin-bottom: 8px;">
        <span class="qty">${i.quantity}x</span> 
        <span class="name">${i.name}</span>
        ${i.weightKg ? `<br/><small>Peso: ${Number(i.weightKg).toFixed(3)}kg</small>` : ''}
      </li>
    `).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comanda #${order.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${font}; 
      font-weight: ${fontWeight};
      width: ${paperWidth}; 
      padding: 10px; 
      background-color: #fff;
      color: #000 !important;
      -webkit-font-smoothing: none;
      text-shadow: 0 0 1px rgba(0,0,0,0.5);
    }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
    .title { font-size: 14px; font-weight: bold; letter-spacing: 2px; }
    .num { font-size: 32px; font-weight: 900; color: #000; margin: 5px 0; }
    .time { font-size: 11px; font-weight: bold; }
    .type { font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
    
    ul { list-style: none; font-size: ${fontSize}; }
    .qty { font-weight: 900; border-right: 1px solid #000; padding-right: 6px; margin-right: 6px; }
    .name { font-weight: bold; }
    
    .obs { 
      margin-top: 15px; 
      padding: 8px; 
      border: 1px solid #000; 
      font-size: 12px; 
      border-radius: 4px;
    }
    .footer { 
      margin-top: 15px; 
      text-align: center; 
      font-size: 10px; 
      border-top: 1px dashed #000; 
      padding-top: 8px; 
      font-weight: bold; 
    }
    
    @media print { 
      body { width: ${paperWidth}; }
      @page { margin: 0; size: ${paperWidth} auto; } 
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">PEDIDO</div>
    <div class="num">#${String(order.number).padStart(4, '0')}</div>
    <div class="time">${new Date().toLocaleTimeString('pt-BR')}</div>
    <div class="type">${order.type || 'Balcão'} — ${order.customerName || 'Balcão'}</div>
  </div>

  <ul>${itemsRows}</ul>

  ${order.notes ? `
    <div class="obs">
      <strong>OBSERVAÇÃO:</strong><br/>
      ${order.notes}
    </div>
  ` : ''}

  <div class="footer">
    Açaí ERP SaaS - Impressão de Produção
  </div>
</body>
</html>`;
  }
}

export const printService = new PrintService();
