import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getFreshMockData, getAdvancedBIStats } from '../data/mockData';
import { eventBus, EVENTS } from '../services/eventBus';
import { marketplaceService } from '../services/marketplaceService';
import { automationService } from '../services/automationService';
import {
  produtosApi, clientesApi, pedidosApi, estoqueApi,
  funcionariosApi, fornecedoresApi, financeiroApi,
} from '../services/api';
import {
  mapProduto, mapProdutoToApi,
  mapCliente, mapClienteToApi,
  mapPedido, mapPedidoToApi,
  mapInsumo, mapInsumoToApi,
  mapFuncionario, mapFuncionarioToApi,
  mapFornecedor, mapFornecedorToApi,
  mapLancamento, mapLancamentoToApi,
  toPtStatus,
} from '../services/apiAdapter';

const AppContext = createContext(null);
const STORAGE_KEY = 'zullya_system_data';

function isAuthenticated() {
  return !!localStorage.getItem('zullya_access_token');
}

function cleanBranding(data) {
  if (!data) return data;
  let str = JSON.stringify(data);
  const legacyTerms = [
    { old: /AçaíBom/g, new: 'Zullya ERP' },
    { old: /AcaìBom/g, new: 'Zullya ERP' },
    { old: /AçaíTop/g, new: 'Zullya ERP' },
    { old: /AcaìTop/g, new: 'Zullya ERP' },
    { old: /AçaíSystem/g, new: 'Zullya ERP' },
    { old: /Açaí ERP SaaS/g, new: 'Zullya ERP' },
    { old: /Açaí ERP/g, new: 'Zullya ERP' },
    { old: /acaibom\.com\.br/g, new: 'zullya.com.br' },
    { old: /acaierpsaas\.com\.br/g, new: 'zullya.com.br' },
    { old: /@acaibom/g, new: '@zullya_erp' },
    { old: /@acaierpsaas/g, new: '@zullya_erp' },
    { old: /"acaiPricePerKg"/g, new: '"productPricePerKg"' },
  ];
  legacyTerms.forEach(t => { str = str.replace(t.old, t.new); });
  return JSON.parse(str);
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return cleanBranding(JSON.parse(raw));
  } catch {}
  return null;
}

function saveToStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function AppProvider({ children }) {
  const stored = loadFromStorage();
  const freshData = getFreshMockData();

  const [apiSynced, setApiSynced] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const syncedRef = useRef(false);

  // --- MULTI-COMPANY STATE ---
  const [companies, setCompanies] = useState(() => stored?.companies ?? freshData.initialCompanies);
  const [activeCompanyId, setActiveCompanyId] = useState(() => stored?.activeCompanyId ?? freshData.initialCompanies[0].id);

  // --- DATA STATES ---
  // Quando autenticado, entidades partem vazias e são preenchidas pela API (sem mock/localStorage)
  const auth = isAuthenticated();
  const [allProducts, setAllProducts] = useState(() => auth ? [] : (stored?.products ?? freshData.initialProducts));
  const [allCustomers, setAllCustomers] = useState(() => auth ? [] : (stored?.customers ?? freshData.initialCustomers));
  const [allInventory, setAllInventory] = useState(() => auth ? [] : (stored?.inventory ?? freshData.initialInventory));
  const [allOrders, setAllOrders] = useState(() => auth ? [] : (stored?.orders ?? freshData.initialOrders));
  const [allSettings, setAllSettings] = useState(() => ({ ...freshData.initialSettings, ...(stored?.settings ?? {}) }));
  const [allEmployees, setAllEmployees] = useState(() => auth ? [] : (Array.isArray(stored?.employees) ? stored.employees : freshData.initialEmployees));
  const [allSuppliers, setAllSuppliers] = useState(() => auth ? [] : (Array.isArray(stored?.suppliers) ? stored.suppliers : freshData.initialSuppliers));
  const [allFinanceEntries, setAllFinanceEntries] = useState(() => auth ? [] : (Array.isArray(stored?.financeEntries) ? stored.financeEntries : freshData.initialFinanceEntries));
  const [allConciliations, setAllConciliations] = useState(() => Array.isArray(stored?.conciliations) ? stored.conciliations : []);
  const [allProposals, setAllProposals] = useState(() => Array.isArray(stored?.proposals) ? stored.proposals : freshData.initialProposals);
  const [allAutomationRules, setAllAutomationRules] = useState(() => Array.isArray(stored?.automationRules) ? stored.automationRules : freshData.initialAutomationRules);
  const [orderCounter, setOrderCounter] = useState(() => stored?.orderCounter ?? freshData.initialOrders.length + 1);
  const [activeExtensions, setActiveExtensions] = useState(() => Array.isArray(stored?.activeExtensions) ? stored.activeExtensions : freshData.initialActiveExtensions);
  const [allCashiers, setAllCashiers] = useState(() => {
    if (stored?.allCashiers) return stored.allCashiers;
    const init = {};
    freshData.initialCompanies.forEach(c => { init[c.id] = freshData.initialCashier; });
    return init;
  });

  const cashier = allCashiers[activeCompanyId] || freshData.initialCashier;

  // ── CARREGAR DA API ────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated() || syncedRef.current) return;
    syncedRef.current = true;

    const compId = activeCompanyId;

    async function loadAll() {
      setApiLoading(true);
      try {
        const [prods, clients, peds, stock, funcs, forn, fin] = await Promise.allSettled([
          produtosApi.listar(),
          clientesApi.listar(),
          pedidosApi.listar({ limit: 200 }),
          estoqueApi.listar(),
          funcionariosApi.listar(),
          fornecedoresApi.listar(),
          financeiroApi.listar({ limit: 500 }),
        ]);

        if (prods.status === 'fulfilled' && prods.value?.dados) {
          setAllProducts(prods.value.dados.map(p => mapProduto(p, compId)));
        }
        if (clients.status === 'fulfilled' && clients.value?.dados) {
          setAllCustomers(clients.value.dados.map(c => mapCliente(c, compId)));
        }
        if (peds.status === 'fulfilled' && peds.value?.dados) {
          setAllOrders(peds.value.dados.map(p => mapPedido(p, compId)));
        }
        if (stock.status === 'fulfilled' && stock.value?.dados) {
          setAllInventory(stock.value.dados.map(i => mapInsumo(i, compId)));
        }
        if (funcs.status === 'fulfilled' && funcs.value?.dados) {
          setAllEmployees(funcs.value.dados.map(f => mapFuncionario(f, compId)));
        }
        if (forn.status === 'fulfilled' && forn.value?.dados) {
          setAllSuppliers(forn.value.dados.map(f => mapFornecedor(f, compId)));
        }
        if (fin.status === 'fulfilled' && fin.value?.dados) {
          setAllFinanceEntries(fin.value.dados.map(l => mapLancamento(l, compId)));
        }

        setApiSynced(true);
      } catch (err) {
        console.warn('API load failed, using local data:', err.message);
      } finally {
        setApiLoading(false);
      }
    }

    loadAll();
  }, [activeCompanyId]);

  // --- DATA MIGRATION ---
  useEffect(() => {
    const defaultId = companies[0]?.id || 'comp-1';
    const migrate = (list, setter) => {
      if (list.some(item => !item.companyId)) {
        setter(prev => prev.map(item => item.companyId ? item : { ...item, companyId: defaultId }));
      }
    };
    migrate(allProducts, setAllProducts);
    migrate(allCustomers, setAllCustomers);
    migrate(allInventory, setAllInventory);
    migrate(allOrders, setAllOrders);
    migrate(allFinanceEntries, setAllFinanceEntries);
    migrate(allEmployees, setAllEmployees);
    migrate(allSuppliers, setAllSuppliers);
    migrate(allProposals, setAllProposals);
    migrate(allAutomationRules, setAllAutomationRules);
  }, [companies]);

  // --- FILTERED DATA ---
  const products = allProducts.filter(p => p.companyId === activeCompanyId);
  const customers = allCustomers.filter(c => c.companyId === activeCompanyId);
  const inventory = allInventory.filter(i => i.companyId === activeCompanyId);
  const orders = allOrders.filter(o => o.companyId === activeCompanyId);
  const employees = allEmployees.filter(e => e.companyId === activeCompanyId);
  const suppliers = allSuppliers.filter(s => s.companyId === activeCompanyId);
  const financeEntries = allFinanceEntries.filter(f => f.companyId === activeCompanyId);
  const conciliations = allConciliations.filter(c => c.companyId === activeCompanyId);
  const proposals = allProposals.filter(p => p.companyId === activeCompanyId);
  const automationRules = allAutomationRules.filter(r => r.companyId === activeCompanyId);
  const settings = allSettings[activeCompanyId] || freshData.initialSettings['comp-1'];
  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];

  const resetToDemoData = useCallback(() => {
    const fresh = getFreshMockData();
    setCompanies(fresh.initialCompanies);
    setActiveCompanyId(fresh.initialCompanies[0].id);
    setAllProducts(fresh.initialProducts);
    setAllCustomers(fresh.initialCustomers);
    setAllInventory(fresh.initialInventory);
    setAllOrders(fresh.initialOrders);
    setAllSettings(fresh.initialSettings);
    setOrderCounter(fresh.initialOrders.length + 1);
    setAllEmployees(fresh.initialEmployees);
    setAllSuppliers(fresh.initialSuppliers);
    setAllFinanceEntries(fresh.initialFinanceEntries);
    setAllConciliations([]);
    setAllProposals(fresh.initialProposals);
    setActiveExtensions(fresh.initialActiveExtensions);
    setAllAutomationRules(fresh.initialAutomationRules);
    setAllCashiers({ [fresh.initialCompanies[0].id]: fresh.initialCashier });
    syncedRef.current = false;
    setApiSynced(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Persist
  useEffect(() => {
    saveToStorage({
      companies, activeCompanyId,
      products: allProducts, customers: allCustomers, inventory: allInventory,
      orders: allOrders, settings: allSettings,
      orderCounter, employees: allEmployees, suppliers: allSuppliers,
      financeEntries: allFinanceEntries, conciliations: allConciliations,
      proposals: allProposals, activeExtensions, automationRules: allAutomationRules, allCashiers,
    });
  }, [companies, activeCompanyId, allProducts, allCustomers, allInventory, allOrders, allSettings, orderCounter, allEmployees, allSuppliers, allFinanceEntries, allConciliations, allProposals, activeExtensions, allAutomationRules, allCashiers]);

  useEffect(() => {
    automationService.init(automationRules, { inventory, customers, orders, settings });
  }, [automationRules, inventory, customers, orders, settings]);

  // --- ACTIONS ---

  const switchCompany = useCallback((id) => {
    if (companies.some(c => c.id === id)) setActiveCompanyId(id);
  }, [companies]);

  const addCompany = useCallback((companyData) => {
    const newId = `comp-${Date.now()}`;
    const newCompany = { ...companyData, id: newId };
    setCompanies(prev => [...prev, newCompany]);
    setAllSettings(prev => ({ ...prev, [newId]: { ...freshData.initialSettings['comp-1'] } }));
    return newCompany;
  }, [freshData.initialSettings]);

  const updateCompany = useCallback((id, updates) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // ── PRODUTOS ──────────────────────────────────────────────
  const addProduct = useCallback(async (product) => {
    if (isAuthenticated()) {
      const res = await produtosApi.criar(mapProdutoToApi({ ...product, categoryId: product.categoryId || null }));
      if (!res?.dados) throw new Error('Falha ao criar produto');
      const mapped = mapProduto(res.dados, activeCompanyId);
      setAllProducts(prev => [...prev, mapped]);
      return mapped;
    }
    const newP = { ...product, id: `p${Date.now()}`, companyId: activeCompanyId };
    setAllProducts(prev => [...prev, newP]);
    return newP;
  }, [activeCompanyId]);

  const updateProduct = useCallback(async (id, updates) => {
    if (isAuthenticated()) {
      await produtosApi.editar(id, mapProdutoToApi(updates));
    }
    setAllProducts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      const p = updated.find(x => x.id === id);
      if (p?.mappings) marketplaceService.syncInventory(p);
      return updated;
    });
  }, [activeCompanyId]);

  const deleteProduct = useCallback(async (id) => {
    if (isAuthenticated()) {
      await produtosApi.desativar(id);
    }
    setAllProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── PEDIDOS ───────────────────────────────────────────────
  const addOrder = useCallback(async (orderData) => {
    if (!orderData?.items) { console.error('addOrder: dados inválidos'); return null; }

    let newOrder;

    if (isAuthenticated()) {
      const res = await pedidosApi.criar(mapPedidoToApi(orderData));
      if (!res?.dados) throw new Error('Falha ao criar pedido');
      newOrder = mapPedido(res.dados, activeCompanyId);
      setAllOrders(prev => [newOrder, ...prev]);
      setOrderCounter(prev => prev + 1);
      setAllCashiers(prev => {
        const current = prev[activeCompanyId] || freshData.initialCashier;
        if (!current.isOpen) return prev;
        return {
          ...prev,
          [activeCompanyId]: {
            ...current,
            salesCount: current.salesCount + 1,
            currentBalance: orderData.payment === 'dinheiro' ? current.currentBalance + orderData.total : current.currentBalance,
          },
        };
      });
      eventBus.emit(EVENTS.SALE_CREATED, { order: newOrder });
      eventBus.emit(EVENTS.KITCHEN_REFRESH, { orderId: newOrder.id });
      return newOrder;
    }

    // Fallback local
    newOrder = {
      ...orderData,
      id: `ord-${String(orderCounter).padStart(4, '0')}`,
      companyId: activeCompanyId,
      number: orderCounter,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setAllOrders(prev => [newOrder, ...prev]);
    setOrderCounter(prev => prev + 1);
    setAllCashiers(prev => {
      const current = prev[activeCompanyId] || freshData.initialCashier;
      if (!current.isOpen) return prev;
      return {
        ...prev,
        [activeCompanyId]: {
          ...current,
          salesCount: current.salesCount + 1,
          currentBalance: orderData.payment === 'dinheiro' ? current.currentBalance + orderData.total : current.currentBalance,
        },
      };
    });

    if (orderData.customerId) {
      setAllCustomers(prev => prev.map(c => {
        if (c.id === orderData.customerId) {
          const pts = Math.floor(orderData.total / (settings.pointsRate || 10));
          return { ...c, points: c.points + pts, totalSpent: parseFloat((c.totalSpent + orderData.total).toFixed(2)), ordersCount: c.ordersCount + 1 };
        }
        return c;
      }));
    }
    if (orderData.items?.length > 0) deductInventoryOnSale(orderData.items);

    eventBus.emit(EVENTS.SALE_CREATED, { order: newOrder });
    eventBus.emit(EVENTS.KITCHEN_REFRESH, { orderId: newOrder.id });
    return newOrder;
  }, [orderCounter, settings.pointsRate, activeCompanyId]);

  const deductInventoryOnSale = useCallback((items) => {
    setAllInventory(prev => {
      const updated = [...prev];
      items.forEach(item => {
        const isAcai = item.name?.toLowerCase().includes('açaí') || item.name?.toLowerCase().includes('acai');
        if (isAcai) {
          let kg = 0.300;
          if (item.name?.includes('500')) kg = 0.500;
          else if (item.name?.includes('700')) kg = 0.700;
          else if (item.name?.includes('1L') || item.name?.includes('1000')) kg = 1.000;
          if (item.weightKg) kg = parseFloat(item.weightKg);
          const polpaIdx = updated.findIndex(i => i.id === 'i1' && i.companyId === activeCompanyId);
          if (polpaIdx !== -1) {
            updated[polpaIdx] = { ...updated[polpaIdx], quantity: Math.max(0, parseFloat((updated[polpaIdx].quantity - kg * item.quantity).toFixed(3))), lastUpdate: new Date().toISOString() };
          }
        }
        const compMap = { 'Granola': 'i2', 'Mel': 'i4', 'Morango': 'i5', 'Banana': 'i6', 'Nutella': 'i7', 'Coco Ralado': 'i8' };
        const stockId = compMap[item.name];
        if (stockId) {
          const idx = updated.findIndex(i => i.id === stockId && i.companyId === activeCompanyId);
          if (idx !== -1) {
            updated[idx] = { ...updated[idx], quantity: Math.max(0, parseFloat((updated[idx].quantity - 0.015 * item.quantity).toFixed(3))), lastUpdate: new Date().toISOString() };
          }
        }
      });
      eventBus.emit(EVENTS.STOCK_UPDATED, { items });
      return updated;
    });
    items.forEach(item => {
      const product = allProducts.find(p => (p.id === item.productId || p.name === item.name) && p.companyId === activeCompanyId);
      if (product?.mappings) marketplaceService.syncInventory({ ...product, stock: product.stock - (item.quantity || 1) });
    });
  }, [allProducts, activeCompanyId]);

  const updateOrderStatus = useCallback(async (id, status) => {
    if (isAuthenticated()) {
      await pedidosApi.atualizarStatus(id, toPtStatus(status));
    }
    const now = new Date().toISOString();
    const tsMap = { preparing: 'preparingAt', ready: 'readyAt', delivered: 'deliveredAt', cancelled: 'cancelledAt' };
    setAllOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      return { ...o, status, ...(tsMap[status] ? { [tsMap[status]]: now } : {}) };
    }));
  }, []);

  const updateOrder = useCallback((id, updates) => {
    setAllOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, []);

  // ── CLIENTES ──────────────────────────────────────────────
  const addCustomer = useCallback(async (customer) => {
    if (isAuthenticated()) {
      const res = await clientesApi.criar(mapClienteToApi(customer));
      if (!res?.dados) throw new Error('Falha ao criar cliente');
      const mapped = mapCliente(res.dados, activeCompanyId);
      setAllCustomers(prev => [...prev, mapped]);
      return mapped;
    }
    const newC = { ...customer, id: `c${Date.now()}`, companyId: activeCompanyId, points: 0, totalSpent: 0, ordersCount: 0, createdAt: new Date().toISOString() };
    setAllCustomers(prev => [...prev, newC]);
    return newC;
  }, [activeCompanyId]);

  const updateCustomer = useCallback(async (id, updates) => {
    if (isAuthenticated()) {
      await clientesApi.editar(id, mapClienteToApi(updates));
    }
    setAllCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCustomer = useCallback(async (id) => {
    if (isAuthenticated()) {
      await clientesApi.desativar(id);
    }
    setAllCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── ESTOQUE ───────────────────────────────────────────────
  const updateInventoryItem = useCallback(async (id, updates) => {
    if (isAuthenticated()) {
      await estoqueApi.editar(id, mapInsumoToApi(updates));
    }
    setAllInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates, lastUpdate: new Date().toISOString() } : i));
  }, []);

  const addInventoryItem = useCallback(async (item) => {
    if (isAuthenticated()) {
      const res = await estoqueApi.criar(mapInsumoToApi(item));
      if (!res?.dados) throw new Error('Falha ao criar insumo');
      const mapped = mapInsumo(res.dados, activeCompanyId);
      setAllInventory(prev => [...prev, mapped]);
      return mapped;
    }
    const newI = { ...item, id: `i${Date.now()}`, companyId: activeCompanyId, lastUpdate: new Date().toISOString() };
    setAllInventory(prev => [...prev, newI]);
    return newI;
  }, [activeCompanyId]);

  const addInventoryStock = useCallback(async (id, qty, motivo = 'Ajuste manual') => {
    if (isAuthenticated()) {
      await estoqueApi.registrarMovimentacao(id, { tipo: 'entrada', quantidade: qty, motivo });
    }
    setAllInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity + qty, lastUpdate: new Date().toISOString() } : i));
  }, []);

  // ── SETTINGS ──────────────────────────────────────────────
  const updateSettings = useCallback((updates) => {
    setAllSettings(prev => ({ ...prev, [activeCompanyId]: { ...(prev[activeCompanyId] || {}), ...updates } }));
  }, [activeCompanyId]);

  // ── FUNCIONÁRIOS ──────────────────────────────────────────
  const addEmployee = useCallback(async (emp) => {
    if (isAuthenticated()) {
      const res = await funcionariosApi.criar(mapFuncionarioToApi(emp));
      if (!res?.dados) throw new Error('Falha ao cadastrar funcionário');
      const mapped = mapFuncionario(res.dados, activeCompanyId);
      setAllEmployees(prev => [...prev, mapped]);
      return mapped;
    }
    const newE = { ...emp, id: `e${Date.now()}`, companyId: activeCompanyId, hiredAt: emp.hiredAt || new Date().toISOString() };
    setAllEmployees(prev => [...prev, newE]);
    return newE;
  }, [activeCompanyId]);

  const updateEmployee = useCallback(async (id, updates) => {
    if (isAuthenticated()) {
      await funcionariosApi.editar(id, mapFuncionarioToApi(updates));
    }
    setAllEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteEmployee = useCallback(async (id) => {
    if (isAuthenticated()) {
      await funcionariosApi.desativar(id);
    }
    setAllEmployees(prev => prev.filter(e => e.id !== id));
  }, []);

  // ── FORNECEDORES ──────────────────────────────────────────
  const addSupplier = useCallback(async (sup) => {
    if (isAuthenticated()) {
      const res = await fornecedoresApi.criar(mapFornecedorToApi(sup));
      if (!res?.dados) throw new Error('Falha ao cadastrar fornecedor');
      const mapped = mapFornecedor(res.dados, activeCompanyId);
      setAllSuppliers(prev => [...prev, mapped]);
      return mapped;
    }
    const newS = { ...sup, id: `s${Date.now()}`, companyId: activeCompanyId, lastOrder: null };
    setAllSuppliers(prev => [...prev, newS]);
    return newS;
  }, [activeCompanyId]);

  const updateSupplier = useCallback(async (id, updates) => {
    if (isAuthenticated()) {
      await fornecedoresApi.editar(id, mapFornecedorToApi(updates));
    }
    setAllSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSupplier = useCallback(async (id) => {
    if (isAuthenticated()) {
      await fornecedoresApi.desativar(id);
    }
    setAllSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  // ── FINANCEIRO ────────────────────────────────────────────
  const addFinanceEntry = useCallback(async (entry) => {
    if (isAuthenticated() && !entry.pedidoId) {
      const res = await financeiroApi.criar(mapLancamentoToApi(entry));
      if (!res?.dados) throw new Error('Falha ao criar lançamento');
      const mapped = mapLancamento(res.dados, activeCompanyId);
      setAllFinanceEntries(prev => [mapped, ...prev]);
      return mapped;
    }
    const newF = { ...entry, id: `f${Date.now()}`, companyId: activeCompanyId, date: entry.date || new Date().toISOString() };
    setAllFinanceEntries(prev => [newF, ...prev]);
    return newF;
  }, [activeCompanyId]);

  const updateFinanceEntry = useCallback(async (id, updates) => {
    if (isAuthenticated()) {
      await financeiroApi.editar(id, mapLancamentoToApi(updates));
    }
    setAllFinanceEntries(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const deleteFinanceEntry = useCallback(async (id) => {
    if (isAuthenticated()) {
      await financeiroApi.excluir(id);
    }
    setAllFinanceEntries(prev => prev.filter(f => f.id !== id));
  }, []);

  // ── CONCILIAÇÃO / ORÇAMENTOS / EXTENSÕES / AUTOMAÇÕES ─────
  const addConciliation = useCallback((item) => {
    setAllConciliations(prev => [{ ...item, id: `con-${Date.now()}`, companyId: activeCompanyId }, ...prev]);
  }, [activeCompanyId]);

  const updateConciliation = useCallback((id, updates) => {
    setAllConciliations(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const addProposal = useCallback((prop) => {
    const newProp = { ...prop, id: `prop-${Date.now()}`, companyId: activeCompanyId, number: proposals.length + 1, date: new Date().toISOString(), status: 'pending' };
    setAllProposals(prev => [newProp, ...prev]);
    return newProp;
  }, [proposals.length, activeCompanyId]);

  const updateProposalStatus = useCallback((id, status) => {
    setAllProposals(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  }, []);

  const convertProposalToOrder = useCallback(async (proposalId) => {
    const proposal = allProposals.find(p => p.id === proposalId);
    if (!proposal) return null;
    const newOrder = await addOrder({ customerId: proposal.customerId, customerName: proposal.customerName, items: proposal.items, total: proposal.total, type: 'balcão', payment: 'pendente', notes: `Orçamento #${proposal.number}. ${proposal.notes || ''}` });
    updateProposalStatus(proposalId, 'approved');
    return newOrder;
  }, [allProposals, addOrder, updateProposalStatus]);

  const toggleExtension = useCallback((id) => {
    setActiveExtensions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const addAutomationRule = useCallback((rule) => {
    setAllAutomationRules(prev => [{ ...rule, id: `rule-${Date.now()}`, companyId: activeCompanyId }, ...prev]);
  }, [activeCompanyId]);

  const updateAutomationRule = useCallback((id, updates) => {
    setAllAutomationRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteAutomationRule = useCallback((id) => {
    setAllAutomationRules(prev => prev.filter(r => r.id !== id));
  }, []);

  // ── CAIXA ─────────────────────────────────────────────────
  const openCashier = useCallback((initialBalance, operatorName) => {
    setAllCashiers(prev => ({
      ...prev,
      [activeCompanyId]: { isOpen: true, openedAt: new Date().toISOString(), closedAt: null, initialBalance: parseFloat(initialBalance), currentBalance: parseFloat(initialBalance), operatorName, salesCount: 0, history: prev[activeCompanyId]?.history || [] },
    }));
  }, [activeCompanyId]);

  const closeCashier = useCallback((finalBalance, notes) => {
    let closedSession = null;
    setAllCashiers(prev => {
      const current = prev[activeCompanyId];
      if (!current?.isOpen) return prev;
      closedSession = { openedAt: current.openedAt, closedAt: new Date().toISOString(), initialBalance: current.initialBalance, currentBalance: current.currentBalance, operatorName: current.operatorName, salesCount: current.salesCount, reportedFinalBalance: parseFloat(finalBalance), difference: parseFloat(finalBalance) - current.currentBalance, notes: notes || '' };
      return { ...prev, [activeCompanyId]: { isOpen: false, openedAt: null, closedAt: null, initialBalance: 0, currentBalance: 0, operatorName: null, salesCount: 0, history: [closedSession, ...(current.history || [])].slice(0, 50) } };
    });
    if (closedSession) {
      addFinanceEntry({ type: 'receita', category: 'Vendas PDV', description: `Fechamento de Caixa - ${closedSession.operatorName}`, amount: closedSession.currentBalance - closedSession.initialBalance, paymentMethod: 'misto', status: 'pago', recurring: false });
      eventBus.emit('cashier:closed', closedSession);
    }
  }, [addFinanceEntry, activeCompanyId]);

  // ── STATS ─────────────────────────────────────────────────
  const getDashboardStats = useCallback(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today && o.status !== 'cancelled');
    const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
    const avgTicket = todayOrders.length ? todaySales / todayOrders.length : 0;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yestSales = orders.filter(o => new Date(o.createdAt).toDateString() === yesterday.toDateString()).reduce((s, o) => s + o.total, 0);
    const salesChange = yestSales ? ((todaySales - yestSales) / yestSales) * 100 : 0;
    const pendingOrders = orders.filter(o => ['pending', 'preparing'].includes(o.status));
    const lowStockItems = inventory.filter(i => i.quantity <= i.minQuantity);
    const productSales = {};
    orders.forEach(o => { o.items?.forEach(item => { productSales[item.name] = (productSales[item.name] || 0) + item.quantity; }); });
    const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));
    return { todaySales, todayOrders: todayOrders.length, avgTicket, salesChange, pendingOrders: pendingOrders.length, totalCustomers: customers.length, lowStockCount: lowStockItems.length, topProducts };
  }, [orders, inventory, customers]);

  const value = {
    // state
    apiSynced, apiLoading,
    companies, activeCompanyId, activeCompany,
    products, customers, inventory, orders, settings,
    employees, suppliers, financeEntries,
    // company
    switchCompany, addCompany, updateCompany,
    // produtos
    addProduct, updateProduct, deleteProduct,
    // pedidos
    addOrder, updateOrderStatus, updateOrder, deductInventoryOnSale,
    // clientes
    addCustomer, updateCustomer, deleteCustomer,
    // estoque
    updateInventoryItem, addInventoryItem, addInventoryStock,
    // settings
    updateSettings,
    // funcionários
    addEmployee, updateEmployee, deleteEmployee,
    // fornecedores
    addSupplier, updateSupplier, deleteSupplier,
    // financeiro
    addFinanceEntry, updateFinanceEntry, deleteFinanceEntry,
    // conciliação
    addConciliation, updateConciliation,
    conciliations,
    // orçamentos
    proposals, addProposal, updateProposalStatus, convertProposalToOrder,
    // extensões
    activeExtensions, toggleExtension,
    // automações
    automationRules, addAutomationRule, updateAutomationRule, deleteAutomationRule,
    // caixa
    cashier, openCashier, closeCashier,
    // stats
    getDashboardStats, getAdvancedBIStats,
    resetToDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
