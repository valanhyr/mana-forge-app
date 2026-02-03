import { useTranslation } from "../../hooks/useTranslation";

interface ForgeSpinnerProps {
  size?: number;
  className?: string;
}

const ForgeSpinner: React.FC<ForgeSpinnerProps> = ({
  size = 128,
  className = "",
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      <style>
        {`
          @keyframes ripple-expand {
            0% {
              transform: scale(0.3);
              opacity: 0;
              border-width: 6px;
            }
            20% {
              opacity: 1;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
              border-width: 0px;
            }
          }
          .ripple {
            position: absolute;
            border-radius: 50%;
            border: 2px solid currentColor;
            opacity: 0;
            animation: ripple-expand 2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
          }
        `}
      </style>

      {/* Ondas expansivas */}
      <div className="absolute inset-0 flex items-center justify-center opacity-60">
        <div
          className="ripple"
          style={{ width: "100%", height: "100%", animationDelay: "0s" }}
        ></div>
        <div
          className="ripple"
          style={{ width: "100%", height: "100%", animationDelay: "0.5s" }}
        ></div>
        <div
          className="ripple"
          style={{ width: "100%", height: "100%", animationDelay: "1s" }}
        ></div>
        <div
          className="ripple"
          style={{ width: "100%", height: "100%", animationDelay: "1.5s" }}
        ></div>
      </div>

      {/* Label central */}
      <div className="relative z-10 flex items-center justify-center">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse bg-zinc-950/80 px-3 py-1.5 rounded-full backdrop-blur-md border border-current shadow-lg whitespace-nowrap">
          {t("common.forging")}
        </span>
      </div>
    </div>
  );
};

export default ForgeSpinner;
