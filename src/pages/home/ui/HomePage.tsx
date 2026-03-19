import { AppLayout } from '@/app/layouts/AppLayout';

export const HomePage = () => {
  return (
    <AppLayout>
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Japanese Learning App</h1>

          <p className="mt-4 text-base text-slate-300 sm:text-lg">
            Фронтенд-фундамент готов. Дальше можно добавлять страницы и фичи.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};
