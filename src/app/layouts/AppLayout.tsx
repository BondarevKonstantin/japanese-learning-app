import type { PropsWithChildren } from 'react';

export const AppLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="h-screen overflow-hidden bg-background text-text-primary">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-40">
        <div className="absolute -left-[100px] -top-[100px] h-72 w-72 rounded-full bg-secondary blur-3xl" />
        <div className="absolute -right-[120px] -bottom-[120px] h-80 w-80 rounded-full bg-primary-light blur-3xl" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="h-1 w-full shrink-0 bg-primary" />

        <div className="min-h-0 flex-1 px-6 py-6">
          <div className="mx-auto h-full min-h-0 max-w-6xl">{children}</div>
        </div>
      </div>
    </div>
  );
};
