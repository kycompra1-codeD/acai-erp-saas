import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEME_PRESETS } from '../data/themePresets';

const AppearanceContext = createContext();

export function AppearanceProvider({ children }) {
  // Estado inicial recuperado do localStorage ou preset padrão
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('zullya_erp_theme');
    let theme = saved ? JSON.parse(saved) : THEME_PRESETS.zullya;
    
    // MIGRATION: Se o tema for o 'acai' mas tiver as cores antigas (azuladas), força o reset para o novo preset
    if (theme.colors?.bg === '#0F172A' || theme.colors?.bg === '#1a1a1a') {
      console.log('Migrando cores do tema legado para o novo Zullya ERP...');
      theme = THEME_PRESETS.zullya;
    }
    
    return theme;
  });

  const [dashboardOrder, setDashboardOrder] = useState(() => {
    const saved = localStorage.getItem('zullya_erp_dashboard_order');
    return saved ? JSON.parse(saved) : ['stats', 'sales_chart', 'recent_orders', 'inventory_alert', 'loyalty_summary'];
  });

  // Aplicar variáveis CSS dinamicamente
  useEffect(() => {
    const root = document.documentElement;
    const colors = currentTheme.colors;

    // Injeção de cores primárias e secundárias
    Object.entries(colors).forEach(([key, value]) => {
      // Converte camelCase para kebab-case e também lida com números (ex: surface2 -> surface-2)
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').replace(/(\d+)/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    // Derivados e casos especiais
    if (colors.primary) {
      root.style.setProperty('--primary-glow', `${colors.primary}33`); // 20% opacidade
      root.style.setProperty('--shadow-primary', `0 10px 15px -3px ${colors.primary}4D`);
    }

    if (colors.accent) {
      root.style.setProperty('--accent-glow', `${colors.accent}33`);
    }

    if (colors.border) {
      root.style.setProperty('--border-light', colors.border.includes('rgba') 
        ? colors.border.replace('0.1', '0.2').replace('0.05', '0.1')
        : `${colors.border}66`
      );
    }

    if (colors.surface) {
      root.style.setProperty('--surface-hover', colors.surface); // Fallback
    }

    // Casos especiais de cor de texto e bordas baseadas no tema
    if (colors.text) root.style.setProperty('--text', colors.text);
    if (colors.textSecondary) root.style.setProperty('--text-secondary', colors.textSecondary);
    if (colors.border) root.style.setProperty('--border', colors.border);
    
    // Tipografia
    root.style.setProperty('--font-family-main', currentTheme.fontFamily);
    document.body.style.fontFamily = currentTheme.fontFamily;

    // Salvar no localStorage
    localStorage.setItem('zullya_erp_theme', JSON.stringify(currentTheme));
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('zullya_erp_dashboard_order', JSON.stringify(dashboardOrder));
  }, [dashboardOrder]);

  const updateTheme = (newTheme) => {
    setCurrentTheme(newTheme);
  };

  const updateColors = (newColors) => {
    setCurrentTheme(prev => ({
      ...prev,
      colors: { ...prev.colors, ...newColors }
    }));
  };

  const updateFont = (fontFamily) => {
    setCurrentTheme(prev => ({ ...prev, fontFamily }));
  };

  const reorderDashboard = (newOrder) => {
    setDashboardOrder(newOrder);
  };

  return (
    <AppearanceContext.Provider value={{
      currentTheme,
      dashboardOrder,
      updateTheme,
      updateColors,
      updateFont,
      reorderDashboard,
      presets: THEME_PRESETS
    }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export const useAppearance = () => {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used within AppearanceProvider');
  return context;
};
