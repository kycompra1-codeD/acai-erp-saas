import { useState, useEffect, useRef } from 'react';
import { X, CreditCard, QrCode, Lock, ChevronRight, CheckCircle2, Loader2, ArrowLeft, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'https://api.zullya.com.br/api';

function authFetch(path, options = {}) {
  const token = localStorage.getItem('zullya_access_token');
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  }).then(r => r.json());
}

export default function CheckoutModal({ plan, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [cycle, setCycle] = useState('monthly');
  const [method, setMethod] = useState('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState(0);
  const [pixData, setPixData] = useState(null);
  const pollingRef = useRef(null);

  // Limpar polling ao fechar
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const price = cycle === 'yearly'
    ? (plan.valor_anual ?? plan.price * 12 * 0.8)
    : (plan.valor_mensal ?? plan.price);

  const priceFmt = parseFloat(price || 0).toFixed(2);
  const savings = cycle === 'yearly'
    ? (parseFloat(plan.valor_mensal ?? plan.price) * 12 * 0.2).toFixed(2)
    : 0;

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const periodo = cycle === 'yearly' ? 'anual' : 'mensal';
      const metodo  = method === 'credit_card' ? 'cartao' : 'pix';

      const res = await authFetch('/pagamentos/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plano_id: plan.id,
          periodo,
          metodo,
        }),
      });

      if (!res.sucesso) {
        toast.error(res.mensagem || 'Erro ao processar pagamento');
        setIsProcessing(false);
        return;
      }

      if (res.tipo === 'cartao') {
        // Redirecionar para Checkout Pro do Mercado Pago
        window.location.href = res.dados.init_point;
        return;
      }

      if (res.tipo === 'pix') {
        setPixData(res.dados);
        setIsProcessing(false);
        // Iniciar polling de status
        pollingRef.current = setInterval(async () => {
          const status = await authFetch(`/pagamentos/status/${res.dados.payment_id}`);
          if (status.dados?.status === 'approved') {
            clearInterval(pollingRef.current);
            setStep(4);
            ativarConta();
          }
        }, 4000);
      }
    } catch (err) {
      toast.error('Erro ao conectar com o servidor');
      setIsProcessing(false);
    }
  };

  const ativarConta = () => {
    let pStep = 0;
    const interval = setInterval(() => {
      pStep++;
      setProvisioningStep(pStep);
      if (pStep === 3) {
        clearInterval(interval);
        setTimeout(() => { onSuccess(plan.id); }, 1500);
      }
    }, 1000);
  };

  const copiarPix = () => {
    if (pixData?.qr_code) {
      navigator.clipboard.writeText(pixData.qr_code);
      toast.success('Código PIX copiado!');
    }
  };

  // Verificar retorno do MP Checkout Pro (URL params)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pagamento = params.get('pagamento');
    if (pagamento === 'aprovado') {
      setStep(4);
      ativarConta();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade">
      <div className="glass-card w-full max-w-2xl overflow-hidden flex flex-col relative bg-surface" style={{ padding: 0, minHeight: 500 }}>

        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface-2">
          <div className="flex items-center gap-4">
            {step > 1 && step < 4 && !pixData && (
              <button className="btn btn-ghost btn-icon" onClick={() => { setStep(step - 1); setPixData(null); }}>
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h2 className="font-bold text-lg">Checkout Seguro</h2>
              <p className="text-xs text-muted flex items-center gap-1">
                <Lock size={12} /> Pagamento processado pelo Mercado Pago
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={isProcessing || step === 4}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex">
          {/* Left Column */}
          <div className="flex-1 p-8">
            {step === 1 && (
              <div>
                <h3 className="font-bold mb-4 text-lg">Ciclo de Faturamento</h3>
                <div className="space-y-4">
                  <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${cycle === 'monthly' ? 'border-primary bg-primary-glow' : 'border-border hover:border-primary/50'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="cycle" checked={cycle === 'monthly'} onChange={() => setCycle('monthly')} className="w-4 h-4 accent-primary" />
                      <div>
                        <div className="font-bold">Mensal</div>
                        <div className="text-xs text-muted">Cancele quando quiser</div>
                      </div>
                    </div>
                    <div className="font-black">R$ {parseFloat(plan.valor_mensal ?? plan.price).toFixed(2)} /mês</div>
                  </label>

                  {(plan.valor_anual || plan.price) && (
                    <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${cycle === 'yearly' ? 'border-primary bg-primary-glow' : 'border-border hover:border-primary/50'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="cycle" checked={cycle === 'yearly'} onChange={() => setCycle('yearly')} className="w-4 h-4 accent-primary" />
                        <div>
                          <div className="font-bold flex items-center gap-2">Anual <span className="badge badge-success text-[10px]">-20% OFF</span></div>
                          <div className="text-xs text-success font-bold">Economize R$ {savings}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black">R$ {parseFloat(plan.valor_mensal ?? plan.price * 0.8).toFixed(2)} /mês</div>
                        <div className="text-[10px] text-muted">Cobrado R$ {priceFmt} anualmente</div>
                      </div>
                    </label>
                  )}
                </div>
                <button className="btn btn-primary w-full mt-8" onClick={() => setStep(2)}>
                  Continuar <ChevronRight size={16} />
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <h3 className="font-bold mb-4 text-lg">Método de Pagamento</h3>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${method === 'credit_card' ? 'border-primary bg-primary-glow' : 'border-border'}`}
                    onClick={() => setMethod('credit_card')}
                  >
                    <CreditCard size={32} className={`mb-2 ${method === 'credit_card' ? 'text-primary' : 'text-muted'}`} />
                    <span className="font-bold text-sm">Cartão de Crédito</span>
                    <span className="text-[10px] text-muted mt-1">Redirect seguro MP</span>
                  </button>
                  <button
                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all ${method === 'pix' ? 'border-success bg-success-bg' : 'border-border'}`}
                    onClick={() => setMethod('pix')}
                  >
                    <QrCode size={32} className={`mb-2 ${method === 'pix' ? 'text-success' : 'text-muted'}`} />
                    <span className="font-bold text-sm">PIX</span>
                    <span className="text-[10px] text-success font-bold mt-1">Aprovação imediata</span>
                  </button>
                </div>
                <button className="btn btn-primary w-full" onClick={() => setStep(3)}>
                  Prosseguir <ChevronRight size={16} />
                </button>
              </div>
            )}

            {step === 3 && method === 'credit_card' && (
              <div>
                <h3 className="font-bold mb-2 text-lg">Pagamento com Cartão</h3>
                <p className="text-sm text-muted mb-6">
                  Você será redirecionado para a página segura do Mercado Pago para inserir os dados do cartão.
                </p>
                <div style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Lock size={14} color="var(--success)" />
                    <p className="text-sm font-bold">Checkout 100% seguro</p>
                  </div>
                  <p className="text-xs text-muted">Seus dados de cartão são processados diretamente pelo Mercado Pago (PCI DSS Level 1). O Zullya ERP não armazena dados de pagamento.</p>
                </div>
                <button
                  className="btn btn-primary w-full btn-lg"
                  onClick={handleProcess}
                  disabled={isProcessing}
                >
                  {isProcessing ? <><Loader2 className="animate-spin" size={18}/> Redirecionando...</> : (
                    <><ExternalLink size={16}/> Ir para Checkout — R$ {priceFmt}</>
                  )}
                </button>
              </div>
            )}

            {step === 3 && method === 'pix' && !pixData && (
              <div className="flex flex-col items-center text-center">
                <h3 className="font-bold mb-2 text-lg">Pagar com PIX</h3>
                <p className="text-xs text-muted mb-6">Clique abaixo para gerar o QR Code PIX.</p>
                <button
                  className="btn btn-primary w-full btn-lg"
                  onClick={handleProcess}
                  disabled={isProcessing}
                >
                  {isProcessing ? <><Loader2 className="animate-spin" size={18}/> Gerando QR Code...</> : 'Gerar QR Code PIX'}
                </button>
              </div>
            )}

            {step === 3 && method === 'pix' && pixData && (
              <div className="flex flex-col items-center text-center">
                <h3 className="font-bold mb-2 text-lg">Escaneie o QR Code</h3>
                <p className="text-xs text-muted mb-4">Abra o app do seu banco e escaneie ou copie o código PIX.</p>
                <div className="p-3 bg-white rounded-xl mb-4 shadow-md border border-border inline-block">
                  {pixData.qr_code_base64 ? (
                    <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" style={{ width: 192, height: 192 }} />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                      <QrCode size={120} color="#000" />
                    </div>
                  )}
                </div>
                {pixData.qr_code && (
                  <button onClick={copiarPix} className="btn btn-outline w-full mb-3 flex items-center gap-2">
                    <Copy size={14} /> Copiar código PIX
                  </button>
                )}
                <div className="text-success font-bold flex items-center gap-2 animate-pulse text-sm">
                  <Loader2 className="animate-spin" size={14} /> Aguardando confirmação de pagamento...
                </div>
                <p className="text-xs text-muted mt-2">Esta página atualiza automaticamente.</p>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col items-center justify-center text-center h-full py-10">
                <div className="w-20 h-20 bg-success-bg rounded-full flex items-center justify-center mb-6 relative">
                  <CheckCircle2 size={40} className="text-success" />
                  {provisioningStep < 3 && (
                    <div className="absolute inset-0 border-4 border-success border-t-transparent rounded-full animate-spin opacity-20"></div>
                  )}
                </div>
                <h2 className="text-2xl font-black mb-2">Pagamento Confirmado!</h2>
                <p className="text-muted mb-8 text-sm">Sua assinatura <strong>{plan.nome || plan.name}</strong> foi ativada.</p>
                <div className="w-full max-w-xs space-y-3">
                  {[
                    'Ativando licença multi-tenant...',
                    'Liberando módulos do plano...',
                    'Finalizando configuração...',
                  ].map((label, i) => (
                    <div key={i} className={`flex items-center gap-3 text-xs transition-opacity ${provisioningStep >= i + 1 ? 'opacity-100 font-bold' : 'opacity-40'}`}>
                      {provisioningStep >= i + 1 ? <CheckCircle2 size={14} className="text-success" /> : <div className="w-3 h-3 rounded-full border border-muted" />}
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          <div className="w-64 bg-surface-2 p-6 border-l border-border hidden md:block">
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-muted">Resumo</h4>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded bg-primary-glow flex items-center justify-center text-xl">
                💎
              </div>
              <div>
                <div className="font-bold">{plan.nome || plan.name}</div>
                <div className="text-[10px] text-muted">Plano {cycle === 'yearly' ? 'Anual' : 'Mensal'}</div>
              </div>
            </div>

            <div className="space-y-3 text-sm border-b border-border pb-4 mb-4">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>R$ {cycle === 'yearly'
                  ? (parseFloat(plan.valor_mensal ?? plan.price) * 12).toFixed(2)
                  : parseFloat(plan.valor_mensal ?? plan.price).toFixed(2)}</span>
              </div>
              {cycle === 'yearly' && (
                <div className="flex justify-between text-success font-bold">
                  <span>Desconto (20%)</span>
                  <span>- R$ {savings}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-end">
              <span className="font-bold">Total</span>
              <span className="text-xl font-black text-primary">R$ {priceFmt}</span>
            </div>

            <div className="mt-8 text-center">
              <div className="text-[11px] font-bold text-muted border border-border rounded px-2 py-1 inline-block">
                🔒 Mercado Pago
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
