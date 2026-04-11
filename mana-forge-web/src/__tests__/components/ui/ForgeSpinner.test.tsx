import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ForgeSpinner from '../../../components/ui/ForgeSpinner';
import { LanguageProvider } from '../../../services/LanguageContext';

describe('ForgeSpinner', () => {
  it('renderiza sin errores', () => {
    expect(() =>
      render(
        <LanguageProvider>
          <ForgeSpinner />
        </LanguageProvider>
      )
    ).not.toThrow();
  });
});
