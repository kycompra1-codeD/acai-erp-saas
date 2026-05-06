import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getFreshMockData, getAdvancedBIStats } from '../data/mockData';
import { eventBus, EVENTS } from '../services/eventBus';
import { marketplaceService } from '../services/marketplaceService';
import { automationService } from '../services/automationService';

const AppContext = createContext(null);

const STORAGE_KEY = 'acai_system_data';

function cleanBranding(data) {
  if (!data) return data;
  
  // Transforma o objeto em string para um "deep replace" de nomes legados
  let str = JSON.stringify(data);
  
  // Lista de termos legados e seus substitutos
  const legacyTerms = [
    { old: /AçaíBom/g, new: 'Açaí ERP SaaS' },
    { old: /AcaìBom/g, new: 'Açaí ERP SaaS' },
    { old: /AçaíTop/g, new: 'Açaí ERP SaaS' },
    { old: /AcaìTop/g, new: 'Açaí ERP SaaS' },
    { old: /AçaíSystem/g, new: 'Açaí ERP SaaS' },
    { old: /acaibom\.com\.br/g, new: 'acaierpsaas.com.br' },
    { old: /@acaibom/g, new: '@acaierp_saas' }
  ];

  legacyTerms.forEach(term => {
    str = str.replace(term.old, term.new);
  });

  return JSON.parse(str);
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return cleanBranding(data);
    }
  } catch {}
  return null;
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function AppProvider({ children }) {
  const stored = loadFromStorage();
  const freshData = getFreshMockData();

  // --- MULTI-COMPANY STATE ---
  const [companies, setCompanies] = useState(() => {
    try { return stored?.companies ?? freshData.initialCompanies; }
    catch { return freshData.initialCompanies; }
  });

  const [activeCompanyId, setActiveCompanyId] = useState(() => {
    try { return stored?.activeCompanyId ?? freshData.initialCompanies[0].id; }
    catch { return freshData.initialCompanies[0].id; }
  });

  // --- DATA STATES (ALL DATA) ---
  const [allProducts, setAllProducts] = useState(() => {
    try { return stored?.products ?? freshData.initialProducts; } 
    catch { return freshData.initialProducts; }
  });
  const [allCustomers, setAllCustomers] = useState(() => {
    try { return stored?.customers ?? freshData.initialCustomers; }
    catch { return freshData.initialCustomers; }
  });
  const [allInventory, setAllInventory] = useState(() => {
    try { return stored?.inventory ?? freshData.initialInventory; }
    catch { return freshData.initialInventory; }
  });
  const [allOrders, setAllOrders] = useState(() => {
    try { return stored?.orders ?? freshData.initialOrders; }
    catch { return freshData.initialOrders; }
  });
  const [allSettings, setAllSettings] = useState(() => {
    try { return { ...freshData.initialSettings, ...(stored?.settings ?? {}) }; }
    catch { return freshData.initialSettings; }
  });
  const [allEmployees, setAllEmployees] = useState(() => {
    try { return Array.isArray(stored?.employees) ? stored.employees : freshData.initialEmployees; }
    catch { return freshData.initialEmployees; }
  });
  const [allSuppliers, setAllSuppliers] = useState(() => {
    try { return Array.isArray(stored?.suppliers) ? stored.suppliers : freshData.initialSuppliers; }
    catch { return freshData.initialSuppliers; }
  });
  const [allFinanceEntries, setAllFinanceEntries] = useState(() => {
    try { return Array.isArray(stored?.financeEntries) ? stored.financeEntries : freshData.initialFinanceEntries; }
    catch { return freshData.initialFinanceEntries; }
  });
  const [allConciliations, setAllConciliations] = useState(() => {
    try { return Array.isArray(stored?.conciliations) ? stored.conciliations : []; }
    catch { return []; }
  });
  const [allProposals, setAllProposals] = useState(() => {
    try { return Array.isArray(stored?.proposals) ? stored.proposals : freshData.initialProposals; }
    catch { return freshData.initialProposals; }
  });
  const [allAutomationRules, setAllAutomationRules] = useState(() => {
    try { return Array.isArray(stored?.automationRules) ? stored.automationRules : freshData.initialAutomationRules; }
    catch { return freshData.initialAutomationRules; }
  });

  // These remain global or scoped differently if needed, keeping them as is for now but linked to company
  const [orderCounter, setOrderCounter] = useState(() => {
    try { return stored?.orderCounter ?? freshData.initialOrders.length + 1; }
    catch { return freshData.initialOrders.length + 1; }
  });
  const [activeExtensions, setActiveExtensions] = useState(() => {
    try { return Array.isArray(stored?.activeExtensions) ? stored.activeExtensions : freshData.initialActiveExtensions; }
    catch { return freshData.initialActiveExtensions; }
  });
  const [allCashiers, setAllCashiers] = useState(() => {
    try { 
      if (stored?.allCashiers) return stored.allCashiers;
      // Initialize with default for current companies
      const initial = {};
      freshData.initialCompanies.forEach(c => {
        initial[c.id] = freshData.initialCashier;
      });
      return initial;
    }
    catch { 
      const initial = {};
      freshData.initialCompanies.forEach(c => {
        initial[c.id] = freshData.initialCashier;
      });
      return initial;
    }
  });

  const cashier = allCashiers[activeCompanyId] || freshData.initialCashier;

  // --- DATA MIGRATION (Ensure all records have companyId) ---
  useEffect(() => {
    let changed = false;
    const defaultId = companies[0]?.id || 'comp-1';

    const migrate = (list, setter) => {
      const needsMigration = list.some(item => !item.companyId);
      if (needsMigration) {
        setter(prev => prev.map(item => item.companyId ? item : { ...item, companyId: defaultId }));
        changed = true;
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

    if (changed) {
      console.log('Dados migrados para compatibilidade multi-empresa.');
    }
  }, [companies, allProducts, allCustomers, allInventory, allOrders, allFinanceEntries, allEmployees, allSuppliers, allProposals, allAutomationRules]);

  // --- FILTERED DATA (EXPOSED TO COMPONENTS) ---
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
      proposals: allProposals, activeExtensions, automationRules: allAutomationRules, allCashiers
    });
  }, [companies, activeCompanyId, allProducts, allCustomers, allInventory, allOrders, allSettings, orderCounter, allEmployees, allSuppliers, allFinanceEntries, allConciliations, allProposals, activeExtensions, allAutomationRules, allCashiers]);

  // 🆕 Inicializa o Motor de Automação (apenas para a empresa ativa)
  useEffect(() => {
    automationService.init(automationRules, {
      inventory,
      customers,
      orders,
      settings
    });
  }, [automationRules, inventory, customers, orders, settings]);

  // --- ACTIONS WITH SCOPE ---

  const switchCompany = useCallback((id) => {
    if (companies.some(c => c.id === id)) {
      setActiveCompanyId(id);
    }
  }, [companies]);

  const addCompany = useCallback((companyData) => {
    const newId = `comp-${Date.now()}`;
    const newCompany = { ...companyData, id: newId };
    setCompanies(prev => [...prev, newCompany]);
    // Initialize settings for new company
    setAllSettings(prev => ({
      ...prev,
      [newId]: { ...freshData.initialSettings['comp-1'] }
    }));
    return newCompany;
  }, [freshData.initialSettings]);

  const updateCompany = useCallback((id, updates) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // ---- PRODUTOS ----
  const addProduct = useCallback((product) => {
    const newProduct = { ...product, id: `p${Date.now()}`, companyId: activeCompanyId };
    setAllProducts(prev => [...prev, newProduct]);
  }, [activeCompanyId]);

  const updateProduct = useCallback((id, updates) => {
    let productToSync = null;
    setAllProducts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      productToSync = updated.find(p => p.id === id);
      return updated;
    });

    if (productToSync && (updates.stock !== undefined || updates.price !== undefined || updates.mappings)) {
      marketplaceService.syncInventory(productToSync);
    }
  }, []);

  const deleteProduct = useCallback((id) => {
    setAllProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  // ---- PEDIDOS ----
  const addOrder = useCallback((orderData) => {
    if (!orderData || !orderData.items) {
      console.error('AddOrder: Dados inválidos');
      return null;
    }

    const newOrder = {
      ...orderData,
      id: `ord-${String(orderCounter).padStart(4, '0')}`,
      companyId: activeCompanyId,
      number: orderCounter,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setAllOrders(prev => [newOrder, ...prev]);
    setOrderCounter(prev => prev + 1);

    // 🆕 Atualiza caixa (se aberto para esta empresa)
    setAllCashiers(prev => {
      const current = prev[activeCompanyId] || freshData.initialCashier;
      if (!current.isOpen) return prev;
      let newBalance = current.currentBalance;
      if (orderData.payment === 'dinheiro') {
        newBalance += orderData.total;
      }
      return {
        ...prev,
        [activeCompanyId]: {
          ...current,
          salesCount: current.salesCount + 1,
          currentBalance: newBalance
        }
      };
    });

    // Atualiza pontos e total do cliente
    if (orderData.customerId) {
      setAllCustomers(prev => prev.map(c => {
        if (c.id === orderData.customerId) {
          const points = Math.floor(orderData.total / (settings.pointsRate || 10));
          return {
            ...c,
            points: c.points + points,
            totalSpent: parseFloat((c.totalSpent + orderData.total).toFixed(2)),
            ordersCount: c.ordersCount + 1,
          };
        }
        return c;
      }));
    }

    if (orderData.items?.length > 0) {
      deductInventoryOnSale(orderData.items);
    }

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
            const deduct = kg * item.quantity;
            updated[polpaIdx] = {
              ...updated[polpaIdx],
              quantity: Math.max(0, parseFloat((updated[polpaIdx].quantity - deduct).toFixed(3))),
              lastUpdate: new Date().toISOString(),
            };
          }
        }

        const compMap = { 'Granola': 'i2', 'Mel': 'i4', 'Morango': 'i5', 'Banana': 'i6', 'Nutella': 'i7', 'Coco Ralado': 'i8' };
        const stockId = compMap[item.name];
        if (stockId) {
          const idx = updated.findIndex(i => i.id === stockId && i.companyId === activeCompanyId);
          if (idx !== -1) {
            updated[idx] = {
              ...updated[idx],
              quantity: Math.max(0, parseFloat((updated[idx].quantity - 0.015 * item.quantity).toFixed(3))),
              lastUpdate: new Date().toISOString(),
            };
          }
        }
      });
      eventBus.emit(EVENTS.STOCK_UPDATED, { items });
      return updated;
    });

    items.forEach(item => {
      const product = allProducts.find(p => (p.id === item.productId || p.name === item.name) && p.companyId === activeCompanyId);
      if (product && product.mappings) {
        marketplaceService.syncInventory({ ...product, stock: product.stock - (item.quantity || 1) });
      }
    });
  }, [allProducts, activeCompanyId]);

  const updateOrderStatus = useCallback((id, status) => {
    const now = new Date().toISOString();
    const tsMap = { preparing: 'preparingAt', ready: 'readyAt', delivered: 'deliveredAt', cancelled: 'cancelledAt' };
    setAllOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const extra = tsMap[status] ? { [tsMap[status]]: now } : {};
      return { ...o, status, ...extra };
    }));
  }, []);

  const updateOrder = useCallback((id, updates) => {
    setAllOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, []);

  // ---- CLIENTES ----
  const addCustomer = useCallback((customer) => {
    const newCustomer = {
      ...customer,
      id: `c${Date.now()}`,
      companyId: activeCompanyId,
      points: 0,
      totalSpent: 0,
      ordersCount: 0,
      createdAt: new Date().toISOString(),
    };
    setAllCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  }, [activeCompanyId]);

  const updateCustomer = useCallback((id, updates) => {
    setAllCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCustomer = useCallback((id) => {
    setAllCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  // ---- ESTOQUE ----
  const updateInventoryItem = useCallback((id, updates) => {
    setAllInventory(prev => prev.map(i =>
      i.id === id ? { ...i, ...updates, lastUpdate: new Date().toISOString() } : i
    ));
  }, []);

  const addInventoryItem = useCallback((item) => {
    setAllInventory(prev => [...prev, { ...item, id: `i${Date.now()}`, companyId: activeCompanyId, lastUpdate: new Date().toISOString() }]);
  }, [activeCompanyId]);

  const addInventoryStock = useCallback((id, qty) => {
    setAllInventory(prev => prev.map(i =>
      i.id === id ? { ...i, quantity: i.quantity + qty, lastUpdate: new Date().toISOString() } : i
    ));
  }, []);

  // ---- SETTINGS ----
  const updateSettings = useCallback((updates) => {
    setAllSettings(prev => ({
      ...prev,
      [activeCompanyId]: { ...(prev[activeCompanyId] || {}), ...updates }
    }));
  }, [activeCompanyId]);

  // ---- FUNCIONÁRIOS ----
  const addEmployee = useCallback((emp) => {
    const newEmp = { ...emp, id: `e${Date.now()}`, companyId: activeCompanyId, hiredAt: emp.hiredAt || new Date().toISOString() };
    setAllEmployees(prev => [...prev, newEmp]);
    return newEmp;
  }, [activeCompanyId]);

  const updateEmployee = useCallback((id, updates) => {
    setAllEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteEmployee = useCallback((id) => {
    setAllEmployees(prev => prev.filter(e => e.id !== id));
  }, []);

  // ---- FORNECEDORES ----
  const addSupplier = useCallback((sup) => {
    const newSup = { ...sup, id: `s${Date.now()}`, companyId: activeCompanyId, lastOrder: null };
    setAllSuppliers(prev => [...prev, newSup]);
    return newSup;
  }, [activeCompanyId]);

  const updateSupplier = useCallback((id, updates) => {
    setAllSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSupplier = useCallback((id) => {
    setAllSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  // ---- FINANCEIRO ----
  const addFinanceEntry = useCallback((entry) => {
    const newEntry = { ...entry, id: `f${Date.now()}`, companyId: activeCompanyId, date: entry.date || new Date().toISOString() };
    setAllFinanceEntries(prev => [newEntry, ...prev]);
    return newEntry;
  }, [activeCompanyId]);

  const updateFinanceEntry = useCallback((id, updates) => {
    setAllFinanceEntries(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const deleteFinanceEntry = useCallback((id) => {
    setAllFinanceEntries(prev => prev.filter(f => f.id !== id));
  }, []);

  // ---- CONCILIAÇÃO ----
  const addConciliation = useCallback((item) => {
    setAllConciliations(prev => [{ ...item, id: `con-${Date.now()}`, companyId: activeCompanyId }, ...prev]);
  }, [activeCompanyId]);

  const updateConciliation = useCallback((id, updates) => {
    setAllConciliations(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // ---- ORÇAMENTOS ----
  const addProposal = useCallback((prop) => {
    const newProp = { 
      ...prop, 
      id: `prop-${Date.now()}`, 
      companyId: activeCompanyId,
      number: proposals.length + 1, 
      date: new Date().toISOString(),
      status: 'pending'
    };
    setAllProposals(prev => [newProp, ...prev]);
    return newProp;
  }, [proposals.length, activeCompanyId]);

  const updateProposalStatus = useCallback((id, status) => {
    setAllProposals(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  }, []);

  const convertProposalToOrder = useCallback((proposalId) => {
    const proposal = allProposals.find(p => p.id === proposalId);
    if (!proposal) return null;
    const orderData = {
      customerId: proposal.customerId,
      customerName: proposal.customerName,
      items: proposal.items,
      total: proposal.total,
      type: 'balcão',
      payment: 'pendente',
      notes: `Convertido do Orçamento #${proposal.number}. ${proposal.notes || ''}`,
    };
    const newOrder = addOrder(orderData);
    updateProposalStatus(proposalId, 'approved');
    return newOrder;
  }, [allProposals, addOrder, updateProposalStatus]);

  // ---- EXTENSÕES ----
  const toggleExtension = useCallback((id) => {
    setActiveExtensions(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  // ---- AUTOMAÇÕES ----
  const addAutomationRule = useCallback((rule) => {
    setAllAutomationRules(prev => [{ ...rule, id: `rule-${Date.now()}`, companyId: activeCompanyId }, ...prev]);
  }, [activeCompanyId]);

  const updateAutomationRule = useCallback((id, updates) => {
    setAllAutomationRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteAutomationRule = useCallback((id) => {
    setAllAutomationRules(prev => prev.filter(r => r.id !== id));
  }, []);

  // ---- CAIXA ----
  const openCashier = useCallback((initialBalance, operatorName) => {
    setAllCashiers(prev => ({
      ...prev,
      [activeCompanyId]: {
        isOpen: true,
        openedAt: new Date().toISOString(),
        closedAt: null,
        initialBalance: parseFloat(initialBalance),
        currentBalance: parseFloat(initialBalance),
        operatorName: operatorName,
        salesCount: 0,
        history: prev[activeCompanyId]?.history || []
      }
    }));
  }, [activeCompanyId]);

  const closeCashier = useCallback((finalBalance, notes) => {
    let closedSession = null;
    setAllCashiers(prev => {
      const current = prev[activeCompanyId];
      if (!current || !current.isOpen) return prev;
      closedSession = {
        openedAt: current.openedAt,
        closedAt: new Date().toISOString(),
        initialBalance: current.initialBalance,
        currentBalance: current.currentBalance,
        operatorName: current.operatorName,
        salesCount: current.salesCount,
        reportedFinalBalance: parseFloat(finalBalance),
        difference: parseFloat(finalBalance) - current.currentBalance,
        notes: notes || ''
      };
      return {
        ...prev,
        [activeCompanyId]: {
          isOpen: false,
          openedAt: null,
          closedAt: null,
          initialBalance: 0,
          currentBalance: 0,
          operatorName: null,
          salesCount: 0,
          history: [closedSession, ...(current.history || [])].slice(0, 50)
        }
      };
    });

    if (closedSession) {
      addFinanceEntry({
        type: 'receita',
        category: 'Vendas PDV',
        description: `Fechamento de Caixa - ${closedSession.operatorName}`,
        amount: closedSession.currentBalance - closedSession.initialBalance,
        paymentMethod: 'misto',
        status: 'pago',
        recurring: false
      });
      eventBus.emit('cashier:closed', closedSession);
    }
  }, [addFinanceEntry]);

  // ---- STATS ----
  const getDashboardStats = useCallback(() => {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
    const avgTicket = todayOrders.length ? todaySales / todayOrders.length : 0;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestOrders = orders.filter(o => new Date(o.createdAt).toDateString() === yesterday.toDateString());
    const yestSales = yestOrders.reduce((s, o) => s + o.total, 0);
    const salesChange = yestSales ? ((todaySales - yestSales) / yestSales) * 100 : 0;
    const pendingOrders = orders.filter(o => ['pending', 'preparing'].includes(o.status));
    const lowStockItems = inventory.filter(i => i.quantity <= i.minQuantity);
    const productSales = {};
    orders.forEach(o => {
      o.items?.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
      });
    });
    const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty }));

    return { todaySales, todayOrders: todayOrders.length, avgTicket, salesChange, pendingOrders: pendingOrders.length, totalCustomers: customers.length, lowStockCount: lowStockItems.length, topProducts };
  }, [orders, inventory, customers]);

  const value = {
    companies, activeCompanyId, activeCompany,
    products, customers, inventory, orders, settings,
    employees, suppliers, financeEntries,
    switchCompany, addCompany, updateCompany,
    addProduct, updateProduct, deleteProduct,
    addOrder, updateOrderStatus, updateOrder,
    addCustomer, updateCustomer, deleteCustomer,
    updateInventoryItem, addInventoryItem, addInventoryStock,
    updateSettings,
    addEmployee, updateEmployee, deleteEmployee,
    addSupplier, updateSupplier, deleteSupplier,
    addFinanceEntry, updateFinanceEntry, deleteFinanceEntry,
    addConciliation, updateConciliation,
    proposals, addProposal, updateProposalStatus, convertProposalToOrder,
    activeExtensions, toggleExtension,
    automationRules, addAutomationRule, updateAutomationRule, deleteAutomationRule,
    cashier, openCashier, closeCashier,
    getDashboardStats,
    getAdvancedBIStats,
    deductInventoryOnSale,
    resetToDemoData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
