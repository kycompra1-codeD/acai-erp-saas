import { test, expect } from '@playwright/test';

test.describe('Zullya ERP - PDV e Vendas', () => {
  
  test('Fluxo completo: Adicionar item, pagar com dinheiro e aprovar', async ({ page }) => {
    // 1. Acessar o sistema e ir para o PDV
    await page.goto('/pos');
    
    // A página inicial pode ser o Dashboard, então navegamos explicitamente se necessário
    // Vamos garantir que estamos no PDV
    await expect(page.locator('text=Carrinho')).toBeVisible();

    // 2. Adicionar um produto ao carrinho (Pega o primeiro botão de produto ativo)
    const productButton = page.locator('button', { hasText: 'R$' }).first();
    await expect(productButton).toBeVisible();
    await productButton.click();

    // 3. Verifica se o produto foi para o carrinho e o botão "Cobrar" apareceu
    const cobrarButton = page.locator('button', { hasText: /Cobrar/ });
    await expect(cobrarButton).toBeVisible();
    await cobrarButton.click();

    // 4. Modal de Checkout (Gerenciador de Pagamento)
    // Selecionar "Dinheiro"
    const dinheiroOption = page.locator('button', { hasText: 'Dinheiro' });
    await expect(dinheiroOption).toBeVisible();
    await dinheiroOption.click();

    // Clicar em "Adicionar Pagamento" (supondo que o valor exato já venha preenchido)
    const addPaymentBtn = page.locator('button', { hasText: 'Adicionar Pagamento' });
    await addPaymentBtn.click();

    // 5. Finalizar Venda
    const finalizarBtn = page.locator('button', { hasText: 'Finalizar Venda' });
    await expect(finalizarBtn).toBeEnabled();
    await finalizarBtn.click();

    // 6. Verificar tela de sucesso
    await expect(page.locator('text=registrado!')).toBeVisible();
  });

  test('Teste de Stress / Carga de Renderização (Carrinho Grande)', async ({ page }) => {
    await page.goto('/pos');
    
    // Pega o primeiro produto
    const productButton = page.locator('button', { hasText: 'R$' }).first();
    await expect(productButton).toBeVisible();
    
    // Clica 50 vezes bem rápido para testar se a interface trava (Render Stress)
    for(let i=0; i<50; i++) {
      await productButton.click();
    }

    // Verifica se a UI do carrinho atualizou corretamente
    const badge = page.locator('.badge-primary').first();
    await expect(badge).toHaveText('50');
  });

});
