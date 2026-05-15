// ============================================================
// MOCK DATA — Açaí ERP SaaS
// Dados de demonstração iniciais
// ============================================================

import { format, subDays } from 'date-fns';

export function getFreshMockData() {
  const initialCompanies = [
    { 
      id: 'comp-1', name: 'Zullya ERP - Matriz', cnpj: '00.000.000/0001-00', address: 'Rua das Flores, 123 — Centro', color: '#8B5CF6',
      phone: '(11) 99999-0000', email: 'contato@zullya.com.br', website: 'https://zullya.com.br',
      cep: '01000-000', street: 'Rua das Flores', number: '123', complement: '', neighborhood: 'Centro', city: 'São Paulo', state: 'SP',
      instagram: '@zullya_erp', tiktok: '@zullya_erp', youtube: 'youtube.com/@zullya_erp',
      hours_seg: 'aberto', hours_seg_open: '09:00', hours_seg_close: '22:00',
      hours_ter: 'aberto', hours_ter_open: '09:00', hours_ter_close: '22:00',
      hours_qua: 'aberto', hours_qua_open: '09:00', hours_qua_close: '22:00',
      hours_qui: 'aberto', hours_qui_open: '09:00', hours_qui_close: '22:00',
      hours_sex: 'aberto', hours_sex_open: '09:00', hours_sex_close: '23:00',
      hours_sab: 'aberto', hours_sab_open: '10:00', hours_sab_close: '23:00',
      hours_dom: 'aberto', hours_dom_open: '10:00', hours_dom_close: '22:00',
    },
    { 
      id: 'comp-2', name: 'Zullya ERP - Shopping', cnpj: '00.000.000/0002-99', address: 'Av. Paulista, 1000 — Shopping Premium Center', color: '#F472B6',
      phone: '(11) 98888-1111', email: 'shopping@zullya.com.br', website: 'https://zullya.com.br',
      cep: '01310-100', street: 'Av. Paulista', number: '1000', complement: 'Loja 45', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP',
      instagram: '@acaierpsaasshopping', tiktok: '', youtube: '',
      hours_seg: 'aberto', hours_seg_open: '10:00', hours_seg_close: '22:00',
      hours_ter: 'aberto', hours_ter_open: '10:00', hours_ter_close: '22:00',
      hours_qua: 'aberto', hours_qua_open: '10:00', hours_qua_close: '22:00',
      hours_qui: 'aberto', hours_qui_open: '10:00', hours_qui_close: '22:00',
      hours_sex: 'aberto', hours_sex_open: '10:00', hours_sex_close: '22:00',
      hours_sab: 'aberto', hours_sab_open: '10:00', hours_sab_close: '22:00',
      hours_dom: 'aberto', hours_dom_open: '12:00', hours_dom_close: '20:00',
    }
  ];

  const initialProducts = [
    // Açaís
    { 
      id: 'p1', companyId: 'comp-1', name: 'Açaí 300ml', category: 'acai', brand: 'Açaí ERP SaaS', price: 14.90, promotionalPrice: 12.90, cost: 5.50, averageCost: 5.25, markup: '170.9', 
      stock: 80, minStock: 20, maxStock: 200, stockNotification: true, stockLocation: 'Corredor A - Prateleira 2', preparationDays: 1, unit: 'pote', active: true, 
      identityType: 'image', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=300&h=300&fit=crop', emoji: '🍇', description: 'Açaí puro natural 300ml',
      sku: 'AC-300', ean: '7891234567890', eanTributavel: '7891234567890', ncm: '2106.90.90', cest: '17.111.00', weight: '0.350', weightNet: '0.300', packagingType: 'pacote', width: '10', height: '12', length: '10', itemsPerBox: '1',
      ipiCode: '999', ipiFixed: '0.00', extipi: '', origin: '0',
      videoLink: 'https://youtube.com/watch?v=acai123', slug: 'acai-puro-natural-300ml', keywords: 'açaí, natural, copo 300ml', seoTitle: 'Açaí Puro Natural 300ml | Açaí ERP SaaS', seoDescription: 'O melhor açaí natural em copo de 300ml, pronto para consumo.', richDescription: '<p>Açaí delicioso com a melhor qualidade.</p>',
      tags: ['Destaque', 'Verão', 'Vegano'],
      attributes: [
        { name: 'Sabor', value: 'Tradicional' },
        { name: 'Vegano', value: 'Sim' }
      ],
      priceLists: [
        { name: 'Varejo', price: 14.90 },
        { name: 'Atacado (10+)', price: 11.50 }
      ],
      ads: [
        { channel: 'Mercado Livre', id: 'MLB123', status: 'ativo' },
        { channel: 'iFood', id: 'ACAI300IF', status: 'ativo' }
      ],
      mappings: { mercado_livre: 'MLB123', ifood: 'ACAI300IF', ifood_price: '18.90' },
      suppliers: [ { name: 'Açaí ERP SaaS Distribuidora', code: 'FORN-001' } ],
      internalNotes: 'O pote costuma amassar se empilhar mais de 10.',
      variations: [
        { name: 'Tradicional', price: '0', sku: 'AC-300-TRAD' },
        { name: 'Zero Açúcar', price: '2.00', sku: 'AC-300-ZERO' }
      ]
    },
    { id: 'p2', companyId: 'comp-1', name: 'Açaí 500ml', category: 'acai', price: 22.90, cost: 8.00, stock: 60, unit: 'pote', active: true, identityType: 'image', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=300&fit=crop', emoji: '🍇', description: 'Açaí puro natural 500ml' },
    { id: 'p3', companyId: 'comp-1', name: 'Açaí 700ml', category: 'acai', price: 29.90, cost: 10.50, stock: 40, unit: 'pote', active: true, identityType: 'emoji', emoji: '🍇', description: 'Açaí puro natural 700ml' },
    { id: 'p4', companyId: 'comp-1', name: 'Açaí 1L', category: 'acai', price: 39.90, cost: 14.00, stock: 30, unit: 'pote', active: true, identityType: 'emoji', emoji: '🍇', description: 'Açaí puro natural 1 litro' },
    { id: 'p5', companyId: 'comp-1', name: 'Açaí Tigela Pequena', category: 'acai', price: 18.90, cost: 7.00, stock: 50, unit: 'tigela', active: true, identityType: 'image', image: 'https://images.unsplash.com/photo-1626078437365-1d6e191b483b?w=300&h=300&fit=crop', emoji: '🥣', description: 'Tigela de açaí 300ml' },
    { id: 'p6', companyId: 'comp-1', name: 'Açaí Tigela Grande', category: 'acai', price: 25.90, cost: 9.50, stock: 50, unit: 'tigela', active: true, identityType: 'image', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=300&h=300&fit=crop', emoji: '🥣', description: 'Tigela de açaí 500ml' },

    // Complementos
    { id: 'p7', companyId: 'comp-1', name: 'Granola', category: 'complemento', price: 2.00, cost: 0.50, stock: 200, unit: 'porção', active: true, identityType: 'emoji', emoji: '🌾', description: 'Granola crocante' },
    { id: 'p8', companyId: 'comp-1', name: 'Leite em Pó', category: 'complemento', price: 1.50, cost: 0.30, stock: 300, unit: 'porção', active: true, identityType: 'emoji', emoji: '🥛', description: 'Leite em pó integral' },
    { id: 'p9', companyId: 'comp-1', name: 'Mel', category: 'complemento', price: 2.50, cost: 0.80, stock: 150, unit: 'porção', active: true, identityType: 'emoji', emoji: '🍯', description: 'Mel puro de abelha' },
    { id: 'p10', companyId: 'comp-1', name: 'Morango', category: 'complemento', price: 3.00, cost: 1.20, stock: 100, unit: 'porção', active: true, identityType: 'image', image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&h=300&fit=crop', emoji: '🍓', description: 'Morango fresco em fatias' },
    { id: 'p11', companyId: 'comp-1', name: 'Banana', category: 'complemento', price: 2.00, cost: 0.70, stock: 120, unit: 'porção', active: true, identityType: 'image', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&h=300&fit=crop', emoji: '🍌', description: 'Banana em rodelas' },
    { id: 'p12', companyId: 'comp-1', name: 'Nutella', category: 'complemento', price: 4.00, cost: 1.50, stock: 80, unit: 'porção', active: true, identityType: 'image', image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&h=300&fit=crop', emoji: '🍫', description: 'Creme de avelã Nutella' },
    { id: 'p13', companyId: 'comp-1', name: 'Paçoca', category: 'complemento', price: 2.00, cost: 0.60, stock: 100, unit: 'porção', active: true, identityType: 'emoji', emoji: '🥜', description: 'Paçoca rolha esfarelada' },
    { id: 'p14', companyId: 'comp-1', name: 'Coco Ralado', category: 'complemento', price: 2.00, cost: 0.50, stock: 200, unit: 'porção', active: true, identityType: 'emoji', emoji: '🥥', description: 'Coco ralado seco' },

    // Bebidas
    { id: 'p15', companyId: 'comp-1', name: 'Água 500ml', category: 'bebida', price: 4.00, cost: 1.50, stock: 50, unit: 'garrafa', active: true, identityType: 'emoji', emoji: '💧', description: 'Água mineral sem gás' },
    { id: 'p16', companyId: 'comp-1', name: 'Refrigerante Lata', category: 'bebida', price: 6.00, cost: 2.50, stock: 40, unit: 'lata', active: true, identityType: 'emoji', emoji: '🥤', description: 'Refrigerante lata 350ml' },
    { id: 'p17', companyId: 'comp-1', name: 'Suco Natural', category: 'bebida', price: 9.90, cost: 3.00, stock: 30, unit: 'copo', active: true, identityType: 'emoji', emoji: '🍹', description: 'Suco de fruta natural 300ml' },
    { id: 'p18', companyId: 'comp-1', name: 'Vitamina de Açaí', category: 'bebida', price: 16.90, cost: 6.00, stock: 20, unit: 'copo', active: true, identityType: 'emoji', emoji: '🥤', description: 'Vitamina de açaí com banana' },

    // Sobremesas
    { id: 'p19', companyId: 'comp-1', name: 'Churros', category: 'sobremesa', price: 8.90, cost: 3.00, stock: 30, unit: 'unid', active: true, identityType: 'emoji', emoji: '🍩', description: 'Churros recheado com doce de leite' },
    { id: 'p20', companyId: 'comp-1', name: 'Tapioca Doce', category: 'sobremesa', price: 11.90, cost: 3.50, stock: 25, unit: 'unid', active: true, identityType: 'emoji', emoji: '🫓', description: 'Tapioca doce com coco' },
  ];

  const initialCustomers = [
    { id: 'c1', companyId: 'comp-1', name: 'Ana Beatriz', tradingName: 'Bia Presentes', personType: 'pf', document: '111.222.333-44', phone: '(11) 99999-1111', email: 'ana@email.com', points: 450, totalSpent: 385.60, ordersCount: 18, createdAt: subDays(new Date(), 90).toISOString(), roles: ['cliente'], cep: '01234-567', city: 'São Paulo', state: 'SP', street: 'Rua das Palmeiras', number: '50', neighborhood: 'Santa Cecília', taxpayerType: '9', taxRegime: '1', crmStatus: 'cliente', salesperson: 'João Silva', paymentCondition: '30 dias', creditLimit: 500 },
    { id: 'c2', companyId: 'comp-1', name: 'Carlos Eduardo', tradingName: 'Cadu Tech', personType: 'pj', document: '11.222.333/0001-44', phone: '(11) 99999-2222', email: 'carlos@email.com', points: 280, totalSpent: 239.10, ordersCount: 11, createdAt: subDays(new Date(), 60).toISOString(), roles: ['cliente'], cep: '04567-890', city: 'São Paulo', state: 'SP', street: 'Av. Brigadeiro Faria Lima', number: '1500', neighborhood: 'Itaim Bibi', taxpayerType: '1', ie: '111.222.333.444', taxRegime: '3', crmStatus: 'cliente', salesperson: 'Maria Souza', paymentCondition: '30/60 dias', creditLimit: 2000, priceList: 'atacado' },
    { id: 'c3', companyId: 'comp-1', name: 'Fernanda Lima', phone: '(11) 99999-3333', email: 'fe@email.com', points: 720, totalSpent: 612.40, ordersCount: 29, createdAt: subDays(new Date(), 120).toISOString(), roles: ['cliente'], personType: 'pf', document: '222.333.444-55' },
    { id: 'c4', companyId: 'comp-1', name: 'Gabriel Santos', phone: '(11) 99999-4444', email: null, points: 95, totalSpent: 82.70, ordersCount: 4, createdAt: subDays(new Date(), 15).toISOString(), roles: ['cliente'], personType: 'pf', document: '333.444.555-66' },
    { id: 'c5', companyId: 'comp-1', name: 'Helena Martins', phone: '(11) 99999-5555', email: 'helena@email.com', points: 1100, totalSpent: 940.20, ordersCount: 45, createdAt: subDays(new Date(), 180).toISOString(), roles: ['cliente'], personType: 'pf', document: '444.555.666-77' },
    { id: 'c6', companyId: 'comp-1', name: 'Igor Alves', phone: '(11) 99999-6666', email: null, points: 160, totalSpent: 134.80, ordersCount: 7, createdAt: subDays(new Date(), 30).toISOString(), roles: ['cliente'], personType: 'pf', document: '555.666.777-88' },
    { id: 'c7', companyId: 'comp-1', name: 'Juliana Costa', phone: '(11) 99999-7777', email: 'ju@email.com', points: 340, totalSpent: 291.30, ordersCount: 14, createdAt: subDays(new Date(), 75).toISOString(), roles: ['cliente'], personType: 'pf', document: '666.777.888-99' },
    { id: 'c8', companyId: 'comp-1', name: 'Lucas Pereira', phone: '(11) 99999-8888', email: 'lucas@email.com', points: 55, totalSpent: 49.80, ordersCount: 2, createdAt: subDays(new Date(), 7).toISOString(), roles: ['cliente'], personType: 'pf', document: '777.888.999-00' },
  ];

  const initialInventory = [
    { id: 'i1', companyId: 'comp-1', name: 'Polpa de Açaí', unit: 'kg', quantity: 45, minQuantity: 20, cost: 12.50, supplier: 'Açaí ERP SaaS', lastUpdate: new Date().toISOString() },
    { id: 'i2', companyId: 'comp-1', name: 'Granola', unit: 'kg', quantity: 8, minQuantity: 10, cost: 8.00, supplier: 'NaturaVida', lastUpdate: new Date().toISOString() },
    { id: 'i3', companyId: 'comp-1', name: 'Leite em Pó', unit: 'kg', quantity: 15, minQuantity: 5, cost: 15.00, supplier: 'Nestlé', lastUpdate: new Date().toISOString() },
    { id: 'i4', companyId: 'comp-1', name: 'Mel', unit: 'litro', quantity: 3, minQuantity: 5, cost: 25.00, supplier: 'MelPuro', lastUpdate: new Date().toISOString() },
    { id: 'i5', companyId: 'comp-1', name: 'Morango', unit: 'kg', quantity: 6, minQuantity: 8, cost: 18.00, supplier: 'HortiFruti', lastUpdate: new Date().toISOString() },
    { id: 'i6', companyId: 'comp-1', name: 'Banana', unit: 'kg', quantity: 12, minQuantity: 6, cost: 4.00, supplier: 'HortiFruti', lastUpdate: new Date().toISOString() },
    { id: 'i7', companyId: 'comp-1', name: 'Nutella', unit: 'kg', quantity: 4, minQuantity: 2, cost: 45.00, supplier: 'Distribuidora X', lastUpdate: new Date().toISOString() },
    { id: 'i8', companyId: 'comp-1', name: 'Coco Ralado', unit: 'kg', quantity: 7, minQuantity: 3, cost: 12.00, supplier: 'NaturaVida', lastUpdate: new Date().toISOString() },
    { id: 'i9', companyId: 'comp-1', name: 'Pote 300ml', unit: 'unid', quantity: 200, minQuantity: 100, cost: 0.25, supplier: 'Embalagens SP', lastUpdate: new Date().toISOString() },
    { id: 'i10', companyId: 'comp-1', name: 'Pote 500ml', unit: 'unid', quantity: 180, minQuantity: 80, cost: 0.35, supplier: 'Embalagens SP', lastUpdate: new Date().toISOString() },
    { id: 'i11', companyId: 'comp-1', name: 'Pote 700ml', unit: 'unid', quantity: 120, minQuantity: 60, cost: 0.45, supplier: 'Embalagens SP', lastUpdate: new Date().toISOString() },
    { id: 'i12', companyId: 'comp-1', name: 'Colher Plástica', unit: 'unid', quantity: 500, minQuantity: 200, cost: 0.05, supplier: 'Embalagens SP', lastUpdate: new Date().toISOString() },
  ];

  const statuses = ['delivered', 'delivered', 'delivered', 'ready', 'preparing', 'pending'];
  const types = ['balcão', 'delivery', 'retirada'];
  const payments = ['pix', 'dinheiro', 'cartão'];
  const orderItems = [
    { productId: 'p2', name: 'Açaí 500ml', quantity: 1, price: 22.90 },
    { productId: 'p7', name: 'Granola', quantity: 1, price: 2.00 },
    { productId: 'p10', name: 'Morango', quantity: 1, price: 3.00 },
  ];

  const orders = [];
  let id = 1;

  for (let d = 6; d >= 0; d--) {
    const dayOrders = Math.floor(Math.random() * 8) + 5;
    for (let o = 0; o < dayOrders; o++) {
      const status = d === 0 ? statuses[Math.floor(Math.random() * statuses.length)] : 'delivered';
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const items = Array.from({ length: itemCount }, (_, i) => ({ ...orderItems[i % orderItems.length] }));
      const total = items.reduce((s, it) => s + it.price * it.quantity, 0) + Math.random() * 10;

      orders.push({
        id: `ord-${String(id).padStart(4, '0')}`,
        companyId: 'comp-1',
        number: id,
        customerId: Math.random() > 0.4 ? initialCustomers[Math.floor(Math.random() * initialCustomers.length)].id : null,
        customerName: Math.random() > 0.4 ? initialCustomers[Math.floor(Math.random() * initialCustomers.length)].name : 'Balcão',
        items,
        total: parseFloat(total.toFixed(2)),
        status,
        type: types[Math.floor(Math.random() * types.length)],
        payment: payments[Math.floor(Math.random() * payments.length)],
        notes: '',
        createdAt: subDays(new Date(), d).toISOString(),
      });
      id++;
    }
  }

  const initialOrders = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const initialSettings = {
    'comp-1': {
      deliveryFee: 5.00,
      deliveryRadius: 5,
      currency: 'R$',
      pointsRate: 10,
      loyaltyRewardAt: 100,
      // Impressão
      printLogo: null,
      printHeader: 'Bem-vindo ao Açaí ERP SaaS!',
      printFooter: 'Obrigado pela preferência! Volte sempre! 🍇',
      printLoyaltyMsg: 'Acumule pontos e ganhe recompensas exclusivas!',
      printCupomWidth: '80mm',
      printFont: 'normal',
      printShowOrderNumber: true,
      printShowTime: true,
      printShowQr: false,
      printPixKey: '',
      printSeparator: 'linha',
      printShowCnpj: true,
      printShowAddress: true,
      planId: 'pro',
      paymentConfig: {
        defaultTerminalProvider: 'mercadopago',
        pixEnabled: true,
        pixKeyType: 'cnpj',
        pixKey: '00.000.000/0001-00',
        mercadoPagoEnabled: true,
        mercadoPagoToken: 'TEST_TOKEN',
        mercadoPagoDeviceId: 'TEST_DEVICE_01',
        stoneEnabled: false,
        stoneCode: '',
        pagSeguroEnabled: false,
        pagSeguroToken: '',
        pagSeguroDeviceId: '',
        tefEnabled: false,
        tefIp: '127.0.0.1'
      }
    },
    'comp-2': {
      deliveryFee: 7.00,
      deliveryRadius: 3,
      currency: 'R$',
      pointsRate: 10,
      loyaltyRewardAt: 100,
      printHeader: 'Unidade Shopping!',
      printFooter: 'Valeu pelo açaí! 🍦',
      planId: 'pro',
      paymentConfig: {
        defaultTerminalProvider: 'pagseguro',
        pixEnabled: true,
        pixKey: '00.000.000/0002-99',
        pagSeguroEnabled: true,
      }
    }
  };

  const initialEmployees = [
    { id: 'e1', companyId: 'comp-1', name: 'João Silva', cpf: '123.456.789-00', role: 'admin', jobTitle: 'Gerente', shift: 'manhã', salary: 2800.00, phone: '(11) 99001-1111', email: 'joao@acaierpsaas.com.br', hiredAt: subDays(new Date(), 365).toISOString(), status: 'ativo', notes: '' },
    { id: 'e2', companyId: 'comp-1', name: 'Maria Caixa', cpf: '234.567.890-11', role: 'caixa', jobTitle: 'Operadora de Caixa', shift: 'manhã', salary: 1800.00, phone: '(11) 99002-2222', email: 'maria@acaierpsaas.com.br', hiredAt: subDays(new Date(), 180).toISOString(), status: 'ativo', notes: '' },
    { id: 'e3', companyId: 'comp-1', name: 'Pedro Cozinha', cpf: '345.678.901-22', role: 'producao', jobTitle: 'Produtor', shift: 'tarde', salary: 1600.00, phone: '(11) 99003-3333', email: 'pedro@acaierpsaas.com.br', hiredAt: subDays(new Date(), 90).toISOString(), status: 'ativo', notes: '' },
    { id: 'e4', companyId: 'comp-1', name: 'Ana Atendente', cpf: '456.789.012-33', role: 'caixa', jobTitle: 'Atendente', shift: 'noite', salary: 1600.00, phone: '(11) 99004-4444', email: 'ana@acaierpsaas.com.br', hiredAt: subDays(new Date(), 45).toISOString(), status: 'férias', notes: 'Retorna dia 10/05' },
  ];

  const initialSuppliers = [
    { id: 's1', companyId: 'comp-1', name: 'Açaí ERP SaaS Distribuidora', tradingName: 'Açaí ERP SaaS Atacado', personType: 'pj', document: '10.000.001/0001-01', contact: 'Carlos Mendes', phone: '(91) 98001-0001', email: 'vendas@acaierpsaas-dist.com.br', city: 'Belém', state: 'PA', category: 'Polpas e Açaí', products: 'Polpa de Açaí, Polpa de Cupuaçu', paymentTerms: '30 dias', rating: 5, status: 'ativo', lastOrder: subDays(new Date(), 5).toISOString(), roles: ['fornecedor'], taxpayerType: '1', ie: '123456789' },
    { id: 's2', companyId: 'comp-1', name: 'NaturaVida', tradingName: 'NaturaVida Grãos', personType: 'pj', document: '10.000.002/0001-02', contact: 'Fernanda Lima', phone: '(11) 97002-0002', email: 'pedidos@naturavida.com.br', city: 'São Paulo', state: 'SP', category: 'Grãos e Cereais', products: 'Granola, Coco Ralado, Aveia', paymentTerms: '15 dias', rating: 4, status: 'ativo', lastOrder: subDays(new Date(), 12).toISOString(), roles: ['fornecedor'], taxpayerType: '1' },
    { id: 's3', companyId: 'comp-1', name: 'HortiFruti Central', personType: 'pj', document: '10.000.003/0001-03', contact: 'Roberto Costa', phone: '(11) 96003-0003', email: 'hortifruti@central.com.br', city: 'Campinas', state: 'SP', category: 'Frutas e Verduras', products: 'Morango, Banana, Abacaxi, Kiwi', paymentTerms: 'à vista', rating: 4, status: 'ativo', lastOrder: subDays(new Date(), 2).toISOString(), roles: ['fornecedor'] },
    { id: 's4', companyId: 'comp-1', name: 'Embalagens SP', personType: 'pj', document: '10.000.004/0001-04', contact: 'Patrícia Souza', phone: '(11) 95004-0004', email: 'embalagens@sp.com.br', city: 'São Paulo', state: 'SP', category: 'Embalagens', products: 'Potes 300ml, 500ml, 700ml, Colheres, Canudos', paymentTerms: '30 dias', rating: 3, status: 'ativo', lastOrder: subDays(new Date(), 20).toISOString(), roles: ['fornecedor'] },
    { id: 's5', companyId: 'comp-1', name: 'MelPuro LTDA', personType: 'pj', document: '10.000.005/0001-05', contact: 'Antônio Mel', phone: '(62) 94005-0005', email: 'melpuro@goias.com.br', city: 'Goiânia', state: 'GO', category: 'Adoçantes Naturais', products: 'Mel puro, Melado de Cana', paymentTerms: '30 dias', rating: 5, status: 'ativo', lastOrder: subDays(new Date(), 30).toISOString(), roles: ['fornecedor'] },
  ];

  const initialFinanceEntries = [
    { id: 'f1', companyId: 'comp-1', type: 'receita', category: 'Vendas PDV', description: 'Vendas do dia', amount: 1240.50, date: subDays(new Date(), 0).toISOString(), paymentMethod: 'pix', status: 'pago', recurring: false },
    { id: 'f2', companyId: 'comp-1', type: 'despesa', category: 'Fornecedores', description: 'Compra polpa açaí — Açaí ERP SaaS Dist.', amount: 562.50, date: subDays(new Date(), 1).toISOString(), paymentMethod: 'transferência', status: 'pago', recurring: false },
    { id: 'f3', companyId: 'comp-1', type: 'despesa', category: 'Salários', description: 'Pagamento salários Abril', amount: 7800.00, date: subDays(new Date(), 3).toISOString(), paymentMethod: 'transferência', status: 'pago', recurring: true },
    { id: 'f4', companyId: 'comp-1', type: 'receita', category: 'Vendas PDV', description: 'Vendas do dia', amount: 980.00, date: subDays(new Date(), 1).toISOString(), paymentMethod: 'misto', status: 'pago', recurring: false },
    { id: 'f5', companyId: 'comp-1', type: 'despesa', category: 'Aluguel', description: 'Aluguel do ponto comercial', amount: 2500.00, date: subDays(new Date(), 5).toISOString(), paymentMethod: 'boleto', status: 'pago', recurring: true },
    { id: 'f6', companyId: 'comp-1', type: 'despesa', category: 'Fornecedores', description: 'Compra granola e coco — NaturaVida', amount: 280.00, date: subDays(new Date(), 7).toISOString(), paymentMethod: 'pix', status: 'pago', recurring: false },
    { id: 'f7', companyId: 'comp-1', type: 'receita', category: 'Vendas PDV', description: 'Vendas do dia', amount: 1100.00, date: subDays(new Date(), 2).toISOString(), paymentMethod: 'misto', status: 'pago', recurring: false },
    { id: 'f8', companyId: 'comp-1', type: 'despesa', category: 'Utilidades', description: 'Conta de luz', amount: 420.00, date: subDays(new Date(), 10).toISOString(), paymentMethod: 'boleto', status: 'pago', recurring: true },
    { id: 'f9', companyId: 'comp-1', type: 'despesa', category: 'Utilidades', description: 'Internet e telefone', amount: 180.00, date: subDays(new Date(), 10).toISOString(), paymentMethod: 'débito automático', status: 'pago', recurring: true },
    { id: 'f10', companyId: 'comp-1', type: 'receita', category: 'Vendas PDV', description: 'Vendas do dia', amount: 850.00, date: subDays(new Date(), 3).toISOString(), paymentMethod: 'misto', status: 'pago', recurring: false },
    { id: 'f11', companyId: 'comp-1', type: 'despesa', category: 'Fornecedores', description: 'Frutas — HortiFruti Central', amount: 195.00, date: subDays(new Date(), 2).toISOString(), paymentMethod: 'pix', status: 'pago', recurring: false },
    { id: 'f12', companyId: 'comp-1', type: 'despesa', category: 'Embalagens', description: 'Potes e colheres — Embalagens SP', amount: 310.00, date: subDays(new Date(), 15).toISOString(), paymentMethod: 'boleto', status: 'pendente', recurring: false },
  ];

  const initialProposals = [
    { id: 'prop-001', companyId: 'comp-1', number: 1, customerId: 'c1', customerName: 'Ana Beatriz', date: subDays(new Date(), 5).toISOString(), expiryDate: subDays(new Date(), -5).toISOString(), items: [{ name: 'Combo Família Açaí', quantity: 2, price: 85.00 }], total: 170.00, status: 'approved', notes: 'Pedido para festa de aniversário.' },
    { id: 'prop-002', companyId: 'comp-1', number: 2, customerId: 'c2', customerName: 'Carlos Eduardo', date: subDays(new Date(), 2).toISOString(), expiryDate: subDays(new Date(), 8).toISOString(), items: [{ name: 'Açaí 1L', quantity: 5, price: 35.00 }], total: 175.00, status: 'pending', notes: 'Orçamento para evento corporativo.' },
    { id: 'prop-003', companyId: 'comp-1', number: 3, customerId: 'c3', customerName: 'Fernanda Lima', date: subDays(new Date(), 10).toISOString(), expiryDate: subDays(new Date(), -1).toISOString(), items: [{ name: 'Mix de Frutas', quantity: 10, price: 15.00 }], total: 150.00, status: 'expired', notes: '' },
  ];

  const initialActiveExtensions = ['hub', 'fiscal', 'crm', 'bi', 'tef', 'logistics', 'purchases', 'loyalty'];

  const initialAutomationRules = [
    { 
      id: 'rule-1', 
      companyId: 'comp-1',
      name: 'Alerta de Estoque Baixo', 
      trigger: 'trigger:stock_low', 
      action: 'action:whatsapp_alert', 
      enabled: true, 
      metadata: { threshold: 10, phone: '(11) 99999-0000', message: '⚠️ Atenção: Itens com estoque crítico detectados!' } 
    },
    { 
      id: 'rule-2', 
      companyId: 'comp-1',
      name: 'Bonificação VIP', 
      trigger: 'trigger:customer_vip', 
      action: 'action:add_points', 
      enabled: true, 
      metadata: { vipThreshold: 1000, points: 50 } 
    },
    { 
      id: 'rule-3', 
      companyId: 'comp-1',
      name: 'Venda Especial', 
      trigger: 'trigger:sale_high', 
      action: 'action:toast', 
      enabled: true, 
      metadata: { minAmount: 500, message: '🚀 Parabéns! Uma grande venda acaba de ser realizada!' } 
    }
  ];

  const initialCashier = {
    isOpen: false,
    openedAt: null,
    closedAt: null,
    initialBalance: 0,
    currentBalance: 0,
    operatorName: null,
    salesCount: 0,
    history: []
  };

  return {
    initialCompanies,
    initialProducts,
    initialCustomers,
    initialInventory,
    initialOrders,
    initialSettings,
    initialEmployees,
    initialSuppliers,
    initialFinanceEntries,
    initialProposals,
    initialActiveExtensions,
    initialAutomationRules,
    initialCashier
  };
}

// Fallback exports for backward compatibility (used on first load)
const freshData = getFreshMockData();
export const initialProducts = freshData.initialProducts;
export const initialCustomers = freshData.initialCustomers;
export const initialInventory = freshData.initialInventory;
export const initialOrders = freshData.initialOrders;
export const initialSettings = freshData.initialSettings;
export const initialEmployees = freshData.initialEmployees;
export const initialSuppliers = freshData.initialSuppliers;
export const initialFinanceEntries = freshData.initialFinanceEntries;
export const initialCashier = freshData.initialCashier;

// ---------- SALES CHART DATA ----------
export function getSalesChartData(days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i);
    const sales = Math.floor(Math.random() * 600) + 200;
    const orders = Math.floor(Math.random() * 20) + 5;
    return {
      date: format(date, 'dd/MM'),
      fullDate: date.toISOString(),
      sales: parseFloat(sales.toFixed(2)),
      orders,
    };
  });
}

// ---------- ADVANCED BI DATA (FORECAST & COHORT) ----------
export function getAdvancedBIStats(days = 30) {
  // Base data + future projection (Linear Regression Mock)
  const historical = Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - 1 - i);
    const baseSales = Math.floor(Math.random() * 800) + 400;
    return {
      date: format(date, 'dd/MM'),
      sales: baseSales,
      projected: baseSales, // historical matches projection
      isFuture: false
    };
  });

  const future = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    const projectedSales = Math.floor(Math.random() * 900) + 500 + (i * 20); // trend up
    return {
      date: format(date, 'dd/MM'),
      sales: null,
      projected: projectedSales,
      isFuture: true
    };
  });

  const heatmapData = [
    { hour: '08:00', 'Seg': 10, 'Ter': 15, 'Qua': 20, 'Qui': 25, 'Sex': 30, 'Sáb': 40, 'Dom': 45 },
    { hour: '12:00', 'Seg': 45, 'Ter': 50, 'Qua': 55, 'Qui': 60, 'Sex': 70, 'Sáb': 85, 'Dom': 90 },
    { hour: '16:00', 'Seg': 30, 'Ter': 35, 'Qua': 40, 'Qui': 45, 'Sex': 60, 'Sáb': 80, 'Dom': 85 },
    { hour: '20:00', 'Seg': 60, 'Ter': 65, 'Qua': 70, 'Qui': 80, 'Sex': 100, 'Sáb': 120, 'Dom': 110 },
  ];

  const channelData = [
    { name: 'Balcão', ticket: 28.50, volume: 4500, fill: 'var(--primary)' },
    { name: 'Próprio', ticket: 42.90, volume: 3200, fill: 'var(--success)' },
    { name: 'iFood', ticket: 55.00, volume: 8500, fill: 'var(--danger)' },
  ];

  const cohortData = [
    { month: 'Jan', m1: 100, m2: 85, m3: 70, m4: 65, m5: 60, m6: 55 },
    { month: 'Fev', m1: 100, m2: 88, m3: 72, m4: 68, m5: 62, m6: null },
    { month: 'Mar', m1: 100, m2: 82, m3: 65, m4: 60, m5: null, m6: null },
    { month: 'Abr', m1: 100, m2: 90, m3: 75, m4: null, m5: null, m6: null },
  ];

  return {
    forecast: [...historical, ...future],
    heatmap: heatmapData,
    channels: channelData,
    cohort: cohortData
  };
}

