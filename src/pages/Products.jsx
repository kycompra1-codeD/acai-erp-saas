import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Minus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, X, AlertTriangle, Tag, Eye, EyeOff, Package, Truck, FileText, Layout, Layers, Globe, Image as ImageIcon, Video, ShoppingBag, DollarSign, ClipboardList, BarChart2, Hash, Box, Link as LinkIcon, Info, Settings, ShieldCheck, Zap, Share2, ChevronRight, AlignLeft, AlignCenter, AlignRight, Activity, Paperclip, History, PlusCircle, ScanLine, Printer } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import ProductBox3D from '../components/products/ProductBox3D';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
const DEFAULT_CATEGORIES = [
  { id: 'acai', label: 'Açaís', emoji: '🍇', image: null, parentId: null, order: 0 },
  { id: 'complemento', label: 'Complementos', emoji: '🌾', image: null, parentId: null, order: 1 },
  { id: 'bebida', label: 'Bebidas', emoji: '🥤', image: null, parentId: null, order: 2 },
  { id: 'sobremesa', label: 'Sobremesas', emoji: '🍩', image: null, parentId: null, order: 3 },
];

const CATEGORIES_STORAGE_KEY = 'zullya_product_categories';
const CATEGORIES_STORAGE_KEY_LEGACY = 'acai_product_categories';

function fmt(v) { return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

const EMPTY_PRODUCT = { 
  name: '', category: 'acai', subcategory: '', brand: '', condition: 'new', unit: 'pote', 
  identityType: 'emoji',
  emoji: '🍇', description: '', active: true,
  // Tipo do produto
  productType: 'simples', itemTypeSped: '00', productLine: '', guarantee: '',
  allowInSales: 'sim',
  // Financial
  price: '', promotionalPrice: '', cost: '', averageCost: '', markup: '', 
  priceLists: [],
  // Stock
  stock: '', minStock: '5', maxStock: '', stockNotification: true, stockLocation: '', preparationDays: '1',
  controlStock: 'sim', underOrder: 'nao', controlLots: 'nao',
  // IDs & Fiscal
  sku: '', ean: '', eanTributavel: '', ncm: '', cest: '', origin: '0',
  ipiCode: '', ipiFixed: '', ipiLegalCode: '', extipi: '',
  tributaryUnit: '', conversionFactor: '',
  icms_sit_trib: '102', icms_origem: '0',
  pis_sit_trib: '07', cofins_sit_trib: '07',
  // Logistics
  weight: '', weightNet: '', packagingType: 'pacote', packaging: '',
  width: '', height: '', length: '', itemsPerBox: '1',
  // SEO & Marketing
  videoLink: '', slug: '', keywords: '', seoTitle: '', seoDescription: '', richDescription: '',
  // Arrays & Objects
  tags: [], attributes: [], images: [],
  mappings: {}, variations: [], suppliers: [], internalNotes: '',
  ads: [],
  // FASE 2: Enterprise Fields
  components: [], // Composição/Kit (BOM)
  nutritional: { portion: '', calories: '', carbs: '', sugars: '', proteins: '', fats: '', fiber: '', sodium: '' },
  batches: [], // Lotes e Validade
  relatedProducts: [], // Cross-sell / Compre Junto
  attachments: [], // Anexos e Laudos
  historyLogs: [], // Auditoria
  pis_perc: '', cofins_perc: '', cfop_int: '', cfop_ext: ''
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

function CategoryTreeNode({ node, level, onAdd, onEdit, onDelete, onMove, expandedNodes, toggleExpand, draggedId, setDraggedId, dragOverId, setDragOverId, dragPosition, setDragPosition }) {
  const isExpanded = expandedNodes[node.id];
  const hasChildren = node.children && node.children.length > 0;

  const handleDragStart = (e) => {
    e.stopPropagation();
    setDraggedId(node.id);
    e.dataTransfer.effectAllowed = 'move';
    // Remove drag image ghost if preferred, or leave default
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId === node.id) return;

    setDragOverId(node.id);
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;

    // Se estiver no primeiro terço (acima), no último terço (abaixo), ou no meio (dentro)
    if (y < h * 0.25) {
      setDragPosition('before');
    } else if (y > h * 0.75) {
      setDragPosition('after');
    } else {
      setDragPosition('inside');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== node.id) {
      onMove(draggedId, node.id, dragPosition);
    }
    setDraggedId(null);
    setDragOverId(null);
    setDragPosition(null);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Do not clear immediately to avoid flickering
  };

  return (
    <div className="w-full">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        className={`flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-black/20 group hover:bg-white/5 transition-all
          ${dragOverId === node.id && dragPosition === 'before' ? 'border-t-primary' : ''}
          ${dragOverId === node.id && dragPosition === 'after' ? 'border-b-primary' : ''}
          ${dragOverId === node.id && dragPosition === 'inside' ? 'bg-primary/20 border-primary/50' : ''}
          ${draggedId === node.id ? 'opacity-50' : ''}
        `}
      >
        <div className="flex-1 flex items-center gap-3">
          {hasChildren ? (
            <button type="button" onClick={() => toggleExpand(node.id)} className="w-6 h-6 flex items-center justify-center bg-white/5 rounded-lg text-muted hover:text-white">
              {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
            </button>
          ) : <div className="w-6" />}
          
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl overflow-hidden">
            {node.image ? <img src={node.image} alt="" className="w-full h-full object-cover" /> : node.emoji}
          </div>
          <div className="flex flex-col">
            <span className="text-white font-medium text-sm">{node.label}</span>
            <span className="text-muted text-[10px]">{node.children.length} subcategorias</span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:opacity-40 group-hover:opacity-100 transition-all">
          <button type="button" onClick={(e) => { e.stopPropagation(); onAdd(node.id); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-primary text-white transition-all border border-white/5 shadow-sm" title="Criar Subcategoria">
            <Plus size={14} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(node); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-blue-500 text-white transition-all border border-white/5 shadow-sm" title="Editar Categoria">
            <Edit2 size={14} />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-red-500 text-white transition-all border border-white/5 shadow-sm" title="Excluir Categoria">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="pl-6 mt-3 flex flex-col gap-3 relative">
          <div className="absolute left-[19px] top-0 bottom-4 w-[2px] bg-white/20 rounded-full" />
          {node.children.map(child => (
            <div key={child.id} className="relative">
              <div className="absolute left-[-16px] top-[24px] w-4 h-[2px] bg-white/20 rounded-full" />
              <CategoryTreeNode 
                node={child} 
                level={level + 1}
                onAdd={onAdd}
                onEdit={onEdit}
                onDelete={onDelete}
                onMove={onMove}
                expandedNodes={expandedNodes}
                toggleExpand={toggleExpand}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
                dragOverId={dragOverId}
                setDragOverId={setDragOverId}
                dragPosition={dragPosition}
                setDragPosition={setDragPosition}
              />
            </div>
          ))}
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
  const [subCatFilter, setSubCatFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [modalTab, setModalTab] = useState('basico');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCost, setShowCost] = useState(false);
  const [tempMediaUrl, setTempMediaUrl] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [categoriesList, setCategoriesList] = useState(() => {
    let cats = DEFAULT_CATEGORIES;
    try {
      const legacy = localStorage.getItem(CATEGORIES_STORAGE_KEY_LEGACY);
      if (legacy) {
        localStorage.setItem(CATEGORIES_STORAGE_KEY, legacy);
        localStorage.removeItem(CATEGORIES_STORAGE_KEY_LEGACY);
      }
      const s = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (s) cats = JSON.parse(s);
    } catch {}

    // Migration to flat structure
    if (cats.length > 0 && cats[0].subcategories !== undefined) {
      const flat = [];
      cats.forEach((c, i) => {
        const catId = c.key || c.id || `cat_${Date.now()}_${i}`;
        flat.push({
          id: catId,
          label: c.label,
          emoji: c.emoji || '🏷️',
          image: c.image || null,
          parentId: null,
          order: i,
        });
        if (c.subcategories && c.subcategories.length > 0) {
          c.subcategories.forEach((sub, j) => {
            flat.push({
              id: sub.key || sub.id || `sub_${Date.now()}_${i}_${j}`,
              label: sub.label,
              emoji: sub.emoji || '🏷️',
              image: sub.image || null,
              parentId: catId,
              order: j,
            });
          });
        }
      });
      try { localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(flat)); } catch {}
      return flat;
    }
    return cats;
  });
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatForm, setNewCatForm] = useState({ label: '', emoji: '🏷️', image: null });
  const [editingCatId, setEditingCatId] = useState(null);
  const [addingSubCatId, setAddingSubCatId] = useState(null);

  // Tree and DND states
  const [expandedNodes, setExpandedNodes] = useState({});
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);

  const toggleExpand = (id) => setExpandedNodes(p => ({ ...p, [id]: !p[id] }));

  const saveCats = (cats) => {
    setCategoriesList(cats);
    try { localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats)); } catch {}
  };

  const getTree = () => {
    const map = {};
    const roots = [];
    categoriesList.forEach(c => map[c.id] = { ...c, children: [] });
    categoriesList.forEach(c => {
      if (c.parentId && map[c.parentId]) {
        map[c.parentId].children.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    const sortTree = (nodes) => {
      nodes.sort((a, b) => a.order - b.order);
      nodes.forEach(n => sortTree(n.children));
    };
    sortTree(roots);
    return roots;
  };

  const getDepth = (id) => {
    let depth = 1;
    const visited = new Set();
    let curr = categoriesList.find(c => c.id === id);
    while (curr && curr.parentId && !visited.has(curr.id)) {
      visited.add(curr.id);
      depth++;
      curr = categoriesList.find(c => c.id === curr.parentId);
    }
    return depth;
  };

  const addCategory = (parentId = null) => {
    if (!newCatForm.label.trim()) { toast.error('Nome obrigatório'); return; }
    if (parentId && getDepth(parentId) >= 4) { toast.error('Limite máximo de 3 níveis de subcategoria atingido'); return; }
    
    const id = `cat_${Date.now()}`;
    const siblings = categoriesList.filter(c => c.parentId === parentId);
    const order = siblings.length > 0 ? Math.max(...siblings.map(s => s.order)) + 1 : 0;
    
    saveCats([...categoriesList, { 
      id, 
      label: newCatForm.label.trim(), 
      emoji: newCatForm.emoji || '🏷️', 
      image: newCatForm.image || null,
      parentId, 
      order 
    }]);
    setNewCatForm({ label: '', emoji: '🏷️', image: null });
    toast.success(parentId ? 'Subcategoria criada!' : 'Categoria criada!');
  };

  const updateCategory = (id, updates) => {
    saveCats(categoriesList.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCategory = (id) => {
    if (DEFAULT_CATEGORIES.find(c => c.id === id)) { toast.error('Não é possível remover categorias padrão'); return; }
    // Deleta também os filhos recursivamente
    const idsToDelete = new Set([id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of categoriesList) {
        if (idsToDelete.has(c.parentId) && !idsToDelete.has(c.id)) {
          idsToDelete.add(c.id);
          added = true;
        }
      }
    }
    saveCats(categoriesList.filter(c => !idsToDelete.has(c.id)));
    toast.success('Categoria e dependentes removidos');
  };

  const moveCategory = (dragId, targetId, position) => {
    // position: 'before', 'after', 'inside'
    if (dragId === targetId) return;
    
    const dragCat = categoriesList.find(c => c.id === dragId);
    const targetCat = categoriesList.find(c => c.id === targetId);
    if (!dragCat || !targetCat) return;

    // Prevent cyclic drops
    let curr = targetCat;
    while (curr) {
      if (curr.id === dragId) { toast.error('Movimento inválido'); return; }
      curr = categoriesList.find(c => c.id === curr.parentId);
    }

    let newParentId = targetCat.parentId;
    if (position === 'inside') {
      if (getDepth(targetId) >= 4) { toast.error('Limite máximo de níveis atingido'); return; }
      newParentId = targetId;
    }

    let newList = categoriesList.map(c => c.id === dragId ? { ...c, parentId: newParentId } : c);
    
    // Reorder
    const siblings = newList.filter(c => c.parentId === newParentId).sort((a, b) => a.order - b.order);
    const dragIndexInSiblings = siblings.findIndex(c => c.id === dragId);
    siblings.splice(dragIndexInSiblings, 1);

    let targetIndex = siblings.findIndex(c => c.id === targetId);
    if (position === 'inside') {
      siblings.push(dragCat);
    } else {
      if (targetIndex === -1) targetIndex = siblings.length;
      siblings.splice(position === 'after' ? targetIndex + 1 : targetIndex, 0, dragCat);
    }

    siblings.forEach((s, i) => {
      const cat = newList.find(c => c.id === s.id);
      if (cat) cat.order = i;
    });

    saveCats(newList);
  };

  // Obter todos os descendant IDs de uma categoria
  const getDescendantIds = (catId) => {
    const descendants = new Set();
    const stack = [catId];
    while (stack.length > 0) {
      const current = stack.pop();
      if (descendants.has(current)) continue; // Evita loop
      descendants.add(current);
      const children = categoriesList.filter(c => c.parentId === current).map(c => c.id);
      stack.push(...children);
    }
    return descendants;
  };

  const filtered = useMemo(() => {
    const targetDescendants = catFilter !== 'all' ? getDescendantIds(catFilter) : null;
    return (products || []).filter(p => {
      if (!p) return false;
      const name = p.name || '';
      const sku = p.sku || '';
      const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                            sku.toLowerCase().includes(search.toLowerCase());
      
      let matchesCategory = true;
      if (catFilter !== 'all') {
        const prodCatId = p.categoryId || p.subcategory || p.category;
        matchesCategory = targetDescendants.has(prodCatId);
      }
      
      return matchesSearch && matchesCategory;
    });
  }, [products, search, catFilter, categoriesList]);

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
    if (!form.name || (!form.categoryId && !form.category)) {
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

  // Helper for navigation
  const currentPath = catFilter === 'all' ? [] : (() => {
    const path = [];
    const visited = new Set();
    let curr = categoriesList.find(c => c.id === catFilter);
    while (curr && !visited.has(curr.id)) {
      path.unshift(curr);
      visited.add(curr.id);
      curr = categoriesList.find(c => c.id === curr.parentId);
    }
    return path;
  })();

  const currentLevelOptions = categoriesList.filter(c => c.parentId === (catFilter === 'all' ? null : catFilter)).sort((a,b) => a.order - b.order);

  const getProductCount = (catId) => {
    const descendants = getDescendantIds(catId);
    return (products || []).filter(p => {
       const prodCatId = p.categoryId || p.subcategory || p.category;
       return descendants.has(prodCatId);
    }).length;
  };

  const groupsToRender = catFilter === 'all' 
    ? categoriesList.filter(c => c.parentId === null).sort((a,b) => a.order - b.order) 
    : [categoriesList.find(c => c.id === catFilter)];

  const grouped = groupsToRender.filter(Boolean).map(cat => ({
    ...cat,
    items: filtered.filter(p => {
       const prodCatId = p.categoryId || p.subcategory || p.category;
       const desc = getDescendantIds(cat.id);
       return desc.has(prodCatId);
    }),
  }));

  // Adicionar grupo para produtos sem categoria classificada corretamente se estiver no filtro 'all'
  if (catFilter === 'all') {
    const allValidCatIds = new Set(categoriesList.map(c => c.id));
    const orphanedProducts = filtered.filter(p => {
      const prodCatId = p.categoryId || p.subcategory || p.category;
      return !prodCatId || !allValidCatIds.has(prodCatId);
    });
    if (orphanedProducts.length > 0) {
      grouped.push({
        id: 'orphans',
        label: 'Sem Categoria / Não Classificados',
        emoji: '❓',
        items: orphanedProducts
      });
    }
  }

  return (
    <div className="animate-fade">
      {/* Actions */}
      <div className="flex flex-col" style={{ marginBottom: 20, gap: 12 }}>
        <div className="flex items-center justify-between flex-wrap" style={{ gap: 12 }}>
          
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={`btn btn-sm ${catFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCatFilter('all')}>
              Todos ({products?.length || 0})
            </button>
            
            {currentPath.map((node, index) => (
              <React.Fragment key={node.id}>
                <span className="text-muted/50">/</span>
                <button 
                  className={`btn btn-sm ${index === currentPath.length - 1 ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setCatFilter(node.id)}
                >
                  {node.emoji} {node.label}
                </button>
              </React.Fragment>
            ))}

            <button className="btn btn-sm btn-ghost ml-2" style={{ borderStyle: 'dashed', border: '1px dashed var(--border)' }} onClick={() => setShowCatModal(true)}>
              <Tag size={13} /> Gerenciar Categorias
            </button>
            <button className="btn btn-sm btn-ghost ml-2" style={{ borderStyle: 'dashed', border: '1px dashed var(--border)' }} onClick={() => setShowCost(!showCost)}>
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

        {/* Subcategory Navigation */}
        {currentLevelOptions.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 8, borderLeft: '2px solid var(--primary-light)' }}>
            {currentLevelOptions.map(sub => {
              const count = getProductCount(sub.id);
              return (
                <button key={sub.id} className="btn btn-sm h-8 btn-secondary" onClick={() => setCatFilter(sub.id)}>
                  {sub.emoji} {sub.label} <span className="opacity-50 ml-1">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Product List by Category */}
      {grouped.map(group => group.items.length > 0 && (
        <div key={group.id} className="mb-10">
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

                  <div className="absolute top-3 right-3 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
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
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary flex-1" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn bg-red-500 hover:bg-red-600 text-white flex-1 flex items-center justify-center gap-2 border border-red-500" onClick={handleDelete}>
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCatModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Tag size={16} color="var(--primary-light)" /> Gerenciar Categorias</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowCatModal(false); setEditingCatId(null); setAddingSubCatId(null); setNewCatForm({ label: '', emoji: '🏷️', image: null }); }}><X size={18} /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16, overflowY: 'auto', paddingRight: 8, flex: 1 }} className="custom-scrollbar">
              {getTree().map(rootNode => (
                <CategoryTreeNode 
                  key={rootNode.id}
                  node={rootNode}
                  level={0}
                  onAdd={(parentId) => {
                    setEditingCatId(null);
                    setAddingSubCatId(parentId);
                    setNewCatForm({ label: '', emoji: '🏷️', image: null });
                    // Foco no input
                    setTimeout(() => {
                      const el = document.getElementById('new-cat-label');
                      if (el) el.focus();
                    }, 50);
                    setExpandedNodes(p => ({ ...p, [parentId]: true }));
                  }}
                  onEdit={(node) => {
                    setEditingCatId(node.id);
                    setNewCatForm({ label: node.label, emoji: node.emoji, image: node.image });
                  }}
                  onDelete={deleteCategory}
                  onMove={moveCategory}
                  expandedNodes={expandedNodes}
                  toggleExpand={toggleExpand}
                  draggedId={draggedId}
                  setDraggedId={setDraggedId}
                  dragOverId={dragOverId}
                  setDragOverId={setDragOverId}
                  dragPosition={dragPosition}
                  setDragPosition={setDragPosition}
                />
              ))}
              {categoriesList.length === 0 && (
                <div className="py-10 text-center text-muted text-sm border border-dashed border-white/10 rounded-xl">
                  Nenhuma categoria cadastrada.
                </div>
              )}
            </div>

            <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: 12, border: '1px dashed var(--border)', marginTop: 'auto' }}>
              <div className="flex items-center justify-between mb-4">
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {editingCatId ? 'Editar Categoria' : (addingSubCatId ? 'Nova Subcategoria' : 'Nova Categoria Raiz')}
                </p>
                {(editingCatId || addingSubCatId) && (
                  <button className="text-[10px] text-primary hover:underline" onClick={() => { setEditingCatId(null); setAddingSubCatId(null); setNewCatForm({ label: '', emoji: '🏷️', image: null }); }}>
                    Cancelar
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="relative">
                    <EmojiPicker value={newCatForm.emoji} onChange={(emoji) => setNewCatForm(p => ({ ...p, emoji }))} />
                    <button 
                      type="button" 
                      className="absolute -top-2 -right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-primary transition-all shadow-lg border border-white/10"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => setNewCatForm(p => ({ ...p, image: event.target.result }));
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      title="Fazer upload de foto"
                    >
                      <ImageIcon size={10} />
                    </button>
                    {newCatForm.image && (
                      <button type="button" onClick={() => setNewCatForm(p => ({ ...p, image: null }))} className="absolute -bottom-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg border border-white/10" title="Remover imagem">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                  
                  {newCatForm.image && (
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                      <img src={newCatForm.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex flex-col flex-1 gap-2">
                    <input id="new-cat-label" className="input-field h-10" value={newCatForm.label} onChange={e => setNewCatForm(p => ({ ...p, label: e.target.value }))} placeholder="Nome da categoria" />
                    <button 
                      className="btn btn-primary h-10 w-full" 
                      onClick={() => {
                        if (editingCatId) {
                          updateCategory(editingCatId, { label: newCatForm.label, emoji: newCatForm.emoji, image: newCatForm.image });
                          setEditingCatId(null);
                          setNewCatForm({ label: '', emoji: '🏷️', image: null });
                          toast.success('Categoria atualizada');
                        } else {
                          addCategory(addingSubCatId);
                          setAddingSubCatId(null);
                        }
                      }}
                    >
                      {editingCatId ? <><Edit2 size={14} /> Salvar Alterações</> : <><Plus size={14} /> {addingSubCatId ? 'Criar Subcategoria' : 'Criar Categoria Raiz'}</>}
                    </button>
                  </div>
                </div>
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
              <div className="sticky top-0 z-40 bg-[#0f1115]/95 backdrop-blur-3xl px-4 md:px-8 py-4 border-b border-white/5 flex flex-wrap items-center gap-2 max-h-[30vh] overflow-y-auto custom-scrollbar">
                {[
                  { id: 'geral', label: 'Geral', icon: <Layout size={14} /> },
                  { id: 'composicao', label: 'Composição', icon: <Layers size={14} /> },
                  { id: 'precos', label: 'Preços', icon: <DollarSign size={14} /> },
                  { id: 'estoque', label: 'Estoque', icon: <Package size={14} /> },
                  { id: 'logistica', label: 'Logística', icon: <Truck size={14} /> },
                  { id: 'nutricional', label: 'Nutricional', icon: <Activity size={14} /> },
                  { id: 'fiscal', label: 'Fiscal', icon: <FileText size={14} /> },
                  { id: 'ficha', label: 'Ficha Técnica', icon: <ClipboardList size={14} /> },
                  { id: 'marketing', label: 'Marketing', icon: <Globe size={14} /> },
                  { id: 'canais', label: 'Canais', icon: <LinkIcon size={14} /> },
                  { id: 'codigos', label: 'Códigos & Etiquetas', icon: <ScanLine size={14} /> },
                  { id: 'anexos', label: 'Anexos', icon: <Paperclip size={14} /> },
                  { id: 'outros', label: 'Outros', icon: <Settings size={14} /> },
                  { id: 'historico', label: 'Histórico', icon: <History size={14} /> },
                ].map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setModalTab(t.id)}
                    className={`btn btn-sm ${modalTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '1rem', whiteSpace: 'nowrap' }}
                  >
                    <span className={modalTab !== t.id ? 'opacity-70 text-muted-foreground' : ''}>
                      {t.icon}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {modalTab === 'geral' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      {/* Identidade Visual */}
                      <div className="md:col-span-4 space-y-4">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest block flex justify-between items-center">
                          Identidade Visual
                          {form.identityType === 'image' && (
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline flex items-center gap-1">
                              <Plus size={10} /> Adicionar
                            </button>
                          )}
                        </label>
                        
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 mb-4">
                          <button className={`flex-1 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${form.identityType === 'emoji' ? 'bg-primary text-white' : 'text-muted hover:bg-white/5'}`} onClick={() => setForm({ ...form, identityType: 'emoji' })}>Emoji</button>
                          <button className={`flex-1 py-2 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${form.identityType === 'image' ? 'bg-primary text-white' : 'text-muted hover:bg-white/5'}`} onClick={() => setForm({ ...form, identityType: 'image' })}>Galeria</button>
                        </div>

                        {form.identityType === 'emoji' ? (
                          <div className="space-y-4">
                            <div className="aspect-square rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                              <div className="text-7xl">{form.emoji || '📦'}</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center gap-3">
                              <span className="text-[10px] font-black text-muted uppercase tracking-widest">Escolher Ícone</span>
                              <EmojiPicker value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e })} />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(!form.images || form.images.length === 0) ? (
                              <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-6 text-center group hover:border-primary/50 hover:bg-white/10 transition-all cursor-pointer">
                                <Plus className="text-muted group-hover:text-primary mb-2 transition-colors" size={32} />
                                <span className="text-[10px] font-bold text-muted uppercase">Upload Imagem</span>
                              </div>
                            ) : (
                              <>
                                {/* Foto Principal */}
                                <div 
                                  className={`aspect-square rounded-3xl bg-black/40 border-2 relative overflow-hidden group cursor-pointer transition-all ${draggedIndex === 0 ? 'border-primary opacity-50 scale-95' : 'border-white/10 hover:border-white/30'}`}
                                  onClick={() => setPreviewImage(form.images[0].url)}
                                  draggable
                                  onDragStart={() => onDragStart(0)}
                                  onDragOver={onDragOver}
                                  onDrop={() => onDrop(0)}
                                >
                                  <img src={form.images[0].url} alt="Principal" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                  <div className="absolute top-3 left-3 pointer-events-none">
                                    <span className="bg-primary/90 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md backdrop-blur-md">Principal</span>
                                  </div>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setForm({ ...form, images: form.images.slice(1) }); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white backdrop-blur-md opacity-100 transition-all shadow-xl z-10" title="Remover Foto">
                                    <Trash2 size={14} strokeWidth={2.5} />
                                  </button>
                                  <div className="absolute bottom-3 inset-x-0 text-center text-[10px] font-bold text-white/80 uppercase tracking-widest flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <Eye size={12} /> Ampliar
                                  </div>
                                </div>
                                
                                {/* Grade de Miniaturas */}
                                {form.images.length > 1 && (
                                  <div className="grid grid-cols-3 gap-2">
                                    {form.images.slice(1).map((img, idx) => {
                                      const actualIdx = idx + 1;
                                      return (
                                        <div 
                                          key={img.id || actualIdx}
                                          className={`aspect-square rounded-xl bg-black/40 border-2 relative overflow-hidden group cursor-pointer transition-all ${draggedIndex === actualIdx ? 'border-primary opacity-50 scale-95' : 'border-white/5 hover:border-white/20'}`}
                                          onClick={() => setPreviewImage(img.url)}
                                          draggable
                                          onDragStart={() => onDragStart(actualIdx)}
                                          onDragOver={onDragOver}
                                          onDrop={() => onDrop(actualIdx)}
                                        >
                                          <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                          <button type="button" onClick={(e) => { e.stopPropagation(); setForm({ ...form, images: form.images.filter((_, i) => i !== actualIdx) }); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white opacity-100 transition-all z-10" title="Remover Foto">
                                            <Trash2 size={12} strokeWidth={2.5} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                    <div 
                                      onClick={() => fileInputRef.current?.click()} 
                                      className="aspect-square rounded-xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center text-muted hover:text-primary hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all"
                                      title="Adicionar mais imagens"
                                    >
                                      <Plus size={16} />
                                    </div>
                                  </div>
                                )}
                                {form.images.length === 1 && (
                                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-3 rounded-xl border border-dashed border-white/10 bg-white/5 flex items-center justify-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all">
                                    <Plus size={12} /> Adicionar mais fotos
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Informações Básicas */}
                      <div className="md:col-span-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Tipo do Produto</label>
                            <select className="input-field h-12 bg-white/5 border-white/10" value={form.productType} onChange={e => setForm({ ...form, productType: e.target.value })}>
                              <option value="simples">Simples</option>
                              <option value="com_variacoes">Com Variações</option>
                              <option value="kit">Kit</option>
                              <option value="materia_prima">Matéria-prima</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Tipo SPED</label>
                            <select className="input-field h-12 bg-white/5 border-white/10" value={form.itemTypeSped} onChange={e => setForm({ ...form, itemTypeSped: e.target.value })}>
                              <option value="00">00 - Mercadoria para Revenda</option>
                              <option value="01">01 - Matéria-Prima</option>
                              <option value="02">02 - Embalagem</option>
                              <option value="03">03 - Produto em Processo</option>
                              <option value="04">04 - Produto Acabado</option>
                              <option value="05">05 - Subproduto</option>
                              <option value="06">06 - Produto Intermediário</option>
                              <option value="07">07 - Material de Uso e Consumo</option>
                              <option value="08">08 - Ativo Imobilizado</option>
                              <option value="09">09 - Serviços</option>
                              <option value="10">10 - Outros insumos</option>
                              <option value="99">99 - Outras</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Cód. de Barras (EAN)</label>
                            <input className="input-field h-12 bg-white/5 border-white/10 font-mono" value={form.ean || ''} onChange={e => setForm({ ...form, ean: e.target.value })} placeholder="Ex: 7890000000000" />
                          </div>
                        </div>
                        
                        <div className="form-group mb-6">
                          <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Nome do Produto *</label>
                          <input className="input-field h-14 text-lg font-bold bg-white/5 border-white/10" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Açaí Premium 5L" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
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

                        {/* Hierarquia Dinâmica de Categorias */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          {(() => {
                            let path = [];
                            if (form.categoryId) {
                              let curr = categoriesList.find(c => c.id === form.categoryId);
                              const visited = new Set();
                              while (curr && !visited.has(curr.id)) {
                                visited.add(curr.id);
                                path.unshift(curr.id);
                                curr = categoriesList.find(c => c.id === curr.parentId);
                              }
                            } else if (form.category) {
                              // Fallback para produtos antigos
                              const cat = categoriesList.find(c => c.id === form.category);
                              if (cat) path.push(cat.id);
                              if (form.subcategory) {
                                const sub = categoriesList.find(c => c.id === form.subcategory && c.parentId === form.category);
                                if (sub) path.push(sub.id);
                              }
                            }

                            const selects = [];
                            let currentParentId = null;

                            for (let level = 0; level < 4; level++) {
                              const options = categoriesList.filter(c => c.parentId === currentParentId).sort((a, b) => a.order - b.order);
                              if (options.length === 0) break;

                              const selectedId = path[level] || '';
                              
                              selects.push(
                                <div key={`level_${level}`} className="form-group">
                                  <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">
                                    {level === 0 ? 'Categoria Principal' : `Subcategoria Nível ${level}`}
                                  </label>
                                  <select 
                                    className="input-field h-12 bg-white/5 border-white/10" 
                                    value={selectedId} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (val) {
                                        setForm({ ...form, categoryId: val, category: '', subcategory: '' });
                                      } else {
                                        const prevId = level > 0 ? path[level - 1] : '';
                                        setForm({ ...form, categoryId: prevId, category: '', subcategory: '' });
                                      }
                                    }}
                                  >
                                    <option value="">{level === 0 ? 'Selecione a categoria...' : 'Nenhuma'}</option>
                                    {options.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                                  </select>
                                </div>
                              );

                              if (!selectedId) break;
                              currentParentId = selectedId;
                            }

                            return selects;
                          })()}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Marca</label>
                            <input className="input-field h-12 bg-white/5 border-white/10" value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Ex: Açaí Top" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="form-group">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Descrição Curta</label>
                        <textarea className="input-field min-h-[120px] py-3 bg-white/5 border-white/10 text-xs" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Uma breve descrição para listagens..." />
                      </div>
                      <div className="form-group">
                        <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Descrição Completa</label>
                        <div className="flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                          <div className="flex items-center gap-2 p-2 border-b border-white/10 bg-black/20">
                            <button className="p-1.5 hover:bg-white/10 rounded text-muted"><strong className="font-serif">B</strong></button>
                            <button className="p-1.5 hover:bg-white/10 rounded text-muted"><em className="font-serif">I</em></button>
                            <button className="p-1.5 hover:bg-white/10 rounded text-muted"><u className="font-serif">U</u></button>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <button className="p-1.5 hover:bg-white/10 rounded text-muted"><AlignLeft size={14} /></button>
                            <button className="p-1.5 hover:bg-white/10 rounded text-muted"><AlignCenter size={14} /></button>
                            <button className="p-1.5 hover:bg-white/10 rounded text-muted"><AlignRight size={14} /></button>
                          </div>
                          <textarea className="flex-1 bg-transparent border-none focus:ring-0 p-3 text-xs min-h-[120px] resize-none" value={form.richDescription || ''} onChange={e => setForm({ ...form, richDescription: e.target.value })} placeholder="Descrição detalhada para e-commerce e propostas comerciais..." />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {modalTab === 'composicao' && (
                  <div className="space-y-8 animate-fade">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-6">
                      <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                          <Layers size={18} className="text-primary" />
                          <h4 className="text-xs font-black text-white uppercase tracking-widest">Insumos e Composição</h4>
                        </div>
                        <button className="btn btn-sm btn-primary" onClick={() => setForm({ ...form, components: [...(form.components || []), { name: '', qty: '', cost: '' }] })}>
                          <Plus size={14} /> Adicionar Insumo
                        </button>
                      </div>

                      <div className="space-y-3">
                        {(form.components || []).length > 0 && (
                          <div className="grid grid-cols-[1fr_100px_100px_100px_40px] gap-4 px-4 pb-2">
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">Produto/Insumo</span>
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">Qtd Utilizada</span>
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">Custo Unit.</span>
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest text-right">Custo Total</span>
                            <span />
                          </div>
                        )}
                        {(form.components || []).map((comp, i) => (
                          <div key={i} className="grid grid-cols-[1fr_100px_100px_100px_40px] gap-4 items-center p-3 rounded-xl bg-black/20 border border-white/5">
                            <input className="input-field h-10 bg-white/5 border-white/10 text-xs" value={comp.name} onChange={e => {
                              const n = [...(form.components || [])]; n[i].name = e.target.value; setForm({ ...form, components: n });
                            }} placeholder="Buscar insumo..." />
                            
                            <input className="input-field h-10 bg-white/5 border-white/10 text-xs text-center" type="number" step="0.001" value={comp.qty} onChange={e => {
                              const n = [...(form.components || [])]; n[i].qty = e.target.value; setForm({ ...form, components: n });
                            }} placeholder="0.000" />
                            
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-[10px]">R$</span>
                              <input className="input-field h-10 pl-6 bg-white/5 border-white/10 text-xs" type="number" step="0.01" value={comp.cost} onChange={e => {
                                const n = [...(form.components || [])]; n[i].cost = e.target.value; setForm({ ...form, components: n });
                              }} placeholder="0,00" />
                            </div>

                            <div className="text-right text-xs font-bold text-white/80">
                              {fmt((parseFloat(comp.qty || 0) * parseFloat(comp.cost || 0)).toFixed(2))}
                            </div>

                            <button className="w-10 h-10 rounded-lg bg-red-400/10 text-red-400 flex items-center justify-center hover:bg-red-400 hover:text-white transition-all" onClick={() => {
                              setForm({ ...form, components: form.components.filter((_, idx) => idx !== i) });
                            }}><Trash2 size={14} /></button>
                          </div>
                        ))}
                        {(!form.components || form.components.length === 0) && (
                          <div className="py-8 text-center text-muted/50 text-[10px] uppercase tracking-widest font-bold">
                            Nenhum insumo adicionado a esta composição.
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-muted uppercase tracking-widest block mb-1">Custo Total da Composição</span>
                          <span className="text-xl font-black text-white">
                            {fmt((form.components || []).reduce((acc, curr) => acc + (parseFloat(curr.qty || 0) * parseFloat(curr.cost || 0)), 0).toFixed(2))}
                          </span>
                        </div>
                      </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="form-group">
                        <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Controlar Estoque</label>
                        <select className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.controlStock} onChange={e => setForm({ ...form, controlStock: e.target.value })}>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Sob Encomenda</label>
                        <select className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.underOrder} onChange={e => setForm({ ...form, underOrder: e.target.value })}>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Controlar Lotes</label>
                        <select className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.controlLots} onChange={e => setForm({ ...form, controlLots: e.target.value })}>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                    </div>

                    {form.controlLots === 'sim' && (
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4 animate-fade">
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center gap-2">
                            <Layers size={16} className="text-primary" />
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Controle de Lotes e Validade</h4>
                          </div>
                          <button className="btn btn-sm btn-primary" onClick={() => setForm({ ...form, batches: [...(form.batches || []), { lotNumber: '', validity: '', qty: '' }] })}>
                            <Plus size={14} /> Novo Lote
                          </button>
                        </div>
                        
                        {(form.batches || []).length > 0 && (
                          <div className="grid grid-cols-[1fr_1fr_100px_40px] gap-3 px-3 pb-1">
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">Número do Lote</span>
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">Data de Validade</span>
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">Qtd no Lote</span>
                            <span />
                          </div>
                        )}
                        <div className="space-y-2">
                          {(form.batches || []).map((batch, i) => (
                            <div key={i} className="grid grid-cols-[1fr_1fr_100px_40px] gap-3 p-3 rounded-xl bg-black/20 border border-white/5 items-center">
                              <input className="input-field h-10 bg-white/5 border-white/10 text-xs font-mono" value={batch.lotNumber} onChange={e => {
                                const n = [...(form.batches || [])]; n[i].lotNumber = e.target.value; setForm({ ...form, batches: n });
                              }} placeholder="Lote..." />
                              
                              <input className="input-field h-10 bg-white/5 border-white/10 text-xs" type="date" value={batch.validity} onChange={e => {
                                const n = [...(form.batches || [])]; n[i].validity = e.target.value; setForm({ ...form, batches: n });
                              }} />
                              
                              <input className="input-field h-10 bg-white/5 border-white/10 text-xs text-center" type="number" value={batch.qty} onChange={e => {
                                const n = [...(form.batches || [])]; n[i].qty = e.target.value; setForm({ ...form, batches: n });
                              }} placeholder="0" />
                              
                              <button className="w-10 h-10 rounded-lg bg-red-400/10 text-red-400 flex items-center justify-center hover:bg-red-400 hover:text-white transition-all" onClick={() => {
                                setForm({ ...form, batches: (form.batches || []).filter((_, idx) => idx !== i) });
                              }}><Trash2 size={14} /></button>
                            </div>
                          ))}
                          {(!form.batches || form.batches.length === 0) && (
                            <div className="py-6 text-center text-[10px] text-muted/50 italic font-bold uppercase tracking-widest">
                              Nenhum lote registrado
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                {modalTab === 'nutricional' && (
                  <div className="space-y-8 animate-fade">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                          <Activity size={18} className="text-primary" />
                          <h4 className="text-xs font-black text-white uppercase tracking-widest">Informação Nutricional</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Porção (g/ml)</label>
                            <input className="input-field h-12 bg-white/5 border-white/10" value={form.nutritionInfo?.portion || ''} onChange={e => setForm({ ...form, nutritionInfo: { ...form.nutritionInfo, portion: e.target.value } })} placeholder="Ex: 60" />
                          </div>
                          <div className="form-group">
                            <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Medida Caseira</label>
                            <input className="input-field h-12 bg-white/5 border-white/10" value={form.nutritionInfo?.measure || ''} onChange={e => setForm({ ...form, nutritionInfo: { ...form.nutritionInfo, measure: e.target.value } })} placeholder="Ex: 1 bola" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-[1fr_80px_80px] gap-2 px-2 pb-1 border-b border-white/5">
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">Nutriente</span>
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest text-right">Qtd</span>
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest text-right">%VD</span>
                          </div>
                          {[
                            { id: 'calories', label: 'Valor Energético (kcal)' },
                            { id: 'carbs', label: 'Carboidratos (g)' },
                            { id: 'protein', label: 'Proteínas (g)' },
                            { id: 'fat', label: 'Gorduras Totais (g)' },
                            { id: 'sodium', label: 'Sódio (mg)' }
                          ].map(nutrient => (
                            <div key={nutrient.id} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center p-2 rounded-lg hover:bg-white/5 transition-all">
                              <span className="text-xs font-bold text-white/80">{nutrient.label}</span>
                              <input className="input-field h-8 bg-black/20 border-white/5 text-xs text-right" value={form.nutritionInfo?.[nutrient.id]?.amount || ''} onChange={e => setForm({ ...form, nutritionInfo: { ...form.nutritionInfo, [nutrient.id]: { ...form.nutritionInfo?.[nutrient.id], amount: e.target.value } } })} placeholder="0" />
                              <input className="input-field h-8 bg-black/20 border-white/5 text-xs text-right" value={form.nutritionInfo?.[nutrient.id]?.vd || ''} onChange={e => setForm({ ...form, nutritionInfo: { ...form.nutritionInfo, [nutrient.id]: { ...form.nutritionInfo?.[nutrient.id], vd: e.target.value } } })} placeholder="0%" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                          <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Alérgenos e Restrições</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {['Glúten', 'Lactose', 'Amendoim', 'Soja', 'Açúcar', 'Vegano'].map(alergeno => (
                              <label key={alergeno} className="flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-black/20 cursor-pointer hover:bg-white/5 transition-all">
                                <input type="checkbox" className="rounded text-primary focus:ring-primary/20 bg-black/40 border-white/10" 
                                  checked={form.nutritionInfo?.allergens?.includes(alergeno)}
                                  onChange={e => {
                                    const al = form.nutritionInfo?.allergens || [];
                                    setForm({ ...form, nutritionInfo: { ...form.nutritionInfo, allergens: e.target.checked ? [...al, alergeno] : al.filter(a => a !== alergeno) } });
                                  }}
                                />
                                <span className="text-[10px] font-bold text-white/80">{alergeno}</span>
                              </label>
                            ))}
                          </div>
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
                        <div className="space-y-4">
                          <div className="form-group">
                            <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Situação Tributária ICMS</label>
                            <select className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.icms_sit_trib} onChange={e => setForm({ ...form, icms_sit_trib: e.target.value })}>
                              <option value="102">102 - Simples Nacional (Sem crédito)</option>
                              <option value="500">500 - ICMS Cobrado anteriormente</option>
                              <option value="00">00 - Tributada integralmente</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">CFOP Padrão (Estadual / Interestadual)</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input className="input-field h-10 bg-black/20 border-white/5 text-xs text-center font-mono" value={form.fiscal?.cfopState || ''} onChange={e => setForm({ ...form, fiscal: { ...form.fiscal, cfopState: e.target.value } })} placeholder="5102" />
                              <input className="input-field h-10 bg-black/20 border-white/5 text-xs text-center font-mono" value={form.fiscal?.cfopInterstate || ''} onChange={e => setForm({ ...form, fiscal: { ...form.fiscal, cfopInterstate: e.target.value } })} placeholder="6102" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="form-group">
                            <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">PIS / COFINS</label>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <span className="text-[8px] text-muted block mb-1">CST PIS</span>
                                <input className="input-field h-10 bg-black/20 border-white/5 text-xs text-center" value={form.fiscal?.pisCst || ''} onChange={e => setForm({ ...form, fiscal: { ...form.fiscal, pisCst: e.target.value } })} placeholder="01" />
                              </div>
                              <div>
                                <span className="text-[8px] text-muted block mb-1">CST COFINS</span>
                                <input className="input-field h-10 bg-black/20 border-white/5 text-xs text-center" value={form.fiscal?.cofinsCst || ''} onChange={e => setForm({ ...form, fiscal: { ...form.fiscal, cofinsCst: e.target.value } })} placeholder="01" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="relative">
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-[10px]">%</span>
                                <input className="input-field h-10 pr-6 bg-black/20 border-white/5 text-xs" type="number" step="0.01" value={form.fiscal?.pisRate || ''} onChange={e => setForm({ ...form, fiscal: { ...form.fiscal, pisRate: e.target.value } })} placeholder="Alíquota PIS" />
                              </div>
                              <div className="relative">
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-[10px]">%</span>
                                <input className="input-field h-10 pr-6 bg-black/20 border-white/5 text-xs" type="number" step="0.01" value={form.fiscal?.cofinsRate || ''} onChange={e => setForm({ ...form, fiscal: { ...form.fiscal, cofinsRate: e.target.value } })} placeholder="Alíq. COFINS" />
                              </div>
                            </div>
                          </div>
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
                          <div 
                            key={img.id || idx} 
                            className={`group aspect-square rounded-2xl bg-black/40 border-2 relative overflow-hidden cursor-pointer transition-all ${draggedIndex === idx ? 'border-primary opacity-50 scale-95' : 'border-white/10 hover:border-white/30'}`}
                            onClick={() => setPreviewImage(img.url)}
                            draggable
                            onDragStart={() => onDragStart(idx)}
                            onDragOver={onDragOver}
                            onDrop={() => onDrop(idx)}
                          >
                            <img src={img.url} alt="Product" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 pointer-events-none">
                              <div className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1 mb-2">
                                <Eye size={12} /> Ampliar
                              </div>
                            </div>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setForm({ ...form, images: form.images.filter((_, i) => i !== idx) }); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white opacity-100 transition-all shadow-lg z-10" title="Remover Foto">
                              <Trash2 size={12} strokeWidth={2.5} />
                            </button>
                            {idx === 0 && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary text-[8px] font-black text-white uppercase shadow-md backdrop-blur-md pointer-events-none">Principal</span>}
                          </div>
                        ))}
                        <div 
                          onClick={() => fileInputRef.current?.click()} 
                          className="aspect-square rounded-2xl border-2 border-dashed border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted hover:text-primary cursor-pointer"
                        >
                          <Plus size={24} />
                          <span className="text-[9px] font-black uppercase">Upload</span>
                        </div>
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

                {/* ─── FICHA TÉCNICA ─── */}
                {modalTab === 'ficha' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-white">Ficha Técnica</h4>
                        <p className="text-[10px] text-muted mt-0.5">Atributos técnicos exibidos na loja online</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, attributes: [...(form.attributes || []), { attribute: '', value: '' }] })}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/30 transition-all"
                      >
                        <Plus size={12} /> Adicionar Atributo
                      </button>
                    </div>
                    {(form.attributes || []).length > 0 && (
                      <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-3 pb-1 border-b border-white/5">
                        <span className="text-[9px] font-black text-muted uppercase tracking-widest">Atributo</span>
                        <span className="text-[9px] font-black text-muted uppercase tracking-widest">Valor</span>
                        <span />
                      </div>
                    )}
                    <div className="space-y-2">
                      {(form.attributes || []).map((attr, i) => (
                        <div key={i} className="grid grid-cols-[1fr_1fr_40px] gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs font-bold" value={attr.attribute} onChange={e => { const n = [...(form.attributes||[])]; n[i]={...n[i],attribute:e.target.value}; setForm({...form,attributes:n}); }} placeholder="Ex: Peso, Sabor, Tamanho..." />
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" value={attr.value} onChange={e => { const n = [...(form.attributes||[])]; n[i]={...n[i],value:e.target.value}; setForm({...form,attributes:n}); }} placeholder="Ex: 500g, Morango, M" />
                          <button type="button" onClick={() => setForm({...form,attributes:(form.attributes||[]).filter((_,idx)=>idx!==i)})} className="w-10 h-10 rounded-lg bg-red-400/10 text-red-400 flex items-center justify-center hover:bg-red-400 hover:text-white transition-all"><Trash2 size={13} /></button>
                        </div>
                      ))}
                    </div>
                    {(!form.attributes || form.attributes.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 rounded-2xl bg-white/5 border border-dashed border-white/10">
                        <ClipboardList size={32} className="text-muted/30" />
                        <div>
                          <p className="text-[11px] font-black text-muted uppercase tracking-widest">Nenhum atributo</p>
                          <p className="text-[10px] text-muted/50 mt-1">Adicione características técnicas do produto</p>
                        </div>
                        <button type="button" onClick={() => setForm({...form,attributes:[{attribute:'',value:''}]})} className="px-4 py-2 rounded-xl bg-white/10 text-muted text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">+ Primeiro Atributo</button>
                      </div>
                    )}
                  </div>
                )}

                {modalTab === 'codigos' && (
                  <div className="space-y-8 animate-fade">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Código de Barras */}
                      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-full flex justify-center bg-white p-4 rounded-xl shadow-inner">
                          {form.ean ? (
                            <Barcode value={form.ean} format="EAN13" width={2} height={80} background="#ffffff" lineColor="#000000" />
                          ) : (
                            <div className="py-10 text-black/40 text-xs font-black uppercase tracking-widest">Nenhum EAN definido</div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">Código de Barras (EAN-13)</h4>
                          <p className="text-[10px] text-muted/60 mt-2 max-w-xs mx-auto">Utilizado para escaneamento em caixas de supermercado e leitores USB padrão.</p>
                        </div>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={() => window.print()}
                        >
                          <Printer size={14} /> Imprimir Etiqueta
                        </button>
                      </div>

                      {/* QR Code */}
                      <div className="p-8 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-48 h-48 bg-white p-4 rounded-xl shadow-inner flex items-center justify-center">
                          <QRCodeSVG 
                            value={`https://zullya.com.br/product/${form.id || form.sku || 'new'}`} 
                            size={160}
                            bgColor={"#ffffff"}
                            fgColor={"#000000"}
                            level={"Q"}
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white">QR Code do Produto</h4>
                          <p className="text-[10px] text-muted/60 mt-2 max-w-xs mx-auto">Escaneável por câmeras de celular para abrir o link direto do produto no e-commerce.</p>
                        </div>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={() => window.print()}
                        >
                          <Printer size={14} /> Imprimir QR Code
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === 'anexos' && (
                  <div className="space-y-8 animate-fade">
                    <div className="p-6 rounded-3xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center py-16 text-center space-y-4 relative group hover:border-primary/50 transition-all">
                      <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center text-muted group-hover:text-primary transition-colors border border-white/5">
                        <Paperclip size={24} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">Anexos Técnicos</h4>
                        <p className="text-[10px] text-muted/60 mt-1 max-w-sm mx-auto">Upload de laudos, manuais, FISPQ ou certificados. Formatos aceitos: PDF, DOCX, JPG (Max. 5MB)</p>
                      </div>
                      <button className="btn btn-primary btn-sm mt-2 relative overflow-hidden group/btn">
                        <span className="relative z-10 flex items-center gap-2"><Plus size={14} /> Selecionar Arquivo</span>
                      </button>
                    </div>

                    {(form.attachments || []).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-muted uppercase tracking-widest pl-2">Arquivos Anexados</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(form.attachments || []).map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{file.name}</p>
                                  <p className="text-[9px] text-muted">{file.size} • {file.date}</p>
                                </div>
                              </div>
                              <button className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors shrink-0">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {modalTab === 'historico' && (
                  <div className="space-y-8 animate-fade">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
                        <History size={18} className="text-primary" />
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Logs de Auditoria</h4>
                      </div>
                      
                      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                        {(!form.logs || form.logs.length === 0) ? (
                          <div className="text-center py-8 text-muted/50 text-[10px] uppercase tracking-widest font-bold">
                            Nenhum registro encontrado.
                          </div>
                        ) : (
                          form.logs.map((log, i) => (
                            <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#0f1115] bg-white/10 text-muted group-hover:text-primary group-hover:bg-primary/20 transition-colors shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-xl">
                                {log.action === 'create' ? <Plus size={14} /> : log.action === 'delete' ? <Trash2 size={14} /> : <Settings size={14} />}
                              </div>
                              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white/5 border border-white/5 shadow-xl transition-all hover:bg-white/10">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-white">{log.user}</span>
                                  <span className="text-[9px] text-muted font-mono">{log.date}</span>
                                </div>
                                <p className="text-[10px] text-muted/80 leading-relaxed">{log.details}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── OUTROS ─── */}
                {modalTab === 'outros' && (
                  <div className="space-y-8">
                    {/* Informações gerais */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5">
                      <h4 className="text-[10px] font-black text-muted uppercase tracking-widest border-b border-white/5 pb-3">Informações Gerais</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Unid. por Caixa</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" type="number" value={form.itemsPerBox||''} onChange={e=>setForm({...form,itemsPerBox:e.target.value})} placeholder="1" />
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Linha de Produto</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.productLine||''} onChange={e=>setForm({...form,productLine:e.target.value})} placeholder="Ex: Premium" />
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Garantia</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.guarantee||''} onChange={e=>setForm({...form,guarantee:e.target.value})} placeholder="Ex: 3 meses" />
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Permitir nas Vendas</label>
                          <select className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.allowInSales} onChange={e=>setForm({...form,allowInSales:e.target.value})}>
                            <option value="sim">Sim</option>
                            <option value="nao">Não</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Informações Tributárias Adicionais */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <ShieldCheck size={15} className="text-amber-400" />
                        <h4 className="text-[10px] font-black text-muted uppercase tracking-widest">Informações Tributárias Adicionais</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">GTIN/EAN Tributável</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs font-mono" value={form.eanTributavel||''} onChange={e=>setForm({...form,eanTributavel:e.target.value})} placeholder="Caixa, Fardo, Lote..." />
                          <p className="text-[9px] text-muted/40 mt-1">Para Caixa, Fardo, Lote</p>
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Unidade Tributável</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.tributaryUnit||''} onChange={e=>setForm({...form,tributaryUnit:e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Fator de Conversão</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" type="number" step="0.001" value={form.conversionFactor||''} onChange={e=>setForm({...form,conversionFactor:e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Cód. Enquadramento IPI</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.ipiCode||''} onChange={e=>setForm({...form,ipiCode:e.target.value})} placeholder="Ex: 999" />
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">Valor IPI Fixo (R$)</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" type="number" step="0.01" value={form.ipiFixed||''} onChange={e=>setForm({...form,ipiFixed:e.target.value})} placeholder="0,00" />
                          <p className="text-[9px] text-muted/40 mt-1">Tributação específica</p>
                        </div>
                        <div className="form-group">
                          <label className="text-[9px] font-bold text-muted/60 uppercase mb-2 block">EX-TIPI</label>
                          <input className="input-field h-10 bg-black/20 border-white/5 text-xs" value={form.extipi||''} onChange={e=>setForm({...form,extipi:e.target.value})} />
                        </div>
                      </div>
                    </div>

                    {/* Fornecedores */}
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Truck size={15} className="text-blue-400" />
                          <h4 className="text-[10px] font-black text-muted uppercase tracking-widest">Fornecedores</h4>
                        </div>
                        <button type="button" onClick={() => setForm({...form,suppliers:[...(form.suppliers||[]),{name:'',code:''}]})} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1"><Plus size={10} /> adicionar fornecedor</button>
                      </div>
                      {(form.suppliers||[]).length > 0 && (
                        <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-3 pb-1">
                          <span className="text-[9px] font-black text-muted uppercase tracking-widest">Nome</span>
                          <span className="text-[9px] font-black text-muted uppercase tracking-widest">Código no Fornecedor</span>
                          <span />
                        </div>
                      )}
                      <div className="space-y-2">
                        {(form.suppliers||[]).map((sup, i) => (
                          <div key={i} className="grid grid-cols-[1fr_1fr_40px] gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            <input className="input-field h-10 bg-black/20 border-white/5 text-xs" value={sup.name} onChange={e=>{const n=[...(form.suppliers||[])];n[i]={...n[i],name:e.target.value};setForm({...form,suppliers:n});}} placeholder="Nome do fornecedor" />
                            <input className="input-field h-10 bg-black/20 border-white/5 text-xs font-mono" value={sup.code} onChange={e=>{const n=[...(form.suppliers||[])];n[i]={...n[i],code:e.target.value};setForm({...form,suppliers:n});}} placeholder="Código no fornecedor" />
                            <button type="button" onClick={()=>setForm({...form,suppliers:(form.suppliers||[]).filter((_,idx)=>idx!==i)})} className="w-10 h-10 rounded-lg bg-red-400/10 text-red-400 flex items-center justify-center hover:bg-red-400 hover:text-white transition-all"><Trash2 size={13} /></button>
                          </div>
                        ))}
                        {(!form.suppliers||form.suppliers.length===0) && (
                          <div className="py-6 text-center text-[10px] text-muted/50 italic">Nenhum fornecedor vinculado</div>
                        )}
                      </div>
                    </div>

                    {/* Observações */}
                    <div className="form-group">
                      <label className="text-[10px] font-black text-muted uppercase tracking-widest mb-2 block">Observações Gerais (uso interno)</label>
                      <textarea className="input-field min-h-[120px] py-3 bg-white/5 border-white/10 text-xs" value={form.internalNotes||''} onChange={e=>setForm({...form,internalNotes:e.target.value})} placeholder="Informações de uso interno. Não é exibido para o cliente." />
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
          <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*" />
        </div>
      )}

      {/* Lightbox Preview */}
      {previewImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-8 bg-black/90 backdrop-blur-2xl animate-fade cursor-zoom-out" onClick={() => setPreviewImage(null)}>
          
          <div className="absolute top-8 right-8 flex items-center gap-4 z-50">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setForm({ 
                  ...form, 
                  images: (form.images || []).filter(img => img.url !== previewImage) 
                });
                setPreviewImage(null);
                toast.success('Foto removida');
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-full bg-black/70 text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white backdrop-blur-md shadow-2xl transition-all border border-red-500/30 hover:border-red-500"
            >
              <Trash2 size={16} strokeWidth={2.5} /> Remover Foto
            </button>
            
            <button className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/10">
              <X size={24} />
            </button>
          </div>
          
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center group" onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="w-full h-full object-contain rounded-3xl shadow-2xl border border-white/10 animate-zoom-in cursor-default" />
            
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] pointer-events-none">
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
