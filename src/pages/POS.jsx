import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, CheckCircle, X,
  Search, Scale, Printer, Wifi, WifiOff, RotateCcw,
  Zap, Weight, BookmarkPlus, Bookmark, Pencil,
  QrCode, Loader2, Lock, Unlock
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { scaleSimulator } from '../services/scaleSimulator';
import { printService } from '../services/printService';
import { paymentGateway } from '../services/paymentGateway';
import { eventBus, EVENTS } from '../services/eventBus';
import toast from 'react-hot-toast';
import { CashierModal } from '../components/CashierModal';

const STATIC_CATEGORIES = [
  { key: 'acai', label: '🍇 Açaís' },
  { key: 'complemento', label: '🌾 Complementos' },
  { key: 'bebida', label: '🥤 Bebidas' },
  { key: 'sobremesa', label: '🍩 Sobremesas' },
];

const CAT_STORAGE_KEY = 'zullya_product_categories';

function useDynamicCategories() {
  const [cats, setCats] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CAT_STORAGE_KEY) || '[]');
      return saved.length > 0 ? saved : STATIC_CATEGORIES;
    } catch { return STATIC_CATEGORIES; }
  });

  useEffect(() => {
    const handler = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(CAT_STORAGE_KEY) || '[]');
        if (saved.length > 0) setCats(saved);
      } catch {}
    };
    window.addEventListener('storage', handler);
    // poll local changes (same tab)
    const id = setInterval(handler, 2000);
    return () => { window.removeEventListener('storage', handler); clearInterval(id); };
  }, []);

  const withEmoji = cats.map(c => ({
    key: c.key,
    label: c.emoji ? `${c.emoji} ${c.label}` : c.label,
  }));

  return [{ key: 'all', label: 'Todos' }, ...withEmoji];
}

const ORDER_TYPES = ['balcão', 'delivery', 'retirada'];
const PAYMENTS = ['credito', 'debito', 'pix', 'dinheiro'];

// Preço por kg para açaís vendidos por peso (R$/kg)
const ACAI_PRICE_PER_KG = 45.00;

function fmt(v) {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

const TARE_STORAGE_KEY = 'zullya-tare-presets';

function useTarePresets() {
  const [presets, setPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(TARE_STORAGE_KEY) || '[]');
    } catch { return []; }
  });

  const save = (list) => {
    setPresets(list);
    localStorage.setItem(TARE_STORAGE_KEY, JSON.stringify(list));
  };

  const addPreset = (name, kg) => {
    const trimmed = name.trim() || `Tara ${(kg * 1000).toFixed(0)}g`;
    const preset = { id: Date.now().toString(), name: trimmed, kg: parseFloat(kg.toFixed(3)) };
    save([...presets, preset]);
    return preset;
  };

  const removePreset = (id) => save(presets.filter(p => p.id !== id));

  const updatePreset = (id, changes) => save(presets.map(p => p.id === id ? { ...p, ...changes } : p));

  return { presets, addPreset, removePreset, updatePreset };
}

// ============================================================
// PAINEL DE BALANÇA
// ============================================================
function ScalePanel({ onConfirmWeight, pricePerKg }) {
  const [weight, setWeight] = useState(0);
  const [gross, setGross] = useState(0);
  const [tare, setTareState] = useState(0);
  const [stable, setStable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [manualKg, setManualKg] = useState('');
  const [mode, setMode] = useState('auto');
  // preset management
  const { presets, addPreset, removePreset, updatePreset } = useTarePresets();
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTareName, setNewTareName] = useState('');
  const [newTareKg, setNewTareKg] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [manageMode, setManageMode] = useState(false);

  useEffect(() => {
    const unsub = eventBus.on(EVENTS.WEIGHT_UPDATE, (data) => {
      const net = data.net ?? data.weight ?? 0;
      const g   = data.gross ?? data.weight ?? 0;
      setWeight(net);
      setGross(g);
      setTareState(data.tare ?? 0);
      setStable(data.stable || false);
      setConnected(data.connected || false);
    });
    const unsubConn = eventBus.on(EVENTS.SCALE_CONNECTED, () => setConnected(true));
    const unsubDisc = eventBus.on(EVENTS.SCALE_DISCONNECTED, () => {
      setConnected(false);
      setWeight(0);
      setGross(0);
    });
    return () => { unsub(); unsubConn(); unsubDisc(); };
  }, []);

  const toggleScale = () => {
    if (scaleSimulator.isConnected()) {
      scaleSimulator.disconnect();
      setConnected(false);
    } else {
      scaleSimulator.connect();
    }
  };

  const handleManual = () => {
    const kg = parseFloat(manualKg.replace(',', '.'));
    if (!kg || kg <= 0) { toast.error('Peso inválido'); return; }
    scaleSimulator.connect();
    scaleSimulator.setManualWeight(kg);
    setMode('manual');
  };

  const resetManual = () => {
    scaleSimulator.setAutoMode();
    setManualKg('');
    setMode('auto');
  };

  const handleTare = () => {
    if (!connected) { toast.error('Conecte a balança primeiro'); return; }
    if (gross <= 0.001) { toast.error('Coloque o recipiente na balança para tarar'); return; }
    scaleSimulator.setTare();
    toast.success(`Tara definida: ${gross.toFixed(3)} kg`);
  };

  const handleClearTare = () => {
    scaleSimulator.clearTare();
    toast('Tara removida', { icon: '⚖️' });
  };

  const applyPreset = (preset) => {
    scaleSimulator.setTare(preset.kg);
    toast.success(`Tara: ${preset.name} (${preset.kg.toFixed(3)} kg)`);
  };

  const handleSavePreset = () => {
    const kg = newTareKg
      ? parseFloat(newTareKg.replace(',', '.'))
      : gross;
    if (!kg || kg <= 0) { toast.error('Peso inválido para salvar'); return; }
    const p = addPreset(newTareName, kg);
    toast.success(`Preset "${p.name}" salvo!`);
    setShowSaveForm(false);
    setNewTareName('');
    setNewTareKg('');
  };

  const handleRenamePreset = (id) => {
    if (!editName.trim()) return;
    updatePreset(id, { name: editName.trim() });
    setEditId(null);
    setEditName('');
  };

  const net = weight;
  const value = net * pricePerKg;
  const netDisplay = net > 0 ? net.toFixed(3) : '0.000';
  const hasTare = tare > 0.001;

  return (
    <div style={{
      background: connected
        ? 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(16,185,129,0.06))'
        : 'var(--surface-2)',
      border: `1px solid ${connected ? 'rgba(124,58,237,0.3)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: 16,
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Scale size={16} color={connected ? 'var(--primary-light)' : 'var(--text-muted)'} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Balança Digital</span>
          {hasTare && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px',
              background: 'rgba(16,185,129,0.15)', color: 'var(--success)',
              borderRadius: 99, border: '1px solid rgba(16,185,129,0.3)',
            }}>
              TARA ATIVA
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {connected ? (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--success)', fontWeight: 600,
            }}>
              <Wifi size={10} />
              {stable ? 'Estável' : 'Lendo...'}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <WifiOff size={10} /> Desconectada
            </span>
          )}
          <button
            onClick={toggleScale}
            className={`btn btn-sm ${connected ? 'btn-danger' : 'btn-primary'}`}
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            {connected ? 'Desligar' : '⚡ Ligar'}
          </button>
        </div>
      </div>

      {/* Display de peso */}
      <div style={{
        background: '#000',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 12,
        border: '2px solid #111',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
      }}>
        {/* Linha bruto + tara (só aparece quando há tara) */}
        {hasTare && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 8, paddingBottom: 8,
            borderBottom: '1px solid #1a1a1a',
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#444' }}>
              Bruto: <span style={{ color: '#666' }}>{gross.toFixed(3)} kg</span>
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#443300' }}>
              − Tara: <span style={{ color: '#554400' }}>{tare.toFixed(3)} kg</span>
            </span>
          </div>
        )}

        {/* Linha principal: peso líquido */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: '"Courier New", monospace',
              fontSize: 34,
              fontWeight: 900,
              color: connected ? (hasTare ? '#00eebb' : '#00ff88') : '#1a3a1a',
              letterSpacing: 2,
              lineHeight: 1,
              transition: 'color 0.3s',
            }}>
              {netDisplay}
            </div>
            <div style={{ color: '#00cc66', fontSize: 11, opacity: 0.7, marginTop: 2, fontFamily: 'monospace' }}>
              {hasTare ? 'kg líquido' : 'kg'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: '"Courier New", monospace',
              fontSize: 18,
              fontWeight: 700,
              color: connected && net > 0 ? '#ffcc00' : '#332200',
              transition: 'color 0.3s',
            }}>
              {connected && net > 0 ? fmt(value) : '—'}
            </div>
            <div style={{ color: '#665500', fontSize: 10, fontFamily: 'monospace' }}>
              R${pricePerKg.toFixed(2)}/kg
            </div>
          </div>
        </div>
      </div>

      {/* ── Taras ── */}
      <div style={{ marginBottom: 8 }}>
        {/* Linha de ação principal */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleTare}
            disabled={!connected}
            style={{ flex: 1, gap: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
            title="Zera com o peso atual na balança"
          >
            <RotateCcw size={12} /> Tarar
          </button>
          {hasTare && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleClearTare}
              style={{ fontSize: 12, gap: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px' }}
            >
              <X size={12} /> Limpar
            </button>
          )}
          <button
            className={`btn btn-sm ${manageMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setManageMode(m => !m); setShowSaveForm(false); setEditId(null); }}
            style={{ fontSize: 12, gap: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px' }}
            title="Gerenciar presets de tara"
          >
            <Bookmark size={12} /> Presets
          </button>
        </div>

        {/* Grade de presets salvos */}
        {presets.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
            {presets.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {editId === p.id ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      className="input-field"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenamePreset(p.id); if (e.key === 'Escape') setEditId(null); }}
                      style={{ fontSize: 11, padding: '3px 7px', width: 90 }}
                      autoFocus
                    />
                    <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: '3px 7px' }} onClick={() => handleRenamePreset(p.id)}>✓</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '3px 7px' }} onClick={() => setEditId(null)}>✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => !manageMode && applyPreset(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: hasTare && Math.abs(tare - p.kg) < 0.001 ? 'rgba(16,185,129,0.2)' : 'var(--surface)',
                      border: `1px solid ${hasTare && Math.abs(tare - p.kg) < 0.001 ? 'var(--success)' : 'var(--border)'}`,
                      borderRadius: 99, padding: '4px 10px', cursor: manageMode ? 'default' : 'pointer',
                      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                      color: hasTare && Math.abs(tare - p.kg) < 0.001 ? 'var(--success)' : 'var(--text)',
                    }}
                    title={`Aplicar tara: ${p.kg.toFixed(3)} kg`}
                  >
                    ⚖️ {p.name}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{(p.kg * 1000).toFixed(0)}g</span>
                    {manageMode && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setEditId(p.id); setEditName(p.name); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--text-muted)' }}
                          title="Renomear"
                        ><Pencil size={10} /></button>
                        <button
                          onClick={e => { e.stopPropagation(); removePreset(p.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--error, #ef4444)' }}
                          title="Excluir"
                        ><X size={10} /></button>
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formulário salvar novo preset */}
        {manageMode && (
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 10, marginTop: 4,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
              ➕ Novo preset de tara
            </div>
            {!showSaveForm ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setShowSaveForm(true); setNewTareKg(gross > 0.001 ? gross.toFixed(3) : ''); }}
                  style={{ flex: 1, fontSize: 11, gap: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  disabled={gross <= 0.001}
                  title="Usa o peso atual na balança"
                >
                  <BookmarkPlus size={11} /> Salvar peso atual ({gross > 0 ? (gross*1000).toFixed(0) : '0'}g)
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setShowSaveForm(true); setNewTareKg(''); }}
                  style={{ fontSize: 11, gap: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px' }}
                >
                  <Pencil size={11} /> Digitar
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  className="input-field"
                  placeholder="Nome (ex: Pote 300ml, Copo Grande...)"
                  value={newTareName}
                  onChange={e => setNewTareName(e.target.value)}
                  style={{ fontSize: 12 }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    className="input-field"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Peso kg (ex: 0.120)"
                    value={newTareKg}
                    onChange={e => setNewTareKg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                    style={{ flex: 1, fontSize: 12 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleSavePreset} style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                    <BookmarkPlus size={12} /> Salvar
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowSaveForm(false)} style={{ fontSize: 12 }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input manual */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Weight size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            type="number"
            step="0.001"
            min="0"
            placeholder="Peso manual (kg)"
            value={manualKg}
            onChange={e => setManualKg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManual()}
            style={{ fontSize: 13, paddingLeft: 28 }}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleManual} style={{ whiteSpace: 'nowrap' }}>
          Confirmar
        </button>
        {mode === 'manual' && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={resetManual} title="Modo automático">
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      {/* Botão adicionar ao carrinho */}
      {connected && net > 0.001 && (
        <button
          className="btn btn-primary w-full"
          onClick={() => {
            if (!stable && mode !== 'manual') {
              toast.error('Aguarde a balança estabilizar');
              return;
            }
            onConfirmWeight(net, value);
            if (mode !== 'manual') {
              scaleSimulator.setManualWeight(0);
              setTimeout(() => scaleSimulator.setAutoMode(), 100);
            }
          }}
          style={{ fontSize: 13, gap: 6 }}
        >
          <Zap size={14} />
          Adicionar {netDisplay} kg{hasTare ? ' (líq.)' : ''} — {fmt(value)}
        </button>
      )}
    </div>
  );
}

// ============================================================
// POS PRINCIPAL
// ============================================================
export default function POS() {
  const { products, customers, addOrder, settings, cashier } = useApp();
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const categories = useDynamicCategories();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('balcão');
  const [payments, setPayments] = useState([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState('credito');
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Balcão');
  const [notes, setNotes] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [success, setSuccess] = useState(null);
  const [showScale, setShowScale] = useState(false);
  const [pricePerKg, setPricePerKg] = useState(ACAI_PRICE_PER_KG);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [pixQrCodeString, setPixQrCodeString] = useState('');

  const mpPollRef = useRef(null);
  const mpIntentRef = useRef(null);

  useEffect(() => {
    return () => {
      if (mpPollRef.current) clearInterval(mpPollRef.current);
    };
  }, []);

  const cancelIntegration = useCallback(() => {
    setProcessingPayment(false);
    if (mpPollRef.current) {
      clearInterval(mpPollRef.current);
      mpPollRef.current = null;
    }
    if (mpIntentRef.current && settings?.paymentConfig) {
      paymentGateway.cancelTerminalPayment(
        mpIntentRef.current,
        settings.paymentConfig
      );
      mpIntentRef.current = null;
    }
  }, [settings]);

  // Preço por kg das configurações
  useEffect(() => {
    if (settings?.acaiPricePerKg) setPricePerKg(settings.acaiPricePerKg);
  }, [settings]);

  const activeProducts = useMemo(() =>
    products.filter(p => p.active && (
      (category === 'all' || p.category === category) &&
      (search === '' || p.name.toLowerCase().includes(search.toLowerCase()))
    )),
    [products, category, search]
  );

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const paidAmount = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const remainingAmount = Math.max(0, total - paidAmount);
  // O troco só acontece se houver dinheiro envolvido e a soma paga for maior que o total
  const hasCash = payments.some(p => p.method === 'dinheiro');
  const troco = (hasCash && paidAmount > total) ? paidAmount - total : null;

  useEffect(() => {
    if (showPayModal && remainingAmount > 0) {
      setCurrentPaymentAmount(remainingAmount.toFixed(2));
    }
  }, [showPayModal, remainingAmount]);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        price: product.price, 
        quantity: 1, 
        emoji: product.emoji,
        image: product.image,
        identityType: product.identityType 
      }];
    });
  }, []);

  // Adiciona item por peso da balança
  const handleWeightConfirm = useCallback((kg, value) => {
    const weightItem = {
      productId: `acai-peso-${Date.now()}`,
      name: `🍇 Açaí (${kg.toFixed(3)} kg)`,
      price: value,
      quantity: 1,
      emoji: '⚖️',
      weightKg: kg,
      isWeightItem: true,
    };
    setCart(prev => [...prev, weightItem]);
    toast.success(`Adicionado: ${kg.toFixed(3)} kg — ${fmt(value)}`);
  }, []);

  const updateQty = useCallback((productId, delta) => {
    setCart(prev => {
      const updated = prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + delta } : i);
      return updated.filter(i => i.quantity > 0);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setPayments([]);
    setCustomerId('');
    setCustomerName('Balcão');
    setNotes('');
    setCurrentPaymentAmount('');
  }, []);

  const performFinalize = useCallback(() => {
    const customer = customers.find(c => c.id === customerId);
    const orderData = {
      customerId: customerId || null,
      customerName: customer?.name || 'Balcão',
      items: cart,
      total,
      type: orderType,
      payments,
      notes,
      troco: troco || undefined,
    };

    const order = addOrder(orderData);
    setSuccess(order);
    setShowPayModal(false);
    setProcessingPayment(false);
    clearCart();
    toast.success(`Pedido #${order.number} registrado! 🎉`);

    // Impressão automática do cupom
    setTimeout(() => printService.printOrder({ ...order, troco }), 500);
  }, [cart, customers, customerId, total, orderType, payments, notes, troco, addOrder, clearCart]);

  const addPaymentMethod = useCallback(() => {
    if (cart.length === 0) { toast.error('Carrinho vazio!'); return; }
    
    const amountStr = currentPaymentAmount.toString().replace(',', '.');
    let amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) { toast.error('Informe um valor válido.'); return; }
    
    // Se não for dinheiro, não pode pagar mais que o restante
    if (currentPaymentMethod !== 'dinheiro' && amount > remainingAmount) {
      amount = remainingAmount;
    }

    const token = settings?.paymentConfig?.mercadoPagoToken || 'DEMO_TOKEN';
    const desc = `Pedido Parcial - ${currentPaymentMethod}`;

    const onSuccess = () => {
      setPayments(prev => [...prev, { method: currentPaymentMethod, amount }]);
      setProcessingPayment(false);
      setCurrentPaymentAmount('');
    };

    if (currentPaymentMethod === 'pix' && settings?.paymentConfig?.pixEnabled) {
      setProcessingPayment(true);
      setPaymentMessage(`Gerando QR Code do PIX (R$ ${fmt(amount)})...`);
      
      mercadoPagoService.createPixPayment(token, amount, desc)
        .then(data => {
          setPixQrCodeString(data.qr_code);
          setPaymentMessage('Aguardando pagamento via PIX...');
          
          mpPollRef.current = setInterval(async () => {
            try {
              const status = await mercadoPagoService.checkPixStatus(token, data.id);
              if (status.status === 'approved') {
                clearInterval(mpPollRef.current);
                mpPollRef.current = null;
                toast.success('PIX Recebido com sucesso!');
                onSuccess();
              } else if (status.status === 'cancelled' || status.status === 'rejected') {
                clearInterval(mpPollRef.current);
                mpPollRef.current = null;
                toast.error('PIX cancelado ou expirado.');
                setProcessingPayment(false);
              }
            } catch (e) {
              console.warn('Erro ao verificar status do PIX:', e);
            }
          }, 3000);
        })
        .catch(err => {
          toast.error('Erro ao conectar com servidor PIX.');
          setProcessingPayment(false);
        });
      return;
    }

    if ((currentPaymentMethod === 'credito' || currentPaymentMethod === 'debito') && 
       (settings?.paymentConfig?.tefEnabled || settings?.paymentConfig?.mercadoPagoEnabled)) {
       
      setProcessingPayment(true);
      
      if (settings?.paymentConfig?.tefEnabled) {
        setPaymentMessage('Aguardando Pinpad (TEF)... Insira ou aproxime o cartão.');
        // Para fins do MVP com TEF falso, a gente tem o onSuccess no Force Approve
        return;
      }
      
      setPaymentMessage('Conectando com a maquininha...');
      const provider = settings.paymentConfig.defaultTerminalProvider || 'mercadopago';
      
      paymentGateway.sendToTerminal(amount, desc, settings.paymentConfig)
        .then(intent => {
           mpIntentRef.current = intent.id;
           setPaymentMessage('Aguardando cliente na maquininha...');
           
           mpPollRef.current = setInterval(async () => {
              try {
                const status = await paymentGateway.checkTerminalStatus(intent.id, settings.paymentConfig);
                if (status.state === 'FINISHED') {
                  clearInterval(mpPollRef.current);
                  mpPollRef.current = null;
                  toast.success('Pagamento Aprovado na Maquininha!');
                  onSuccess();
                } else if (status.state === 'CANCELED' || status.state === 'ERROR') {
                  clearInterval(mpPollRef.current);
                  mpPollRef.current = null;
                  toast.error('Pagamento recusado/cancelado.');
                  setProcessingPayment(false);
                }
              } catch (e) {
                console.warn('Erro verificação Maquininha:', e);
              }
           }, 3000);
        })
        .catch(err => {
           toast.error(err.message || 'Erro de conexão com a Maquininha.');
           setProcessingPayment(false);
        });
      return;
    }

    // Se for dinheiro ou desabilitado integrações
    onSuccess();
  }, [cart, currentPaymentAmount, currentPaymentMethod, remainingAmount, settings]);

  // Autoconcluir se atingiu o valor
  useEffect(() => {
    if (showPayModal && !processingPayment && payments.length > 0 && remainingAmount === 0) {
      performFinalize();
    }
  }, [showPayModal, processingPayment, payments, remainingAmount, performFinalize]);

  // Tela de sucesso
  if (success) {
    return (
      <div className="animate-fade flex flex-col items-center justify-center" style={{ minHeight: '60vh', gap: 20 }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--success-bg)', border: '2px solid var(--success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle size={40} color="var(--success)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Pedido #{success.number} registrado!</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>{fmt(success.total)} · {success.payment}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => printService.printOrder(success)}
          >
            <Printer size={16} /> Reimprimir
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => setSuccess(null)}>
            <Plus size={18} /> Novo Pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex justify-end px-2">
        <button
          onClick={() => setIsCashierModalOpen(true)}
          className={`btn btn-sm ${cashier?.isOpen ? 'btn-ghost text-success border border-success/20' : 'btn-danger animate-pulse'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: '16px', fontSize: 12, fontWeight: 600 }}
        >
          {cashier?.isOpen ? <Unlock size={14} /> : <Lock size={14} />}
          {cashier?.isOpen ? `Caixa Aberto (${cashier.operatorName})` : 'Caixa Fechado'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, height: 'calc(100vh - 140px)' }}>
      {/* ======== COLUNA ESQUERDA: Produtos ======== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>

        {/* Barra de busca + toggle balança */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={16} className="search-icon" />
            <input className="input-field" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button
            className={`btn ${showScale ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setShowScale(p => !p)}
            style={{ whiteSpace: 'nowrap', gap: 6, display: 'flex', alignItems: 'center' }}
          >
            <Scale size={15} />
            {showScale ? 'Fechar Balança' : 'Balança'}
          </button>
        </div>

        {/* Painel de balança (expansível) */}
        {showScale && (
          <ScalePanel onConfirmWeight={handleWeightConfirm} pricePerKg={pricePerKg} />
        )}

        {/* Filtros de categoria - Scrollable premium */}
        <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar mask-fade-right">
          {categories.map(c => (
            <button
              key={c.key}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                category === c.key 
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-white/5 border-white/5 text-muted hover:text-white hover:bg-white/10'
              }`}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Grid de produtos */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10, overflowY: 'auto', paddingRight: 4,
        }}>
          {activeProducts.map(p => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: 12, cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s ease',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,58,237,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ 
                width: 50, 
                height: 50, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: 26, 
                background: 'var(--surface-2)', 
                borderRadius: 12, 
                overflow: 'hidden',
                marginBottom: 4
              }}>
                {p.identityType === 'image' && p.image ? (
                  <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{p.emoji || '📦'}</span>
                )}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{p.name}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary-light)' }}>{fmt(p.price)}</div>
            </button>
          ))}
          {activeProducts.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <Search size={32} style={{ opacity: 0.3 }} />
              <p>Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* ======== COLUNA DIREITA: Carrinho ======== */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Cabeçalho do carrinho */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between">
            <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={17} color="var(--primary-light)" />
              Carrinho {cart.length > 0 && <span className="badge badge-primary">{cart.length}</span>}
            </h3>
            {cart.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearCart}>
                <Trash2 size={13} /> Limpar
              </button>
            )}
          </div>
          {/* Tipo de pedido */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {ORDER_TYPES.map(t => (
              <button
                key={t}
                className={`btn btn-sm ${orderType === t ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setOrderType(t)}
                style={{ flex: 1, textTransform: 'capitalize', fontSize: 12 }}
              >
                {t === 'balcão' ? '🏪' : t === 'delivery' ? '🛵' : '🚶'} {t}
              </button>
            ))}
          </div>
        </div>

        {/* Itens do carrinho */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <ShoppingCart size={32} style={{ opacity: 0.2 }} />
              <p style={{ fontSize: 13 }}>Adicione produtos</p>
            </div>
          ) : cart.map(item => (
            <div key={item.productId} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', background: 'var(--surface-2)',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              borderLeft: item.isWeightItem ? '3px solid var(--primary-light)' : '1px solid var(--border)',
            }}>
              <div style={{ 
                width: 36, 
                height: 36, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: 18, 
                background: 'var(--surface-3)', 
                borderRadius: 8, 
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {item.identityType === 'image' && item.image ? (
                  <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{item.emoji || '📦'}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--primary-light)', fontWeight: 700 }}>
                  {fmt(item.price * item.quantity)}
                  {item.weightKg && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 4 }}>
                      · {item.weightKg.toFixed(3)} kg
                    </span>
                  )}
                </div>
              </div>
              {!item.isWeightItem ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-3)', padding: 4, borderRadius: 'var(--radius)' }}>
                  <button style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => updateQty(item.productId, -1)}>
                    <Minus size={13} />
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                  <button style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => updateQty(item.productId, 1)}>
                    <Plus size={13} />
                  </button>
                </div>
              ) : (
                <button style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => updateQty(item.productId, -1)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Cliente + Observações */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <select
            className="input-field"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            style={{ fontSize: 12 }}
          >
            <option value="">👤 Cliente — Balcão</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} · {c.points} pts</option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Observações (opcional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ fontSize: 12 }}
          />
        </div>

        {/* Total + Finalizar */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary-light)' }}>{fmt(total)}</span>
          </div>
          <button
            className="btn btn-primary w-full btn-lg"
            disabled={cart.length === 0}
            onClick={() => {
              if (!cashier?.isOpen) {
                toast.error('Caixa fechado! Abra o caixa para realizar vendas.');
                setIsCashierModalOpen(true);
                return;
              }
              setShowPayModal(true);
            }}
          >
            <CheckCircle size={17} /> Finalizar Pedido
          </button>
        </div>
      </div>

      {/* ======== MODAL DE PAGAMENTO ======== */}
      {showPayModal && (
        <div className="modal-backdrop" onClick={() => {}}>
          <div className="modal-box animate-slide" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💳 Finalizar Pagamento</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowPayModal(false); setProcessingPayment(false); }}><X size={18} /></button>
            </div>

            {processingPayment ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <Loader2 size={48} className="text-primary-light" style={{ animation: 'spin 2s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ fontSize: 16, fontWeight: 'bold' }}>{paymentMessage}</p>
                {currentPaymentMethod === 'pix' && pixQrCodeString ? (
                  <div style={{ padding: 16, background: 'white', borderRadius: 12, marginTop: 16, border: '2px solid var(--success)' }}>
                     <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixQrCodeString)}`} alt="QR Code PIX" style={{ width: 160, height: 160, margin: '0 auto' }} />
                     <p style={{ color: '#000', fontSize: 13, marginTop: 12, fontWeight: 'bold' }}>PIX Copia e Cola (Dinâmico):</p>
                     <div style={{ background: '#f4f4f5', padding: '6px 8px', borderRadius: 6, marginTop: 4, wordBreak: 'break-all', fontSize: 10, color: '#52525b', border: '1px dashed #d4d4d8' }}>
                       {pixQrCodeString}
                     </div>
                  </div>
                ) : currentPaymentMethod === 'pix' && settings?.paymentConfig?.pixKey ? (
                  <div style={{ padding: 12, background: 'white', borderRadius: 8, marginTop: 16 }}>
                     <QrCode size={120} color="#000" style={{ margin: '0 auto' }} />
                     <p style={{ color: '#000', fontSize: 12, marginTop: 8, fontWeight: 'bold' }}>{settings.paymentConfig.pixKeyType.toUpperCase()}: {settings.paymentConfig.pixKey}</p>
                  </div>
                ) : null}
                
                <div style={{ marginTop: 24, padding: 16, background: 'var(--surface-2)', borderRadius: 8, border: '1px dashed var(--border)', width: '100%' }}>
                  <p className="text-xs text-muted mb-3">Ambiente de Teste: Forçar aprovação manual</p>
                  <button className="btn btn-primary w-full" onClick={() => {
                    if (mpPollRef.current) clearInterval(mpPollRef.current);
                    const amountStr = currentPaymentAmount.toString().replace(',', '.');
                    let amount = parseFloat(amountStr);
                    if (currentPaymentMethod !== 'dinheiro' && amount > remainingAmount) amount = remainingAmount;
                    setPayments(prev => [...prev, { method: currentPaymentMethod, amount }]);
                    setProcessingPayment(false);
                    setCurrentPaymentAmount('');
                  }}>
                    <CheckCircle size={16}/> Simular Aprovação
                  </button>
                </div>

                <button className="btn btn-ghost mt-2" onClick={cancelIntegration}>Cancelar Integração</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Resumo de valores */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total do Pedido</span>
                    <span style={{ fontSize: 18, fontWeight: 700 }}>{fmt(total)}</span>
                  </div>
                  <div style={{ padding: 12, background: remainingAmount > 0 ? 'rgba(239,68,68,0.1)' : 'var(--success-bg)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 13, color: remainingAmount > 0 ? 'var(--danger)' : 'var(--success)' }}>{remainingAmount > 0 ? 'Falta Pagar' : 'Pago'}</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: remainingAmount > 0 ? 'var(--danger)' : 'var(--success)' }}>{fmt(remainingAmount)}</span>
                  </div>
                </div>

                {payments.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Pagamentos Realizados:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {payments.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}>
                           <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 14 }}>{p.method}</span>
                           <span style={{ fontWeight: 800, color: 'var(--success)' }}>{fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {troco !== null && troco > 0 && (
                  <div style={{ padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--success)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>Troco a devolver</span>
                    <span style={{ color: 'var(--success)', fontWeight: 800 }}>{fmt(troco)}</span>
                  </div>
                )}

                {remainingAmount > 0 && (
                  <>
                    <hr style={{ borderColor: 'var(--border)' }} />
                    {/* Novo Pagamento */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {PAYMENTS.map(p => (
                        <button
                          key={p}
                          className={`btn btn-sm ${currentPaymentMethod === p ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setCurrentPaymentMethod(p)}
                          style={{ flex: 1, textTransform: 'capitalize', fontSize: 11, padding: '6px 4px' }}
                        >
                          {p === 'pix' ? '🔑 PIX' : p === 'credito' ? '💳 Crédito' : p === 'debito' ? '💳 Débito' : '💵 Dinheiro'}
                        </button>
                      ))}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Valor a receber ({currentPaymentMethod})</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input 
                          className="input-field" 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          value={currentPaymentAmount} 
                          onChange={e => setCurrentPaymentAmount(e.target.value)} 
                          style={{ flex: 1, fontSize: 18, fontWeight: 'bold' }}
                        />
                        <button className="btn btn-primary" onClick={addPaymentMethod}>
                          <Plus size={18} /> Adicionar
                        </button>
                      </div>
                    </div>
                  </>
                )}
                
                {remainingAmount <= 0 && (
                  <button className="btn btn-success btn-lg w-full mt-2" onClick={performFinalize}>
                    <CheckCircle size={18} /> Concluir e Imprimir
                  </button>
                )}
            </div>
            )}
          </div>
        </div>
      )}

      <CashierModal isOpen={isCashierModalOpen} onClose={() => setIsCashierModalOpen(false)} />
    </div>
    </div>
  );
}
