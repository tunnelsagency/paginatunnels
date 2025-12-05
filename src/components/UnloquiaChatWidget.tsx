'use client';

import { useEffect } from 'react';

type UnloquiaChatWidgetProps = {
  clientId: string;
};

export default function UnloquiaChatWidget({ clientId }: UnloquiaChatWidgetProps) {
  useEffect(() => {
    // Limpiar instancia anterior si existe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).UnloquiaChat?.destroy?.();

    // Configurar el token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).UNLOQUIA_CONFIG = { token: clientId };

    // Cargar el script del widget con cache busting
    const script = document.createElement('script');
    script.src = `/unloquia-chat.js?v=${Date.now()}`;
    script.async = true;

    // Manejo de errores de carga
    script.onerror = () => {
      console.error('[UnloquiaChat] Failed to load widget script');
    };

    document.body.appendChild(script);

    // Cleanup al desmontar
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).UnloquiaChat?.destroy?.();
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [clientId]);

  // El widget se renderiza a sí mismo en el DOM, este componente no renderiza nada visual en el árbol de React
  return null;
}
