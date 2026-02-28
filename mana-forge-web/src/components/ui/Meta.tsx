import { useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";

interface MetaProps {
  title?: string;
  description?: string;
}

/**
 * Componente para gestionar metadatos SEO de forma dinámica.
 * Actualiza el título del documento y la meta descripción.
 */
const Meta = ({ title, description }: MetaProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    // 1. Actualizar Título
    const baseTitle = "Mana Forge";
    const newTitle = title ? `${title} | ${baseTitle}` : baseTitle;
    document.title = newTitle;

    // 2. Actualizar Descripción Meta
    const metaDescription = document.querySelector('meta[name="description"]');
    const defaultDescription = t("seo.defaultDescription") || "Mana Forge te ayuda a construir los mejores mazos de Magic.";
    const newDescription = description || defaultDescription;

    if (metaDescription) {
      metaDescription.setAttribute("content", newDescription);
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = newDescription;
      document.head.appendChild(meta);
    }
  }, [title, description, t]);

  return null;
};

export default Meta;
