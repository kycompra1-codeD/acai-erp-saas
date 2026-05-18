const cron = require('node-cron');
const { query } = require('../db/connection');
const { enviarLembreteTrialExpirando, enviarTrialExpirado } = require('./emailService');

// ============================================================
// Cron: Expiração de trial + lembretes automáticos
// Roda diariamente às 00:05 (horário do servidor / UTC)
// ============================================================

async function expirarTrials() {
  try {
    const { rows } = await query(`
      UPDATE tenants
      SET status = 'expirado', bloqueado_em = NOW(),
          motivo_bloqueio = 'Trial de 14 dias expirou sem assinatura'
      WHERE status = 'trial' AND trial_expira_em < NOW()
      RETURNING id, nome_empresa, email_contato
    `);

    if (rows.length > 0) {
      console.log(`⏰ Cron: ${rows.length} tenant(s) com trial expirado.`);
      for (const t of rows) {
        const usr = await query(
          `SELECT nome, email FROM usuarios WHERE tenant_id = $1 AND nivel_permissao = 'master' LIMIT 1`,
          [t.id]
        );
        if (usr.rows[0]) {
          await enviarTrialExpirado({
            email: usr.rows[0].email,
            nome: usr.rows[0].nome,
            nomeEmpresa: t.nome_empresa,
          }).catch(e => console.error('[cron] email expirado:', e.message));

          await query(
            `INSERT INTO trial_lembretes (tenant_id, tipo) VALUES ($1, 'expirado')
             ON CONFLICT (tenant_id, tipo) DO NOTHING`,
            [t.id]
          );
        }
      }
    }
  } catch (err) {
    console.error('❌ Cron expirar trials:', err.message);
  }
}

async function enviarLembretes() {
  const intervalos = [
    { dias: 7, tipo: 'D-7' },
    { dias: 3, tipo: 'D-3' },
    { dias: 1, tipo: 'D-1' },
  ];

  for (const { dias, tipo } of intervalos) {
    try {
      const { rows } = await query(`
        SELECT t.id, t.nome_empresa,
               u.nome, u.email
        FROM tenants t
        JOIN usuarios u ON u.tenant_id = t.id AND u.nivel_permissao = 'master'
        WHERE t.status = 'trial'
          AND DATE(t.trial_expira_em AT TIME ZONE 'America/Sao_Paulo')
              = (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo') + INTERVAL '${dias} days'
          AND NOT EXISTS (
            SELECT 1 FROM trial_lembretes tl
            WHERE tl.tenant_id = t.id AND tl.tipo = $1
          )
      `, [tipo]);

      for (const r of rows) {
        await enviarLembreteTrialExpirando({
          email: r.email,
          nome: r.nome,
          nomeEmpresa: r.nome_empresa,
          diasRestantes: dias,
        }).catch(e => console.error(`[cron] lembrete ${tipo}:`, e.message));

        await query(
          `INSERT INTO trial_lembretes (tenant_id, tipo) VALUES ($1, $2)
           ON CONFLICT (tenant_id, tipo) DO NOTHING`,
          [r.id, tipo]
        ).catch(() => {});
      }

      if (rows.length > 0) {
        console.log(`📧 Cron: ${rows.length} lembrete(s) ${tipo} enviado(s).`);
      }
    } catch (err) {
      console.error(`❌ Cron lembrete ${tipo}:`, err.message);
    }
  }
}

function iniciarCrons() {
  // Roda às 00:05 todos os dias (America/Sao_Paulo)
  cron.schedule('5 0 * * *', async () => {
    console.log('🕐 Cron diário iniciado...');
    await expirarTrials();
    await enviarLembretes();
  }, { timezone: 'America/Sao_Paulo' });

  console.log('⏰ Crons agendados: expiração de trial + lembretes (00:05 BRT)');
}

module.exports = { iniciarCrons };
