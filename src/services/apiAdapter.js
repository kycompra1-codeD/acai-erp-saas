// Mapeia dados do backend (snake_case/PT) para o frontend (camelCase/EN) e vice-versa

// ── Status ────────────────────────────────────────────────
const STATUS_TO_EN = {
  pendente: 'pending', preparando: 'preparing', pronto: 'ready',
  entregue: 'delivered', cancelado: 'cancelled',
};
const STATUS_TO_PT = {
  pending: 'pendente', preparing: 'preparando', ready: 'pronto',
  delivered: 'entregue', cancelled: 'cancelado',
};
export const toEnStatus = (s) => STATUS_TO_EN[s] ?? s;
export const toPtStatus = (s) => STATUS_TO_PT[s] ?? s;

// ── Produtos ──────────────────────────────────────────────
export function mapProduto(p, companyId) {
  return {
    id: p.id,
    companyId,
    name: p.nome,
    description: p.descricao || '',
    sku: p.sku || '',
    ean: p.ean || '',
    price: parseFloat(p.preco ?? 0),
    cost: parseFloat(p.custo ?? 0),
    stock: parseFloat(p.estoque_atual ?? 0),
    minStock: parseFloat(p.estoque_minimo ?? 0),
    category: p.categoria_nome || '',
    categoryId: p.categoria_id || null,
    emoji: p.emoji || '🍇',
    imageUrl: p.imagem_url || null,
    identityType: p.identity_type || 'emoji',
    unit: p.unidade || 'unid',
    active: p.ativo !== false,
    ncm: p.ncm || '',
    fornecedores: p.fornecedores || [],
  };
}

export function mapProdutoToApi(p) {
  return {
    nome: p.name,
    descricao: p.description,
    sku: p.sku,
    ean: p.ean,
    preco: p.price,
    custo: p.cost,
    estoque_atual: p.stock,
    estoque_minimo: p.minStock,
    categoria_id: p.categoryId || null,
    emoji: p.emoji,
    imagem_url: p.imageUrl,
    identity_type: p.identityType || 'emoji',
    unidade: p.unit || 'unid',
    ativo: p.active !== false,
    ncm: p.ncm,
    fornecedores: p.fornecedores || [],
  };
}

// ── Clientes ──────────────────────────────────────────────
export function mapCliente(c, companyId) {
  return {
    id: c.id,
    companyId,
    name: c.nome,
    email: c.email || '',
    phone: c.telefone || '',
    document: c.documento || '',
    address: [c.logradouro, c.numero, c.bairro, c.cidade, c.estado].filter(Boolean).join(', '),
    cep: c.cep || '',
    points: parseInt(c.pontos ?? 0),
    totalSpent: parseFloat(c.total_gasto ?? 0),
    ordersCount: parseInt(c.total_pedidos ?? 0),
    status: c.status || 'ativo',
    createdAt: c.criado_em,
  };
}

export function mapClienteToApi(c) {
  return {
    nome: c.name,
    email: c.email,
    telefone: c.phone,
    documento: c.document,
    cep: c.cep,
    status: c.status,
  };
}

// ── Pedidos ───────────────────────────────────────────────
export function mapPedido(p, companyId) {
  const items = (p.itens || []).map(i => ({
    id: i.id,
    productId: i.produto_id,
    name: i.nome_produto,
    quantity: parseFloat(i.quantidade),
    price: parseFloat(i.preco_unitario),
    subtotal: parseFloat(i.subtotal),
  }));
  const payments = (p.pagamentos || []).map(pg => ({
    method: pg.metodo,
    value: parseFloat(pg.valor),
    change: parseFloat(pg.troco ?? 0),
  }));
  const payment = payments[0]?.method || 'dinheiro';

  return {
    id: p.id,
    companyId,
    number: p.numero,
    status: toEnStatus(p.status),
    total: parseFloat(p.total ?? 0),
    discount: parseFloat(p.desconto ?? 0),
    deliveryFee: parseFloat(p.taxa_entrega ?? 0),
    customerId: p.cliente_id || null,
    customerName: p.nome_cliente || p.nome_cliente_cadastrado || 'Balcão',
    type: p.tipo || 'balcao',
    origin: p.origem || 'balcao',
    notes: p.observacoes || '',
    items,
    payments,
    payment,
    createdAt: p.criado_em,
    preparingAt: p.preparando_em,
    readyAt: p.pronto_em,
    deliveredAt: p.entregue_em,
    cancelledAt: p.cancelado_em,
  };
}

export function mapPedidoToApi(o) {
  return {
    cliente_id: o.customerId || null,
    nome_cliente: o.customerName || 'Balcão',
    tipo: o.type || 'balcao',
    origem: o.origin || 'balcao',
    observacoes: o.notes || '',
    desconto: o.discount || 0,
    taxa_entrega: o.deliveryFee || 0,
    itens: (o.items || []).map(i => ({
      produto_id: i.productId || null,
      nome_produto: i.name,
      quantidade: i.quantity,
      preco_unitario: i.price,
    })),
    pagamentos: (o.payments || []).map(p => ({
      metodo: p.method || o.payment || 'dinheiro',
      valor: p.value || o.total,
      troco: p.change || 0,
    })),
  };
}

// ── Estoque (Insumos) ─────────────────────────────────────
export function mapInsumo(i, companyId) {
  return {
    id: i.id,
    companyId,
    name: i.nome,
    unit: i.unidade || 'kg',
    category: i.categoria || '',
    quantity: parseFloat(i.quantidade_atual ?? 0),
    minQuantity: parseFloat(i.quantidade_minima ?? 0),
    cost: parseFloat(i.custo_unitario ?? 0),
    supplierId: i.fornecedor_id || null,
    statusEstoque: i.status_estoque || 'ok',
    lastUpdate: i.atualizado_em,
  };
}

export function mapInsumoToApi(i) {
  return {
    nome: i.name,
    unidade: i.unit,
    categoria: i.category,
    quantidade_minima: i.minQuantity,
    custo_unitario: i.cost,
    fornecedor_id: i.supplierId || null,
    observacoes: i.notes || '',
  };
}

// ── Funcionários ──────────────────────────────────────────
export function mapFuncionario(f, companyId) {
  return {
    id: f.id,
    companyId,
    name: f.nome,
    cpf: f.cpf || '',
    role: f.cargo || '',
    function: f.funcao || 'operador',
    shift: f.turno || 'integral',
    salary: parseFloat(f.salario ?? 0),
    phone: f.telefone || '',
    email: f.email || '',
    photo: f.foto_url || null,
    status: f.status || 'ativo',
    hiredAt: f.data_admissao || f.criado_em,
  };
}

export function mapFuncionarioToApi(f) {
  return {
    nome: f.name,
    cpf: f.cpf,
    cargo: f.role,
    funcao: f.function || f.funcao || 'operador',
    turno: f.shift || f.turno || 'integral',
    salario: f.salary,
    telefone: f.phone,
    email: f.email,
    foto_url: f.photo,
    status: f.status || 'ativo',
    data_admissao: f.hiredAt ? f.hiredAt.split('T')[0] : null,
  };
}

// ── Fornecedores ──────────────────────────────────────────
export function mapFornecedor(f, companyId) {
  return {
    id: f.id,
    companyId,
    name: f.nome,
    cnpj: f.cnpj || '',
    contact: f.contato || '',
    phone: f.telefone || '',
    email: f.email || '',
    category: f.categoria || '',
    rating: f.avaliacao || 3,
    paymentTerm: f.prazo_pagamento || 30,
    status: f.status || 'ativo',
    lastOrder: f.atualizado_em,
  };
}

export function mapFornecedorToApi(f) {
  return {
    nome: f.name,
    cnpj: f.cnpj,
    contato: f.contact,
    telefone: f.phone,
    email: f.email,
    categoria: f.category,
    avaliacao: f.rating,
    prazo_pagamento: f.paymentTerm,
  };
}

// ── Financeiro ────────────────────────────────────────────
export function mapLancamento(l, companyId) {
  return {
    id: l.id,
    companyId,
    type: l.tipo === 'receita' ? 'receita' : 'despesa',
    category: l.categoria || '',
    description: l.descricao || '',
    amount: parseFloat(l.valor ?? 0),
    date: l.data || l.criado_em?.split('T')[0],
    status: l.status || 'pago',
    pedidoId: l.pedido_id || null,
    pedidoNumero: l.pedido_numero || null,
    paymentMethod: l.metodo_pagamento || '',
    createdAt: l.criado_em,
  };
}

export function mapLancamentoToApi(l) {
  return {
    tipo: l.type,
    categoria: l.category,
    descricao: l.description,
    valor: l.amount,
    status: l.status || 'pendente',
    data: l.date,
    metodo_pagamento: l.paymentMethod || null,
  };
}
