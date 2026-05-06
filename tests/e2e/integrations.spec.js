import { test, expect } from '@playwright/test';

test.describe('Açaí ERP SaaS - Hub de Integração', () => {
  
  test.beforeEach(async ({ page }) => {
    // Acessar a página de integrações
    await page.goto('/integrations');
  });

  test('Gerenciamento de Loja iFood (Abrir/Fechar)', async ({ page }) => {
    // 1. Localizar o card do iFood
    const ifoodCard = page.locator('.glass-card', { hasText: 'iFood' });
    await expect(ifoodCard).toBeVisible();

    // 2. Verificar status inicial (assume-se que começa fechado ou pegamos o estado atual)
    const toggleBtn = ifoodCard.locator('button', { has: page.locator('div[style*="border-radius: 50%"]') });
    const statusText = ifoodCard.locator('span', { hasText: /ABERTO|FECHADO/ });
    
    const initialState = await statusText.innerText();
    
    // 3. Clicar no toggle
    await toggleBtn.click();
    
    // 4. Verificar se mudou
    const newState = await statusText.innerText();
    expect(newState).not.toBe(initialState);
    await expect(page.locator('text=IFOOD agora está')).toBeVisible();
  });

  test('Isolamento Multi-Tenant (Unidade A vs Unidade B)', async ({ page }) => {
    // 1. Garantir que estamos na Unidade Matriz (padrão) e abrir a loja iFood
    const ifoodCard = page.locator('.glass-card', { hasText: 'iFood' });
    const statusText = ifoodCard.locator('span', { hasText: /ABERTO|FECHADO/ });
    const toggleBtn = ifoodCard.locator('button', { has: page.locator('div[style*="border-radius: 50%"]') });

    // Garantir que está ABERTO na Matriz
    if (await statusText.innerText() === 'FECHADO') {
      await toggleBtn.click();
    }
    await expect(statusText).toHaveText('ABERTO');

    // 2. Trocar de Unidade no TopBar
    const switcher = page.locator('button', { hasText: 'Unidade Matriz' });
    await switcher.click();
    
    const unit2 = page.locator('button', { hasText: 'Unidade 2' });
    await unit2.click();

    // 3. Verificar se na Unidade 2 o iFood está FECHADO (padrão inicial)
    await expect(statusText).toHaveText('FECHADO');

    // 4. Voltar para Matriz e ver se continua ABERTO
    await page.locator('button', { hasText: 'Unidade 2' }).click();
    await page.locator('button', { hasText: 'Unidade Matriz' }).click();
    await expect(statusText).toHaveText('ABERTO');
  });

  test('Criação de Regra de Automação', async ({ page }) => {
    // 1. Ir para aba de automação
    await page.locator('button', { hasText: 'Automações' }).click();

    // 2. Clicar em Nova Regra
    await page.locator('button', { hasText: 'Nova Regra' }).click();

    // 3. Selecionar modelo iFood
    const template = page.locator('button', { hasText: 'Auto-Aprovação iFood' });
    await expect(template).toBeVisible();
    await template.click();

    // 4. Verificar se a regra apareceu no grid
    await expect(page.locator('.glass-card', { hasText: 'Auto-Aprovação iFood' })).toBeVisible();
    await expect(page.locator('text=Regra "Auto-Aprovação iFood" criada!')).toBeVisible();
  });

  test('Visualização de Analytics de Canais', async ({ page }) => {
    // 1. Ir para aba de analytics
    await page.locator('button', { hasText: 'Analytics' }).click();

    // 2. Verificar se o gráfico de faturamento renderizou
    await expect(page.locator('text=Vendas por Canal')).toBeVisible();
    
    // 3. Verificar KPIs
    await expect(page.locator('text=Faturamento Total')).toBeVisible();
    await expect(page.locator('text=Ticket Médio')).toBeVisible();
    
    // 4. Verificar tabela comparativa
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=Líquido Estimado')).toBeVisible();
  });

});
