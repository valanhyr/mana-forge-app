import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ScrollToTop from '../../../components/layout/ScrollToTop';
import { BrowserRouter } from 'react-router-dom';

describe('ScrollToTop', () => {
  it('renderiza sin errores', () => {
    const { container } = render(
      <BrowserRouter>
        <ScrollToTop />
      </BrowserRouter>
    );
    expect(container).toBeTruthy();
  });
});
