'use client';

import { useEffect, useState } from 'react';

type Health = {
  status: string;
  db: 'connected' | 'disconnected';
  timestamp: string;
};

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; health: Health }
  | { kind: 'error'; message: string };

const ApiStatus = () => {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let alive = true;

    const checkHealth = async () => {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;

      try {
        if (!baseUrl) throw new Error('NEXT_PUBLIC_API_URL is not set');

        const res = await fetch(`${baseUrl}/health`);
        if (!res.ok) throw new Error(`API responded ${res.status}`);

        const health: Health = await res.json();
        if (alive) setState({ kind: 'ok', health });
      } catch (error) {
        if (alive) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };

    checkHealth();

    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === 'loading') {
    return (
      <div className="badge badge-ghost gap-2">
        <span className="loading loading-spinner loading-xs" />
        Checking API…
      </div>
    );
  }

  if (state.kind === 'error') {
    return <div className="badge badge-error">API unreachable — {state.message}</div>;
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <span className="badge badge-success">API ok</span>
      <span
        className={`badge ${state.health.db === 'connected' ? 'badge-success' : 'badge-warning'}`}
      >
        DB {state.health.db}
      </span>
    </div>
  );
};

export default ApiStatus;
