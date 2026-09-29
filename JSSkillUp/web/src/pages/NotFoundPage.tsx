import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';

export function NotFoundPage() {
  return (
    <EmptyState
      title="Страница не найдена"
      description="Такой страницы нет. Проверьте адрес или вернитесь на дашборд."
      action={<ButtonLink to="/">На дашборд</ButtonLink>}
    />
  );
}
