import { useState, useEffect } from 'react';
import { X, DollarSign, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

export function CashierModal({ isOpen, onClose }) {
  const { cashier, openCashier, closeCashier, employees } = useApp();
  
  const [operator, setOperator] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [finalAmount, setFinalAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setOperator('');
      setInitialAmount('');
      setFinalAmount('');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpen = (e) => {
    e.preventDefault();
    if (!operator || !initialAmount) {
      toast.error('Preencha o operador e o valor inicial');
      return;
    }
    openCashier(initialAmount, operator);
    toast.success('Caixa aberto com sucesso!');
    onClose();
  };

  const handleCloseCashier = (e) => {
    e.preventDefault();
    if (!finalAmount) {
      toast.error('Informe o saldo final em caixa');
      return;
    }
    closeCashier(finalAmount, notes);
    toast.success('Caixa fechado com sucesso!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade">
      <div className="bg-surface-1 border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {cashier?.isOpen ? <Unlock className="text-success" size={20} /> : <Lock className="text-danger" size={20} />}
            {cashier?.isOpen ? 'Fechamento de Caixa' : 'Abertura de Caixa'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6">
          {!cashier?.isOpen ? (
            <form onSubmit={handleOpen} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Operador do Caixa</label>
                <select 
                  className="input-field" 
                  value={operator} 
                  onChange={e => setOperator(e.target.value)}
                >
                  <option value="">Selecione o operador...</option>
                  {employees?.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                  <option value="Admin">Administrador (Admin)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fundo de Troco Inicial (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><DollarSign size={16} /></span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className="input-field pl-9" 
                    placeholder="0.00" 
                    value={initialAmount} 
                    onChange={e => setInitialAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="btn btn-primary w-full py-3 text-lg font-bold">
                  Abrir Caixa
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCloseCashier} className="space-y-4">
              <div className="bg-surface-2 p-4 rounded-xl mb-6">
                <h3 className="text-sm font-bold text-muted mb-3 uppercase tracking-wider">Resumo do Turno</h3>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-sm text-muted">Operador</span>
                  <span className="font-medium text-white">{cashier.operatorName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-sm text-muted">Fundo Inicial</span>
                  <span className="font-medium text-white">R$ {cashier.initialBalance?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-sm text-muted">Vendas Registradas</span>
                  <span className="font-medium text-white">{cashier.salesCount}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-muted">Saldo Esperado em Gaveta (Dinheiro)</span>
                  <span className="font-bold text-success">R$ {cashier.currentBalance?.toFixed(2)}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Saldo Real em Gaveta (Informado)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"><DollarSign size={16} /></span>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className="input-field pl-9 border-danger" 
                    placeholder="0.00" 
                    value={finalAmount} 
                    onChange={e => setFinalAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Observações de Fechamento (Opcional)</label>
                <textarea 
                  className="input-field" 
                  placeholder="Justifique diferenças de valor, sangrias, etc." 
                  rows={2}
                  value={notes} 
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              <div className="pt-4">
                <button type="submit" className="btn btn-danger w-full py-3 text-lg font-bold">
                  Finalizar Turno e Fechar Caixa
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
