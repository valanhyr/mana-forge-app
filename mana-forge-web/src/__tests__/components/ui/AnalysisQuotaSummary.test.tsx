import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalysisQuotaSummary from '../../../components/ui/AnalysisQuotaSummary';
import { LanguageProvider } from '../../../services/LanguageContext';

describe('Analysis quota summary', () => {
  beforeEach(() => localStorage.setItem('app_locale', 'es'));
  it('shows server limits and a local reset timestamp', () => {
    render(<LanguageProvider><AnalysisQuotaSummary quota={{ limit: 17, remaining: 4, authenticated: true, resetsAt: '2026-10-10T00:00:00Z' }} /></LanguageProvider>);
    expect(screen.getByText('Te quedan 4 de 17 análisis hoy.')).toBeInTheDocument();
    expect(screen.getByText(/Se renueva el.*tu hora local/)).toBeInTheDocument();
  });
  it('distinguishes unlimited from unavailable', () => {
    const { rerender } = render(<LanguageProvider><AnalysisQuotaSummary quota={null} /></LanguageProvider>);
    expect(screen.getByText(/No se puede consultar/)).toBeInTheDocument();
    rerender(<LanguageProvider><AnalysisQuotaSummary quota={{ limit: null, remaining: null, authenticated: true, resetsAt: null }} /></LanguageProvider>);
    expect(screen.getByText('Análisis sin límite diario.')).toBeInTheDocument();
  });
});
