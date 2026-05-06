import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Minus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, X, AlertTriangle, Tag, Eye, EyeOff, Package, Truck, FileText, Layout, Layers, Globe, Image as ImageIcon, Video, ShoppingBag, DollarSign, ClipboardList, BarChart2, Hash, Box, Link as LinkIcon, Info, Settings, ShieldCheck, Zap, Share2, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import ProductBox3D from '../components/products/ProductBox3D';

const DEFAULT_CATEGORIES = [
  { key: 'acai', label: 'Açaís', emoji: '🍇' },
  { key: 'complemento', label: 'Complementos', emoji: '🌾' },
  { key: 'bebida', label: 'Bebidas', emoji: '🥤' },
  { key: 'sobremesa', label: 'Sobremesas', emoji: '🍩' },
];

const CATEGORIES_STORAGE_KEY = 'acai_product_categories';

function fmt(v) { return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

const EMPTY_PRODUCT = { 
  name: '', category: 'acai', brand: '', condition: 'new', unit: 'pote', 
  identityType: 'emoji', // 'emoji' ou 'image'
  emoji: '🍇', description: '', active: true, 
  // Financial
  price: '', promotionalPrice: '', cost: '', averageCost: '', markup: '', 
  priceLists: [], // { name, price }
  // Stock
  stock: '', minStock: '5', maxStock: '', stockNotification: true, stockLocation: '', preparationDays: '1',
  // IDs & Fiscal
  sku: '', ean: '', eanTributavel: '', ncm: '', cest: '', origin: '0',
  ipiCode: '', ipiFixed: '', extipi: '',
  icms_sit_trib: '102', icms_origem: '0',
  pis_sit_trib: '07', cofins_sit_trib: '07',
  // Logistics
  weight: '', weightNet: '', packagingType: 'pacote', width: '', height: '', length: '', itemsPerBox: '1',
  // SEO & Marketing
  videoLink: '', slug: '', keywords: '', seoTitle: '', seoDescription: '', richDescription: '',
  // Arrays & Objects
  tags: [], attributes: [], images: [],
  mappings: {}, variations: [], suppliers: [], internalNotes: '',
  ads: [] // { channel, id, status }
};

// ─── Emoji Picker Data ───────────────────────────────────────────────────────
const EMOJI_CATEGORIES = {
  'Comida': ['🍇','🍓','🍒','🍑','🥭','🍍','🫐','🍌','🍋','🍊','🍎','🍏','🍐','🍈','🍉','🥝','🍅','🫒','🥥','🥑','🌽','🥕','🧄','🧅','🫑','🥦','🥬','🥒','🧆','🍆','🧅','🍄','🌿','🌱','🥗'],
  'Açaí & Fruteiras': ['🫐','🍇','🫙','🫚','🧃','🍱','🍛','🍜','🍲','🫕','🍝','🥘','🍗','🍖','🌮','🌯','🥙','🥚','🍳','🥞','🧇','🥓','🥩','🍔','🍟','🌭','🍕','🍞','🧀','🥗'],
  'Bebidas': ['🥤','🧋','🍵','☕','🧃','🍺','🥛','🍶','🍾','🥂','🍷','🍸','🍹','🧉','🍫','🍬','🍭','🍮','🧁','🍩','🍪','🎂','🍰','🍦','🍧','🍨','🍫'],
  'Outros': ['⭐','🌟','✨','💫','🔥','❄️','🌿','🌱','🌾','🍀','🌺','🌸','🌼','🌻','🌞','🌈','💜','💚','🤍','🖤','❤️','🧡','💛','💙','💗','🎯','🏆','🎖️','🎁','🎊','🎉'],
};

// All emojis with search names
const EMOJI_DATA = [
  { emoji: '🍇', name: 'uva acai açaí grape' },
  { emoji: '🍓', name: 'morango strawberry' },
  { emoji: '🫐', name: 'mirtilo blueberry açaí acai' },
  { emoji: '🍒', name: 'cereja cherry' },
  { emoji: '🍑', name: 'pêssego peach' },
  { emoji: '🥭', name: 'manga mango' },
  { emoji: '🍍', name: 'abacaxi pineapple' },
  { emoji: '🍌', name: 'banana' },
  { emoji: '🍋', name: 'limão lemon' },
  { emoji: '🍊', name: 'laranja orange' },
  { emoji: '🍎', name: 'maçã apple' },
  { emoji: '🍏', name: 'maçã verde green apple' },
  { emoji: '🍐', name: 'pera pear' },
  { emoji: '🍉', name: 'melancia watermelon' },
  { emoji: '🥝', name: 'kiwi' },
  { emoji: '🍅', name: 'tomate tomato' },
  { emoji: '🥥', name: 'coco coconut' },
  { emoji: '🥑', name: 'abacate avocado' },
  { emoji: '🌽', name: 'milho corn' },
  { emoji: '🥕', name: 'cenoura carrot' },
  { emoji: '🍦', name: 'sorvete ice cream' },
  { emoji: '🍧', name: 'raspado slush' },
  { emoji: '🍨', name: 'sorvete açaí sorbet' },
  { emoji: '🍩', name: 'rosquinha donut' },
  { emoji: '🍪', name: 'biscoito cookie' },
  { emoji: '🎂', name: 'bolo cake' },
  { emoji: '🍰', name: 'fatia bolo cake slice' },
  { emoji: '🧁', name: 'cupcake' },
  { emoji: '🍫', name: 'chocolate' },
  { emoji: '🍬', name: 'bala candy' },
  { emoji: '🍭', name: 'pirulito lollipop' },
  { emoji: '🍮', name: 'pudim flan' },
  { emoji: '🍺', name: 'cerveja beer' },
  { emoji: '🥤', name: 'refrigerante soda drink copo cup' },
  { emoji: '🧋', name: 'bubble tea boba' },
  { emoji: '🍵', name: 'chá tea' },
  { emoji: '☕', name: 'café coffee' },
  { emoji: '🧃', name: 'suco juice' },
  { emoji: '🥛', name: 'leite milk' },
  { emoji: '🫙', name: 'pote jar' },
  { emoji: '🧂', name: 'sal salt' },
  { emoji: '🍯', name: 'mel honey' },
  { emoji: '🫒', name: 'azeitona olive' },
  { emoji: '🌾', name: 'trigo wheat granola' },
  { emoji: '🌿', name: 'erva herb' },
  { emoji: '🍀', name: 'trevo clover' },
  { emoji: '🥗', name: 'salada salad' },
  { emoji: '🥣', name: 'tigela bowl' },
  { emoji: '🫕', name: 'panela pot' },
  { emoji: '🍱', name: 'marmita bento' },
  { emoji: '🍛', name: 'arroz rice' },
  { emoji: '🔥', name: 'fogo fire' },
  { emoji: '❄️', name: 'gelo ice' },
  { emoji: '✨', name: 'brilho sparkle' },
  { emoji: '⭐', name: 'estrela star' },
  { emoji: '🏆', name: 'troféu trophy' },
  { emoji: '🎯', name: 'alvo target' },
  { emoji: '💜', name: 'coração roxo purple heart' },
  { emoji: '💚', name: 'coração verde green heart' },
  { emoji: '❤️', name: 'coração heart' },
];

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = search.trim()
    ? EMOJI_DATA.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).map(e => e.emoji)
    : null;

  const select = (emoji) => { onChange(emoji); setOpen(false); setSearch(''); };

  return (
    <div ref={ref} className="relative inline-block">
      <button 
        type="button" 
        onClick={() => setOpen(o => !o)}
        className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl hover:bg-white/10 hover:border-primary/50 transition-all shadow-inner"
        title="Escolher emoji"
      >
        {value || '🍇'}
      </button>
      {open && (
        <div className="absolute top-[115%] left-0 z-[100] w-[300px] bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="w-full h-10 bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 text-xs text-white placeholder:text-muted/50 focus:border-primary/50 outline-none transition-all"
              placeholder="Buscar emoji (ex: acai, suco...)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto pr-2 no-scrollbar">
            {results ? (
              results.length === 0 ? (
                <div className="py-8 text-center text-muted text-[10px] uppercase tracking-widest font-black">Nenhum resultado</div>
              ) : (
                <div className="grid grid-cols-6 gap-1">
                  {results.map(e => (
                    <button key={e} type="button" onClick={() => select(e)}
                      className="aspect-square flex items-center justify-center text-2xl hover:bg-white/10 rounded-lg transition-all transform hover:scale-110">
                      {e}
                    </button>
                  ))}
                </div>
              )
            ) : (
              Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
                <div key={cat} className="mb-4">
                  <div className="text-[9px] font-black text-muted uppercase tracking-widest mb-2 px-1">{cat}</div>
                  <div className="grid grid-cols-6 gap-1">
                    {emojis.map(e => (
                      <button key={e} type="button" onClick={() => select(e)}
                        className="aspect-square flex items-center justify-center text-xl hover:bg-white/10 rounded-lg transition-all transform hover:scale-110">
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [modalTab, setModalTab] = useState('basico');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCost, setShowCost] = useState(false);
  const [tempMediaUrl, setTempMediaUrl] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  // Dynamic categories
  const [categoriesList, setCategoriesList] = useState(() => {
    try {
      const s = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      return s ? JSON.parse(s) : DEFAULT_CATEGORIES;
    } catch { return DEFAULT_CATEGORIES; }
  });
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatForm, setNewCatForm] = useState({ key: '', label: '', emoji: '🏷️' });
  const [emojiSearch, setEmojiSearch] = useState('');

  const saveCats = (cats) => {
    setCategoriesList(cats);
    try { localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats)); } catch {}
  };

  const addCategory = () => {
    if (!newCatForm.label.trim()) { toast.error('Nome da categoria obrigatório'); return; }
    const key = newCatForm.key.trim() || newCatForm.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (categoriesList.find(c => c.key === key)) { toast.error('Categoria já existe'); return; }
    saveCats([...categoriesList, { key, label: newCatForm.label.trim(), emoji: newCatForm.emoji || '🏷️' }]);
    setNewCatForm({ key: '', label: '', emoji: '🏷️' });
    toast.success('Categoria criada!');
  };

  const deleteCategory = (key) => {
    if (DEFAULT_CATEGORIES.find(c => c.key === key)) { toast.error('Não é possível remover categorias padrão'); return; }
    saveCats(categoriesList.filter(c => c.key !== key));
    toast.success('Categoria removida');
  };

  const filtered = useMemo(() =>
    (products || []).filter(p => {
      if (!p) return false;
      const name = p.name || '';
      const sku = p.sku || '';
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                            sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = catFilter === 'all' || p.category === catFilter;
      return matchesSearch && matchesCategory;
    }), [products, search, catFilter]);

  const openAdd = () => { setForm(EMPTY_PRODUCT); setModal('add'); setModalTab('geral'); };
  const openEdit = (p) => { 
    if (!p) return;
    setForm({ 
      ...EMPTY_PRODUCT, 
      ...p, 
      mappings: p.mappings || {}, 
      variations: p.variations || [],
      tags: p.tags || [],
      attributes: p.attributes || [],
      suppliers: p.suppliers || [],
      images: p.images || [],
    }); 
    setModal(p); 
    setModalTab('geral'); 
  };
  const closeModal = () => { setModal(null); setForm(EMPTY_PRODUCT); }

  const handleSave = () => {
    if (!form.name || !form.category) {
      toast.error('Preencha o nome e a categoria.');
      return;
    }
    const data = { 
      ...form, 
      price: parseFloat(form.price) || 0, 
      cost: parseFloat(form.cost || 0), 
      stock: parseInt(form.stock || 0), 
      minStock: parseInt(form.minStock || 0) 
    };

    if (modal === 'add') {
      addProduct({ ...data, id: Date.now().toString() });
      toast.success('Produto adicionado!');
    } else {
      updateProduct(modal.id, data);
      toast.success('Produto atualizado!');
    }
    closeModal();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImages = [...(form.images || []), { id: Date.now(), url: event.target.result }];
        setForm({ ...form, images: newImages });
        toast.success('Foto carregada!');
      };
      reader.readAsDataURL(file);
    }
  };

  const onDragStart = (idx) => setDraggedIndex(idx);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (idx) => {
    if (draggedIndex === null) return;
    const newImages = [...(form.images || [])];
    const item = newImages.splice(draggedIndex, 1)[0];
    newImages.splice(idx, 0, item);
    setForm({ ...form, images: newImages });
    setDraggedIndex(null);
  };

  const handleCostChange = (val) => {
    const cost = parseFloat(val) || 0;
    const markup = parseFloat(form.markup) || 0;
    const price = cost * (1 + markup / 100);
    setForm({ ...form, cost: val, price: price.toFixed(2) });
  };

  const resolveImageUrl = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('drive.google.com')) {
      const idMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
      }
    }
    return trimmed;
  };

  const handleMarkupChange = (val) => {
    const markup = parseFloat(val) || 0;
    const cost = parseFloat(form.cost) || 0;
    const price = cost * (1 + markup / 100);
    setForm({ ...form, markup: val, price: price.toFixed(2) });
  };

  const confirmDelete = (p) => setDeleteTarget(p);
  const handleDelete = () => {
    if (deleteTarget) {
      deleteProduct(deleteTarget.id);
      setDeleteTarget(null);
      toast.success('Produto removido');
    }
  };

  const toggleActive = (p) => {
    if (!p) return;
    updateProduct(p.id, { active: !p.active });
    toast.success(p.active ? 'Produto desativado' : 'Produto ativado');
  };

  const grouped = categoriesList.map(cat => ({
    ...cat,
    items: filtered.filter(p => p.category === cat.key),
  })).filter(g => catFilter === 'all' ? true : g.key === catFilter);

  return (
    <div className="animate-fade">
      {/* Actions */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${catFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter('all')}>Todos ({products?.length || 0})</button>
          {categoriesList.map(c => (
            <button key={c.key} className={`btn btn-sm ${catFilter === c.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter(c.key)}>
              {c.emoji} {c.label} ({products?.filter(p => p.category === c.key).length || 0})
            </button>
          ))}
          <button className="btn btn-sm btn-ghost" style={{ borderStyle: 'dashed', border: '1px dashed var(--border)' }} onClick={() => setShowCatModal(true)}>
            <Tag size={13} /> Categorias
          </button>
          <button className="btn btn-sm btn-ghost" style={{ borderStyle: 'dashed', border: '1px dashed var(--border)' }} onClick={() => setShowCost(!showCost)}>
            {showCost ? <EyeOff size={13} /> : <Eye size={13} />} {showCost ? 'Ocultar Custo' : 'Mostrar Custo'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-wrap">
            <Search size={14} className="search-icon" />
            <input className="input-field" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Novo Produto</button>
        </div>
      </div>

      {/* Product List by Category */}
      {grouped.map(group => group.items.length > 0 && (
        <div key={group.key} className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shadow-inner border border-white/10">
              {group.emoji}
            </div>
            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">
              {group.label}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {group.items.map(p => (
              <div key={p.id} className={`glass-card group flex flex-col overflow-hidden border-white/5 transition-all duration-500 hover:scale-[1.02] hover:border-primary/40 ${!p.active ? 'opacity-60 grayscale' : ''}`} style={{ minHeight: '340px' }}>
                {/* Product Image/Emoji Header */}
                <div className="relative aspect-[16/10] bg-black/40 overflow-hidden">
                  {p.identityType === 'image' && p.images?.length > 0 ? (
                    <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                      <span className="text-6xl transition-transform duration-500 group-hover:scale-125">{p.emoji || '📦'}</span>
                    </div>
                  )}
                  
                  {/* Overlay Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {p.stock <= (p.minStock || 0) && (
                      <div className="px-2 py-1 rounded-lg bg-amber-500/90 text-[9px] font-black text-black uppercase tracking-widest backdrop-blur-md animate-pulse">
                        Estoque Baixo
                      </div>
                    )}
                    {!p.active && (
                      <div className="px-2 py-1 rounded-lg bg-red-500/90 text-[9px] font-black text-white uppercase tracking-widest backdrop-blur-md">
                        Inativo
                      </div>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-primary transition-all" onClick={() => openEdit(p)}>
                      <Edit2 size={12} />
                    </button>
                    <button className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-danger transition-all" onClick={() => confirmDelete(p)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-base font-black text-white leading-tight line-clamp-1 group-hover:text-primary-light transition-colors">
                        {p.name}
                      </h4>
                      <span className="text-[10px] font-bold text-muted bg-white/5 px-2 py-0.5 rounded-md uppercase tracking-widest">
                        {p.unit || 'UN'}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-muted/60 uppercase tracking-[0.2em]">
                      {p.sku || 'SEM SKU'}
                    </div>
                    {p.description && (
                      <p className="text-[11px] font-medium text-muted/50 mt-3 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5 flex items-end justify-between">
                    <div className="space-y-0.5">
                      <div className="text-[9px] font-black text-muted uppercase tracking-widest opacity-40">Preço Venda</div>
                      <div className="text-xl font-black text-white tracking-tighter">
                        {fmt(p.price)}
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="text-[9px] font-black text-muted uppercase tracking-widest opacity-40">Em Estoque</div>
                      <div className={`text-lg font-black tracking-tight ${p.stock <= (p.minStock || 0) ? 'text-amber-400' : 'text-white/80'}`}>
                        {p.stock}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="px-5 py-3 bg-white/5 border-t border-white/5 flex items-center justify-between group-hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-white/20'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${p.active ? 'text-emerald-400/80' : 'text-muted/60'}`}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <button 
                    className="w-12 h-6 rounded-full bg-white/5 relative p-1 transition-all hover:bg-white/10" 
                    onClick={() => toggleActive(p)}
                  >
                    <div className={`absolute top-1 bottom-1 w-4 rounded-full transition-all duration-300 ${p.active ? 'right-1 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'left-1 bg-white/30'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="empty-state" style={{ padding: '80px 0' }}>
          <span style={{ fontSize: 40 }}>🍇</span>
          <p>Nenhum produto encontrado</p>
          <button className="btn btn-primary btn-sm" onClick={openAdd}><Plus size={14} /> Adicionar</button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--danger)', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 0 40px rgba(239,68,68,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={20} color="var(--danger)" />
              </div>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>Excluir produto?</h3>
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <span style={{ fontSize: 22 }}>{deleteTarget.emoji}</span>
              <span style={{ marginLeft: 8, fontWeight: 700 }}>{deleteTarget.name}</span>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Preço: {fmt(deleteTarget.price)}</div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Esta ação não pode ser desfeita. O produto será removido permanentemente.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary flex-1" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '10px 16px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Trash2 size={15} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCatModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Tag size={16} color="var(--primary-light)" /> Gerenciar Categorias</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCatModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {categoriesList.map(c => (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 20 }}>{c.emoji}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{c.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{products?.filter(p => p.category === c.key).length || 0} produtos</span>
                  {!DEFAULT_CATEGORIES.find(d => d.key === c.key) && (
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteCategory(c.key)}><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 10, border: '1px dashed var(--border)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>Nova Categoria</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input-field" style={{ width: 52 }} value={newCatForm.emoji} onChange={e => setNewCatForm(p => ({ ...p, emoji: e.target.value }))} placeholder="🏷️" />
                <input className="input-field" style={{ flex: 1 }} value={newCatForm.label} onChange={e => setNewCatForm(p => ({ ...p, label: e.target.value }))} placeholder="Nome da categoria" />
                <button className="btn btn-primary" onClick={addCategory}><Plus size={14} /> Criar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade">
          <div className="glass-card w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border-white/10">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  {modal === 'add' ? 'Novo Produto' : 'Editar Produto'}
                </h3>
              </div>
              <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted hover:bg-white/10 hover:text-white transition-all" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth">
              {/* Header Tabs - Sticky and responsive */}
              <div className="sticky top-0 z-40 bg-[#0f1115]/80 backdrop-blur-2xl px-4 md:px-8 py-4 border-b border-white/5 overflow-x-auto no-scrollbar flex items-center gap-3">
                {[
                  { id: 'geral', label: 'Geral', icon: <Layout size={14} /> },
                  { id: 'precos', label: 'Preços', icon: <DollarSign size={14} /> },
                  { id: 'estoque', label: 'Estoque', icon: <Layers size={14} /> },
                  { id: 'logistica', label: 'Logística', icon: <Truck size={14} /> },
                  { id: 'fiscal', label: 'Fiscal', icon: <FileText size={14} /> },
                  { id: 'marketing', label: 'Marketing', icon: <Globe size={14} /> },
                  { id: 'canais', label: 'Canais', icon: <ShoppingBag size={14} /> },
                ].map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setModalTab(t.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                      modalTab === t.id 
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                      : 'bg-white/5 border-white/5 text-muted hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {modalTab === 'geral' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      {/* Identidade Visual */}
                      <div className="md:col-span-4 space-y-4">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest block">Identidade Visual</label>
                        <div className="aspect-square rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-6 text-center group hover:border-primary/50 transition-all relative overflow-hidden">
                          {form.identityType === 'emoji' ? (
                            <div className="text-7xl group-hover:scale-110 transition-transform">{form.emoji || '📦'}</div>
                          ) : (
                            form.images?.[0] ? (
                              <img src={form.images[0].url} alt="Preview" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Plus className="text-muted group-hover:text-primary" size={32} />
                                <span className="text-[10px] font-bold text-muted uppercase">Upload Imagem</span>
                              </div>
                            )
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity">
                            <button type="button" className="p-2 rounded-full bg-white/10 hover:bg-primary text-white transition-all" onClick={() => setForm({ ...form, identityType: 'emoji' })} title="Usar Emoji">
                              <Layout size={16} />
                            </button>
                            <button type="button" className="p-2 rounded-full bg-white/10 hover:bg-primary text-white transition-all" onClick={() => { setForm({ ...form, identityType: 'image' }); fileInputRef.current?.click(); }} title="Upload Imagem">
                              <ImageIcon size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                          <button className={`flex-1 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${form.identityType === 'emoji' ? 'bg-primary text-white' : 'text-muted'}`} onClick={() => setForm({ ...form, identityType: 'emoji' })}>Emoji</button>
                          <button className={`flex-1 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${form.identityType === 'image' ? 'bg-primary text-white' : 'text-muted'}`} onClick={() => setForm({ ...form, identityType: 'image' })}>Imagem</button>
                        </div>

                        {form.identityType === 'emoji' && (
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center gap-3">
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Escolher Ícone</span>
                            <EmojiPicker value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e })} />
                          </div>
                        )}
                      </div>

                      {/* Informações Básicas */}
                      <div className="md:col-span-8 space-y-6">
                        <div className="form-group">
                          <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Nome do Produto *</label>
                          <input className="input-field h-14 text-lg font-bold bg-white/5 border-white/10" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Açaí Premium 5L" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">SKU / Código</label>
                            <input className="input-field h-12 bg-white/5 border-white/10 font-mono" value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Ex: ACAI-001" />
                          </div>
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Unidade</label>
                            <select className="input-field h-12 bg-white/5 border-white/10" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                              <option value="un">Unidade (UN)</option>
                              <option value="pote">Pote</option>
                              <option value="kg">Quilo (KG)</option>
                              <option value="litro">Litro (L)</option>
                              <option value="cx">Caixa (CX)</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Categoria</label>
                            <select className="input-field h-12 bg-white/5 border-white/10" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                              {categoriesList.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Marca</label>
                            <input className="input-field h-12 bg-white/5 border-white/10" value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Ex: Açaí Top" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Descrição Curta</label>
                      <textarea className="input-field min-h-[100px] py-3 bg-white/5 border-white/10" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Uma breve descrição para listagens..." />
                    </div>
                  </div>
                )}

                {modalTab === 'precos' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="form-group md:col-span-1">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Preço de Custo</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">R$</span>
                          <input className="input-field h-14 pl-12 text-xl font-bold bg-white/5 border-white/10" type="number" step="0.01" value={form.cost || ''} onChange={e => handleCostChange(e.target.value)} placeholder="0,00" />
                        </div>
                      </div>
                      <div className="form-group md:col-span-1">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Markup (%)</label>
                        <div className="relative">
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs font-bold">%</span>
                          <input className="input-field h-14 pr-12 text-xl font-bold bg-white/5 border-white/10" type="number" step="0.1" value={form.markup || ''} onChange={e => handleMarkupChange(e.target.value)} placeholder="0,0" />
                        </div>
                      </div>
                      <div className="form-group md:col-span-1">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">Preço de Venda</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-xs font-bold">R$</span>
                          <input className="input-field h-14 pl-12 text-xl font-black bg-primary/10 border-primary/30 text-white shadow-inner shadow-primary/5" type="number" step="0.01" value={form.price || ''} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0,00" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag size={14} className="text-amber-400" />
                          <h4 className="text-[10px] font-black text-muted uppercase tracking-widest">Promoção</h4>
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-1 block">Preço Promocional</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[10px]">R$</span>
                            <input className="input-field h-10 pl-8 bg-black/20 border-white/5" type="number" step="0.01" value={form.promotionalPrice || ''} onChange={e => setForm({ ...form, promotionalPrice: e.target.value })} />
                          </div>
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ClipboardList size={14} className="text-blue-400" />
                          <h4 className="text-[10px] font-black text-muted uppercase tracking-widest">Histórico & Médias</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-muted/40 uppercase block">Custo Médio</span>
                            <span className="text-sm font-bold text-white/80">{fmt(form.averageCost || 0)}</span>
                          </div>
                          <div className="space-y-1 text-right">
                            <span className="text-[9px] font-bold text-muted/40 uppercase block">Última Compra</span>
                            <span className="text-sm font-bold text-white/80">04/05/2026</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'estoque' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="form-group bg-primary/5 p-4 rounded-2xl border border-primary/20">
                        <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block text-center">Saldo Atual</label>
                        <input className="input-field h-14 text-center text-3xl font-black bg-transparent border-none focus:ring-0" type="number" value={form.stock || ''} onChange={e => setForm({ ...form, stock: e.target.value })} />
                      </div>
                      <div className="form-group p-4 rounded-2xl bg-white/5 border border-white/10">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block text-center">Estoque Mínimo</label>
                        <input className="input-field h-14 text-center text-xl font-bold bg-transparent border-none" type="number" value={form.minStock || ''} onChange={e => setForm({ ...form, minStock: e.target.value })} />
                      </div>
                      <div className="form-group p-4 rounded-2xl bg-white/5 border border-white/10">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block text-center">Estoque Máximo</label>
                        <input className="input-field h-14 text-center text-xl font-bold bg-transparent border-none" type="number" value={form.maxStock || ''} onChange={e => setForm({ ...form, maxStock: e.target.value })} />
                      </div>
                      <div className="form-group p-4 rounded-2xl bg-white/5 border border-white/10">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block text-center">Dias Preparo</label>
                        <input className="input-field h-14 text-center text-xl font-bold bg-transparent border-none" type="number" value={form.preparationDays || ''} onChange={e => setForm({ ...form, preparationDays: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="form-group">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Localização no Estoque</label>
                        <div className="relative">
                          <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                          <input className="input-field h-12 pl-12 bg-white/5 border-white/10" value={form.stockLocation || ''} onChange={e => setForm({ ...form, stockLocation: e.target.value })} placeholder="Ex: Prateleira A-12" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${form.stockNotification ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-muted'}`}>
                          <Zap size={20} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Notificação de Estoque</h4>
                          <p className="text-[9px] text-muted">Avisar quando atingir o mínimo</p>
                        </div>
                        <button className={`w-12 h-6 rounded-full relative p-1 transition-all ${form.stockNotification ? 'bg-emerald-500' : 'bg-white/10'}`} onClick={() => setForm({ ...form, stockNotification: !form.stockNotification })}>
                          <div className={`absolute top-1 bottom-1 w-4 rounded-full bg-white transition-all ${form.stockNotification ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'logistica' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="form-group">
                          <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Tipo de Embalagem</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['pacote', 'envelope', 'rolo'].map(type => (
                              <button 
                                key={type}
                                onClick={() => setForm({ ...form, packagingType: type })}
                                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${form.packagingType === type ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/5 text-muted hover:bg-white/10'}`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Peso Bruto (kg)</label>
                            <input className="input-field h-12 bg-white/5 border-white/10" type="number" step="0.001" value={form.weight || ''} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="0,000" />
                          </div>
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Peso Líquido (kg)</label>
                            <input className="input-field h-12 bg-white/5 border-white/10" type="number" step="0.001" value={form.weightNet || ''} onChange={e => setForm({ ...form, weightNet: e.target.value })} placeholder="0,000" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Largura (cm)</label>
                            <input className="input-field h-10 bg-white/5 border-white/10" type="number" value={form.width || ''} onChange={e => setForm({ ...form, width: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Altura (cm)</label>
                            <input className="input-field h-10 bg-white/5 border-white/10" type="number" value={form.height || ''} onChange={e => setForm({ ...form, height: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Compr. (cm)</label>
                            <input className="input-field h-10 bg-white/5 border-white/10" type="number" value={form.length || ''} onChange={e => setForm({ ...form, length: e.target.value })} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-black/40 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-4 left-4 text-[9px] font-black text-primary/40 uppercase tracking-[0.2em]">Visualização 3D</div>
                        <ProductBox3D 
                          width={form.width} 
                          height={form.height} 
                          length={form.length} 
                          packagingType={form.packagingType} 
                        />
                        <div className="mt-4 text-center">
                          <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Dimensões da Embalagem</span>
                          <p className="text-[9px] text-muted/40 italic">A visualização atualiza em tempo real</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'fiscal' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="form-group">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">NCM</label>
                        <input className="input-field h-12 bg-white/5 border-white/10" value={form.ncm || ''} onChange={e => setForm({ ...form, ncm: e.target.value })} placeholder="Ex: 2106.90.90" />
                      </div>
                      <div className="form-group">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">CEST</label>
                        <input className="input-field h-12 bg-white/5 border-white/10" value={form.cest || ''} onChange={e => setForm({ ...form, cest: e.target.value })} placeholder="Ex: 17.046.00" />
                      </div>
                      <div className="form-group">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Origem</label>
                        <select className="input-field h-12 bg-white/5 border-white/10" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })}>
                          <option value="0">0 - Nacional</option>
                          <option value="1">1 - Estrangeira - Imp. Direta</option>
                          <option value="2">2 - Estrangeira - Adq. no Mercado Interno</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck size={16} className="text-emerald-400" />
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Configurações de Tributação</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Situação Tributária ICMS</label>
                          <select className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.icms_sit_trib} onChange={e => setForm({ ...form, icms_sit_trib: e.target.value })}>
                            <option value="102">102 - Simples Nacional (Sem crédito)</option>
                            <option value="500">500 - ICMS Cobrado anteriormente</option>
                            <option value="00">00 - Tributada integralmente</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Cód. Enquadramento IPI</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.ipiCode || ''} onChange={e => setForm({ ...form, ipiCode: e.target.value })} placeholder="Ex: 999" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'marketing' && (
                  <div className="space-y-10">
                    {/* Galeria de Imagens */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest">Galeria de Imagens</label>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                          <Plus size={10} /> Adicionar Fotos
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {(form.images || []).map((img, idx) => (
                          <div key={idx} className="group aspect-square rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden">
                            <img src={img.url} alt="Product" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button onClick={() => setForm({ ...form, images: form.images.filter((_, i) => i !== idx) })} className="p-2 rounded-full bg-rose-500 text-white shadow-lg"><Trash2 size={12} /></button>
                              {idx === 0 && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary text-[8px] font-black text-white uppercase">Capa</span>}
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-white/5 hover:border-primary/40 hover:bg-white/5 transition-all flex flex-col items-center justify-center gap-2 text-muted hover:text-primary">
                          <Plus size={24} />
                          <span className="text-[9px] font-black uppercase">Upload</span>
                        </button>
                      </div>
                    </div>

                    {/* SEO & Online */}
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <Globe size={18} className="text-primary" />
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Otimização de Buscas (SEO)</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">URL Amigável (Slug)</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs font-mono" value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="acai-premium-5l" />
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Palavras-chave</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.keywords || ''} onChange={e => setForm({ ...form, keywords: e.target.value })} placeholder="açaí, premium, pote 5l" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Link de Vídeo (YouTube/Vimeo)</label>
                        <div className="relative">
                          <Video size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                          <input className="input-field h-10 pl-10 bg-black/20 border-white/5 text-xs" value={form.videoUrl || ''} onChange={e => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'canais' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { name: 'Mercado Livre', icon: 'M', color: 'bg-yellow-400' },
                        { name: 'Shopee', icon: 'S', color: 'bg-orange-600' },
                        { name: 'Amazon', icon: 'A', color: 'bg-white' },
                      ].map(channel => (
                        <div key={channel.name} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 group hover:bg-white/10 transition-all cursor-pointer">
                          <div className={`w-10 h-10 rounded-full ${channel.color} flex items-center justify-center font-black text-black text-lg shadow-lg group-hover:scale-110 transition-transform`}>{channel.icon}</div>
                          <div className="flex-1">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{channel.name}</h4>
                            <span className="text-[9px] text-muted uppercase font-bold">Desconectado</span>
                          </div>
                          <ChevronRight size={14} className="text-muted group-hover:translate-x-1 transition-transform" />
                        </div>
                      ))}
                    </div>

                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <Zap size={18} className="text-primary" />
                          <h4 className="text-xs font-black text-white uppercase tracking-widest">Grade de Variações</h4>
                        </div>
                        <button className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/30 transition-all" onClick={() => setForm({ ...form, variations: [...(form.variations || []), { name: '', price: '', sku: '' }] })}>+ Gerar Variações</button>
                      </div>
                      
                      <div className="space-y-2">
                        {(form.variations || []).map((v, i) => (
                          <div key={i} className="flex gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                            <input className="input-field h-10 bg-black/20 border-white/5 flex-[2] text-xs font-bold" value={v.name} onChange={e => {
                              const n = [...form.variations]; n[i].name = e.target.value; setForm({ ...form, variations: n });
                            }} placeholder="Ex: Sabor Morango" />
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted">R$</span>
                              <input className="input-field h-10 pl-8 bg-black/20 border-white/5 text-xs font-bold" type="number" step="0.01" value={v.price} onChange={e => {
                                const n = [...form.variations]; n[i].price = e.target.value; setForm({ ...form, variations: n });
                              }} placeholder="0,00" />
                            </div>
                            <button className="w-10 h-10 rounded-lg bg-red-400/10 text-red-400 flex items-center justify-center hover:bg-red-400 transition-all hover:text-white" onClick={() => {
                              setForm({ ...form, variations: form.variations.filter((_, idx) => idx !== i) });
                            }}><Trash2 size={14} /></button>
                          </div>
                        ))}
                        {(!form.variations || form.variations.length === 0) && (
                          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-muted">
                              <Layout size={32} />
                            </div>
                            <div className="max-w-xs">
                              <p className="text-[11px] font-bold text-muted uppercase tracking-widest">Nenhuma variação definida</p>
                              <p className="text-[10px] text-muted/60">Utilize variações para produtos que possuem tamanhos, cores ou sabores diferentes.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-white/5 bg-white/5 flex gap-4">
              <button className="flex-1 h-14 rounded-2xl bg-white/5 text-muted font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all" onClick={closeModal}>
                Cancelar
              </button>
              <button className="flex-[2] h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" onClick={handleSave}>
                {modal === 'add' ? 'Criar Produto' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-black/90 backdrop-blur-2xl animate-fade cursor-zoom-out" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/10">
            <X size={24} />
          </button>
          <div className="relative group max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-3xl shadow-2xl border border-white/10 animate-zoom-in" />
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
              Clique fora para fechar
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
