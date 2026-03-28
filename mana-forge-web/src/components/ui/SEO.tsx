import { useEffect } from "react";
import { useTranslation } from "../../hooks/useTranslation";

export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  twitterCard?: "summary" | "summary_large_image";
  canonical?: string;
  jsonLd?: any;
}

interface SEOProps extends SEOData {
  /**
   * Optional: provide a full SEO object (e.g. from Strapi)
   */
  data?: SEOData;
}

/**
 * Enhanced SEO & GEO Component.
 * Handles Metadata, Open Graph, Twitter Cards, and JSON-LD for AI/GEO.
 */
const SEO = ({ 
  title, 
  description, 
  keywords, 
  ogImage, 
  ogType = "website", 
  twitterCard = "summary_large_image",
  canonical,
  jsonLd,
  data 
}: SEOProps) => {
  const { t } = useTranslation();

  // Merge direct props with data object (data object takes precedence if provided)
  const finalTitle = data?.title || title;
  const finalDescription = data?.description || description;
  const finalKeywords = data?.keywords || keywords;
  const finalOgImage = data?.ogImage || ogImage || "/og-default.png"; // Fallback to a default image
  const finalOgType = data?.ogType || ogType;
  const finalTwitterCard = data?.twitterCard || twitterCard;
  const finalCanonical = data?.canonical || canonical || window.location.href;
  const finalJsonLd = data?.jsonLd || jsonLd;

  useEffect(() => {
    // 1. Title
    const baseTitle = "Mana Forge";
    const fullTitle = finalTitle ? `${finalTitle} | ${baseTitle}` : baseTitle;
    document.title = fullTitle;

    // 2. Standard Meta Tags
    const updateMeta = (name: string, content: string, attr: string = "name") => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    updateMeta("description", finalDescription || t("seo.defaultDescription"));
    if (finalKeywords) updateMeta("keywords", finalKeywords);

    // 3. Open Graph
    updateMeta("og:title", fullTitle, "property");
    updateMeta("og:description", finalDescription || t("seo.defaultDescription"), "property");
    updateMeta("og:image", finalOgImage, "property");
    updateMeta("og:type", finalOgType, "property");
    updateMeta("og:url", window.location.href, "property");

    // 4. Twitter Cards
    updateMeta("twitter:card", finalTwitterCard);
    updateMeta("twitter:title", fullTitle);
    updateMeta("twitter:description", finalDescription || t("seo.defaultDescription"));
    updateMeta("twitter:image", finalOgImage);

    // 5. Canonical
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", finalCanonical);

    // 6. JSON-LD (GEO / AI Optimization)
    // Remove existing JSON-LD scripts to avoid duplication
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => script.remove());

    if (finalJsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(finalJsonLd);
      document.head.appendChild(script);
    }

  }, [
    finalTitle, 
    finalDescription, 
    finalKeywords, 
    finalOgImage, 
    finalOgType, 
    finalTwitterCard, 
    finalCanonical, 
    finalJsonLd, 
    t
  ]);

  return null;
};

export default SEO;
