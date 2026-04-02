import { useNavigate } from 'react-router-dom';

type BackButtonProps = {
  fallbackTo: string;
  label?: string;
};

export const BackButton = ({ fallbackTo, label = '← Назад' }: BackButtonProps) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(fallbackTo)}
      className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-background"
    >
      <span>{label}</span>
    </button>
  );
};
