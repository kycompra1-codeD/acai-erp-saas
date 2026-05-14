// ============================================================
// Serviço de E-mail — Resend SDK
// Requer: RESEND_API_KEY no .env
// Domínio verificado: zullya.com.br (configure em resend.com/domains)
// ============================================================

const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || 'Açaí ERP <noreply@zullya.com.br>';
const APP_URL = process.env.FRONTEND_URL || 'https://zullya.com.br';

async function enviar({ to, subject, html }) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY não configurado — e-mail não enviado:', subject);
    return { id: 'no-op' };
  }
  try {
    const r = await resend.emails.send({ from: FROM, to, subject, html });
    return r;
  } catch (err) {
    console.error('[email] Falha ao enviar:', err.message);
    throw err;
  }
}

// ── Templates HTML ──────────────────────────────────────────

function layoutBase(content) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#0f0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e0e0f0}
  .wrap{max-width:560px;margin:40px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2a2a4a}
  .header{background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px;text-align:center}
  .header h1{margin:0;font-size:26px;font-weight:800;color:#fff}
  .header p{margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8)}
  .body{padding:32px}
  .body p{line-height:1.7;color:#c0c0d8;margin:0 0 16px}
  .btn{display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:8px 0}
  .footer{padding:20px 32px;text-align:center;font-size:11px;color:#555}
  .divider{height:1px;background:#2a2a4a;margin:24px 0}
  .tag{display:inline-block;background:#7c3aed22;border:1px solid #7c3aed55;color:#a78bfa;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
</style></head>
<body><div class="wrap">${content}<div class="footer">© 2025 Açaí ERP SaaS · <a href="${APP_URL}" style="color:#7c3aed;text-decoration:none">zullya.com.br</a></div></div></body>
</html>`;
}

// ── Boas-vindas ─────────────────────────────────────────────
async function enviarBoasVindas({ email, nome, nomeEmpresa }) {
  const html = layoutBase(`
    <div class="header">
      <h1>🍇 Açaí ERP</h1>
      <p>Bem-vindo ao sistema</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${nome}</strong>!</p>
      <p>Sua empresa <strong>${nomeEmpresa}</strong> foi criada com sucesso no Açaí ERP. Você tem <strong>14 dias gratuitos</strong> para explorar todas as funcionalidades.</p>
      <p style="text-align:center">
        <a class="btn" href="${APP_URL}">Acessar o sistema</a>
      </p>
      <div class="divider"></div>
      <p style="font-size:13px">O que você pode fazer agora:</p>
      <p style="font-size:13px;color:#9090b0">
        ✅ Cadastrar seus produtos<br>
        ✅ Registrar vendas no PDV<br>
        ✅ Gerenciar estoque e fornecedores<br>
        ✅ Acompanhar o financeiro em tempo real
      </p>
    </div>`);

  return enviar({
    to: email,
    subject: `Bem-vindo ao Açaí ERP, ${nome}! 🍇`,
    html,
  });
}

// ── Redefinição de senha ─────────────────────────────────────
async function enviarRedefinicaoSenha({ email, nome, token }) {
  const link = `${APP_URL}/redefinir-senha?token=${token}`;
  const html = layoutBase(`
    <div class="header">
      <h1>🔐 Redefinir Senha</h1>
      <p>Açaí ERP · Segurança de conta</p>
    </div>
    <div class="body">
      <p>Olá, <strong>${nome}</strong>!</p>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
      <p style="text-align:center">
        <a class="btn" href="${link}">Redefinir minha senha</a>
      </p>
      <div class="divider"></div>
      <p style="font-size:12px;color:#666">Este link expira em <strong>1 hora</strong>. Se você não solicitou isso, ignore este e-mail — sua senha permanece a mesma.</p>
    </div>`);

  return enviar({
    to: email,
    subject: 'Redefinição de senha — Açaí ERP',
    html,
  });
}

module.exports = { enviarBoasVindas, enviarRedefinicaoSenha };
