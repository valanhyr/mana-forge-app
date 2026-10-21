import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Existing UI unit tests explicitly use demo fixtures. HTTP integration tests opt into live adapters.
vi.stubEnv('VITE_USE_MOCKS', 'true');
