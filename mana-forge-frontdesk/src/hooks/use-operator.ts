import { createContext, useContext } from 'react';
import { Operator } from '../core/domain/operator';

export const OperatorContext = createContext<Operator | null>(null);
export const useOperator = () => useContext(OperatorContext);
