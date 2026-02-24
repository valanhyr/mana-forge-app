import { useEffect, useState } from "react";
import { ManaSymbolService } from "../../services/ManaSymbolService";

interface ManaCostProps {
  cost: string;
  size?: number;
}

const ManaCost = ({ cost, size = 14 }: ManaCostProps) => {
  const [symbols, setSymbols] = useState<Record<string, string>>({});

  useEffect(() => {
    ManaSymbolService.getAll().then(setSymbols);
  }, []);

  if (!cost) return null;

  const tokens = cost.match(/\{[^}]+\}/g) ?? [];

  return (
    <span className="inline-flex items-center gap-0.5">
      {tokens.map((token, i) => {
        const svgUri = symbols[token];
        return svgUri ? (
          <img
            key={i}
            src={svgUri}
            alt={token}
            title={token}
            style={{ width: size, height: size }}
            className="inline-block"
          />
        ) : (
          <span key={i} className="text-zinc-400 text-xs font-mono">{token}</span>
        );
      })}
    </span>
  );
};

export default ManaCost;
