import { Link } from 'react-router';
import { AppLayout } from '@/app/layouts/AppLayout';
import { routes } from '@/shared/config/routes';

export const NotFoundPage = () => {
  return (
    <AppLayout>
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="mt-3 text-slate-300">Страница не найдена</p>

        <Link
          to={routes.home}
          className="mt-6 rounded-xl border border-slate-700 px-4 py-2 transition hover:bg-slate-800"
        >
          На главную
        </Link>
      </div>
    </AppLayout>
  );
};
