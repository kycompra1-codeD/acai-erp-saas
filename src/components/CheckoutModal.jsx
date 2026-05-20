import { useState, useEffect, useRef } from 'react';
import { X, CreditCard, QrCode, Lock, ChevronRight, CheckCircle2, Loader2, ArrowLeft, Copy, ExternalLink, Tag, Gift } from 'lucide-react';
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

function fmt(val) {
  return parseFloat(val || 0).toFixed(2).replace('.', ',');
}

export default function CheckoutModal({ plan, onClose, onSuccess, desconto = 0, acessoGratuito = false }) {
  const [step, setStep] = useState(1);
  const [cycle, setCycle] = useState('monthly');
  const [method, setMethod] = useState('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [provisioningStep, setProvisioningStep] = useState(0);
  const [pixData, setPixData] = useState(null);
  const pollingRef = useRef(null);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  // ── Cálculo de preços com desconto ──────────────────────────
  const valorMensal = parseFloat(plan.valor_mensal ?? 0);
  const valorAnual = parseFloat(plan.valor_anual ?? valorMensal * 12 * 0.8);

  const valorBase = cycle === 'yearly' ? valorAnual : valorMensal;
  const economiaAnual = (valorMensal * 12 - valorAnual).toFixed(2); // 20% OFF anual

  const temDesconto = desconto > 0 || acessoGratuito;
  const descontoPercent = acessoGratuito ? 100 : desconto;
  const valorFinal = acessoGratuito ? 0 : parseFloat((valorBase * (1 - desconto / 100)).toFixed(2));
  const economiaDesconto = parseFloat((valorBase - valorFinal).toFixed(2));

  // Preços por ciclo com desconto aplicado
  const precoMensalFinal = acessoGratuito ? 0 : parseFloat((valorMensal * (1 - desconto / 100)).toFixed(2));
  const precoAnualFinal = acessoGratuito ? 0 : parseFloat((valorAnual * (1 - desconto / 100)).toFixed(2));

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const periodo = cycle === 'yearly' ? 'anual' : 'mensal';
      const metodo  = method === 'credit_card' ? 'cartao' : 'pix';

      const res = await authFetch('/pagamentos/checkout', {
        method: 'POST',
        body: JSON.stringify({ plano_id: plan.id, periodo, metodo }),
      });

      if (!res.sucesso) {
        toast.error(res.mensagem || 'Erro ao processar pagamento');
        setIsProcessing(false);
        return;
      }

      // Acesso gratuito concedido pelo admin
      if (res.tipo === 'gratuito') {
        setStep(4);
        ativarConta();
        return;
      }

      if (res.tipo === 'cartao') {
        window.location.href = res.dados.init_point;
        return;
      }

      if (res.tipo === 'pix') {
        setPixData(res.dados);
        setIsProcessing(false);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pagamento') === 'aprovado') {
      setStep(4);
      ativarConta();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Banner de desconto especial (mostra em todos os steps exceto step 4)
  const DiscountBanner = () => {
    if (!temDesconto || step === 4) return null;
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(16,185,129,0.15))',
        border: '1px solid rgba(124,58,237,0.35)',
        borderRadius: 10, padding: '10px 14px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {acessoGratuito ? <Gift size={16} color="#10b981" /> : <Tag size={16} color="#7c3aed" />}
        <div style={{ flex: 1 }}>
          {acessoGratuito ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#10b981', margin: 0 }}>
                Acesso Gratuito Concedido
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                O Zullya ERP liberou este plano sem custo para você!
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#7c3aed', margin: 0 }}>
                {descontoPercent}% de desconto exclusivo aplicado!
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                Benefício especial concedido pelo Zullya ERP para sua empresa.
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

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
                <DiscountBanner />
                <h3 className="font-bold mb-4 text-lg">Ciclo de Faturamento</h3>
                <div className="space-y-4">
                  {/* Mensal */}
                  <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${cycle === 'monthly' ? 'border-primary bg-primary-glow' : 'border-border hover:border-primary/50'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="cycle" checked={cycle === 'monthly'} onChange={() => setCycle('monthly')} className="w-4 h-4 accent-primary" />
                      <div>
                        <div className="font-bold">Mensal</div>
                        <div className="text-xs text-muted">Cancele quando quiser</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {temDesconto && !acessoGratuito ? (
                        <div>
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 12, marginRight: 6 }}>
                            R$ {fmt(valorMensal)}
                          </span>
                          <span className="font-black" style={{ color: '#10b981' }}>R$ {fmt(precoMensalFinal)}/mês</span>
                        </div>
                      ) : acessoGratuito ? (
                        <div>
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 12, marginRight: 6 }}>
                            R$ {fmt(valorMensal)}
                          </span>
                          <span className="font-black" style={{ color: '#10b981' }}>Grátis</span>
                        </div>
                      ) : (
                        <div className="font-black">R$ {fmt(valorMensal)}/mês</div>
                      )}
                    </div>
                  </label>

                  {/* Anual */}
                  {valorAnual > 0 && (
                    <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${cycle === 'yearly' ? 'border-primary bg-primary-glow' : 'border-border hover:border-primary/50'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="cycle" checked={cycle === 'yearly'} onChange={() => setCycle('yearly')} className="w-4 h-4 accent-primary" />
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            Anual <span className="badge badge-success text-[10px]">-20% OFF</span>
                          </div>
                          <div className="text-xs text-success font-bold">
                            Economize R$ {fmt(economiaAnual)} no plano anual
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {temDesconto && !acessoGratuito ? (
                          <>
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 11, display: 'block' }}>
                              R$ {fmt(valorAnual)}
                            </span>
                            <span className="font-black" style={{ color: '#10b981' }}>R$ {fmt(precoAnualFinal)}</span>
                            <div className="text-[10px] text-muted">cobrado anualmente</div>
                          </>
                        ) : acessoGratuito ? (
                          <>
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 11, display: 'block' }}>
                              R$ {fmt(valorAnual)}
                            </span>
                            <span className="font-black" style={{ color: '#10b981' }}>Grátis</span>
                          </>
                        ) : (
                          <>
                            <div className="font-black">R$ {fmt(valorMensal * 0.8)}/mês</div>
                            <div className="text-[10px] text-muted">Cobrado R$ {fmt(valorAnual)} anualmente</div>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </div>
                <button className="btn btn-primary w-full mt-8" onClick={() => acessoGratuito ? handleProcess() : setStep(2)}>
                  {acessoGratuito ? (
                    isProcessing ? <><Loader2 className="animate-spin" size={18}/> Ativando...</> : <><Gift size={16}/> Ativar Gratuitamente</>
                  ) : (
                    <>Continuar <ChevronRight size={16} /></>
                  )}
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <DiscountBanner />
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
                <DiscountBanner />
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
                    <><ExternalLink size={16}/> Ir para Checkout — R$ {fmt(valorFinal)}</>
                  )}
                </button>
              </div>
            )}

            {step === 3 && method === 'pix' && !pixData && (
              <div className="flex flex-col items-center text-center">
                <DiscountBanner />
                <h3 className="font-bold mb-2 text-lg">Pagar com PIX</h3>
                <p className="text-xs text-muted mb-6">Clique abaixo para gerar o QR Code PIX.</p>
                <button
                  className="btn btn-primary w-full btn-lg"
                  onClick={handleProcess}
                  disabled={isProcessing}
                >
                  {isProcessing ? <><Loader2 className="animate-spin" size={18}/> Gerando QR Code...</> : `Gerar QR Code PIX — R$ ${fmt(valorFinal)}`}
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
                <h2 className="text-2xl font-black mb-2">
                  {acessoGratuito ? 'Plano Ativado!' : 'Pagamento Confirmado!'}
                </h2>
                <p className="text-muted mb-8 text-sm">
                  Sua assinatura <strong>{plan.nome || plan.name}</strong> foi ativada.
                </p>
                <div className="w-full max-w-xs space-y-3">
                  {['Ativando licença multi-tenant...', 'Liberando módulos do plano...', 'Finalizando configuração...'].map((label, i) => (
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
              <div className="w-10 h-10 rounded bg-primary-glow flex items-center justify-center text-xl">💎</div>
              <div>
                <div className="font-bold">{plan.nome || plan.name}</div>
                <div className="text-[10px] text-muted">Plano {cycle === 'yearly' ? 'Anual' : 'Mensal'}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm border-b border-border pb-4 mb-4">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>R$ {fmt(valorBase)}</span>
              </div>
              {cycle === 'yearly' && !temDesconto && (
                <div className="flex justify-between text-success font-bold">
                  <span>20% OFF Anual</span>
                  <span>- R$ {fmt(valorMensal * 12 * 0.2)}</span>
                </div>
              )}
              {acessoGratuito ? (
                <div className="flex justify-between font-bold" style={{ color: '#10b981' }}>
                  <span className="flex items-center gap-1"><Gift size={11}/> Acesso Gratuito</span>
                  <span>- R$ {fmt(valorBase)}</span>
                </div>
              ) : temDesconto ? (
                <div className="flex justify-between font-bold" style={{ color: '#7c3aed' }}>
                  <span className="flex items-center gap-1"><Tag size={11}/> Desconto ({descontoPercent}%)</span>
                  <span>- R$ {fmt(economiaDesconto)}</span>
                </div>
              ) : null}
            </div>

            <div className="flex justify-between items-end mb-2">
              <span className="font-bold">Total</span>
              <div className="text-right">
                {temDesconto && valorBase !== valorFinal && (
                  <div style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: 11 }}>
                    R$ {fmt(valorBase)}
                  </div>
                )}
                <span className="text-xl font-black" style={{ color: acessoGratuito ? '#10b981' : 'var(--primary-light)' }}>
                  {acessoGratuito ? 'R$ 0,00' : `R$ ${fmt(valorFinal)}`}
                </span>
              </div>
            </div>

            {temDesconto && !acessoGratuito && (
              <div style={{
                background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
                borderRadius: 8, padding: '6px 10px', marginTop: 8, textAlign: 'center',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', margin: 0 }}>
                  Você economiza R$ {fmt(economiaDesconto)}
                </p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: 0 }}>
                  Desconto exclusivo Zullya ERP
                </p>
              </div>
            )}

            {acessoGratuito && (
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 8, padding: '6px 10px', marginTop: 8, textAlign: 'center',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#10b981', margin: 0 }}>
                  Plano 100% Gratuito
                </p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', margin: 0 }}>
                  Cortesia exclusiva do Zullya ERP
                </p>
              </div>
            )}

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
