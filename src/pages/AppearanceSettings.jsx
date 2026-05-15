import React, { useState } from 'react';
import { useAppearance } from '../contexts/AppearanceContext';
import { Layout, Type, Droplet, Check, RefreshCw, Move } from 'lucide-react';
import toast from 'react-hot-toast';

const FONTS = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Playfair Display', value: "'Playfair Display', serif" },
  { name: 'Outfit', value: 'Outfit, sans-serif' },
];

const WIDGET_NAMES = {
  stats: 'Indicadores Rápidos',
  sales_chart: 'Gráfico de Vendas',
  recent_orders: 'Últimos Pedidos',
  inventory_alert: 'Alertas de Estoque',
  loyalty_summary: 'Resumo Fidelidade'
};

export default function AppearanceSettings() {
  const { currentTheme, updateTheme, updateColors, updateFont, presets, dashboardOrder, reorderDashboard } = useAppearance();
  const [activeTab, setActiveTab] = useState('themes');

  const handlePresetSelect = (preset) => {
    updateTheme(preset);
    toast.success(`Tema "${preset.name}" aplicado!`);
  };

  const handleColorChange = (key, value) => {
    updateColors({ [key]: value });
  };

  const moveWidget = (index, direction) => {
    const newOrder = [...dashboardOrder];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    reorderDashboard(newOrder);
  };

  return (
    <div className="animate-fade">
      <header className="page-header">
        <div>
          <h1 className="page-title">Personalização de Aparência</h1>
          <p className="page-subtitle">Ajuste o visual do seu ERP para combinar com sua marca e segmento.</p>
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={() => { 
            if (confirm('Deseja resetar TODOS os dados e o tema para o padrão de fábrica? Isso limpará configurações de unidades e branding antigo.')) {
              localStorage.removeItem('zullya_erp_theme'); 
              localStorage.removeItem('zullya_system_data');
              localStorage.removeItem('zullya_erp_dashboard_order');
              window.location.reload(); 
            }
          }}
        >
          <RefreshCw size={16} /> Resetar Sistema (Deep Repair)
        </button>
      </header>

      <div className="glass-card p-0 overflow-hidden">
        <nav className="flex border-b">
          <button 
            className={`px-6 py-4 font-semibold text-sm flex items-center gap-2 transition-all ${activeTab === 'themes' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'}`}
            onClick={() => setActiveTab('themes')}
          >
            <Layout /> Temas por Segmento
          </button>
          <button 
            className={`px-6 py-4 font-semibold text-sm flex items-center gap-2 transition-all ${activeTab === 'colors' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'}`}
            onClick={() => setActiveTab('colors')}
          >
            <Droplet /> Cores e Estilo
          </button>
          <button 
            className={`px-6 py-4 font-semibold text-sm flex items-center gap-2 transition-all ${activeTab === 'layout' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'}`}
            onClick={() => setActiveTab('layout')}
          >
            <Move /> Organização do Layout
          </button>
        </nav>

        <div className="p-6">
          {/* ABA DE TEMAS */}
          {activeTab === 'themes' && (
            <div className="grid-2">
              {Object.values(presets).map((preset) => (
                <div 
                  key={preset.id} 
                  className={`glass-card cursor-pointer transition-all ${currentTheme.id === preset.id ? 'border-primary ring-1 ring-primary' : ''}`}
                  onClick={() => handlePresetSelect(preset)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{preset.name}</h3>
                      <p className="text-xs text-muted">{preset.description}</p>
                    </div>
                    {currentTheme.id === preset.id && <div className="bg-primary text-white p-1 rounded-full"><Check /></div>}
                  </div>
                  
                  <div className="flex gap-2 mb-4">
                    <div className="w-8 h-8 rounded" style={{ background: preset.colors.primary }}></div>
                    <div className="w-8 h-8 rounded" style={{ background: preset.colors.accent }}></div>
                    <div className="w-8 h-8 rounded" style={{ background: preset.colors.surface, border: '1px solid #ddd' }}></div>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-2 border border-border text-xs italic">
                    Exemplo de texto com a fonte {preset.fontFamily.split(',')[0]}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ABA DE CORES */}
          {activeTab === 'colors' && (
            <div className="grid-2 gap-8">
              <div className="space-y-6">
                <h3 className="font-bold flex items-center gap-2"><Droplet className="text-primary" /> Paleta de Cores</h3>
                
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Cor Primária</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={currentTheme.colors.primary} 
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        className="w-10 h-10 border-0 bg-transparent cursor-pointer rounded"
                      />
                      <span className="text-xs font-mono">{currentTheme.colors.primary}</span>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Cor de Destaque (Accent)</label>
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={currentTheme.colors.accent} 
                        onChange={(e) => handleColorChange('accent', e.target.value)}
                        className="w-10 h-10 border-0 bg-transparent cursor-pointer rounded"
                      />
                      <span className="text-xs font-mono">{currentTheme.colors.accent}</span>
                    </div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Fundo (Background)</label>
                    <input 
                      type="color" 
                      value={currentTheme.colors.bg} 
                      onChange={(e) => handleColorChange('bg', e.target.value)}
                      className="w-full h-10 border-0 bg-transparent cursor-pointer rounded"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Superfície (Surface)</label>
                    <input 
                      type="color" 
                      value={currentTheme.colors.surface} 
                      onChange={(e) => handleColorChange('surface', e.target.value)}
                      className="w-full h-10 border-0 bg-transparent cursor-pointer rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-bold flex items-center gap-2"><Type className="text-primary" /> Tipografia</h3>
                
                <div className="grid-auto gap-3">
                  {FONTS.map(font => (
                    <button
                      key={font.value}
                      className={`btn ${currentTheme.fontFamily === font.value ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontFamily: font.value }}
                      onClick={() => updateFont(font.value)}
                    >
                      {font.name}
                    </button>
                  ))}
                </div>

                <div className="p-6 rounded-xl border border-border bg-surface mt-4">
                  <h4 className="mb-2" style={{ fontFamily: currentTheme.fontFamily }}>Preview de Texto</h4>
                  <p className="text-sm text-secondary" style={{ fontFamily: currentTheme.fontFamily }}>
                    Este é um exemplo de como os textos serão exibidos no seu sistema. 
                    A tipografia influencia diretamente na legibilidade e no tom de voz da sua marca.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABA DE LAYOUT */}
          {activeTab === 'layout' && (
            <div className="max-w-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold flex items-center gap-2"><Move className="text-primary" /> Reordenação da Dashboard</h3>
                <span className="badge badge-info">Arraste ou use as setas</span>
              </div>

              <div className="space-y-3">
                {dashboardOrder.map((widgetId, index) => (
                  <div 
                    key={widgetId} 
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-2 hover:border-primary-light transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-muted cursor-move"><Move /></div>
                      <span className="font-semibold">{WIDGET_NAMES[widgetId]}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-sm btn-secondary p-2" 
                        onClick={() => moveWidget(index, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary p-2" 
                        onClick={() => moveWidget(index, 1)}
                        disabled={index === dashboardOrder.length - 1}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 rounded-lg bg-info-bg text-info text-xs border border-info/20">
                <strong>Nota:</strong> A ordem definida aqui será aplicada automaticamente na página inicial do sistema para todos os usuários da sua empresa.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
