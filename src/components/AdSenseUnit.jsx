import React, { useEffect } from "react";

const client = process.env.REACT_APP_ADSENSE_CLIENT || "";

export default function AdSenseUnit({ slot, format = "auto", className = "" }) {
  useEffect(() => {
    if (!client || !slot) return;

    const scriptId = "imali-adsense-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
      document.head.appendChild(script);
    }

    const timer = window.setTimeout(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.warn("AdSense slot initialization skipped");
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [slot]);

  if (!client || !slot) return null;

  return (
    <div className={className} aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
