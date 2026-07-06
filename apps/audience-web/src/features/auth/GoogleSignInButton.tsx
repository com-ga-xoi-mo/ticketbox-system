import { useEffect, useRef, useState } from 'react';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
  renderButton(
    element: HTMLElement,
    options: { type: 'standard'; theme: 'outline'; size: 'large'; text: 'continue_with'; width: number },
  ): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } };
  }
}

export function GoogleSignInButton({
  disabled,
  onCredential,
  onUnavailable,
}: {
  disabled?: boolean;
  onCredential: (credential: string) => void;
  onUnavailable: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const unavailableRef = useRef(onUnavailable);
  const [ready, setReady] = useState(false);
  callbackRef.current = onCredential;
  unavailableRef.current = onUnavailable;

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      unavailableRef.current();
      return;
    }

    let cancelled = false;
    const initialize = () => {
      if (cancelled || !window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) callbackRef.current(response.credential);
        },
      });
      containerRef.current.replaceChildren();
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 352,
      });
      setReady(true);
    };

    if (window.google) {
      initialize();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-ticketbox-google-signin]');
      const script = existing ?? document.createElement('script');
      const handleError = () => !cancelled && unavailableRef.current();
      script.addEventListener('load', initialize);
      script.addEventListener('error', handleError);
      if (!existing) {
        script.src = 'https://accounts.google.com/gsi/client?hl=vi';
        script.async = true;
        script.dataset.ticketboxGoogleSignin = 'true';
        document.head.appendChild(script);
      }
      return () => {
        cancelled = true;
        script.removeEventListener('load', initialize);
        script.removeEventListener('error', handleError);
      };
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={disabled ? 'pointer-events-none opacity-60' : undefined}
      aria-busy={!ready || disabled}
      aria-label="Tiếp tục với Google"
    >
      <div ref={containerRef} className="flex min-h-10 justify-center" />
    </div>
  );
}
