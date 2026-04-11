import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.mock.*',
        'src/api/apiClient.js',
        'src/__tests__/**',
        'src/core/models/**',
        'src/components/ui/CardGrid.tsx',
        'src/components/ui/CookieConsent.tsx',
        'src/components/ui/DeckList.tsx',
        'src/components/ui/DeckTable.tsx',
        'src/components/ui/FeedbackModal.tsx',
        'src/components/ui/LanguageSelector.tsx',
        'src/components/ui/MyDecks.tsx',
        'src/components/ui/SEO.tsx',
        'src/components/ui/TextAreaInput.tsx',
        'src/components/ui/WhatsNewModal.tsx',
        'src/components/views/**',
        'src/views/articles/**',
        'src/views/dashboard/**',
        'src/views/deck-builder/**',
        'src/views/deck-explorer/**',
        'src/views/deck-viewer/**',
        'src/views/formats/**',
        'src/views/friends/**',
        'src/views/legal/**',
        'src/views/messages/**',
        'src/views/my-decks/**',
        'src/views/profile/**',
      ],
      thresholds: {
        statements: 65,
        branches: 55,
        functions: 60,
        lines: 68,
      },
    },
  },
})
