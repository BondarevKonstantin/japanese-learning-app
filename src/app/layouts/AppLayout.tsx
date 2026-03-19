import type { PropsWithChildren } from 'react';

export const AppLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
};
