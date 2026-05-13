import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, Filter, Plus, Printer,
  FileText, CheckCircle, Package, Truck,
  MoreHorizontal, ShoppingCart, ScanLine, XCircle, CreditCard,
  ChevronRight, Barcode
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

const STATUS_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'em_aberto', label: 'Em Aberto', color: '#f59e0b' },
  { key: 'aprovado', label: 'Aprovado', color: '#3b82f6' },
  { key: 'preparando_envio', label: 'Preparando Envio', color: '#8b5cf6' },
  { key: 'faturado', label: 'Faturado', color: '#10b981' },
  { key: 'enviado', label: 'Enviado', color: '#0ea5e9' },
  { key: 'entregue', label: 'Entregue', color: '#64748b' },
];

export default function Sales() {
  const { orders, proposals, convertProposalToOrder, updateOrder } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('em_aberto');
  const [search, setSearch] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProposalsOpen, setIsProposalsOpen] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  
  // Efeito para leitor de código de barras USB (teclado)
  React.useEffect(() => {
    let timeout;
    const handleKeyDown = (e) => {
      // Ignorar se estiver digitando em um input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          handleScan(barcodeBuffer);
        }
        setBarcodeBuffer('');
      } else if (e.key.length === 1) { // é caractere imprimível
        setBarcodeBuffer(prev => prev + e.key);
      }

      // Limpar o buffer se demorar muito (uma pistola USB digita muito rápido)
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setBarcodeBuffer('');
      }, 100); // 100ms
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [barcodeBuffer]);

  // Inicializar leitor de câmera (QR/Barcode)
  React.useEffect(() => {
    if (isScannerOpen) {
      const scanner = new Html5QrcodeScanner('reader', { 
        qrbox: { width: 250, height: 250 }, 
        fps: 10 
      });
      scanner.render(
        (decodedText) => {
          handleScan(decodedText);
          setIsScannerOpen(false);
          scanner.clear();
        },
        (err) => { /* ignorar erros contínuos de não-leitura */ }
      );
      return () => {
        try { scanner.clear(); } catch(e){}
      };
    }
  }, [isScannerOpen]);

  const handleScan = (code) => {
    toast.success(`Código lido: ${code}`);
    setSearch(code); // Preenche a busca com o código
  };

  const handleEmitirNfe = (orderId) => {
    const toastId = toast.loading('Processando NFe na SEFAZ...');
    setTimeout(() => {
      updateOrder(orderId, { hasNfe: true, nfeNumber: Math.floor(Math.random() * 900000) + 100000 });
      toast.success('NFe emitida com sucesso!', { id: toastId });
    }, 2000);
  };
  
  // For demonstration, map POS/Orders statuses to the new Funnel Statuses,
  // or use an independent sales structure if desired.
  // We'll mock a sales list that combines e-commerce and internal orders for this view.
  const salesList = useMemo(() => {
    // This is a placeholder transformation to fit the Olist-style funnel
    // In production, these states would be saved on the backend
    if (!Array.isArray(orders)) return [];
    return orders.map(o => {
      let mappedStatus = 'em_aberto';
      if (o.status === 'ready') mappedStatus = 'aprovado';
      if (o.status === 'delivered') mappedStatus = 'entregue';
      
      return {
        ...o,
        salesStatus: mappedStatus,
        origin: o.type === 'delivery' ? 'iFood' : 'Balcão',
      };
    }).filter(o => {
      const matchStatus = activeTab === 'all' || o.salesStatus === activeTab;
      const matchSearch = search === '' ||
        (o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        String(o.number || '').includes(search);
      return matchStatus && matchSearch;
    });
  }, [orders, activeTab, search]);

  const counts = useMemo(() => {
    const c = {};
    if (Array.isArray(orders)) {
      orders.forEach(o => {
        let mappedStatus = 'em_aberto';
        if (o.status === 'ready') mappedStatus = 'aprovado';
        if (o.status === 'delivered') mappedStatus = 'entregue';
        c[mappedStatus] = (c[mappedStatus] || 0) + 1;
      });
    }
    return c;
  }, [orders]);

  return (
    <div className="animate-fade space-y-6">
      {/* Header Central de Vendas */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title flex items-center gap-3">
            <ShoppingCart className="text-primary-light" size={28} />
            Central de Vendas
          </h1>
          <p className="page-subtitle mt-1">Gerencie todos os pedidos do ERP, E-commerce e PDV em um único funil.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-sm font-bold" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir Relatório
          </button>
          <button className="btn btn-primary btn-sm font-bold" onClick={() => navigate('/pos')}>
            <Plus size={16} /> Incluir Pedido (PDV)
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => toast('Opções extras (em breve)', { icon: '🚧' })}>
            Mais ações <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="glass-card bg-surface p-0 overflow-hidden border border-border">
        {/* Barra de Pesquisa Superior */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Pesquise por cliente, número do pedido ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field w-full pl-10 h-10 bg-surface-2 border-border"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button className="btn btn-secondary h-10 text-sm whitespace-nowrap" onClick={() => toast('Filtro de período (em breve)', { icon: '🚧' })}>
              <Filter size={16} /> Últimos 30 dias
            </button>
            <button className="btn btn-ghost h-10 text-sm whitespace-nowrap" onClick={() => toast('Filtros avançados (em breve)', { icon: '🚧' })}>
              <Filter size={16} /> Filtros Avançados
            </button>
            <button className="btn btn-ghost h-10 text-sm text-danger whitespace-nowrap" onClick={() => setSearch('')}>
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Abas Horizontais Olist Style */}
        <div className="flex overflow-x-auto hide-scrollbar border-b border-border bg-surface-2/30">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-6 py-4 text-sm font-bold whitespace-nowrap flex items-center gap-2 border-b-2 transition-all
                ${activeTab === tab.key 
                  ? 'border-primary-light text-primary-light bg-primary/5' 
                  : 'border-transparent text-muted hover:text-white hover:bg-surface-3'
                }
              `}
            >
              {tab.label}
              {tab.key !== 'all' && counts[tab.key] > 0 && (
                <span style={{
                  background: activeTab === tab.key ? tab.color : 'var(--surface-3)',
                  color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
                  borderRadius: 99, fontSize: 10, padding: '2px 8px',
                }}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
          <button className="px-6 py-4 text-sm font-bold text-muted hover:text-white flex items-center gap-1 border-b-2 border-transparent" onClick={() => toast('Mais status (em breve)', { icon: '🚧' })}>
            Mais <MoreHorizontal size={14} />
          </button>
        </div>

        {/* Conteúdo da Tabela / Lista */}
        <div className="min-h-[400px] flex flex-col relative">
          
          {/* Se houver resultados, mostramos a lista. Caso contrário, Empty State. */}
          {salesList.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-2 border-b border-border text-xs uppercase tracking-wider text-muted">
                    <th className="p-4 font-bold">Nº Pedido</th>
                    <th className="p-4 font-bold">Data</th>
                    <th className="p-4 font-bold">Cliente</th>
                    <th className="p-4 font-bold">Origem</th>
                    <th className="p-4 font-bold">Total</th>
                    <th className="p-4 font-bold text-center">Status Fiscal</th>
                    <th className="p-4 font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {salesList.map((order, idx) => (
                    <tr key={order.id || idx} className="hover:bg-surface-2/50 transition-colors group">
                      <td className="p-4 font-bold text-white">#{String(order.number || 0).padStart(4, '0')}</td>
                      <td className="p-4 text-sm text-muted">
                        {order.createdAt ? format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                      </td>
                      <td className="p-4 font-medium text-white">
                        {order.customerName || 'Consumidor Final'}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-surface-3 rounded text-xs font-bold text-muted border border-border">
                          {order.origin}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-primary-light">
                        R$ {Number(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        {order.hasNfe ? (
                          <div className="flex flex-col items-center">
                            <span className="px-2 py-1 bg-success/20 text-success rounded text-[10px] font-black uppercase tracking-wider">Autorizado</span>
                            <span className="text-xs text-muted mt-1">#{order.nfeNumber}</span>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleEmitirNfe(order.id)}
                            className="btn btn-xs bg-surface-3 border-border hover:border-primary hover:text-primary-light"
                          >
                            <FileText size={12} className="mr-1" /> Emitir NFe
                          </button>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button className="btn btn-ghost btn-sm px-2 text-muted hover:text-white" onClick={() => navigate('/orders')}>
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Olist-style Empty State */
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="max-w-md w-full mx-auto p-8 rounded-2xl border border-warning/30 bg-warning/5 flex flex-col items-center text-center">
                <Search size={48} className="text-warning opacity-50 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Sua pesquisa não retornou resultados.</h3>
                <p className="text-muted text-sm mb-6">
                  Tente outras opções de pesquisa, situações ou remova os filtros atuais para visualizar mais pedidos nesta etapa.
                </p>
                <div className="flex gap-3">
                  <button className="btn btn-primary px-6" onClick={() => setSearch('')}>
                    Alterar pesquisa
                  </button>
                  <button className="btn btn-secondary px-6" onClick={() => { setSearch(''); setActiveTab('all'); }}>
                    Limpar filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer / Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="glass-card bg-surface-2 p-5 border border-border hover:border-primary-light/50 transition-all cursor-pointer group flex items-center justify-between">
          <div>
            <h4 className="font-bold text-white group-hover:text-primary-light transition-colors">Leitor de Código de Barras</h4>
            <p className="text-xs text-muted mt-1">Conecte uma pistola USB para bipar itens.</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-primary-light">
            <Barcode size={20} />
          </div>
        </div>
        
        <div 
          className="glass-card bg-surface-2 p-5 border border-border hover:border-accent/50 transition-all cursor-pointer group flex items-center justify-between"
          onClick={() => setIsScannerOpen(true)}
        >
          <div>
            <h4 className="font-bold text-white group-hover:text-accent transition-colors">Câmera Celular (QR Code)</h4>
            <p className="text-xs text-muted mt-1">Habilite a câmera para escaneamento rápido.</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-accent">
            <ScanLine size={20} />
          </div>
        </div>
        
        <div 
          className="glass-card bg-surface-2 p-5 border border-border hover:border-success/50 transition-all cursor-pointer group flex items-center justify-between"
          onClick={() => setIsProposalsOpen(true)}
        >
          <div>
            <h4 className="font-bold text-white group-hover:text-success transition-colors">Importar Orçamentos</h4>
            <p className="text-xs text-muted mt-1">Converta propostas do CRM em vendas reais.</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center text-success relative">
            <Package size={20} />
            {proposals.filter(p => p.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow shadow-danger/50 animate-pulse">
                {proposals.filter(p => p.status === 'pending').length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal Leitor de Câmera */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-surface border border-border w-full max-w-md overflow-hidden relative">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ScanLine size={18} className="text-accent" />
                Escaneamento por Câmera
              </h3>
              <button 
                className="text-muted hover:text-white transition-colors"
                onClick={() => setIsScannerOpen(false)}
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-4 flex flex-col items-center">
              <div id="reader" className="w-full bg-black rounded-xl overflow-hidden" style={{ minHeight: '300px' }}></div>
              <p className="text-xs text-muted mt-4 text-center">
                Aponte a câmera para o QR Code ou Código de Barras do produto. A leitura é automática.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Orçamentos do CRM */}
      {isProposalsOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-surface border border-border w-full max-w-2xl overflow-hidden relative">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Package size={18} className="text-success" />
                Propostas em Aberto (CRM)
              </h3>
              <button 
                className="text-muted hover:text-white transition-colors"
                onClick={() => setIsProposalsOpen(false)}
              >
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {proposals.filter(p => p.status === 'pending').length === 0 ? (
                <div className="text-center py-10 text-muted">
                  Nenhuma proposta pendente no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.filter(p => p.status === 'pending').map(prop => (
                    <div key={prop.id} className="p-4 rounded-xl border border-border bg-surface-2 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white">#{String(prop.number).padStart(3, '0')} - {prop.customerName}</h4>
                        <p className="text-xs text-muted mt-1">
                          {prop.items?.length} itens • Válido até {prop.expiryDate ? format(new Date(prop.expiryDate), 'dd/MM/yyyy') : '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-success">
                          R$ {prop.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <button 
                          onClick={() => {
                            convertProposalToOrder(prop.id);
                            toast.success('Pedido criado na Central de Vendas!');
                            setIsProposalsOpen(false);
                          }}
                          className="btn btn-sm btn-primary"
                        >
                          Gerar Pedido
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
