import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Limpa a árvore do DOM após cada teste do React Testing Library
afterEach(() => {
  cleanup();
});
