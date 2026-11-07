import { useEffect } from "react";

const client = process.env.REACT_APP_ADSENSE_CLIENT || "";

export default function AdSenseLoader() {
  useEffect(() => {
    if (!client) return;

    const scriptId = "imali-adsense-script";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    document.head.appendChild(script);
  }, []);

  return null;
}
