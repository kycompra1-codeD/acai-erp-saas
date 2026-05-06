import { useState } from 'react';
import { X, CreditCard, QrCode, Lock, ChevronRight, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CheckoutModal({ plan, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [cycle, setCycle] = useState('monthly');
  const [method, setMethod] = useState('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState(0);

  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const formatCardNumber = (val) => {
    const v = val.replace(/\D/g, '');
    const match = v.match(/.{1,4}/g);
    return match ? match.join(' ').substring(0, 19) : v;
  };

  const formatExpiry = (val) => {
    const v = val.replace(/\D/g, '');
    if (v.length >= 3) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  const isFormValid = cardNumber.length >= 16 && cardName.length > 3 && cardExpiry.length === 5 && cardCvc.length >= 3;

  const price = cycle === 'yearly' ? (plan.price * 12 * 0.8).toFixed(2) : plan.price.toFixed(2);
  const savings = cycle === 'yearly' ? (plan.price * 12 * 0.2).toFixed(2) : 0;

  const handleProcess = () => {
    setIsProcessing(true);
    
    // Simulação de Falha de Pagamento
    if (method === 'credit_card' && cardNumber.endsWith('0000')) {
      setTimeout(() => {
        setIsProcessing(false);
        toast.error('Pagamento Recusado: Saldo insuficiente ou cartão bloqueado.', {
          duration: 4000,
          icon: '💳'
        });
      }, 2000);
      return;
    }

    // Fluxo de Sucesso
    setTimeout(() => {
      setIsProcessing(false);
      setStep(4); // Success step
      
      // Simulação de Webhook / Provisionamento
      let pStep = 0;
      const interval = setInterval(() => {
        pStep++;
        setProvisioningStep(pStep);
        if (pStep === 3) {
          clearInterval(interval);
          setTimeout(() => {
            onSuccess(plan.id);
          }, 1500);
        }
      }, 1000);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade">
      <div className="glass-card w-full max-w-2xl overflow-hidden flex flex-col relative bg-surface" style={{ padding: 0, minHeight: 500 }}>
        
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface-2">
          <div className="flex items-center gap-4">
            {step > 1 && step < 4 && (
              <button className="btn btn-ghost btn-icon" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="font-bold text-lg">Checkout Seguro</h2>
              <p className="text-xs text-muted flex items-center gap-1">
                <Lock size={12} /> Criptografia Ponta a Ponta
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={isProcessing || step === 4}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex">
          {/* Left Column: Flow */}
          <div className="flex-1 p-8">
            {step === 1 && (
              <div className="animate-fade-in slide-in-from-right">
                <h3 className="font-bold mb-4 text-lg">Selecione o Ciclo de Faturamento</h3>
                <div className="space-y-4">
                  <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${cycle === 'monthly' ? 'border-primary bg-primary-glow' : 'border-border hover:border-primary/50'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="cycle" checked={cycle === 'monthly'} onChange={() => setCycle('monthly')} className="w-4 h-4 accent-primary" />
                      <div>
                        <div className="font-bold">Mensal</div>
                        <div className="text-xs text-muted">Cancele quando quiser</div>
                      </div>
                    </div>
                    <div className="font-black">R$ {plan.price.toFixed(2)} /mês</div>
                  </label>

                  <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${cycle === 'yearly' ? 'border-primary bg-primary-glow' : 'border-border hover:border-primary/50'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="cycle" checked={cycle === 'yearly'} onChange={() => setCycle('yearly')} className="w-4 h-4 accent-primary" />
                      <div>
                        <div className="font-bold flex items-center gap-2">Anual <span className="badge badge-success text-[10px]">-20% OFF</span></div>
                        <div className="text-xs text-success font-bold">Economize R$ {savings}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black">R$ {(plan.price * 0.8).toFixed(2)} /mês</div>
                      <div className="text-[10px] text-muted">Cobrado R$ {price} anualmente</div>
                    </div>
                  </label>
                </div>
                <button className="btn btn-primary w-full mt-8" onClick={() => setStep(2)}>
                  Continuar para Pagamento <ChevronRight size={16} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in slide-in-from-right">
                <h3 className="font-bold mb-4 text-lg">Método de Pagamento</h3>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button 
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${method === 'credit_card' ? 'border-primary bg-primary-glow' : 'border-border'}`}
                    onClick={() => setMethod('credit_card')}
                  >
                    <CreditCard size={32} className={`mb-2 ${method === 'credit_card' ? 'text-primary' : 'text-muted'}`} />
                    <span className="font-bold text-sm">Cartão de Crédito</span>
                  </button>
                  <button 
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${method === 'pix' ? 'border-success bg-success-bg' : 'border-border'}`}
                    onClick={() => setMethod('pix')}
                  >
                    <QrCode size={32} className={`mb-2 ${method === 'pix' ? 'text-success' : 'text-muted'}`} />
                    <span className="font-bold text-sm">PIX Instantâneo</span>
                    <span className="text-[10px] text-success font-bold mt-1">Aprovação imediata</span>
                  </button>
                </div>
                <button className="btn btn-primary w-full" onClick={() => setStep(3)}>
                  Prosseguir <ChevronRight size={16} />
                </button>
              </div>
            )}

            {step === 3 && method === 'credit_card' && (
              <div className="animate-fade-in slide-in-from-right">
                <h3 className="font-bold mb-4 text-lg">Dados do Cartão</h3>
                <div className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">Número do Cartão</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                      <input 
                        type="text" 
                        className="input-field pl-10" 
                        placeholder="0000 0000 0000 0000" 
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nome no Cartão</label>
                    <input 
                      type="text" 
                      className="input-field uppercase" 
                      placeholder="Ex: MARCOS A SILVA" 
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">Validade</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="MM/AA" 
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVC</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="123" 
                        maxLength={4}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px dashed var(--border)', marginTop: '20px' }}>
                  <p className="text-xs text-muted mb-1 font-bold">💳 Modo de Teste</p>
                  <p className="text-xs text-muted">A aprovação do cartão será simulada localmente. Você pode digitar qualquer cartão válido para testar o fluxo de <strong>Confirmação</strong>.</p>
                </div>
                <button 
                  className="btn btn-primary w-full mt-6 btn-lg" 
                  onClick={handleProcess} 
                  disabled={isProcessing || !isFormValid}
                >
                  {isProcessing ? <><Loader2 className="animate-spin" size={18}/> Conectando com Stripe...</> : `Pagar R$ ${price}`}
                </button>
              </div>
            )}

            {step === 3 && method === 'pix' && (
              <div className="animate-fade-in slide-in-from-right flex flex-col items-center text-center">
                <h3 className="font-bold mb-2 text-lg">Escaneie o QR Code</h3>
                <p className="text-xs text-muted mb-6">Abra o app do seu banco e escaneie ou copie o código PIX.</p>
                <div className="p-2 bg-white rounded-xl mb-6 shadow-md border border-border inline-block">
                   <div className="w-48 h-48 flex items-center justify-center bg-[var(--surface-3)] relative overflow-hidden">
                     <QrCode size={150} color="#000" />
                     {isProcessing && (
                       <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                         <Loader2 className="animate-spin text-success" size={32} />
                       </div>
                     )}
                   </div>
                </div>
                {!isProcessing ? (
                  <button className="btn btn-outline w-full mb-4" onClick={handleProcess}>
                     <CheckCircle2 size={16} className="text-success" /> Confirmar Pagamento do PIX (Simular)
                  </button>
                ) : (
                   <div className="text-success font-bold flex items-center gap-2 animate-pulse mb-4">
                     <Loader2 className="animate-spin" size={16} /> Processando webhook do PIX...
                   </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="animate-scale-in flex flex-col items-center justify-center text-center h-full py-10">
                <div className="w-20 h-20 bg-success-bg rounded-full flex items-center justify-center mb-6 relative">
                  <CheckCircle2 size={40} className="text-success" />
                  {provisioningStep < 3 && (
                    <div className="absolute inset-0 border-4 border-success border-t-transparent rounded-full animate-spin opacity-20"></div>
                  )}
                </div>
                <h2 className="text-2xl font-black mb-2">Pagamento Confirmado!</h2>
                <p className="text-muted mb-8 text-sm">Sua assinatura <strong>{plan.name}</strong> foi identificada.</p>
                
                <div className="w-full max-w-xs space-y-3">
                  <div className={`flex items-center gap-3 text-xs transition-opacity ${provisioningStep >= 1 ? 'opacity-100 font-bold' : 'opacity-40'}`}>
                    {provisioningStep >= 1 ? <CheckCircle2 size={14} className="text-success" /> : <div className="w-3 h-3 rounded-full border border-muted" />}
                    <span>Ativando licença multi-tenant...</span>
                  </div>
                  <div className={`flex items-center gap-3 text-xs transition-opacity ${provisioningStep >= 2 ? 'opacity-100 font-bold' : 'opacity-40'}`}>
                    {provisioningStep >= 2 ? <CheckCircle2 size={14} className="text-success" /> : <div className="w-3 h-3 rounded-full border border-muted" />}
                    <span>Liberando módulos de {plan.id === 'starter' ? 'base' : 'alta'} performance...</span>
                  </div>
                  <div className={`flex items-center gap-3 text-xs transition-opacity ${provisioningStep >= 3 ? 'opacity-100 font-bold' : 'opacity-40'}`}>
                    {provisioningStep >= 3 ? <CheckCircle2 size={14} className="text-success" /> : <div className="w-3 h-3 rounded-full border border-muted" />}
                    <span>Finalizando configuração do Hub...</span>
                  </div>
                </div>

                <div className="mt-8 text-[10px] text-muted flex items-center gap-2">
                   <Loader2 size={10} className="animate-spin" /> Aguardando redirecionamento...
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <div className="w-64 bg-surface-2 p-6 border-l border-border hidden md:block">
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted">Resumo do Pedido</h4>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded bg-primary-glow flex items-center justify-center">
                 <plan.icon size={20} className="text-primary" />
              </div>
              <div>
                <div className="font-bold">{plan.name}</div>
                <div className="text-[10px] text-muted">Plano {cycle === 'yearly' ? 'Anual' : 'Mensal'}</div>
              </div>
            </div>

            <div className="space-y-3 text-sm border-b border-border pb-4 mb-4">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>R$ {cycle === 'yearly' ? (plan.price * 12).toFixed(2) : plan.price.toFixed(2)}</span>
              </div>
              {cycle === 'yearly' && (
                <div className="flex justify-between text-success font-bold">
                  <span>Desconto (20%)</span>
                  <span>- R$ {savings}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-end">
              <span className="font-bold">Total a Pagar</span>
              <span className="text-xl font-black text-primary">R$ {price}</span>
            </div>
            
            <div className="mt-8 flex gap-2 grayscale opacity-40 justify-center">
              {/* Fake Logos for Trust */}
              <div className="text-[10px] font-bold border rounded px-2">STRIPE</div>
              <div className="text-[10px] font-bold border rounded px-2">MERCADO PAGO</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
