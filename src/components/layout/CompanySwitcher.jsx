import { useState } from 'react';
import { ChevronDown, Building2, Plus, Check } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function CompanySwitcher() {
  const { companies, activeCompanyId, switchCompany, activeCompany } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        className="flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all group"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: isOpen ? 'var(--surface-hover)' : 'var(--surface-2)',
          border: `1px solid ${isOpen ? 'var(--primary)' : 'var(--border)'}`,
          boxShadow: isOpen ? '0 0 20px rgba(124, 58, 237, 0.2)' : 'none',
          minWidth: '200px',
          cursor: 'pointer'
        }}
      >
        <div 
          className="flex items-center justify-center transition-all duration-300"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: isOpen ? 'var(--primary)' : 'var(--primary-glow)',
            color: isOpen ? 'white' : 'var(--primary-light)'
          }}
        >
          <Building2 size={16} />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p style={{ fontSize: '9px', fontWeight: '800', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px', opacity: 0.8 }}>Unidade</p>
          <p style={{ fontSize: '13px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeCompany?.name || 'Selecionar'}
          </p>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transition: 'transform 0.3s' }} className={isOpen ? 'rotate-180' : ''} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
            style={{ background: 'transparent' }}
          />
          <div 
            className="absolute top-full right-0 mt-4 z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300" 
            style={{ 
              width: '260px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border-light)',
              borderRadius: '14px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
               <div className="flex items-center justify-between">
                  <p style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', color: 'var(--primary-light)', letterSpacing: '0.12em' }}>Minhas Unidades</p>
                  <span className="badge badge-primary" style={{ fontSize: '8px', padding: '1px 5px' }}>{companies.length}</span>
               </div>
            </div>
            
            <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '6px' }} className="custom-scrollbar">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    switchCompany(company.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 transition-all text-left group/item"
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: activeCompanyId === company.id ? 'var(--primary-glow)' : 'transparent',
                    border: '1px solid',
                    borderColor: activeCompanyId === company.id ? 'rgba(124, 58, 237, 0.4)' : 'transparent',
                    marginBottom: '2px',
                    cursor: 'pointer'
                  }}
                >
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: activeCompanyId === company.id ? 'var(--primary)' : 'var(--surface-3)',
                      color: activeCompanyId === company.id ? 'white' : 'var(--text-muted)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Building2 size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '12px', fontWeight: '700', color: activeCompanyId === company.id ? 'var(--primary-light)' : 'var(--text)', marginBottom: '1px' }}>
                      {company.name}
                    </p>
                    <p style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{company.document}</p>
                  </div>
                  {activeCompanyId === company.id && (
                    <Check size={12} style={{ color: 'var(--primary-light)' }} strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>

            <div style={{ padding: '6px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
              <button 
                className="w-full flex items-center gap-2 transition-all text-left group/add"
                style={{
                  padding: '8px 10px',
                  borderRadius: '10px',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/settings';
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface-3)',
                  transition: 'all 0.2s'
                }}>
                  <Plus size={16} />
                </div>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '700', display: 'block', color: 'var(--text)' }}>Nova Unidade</span>
                  <span style={{ fontSize: '9px', display: 'block', opacity: 0.6 }}>Configurar filial</span>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
