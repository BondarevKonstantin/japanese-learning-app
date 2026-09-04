type AuthOperation = 'login' | 'signup';

const getErrorDetail = (error: unknown, property: 'code' | 'message') => {
  if (typeof error !== 'object' || error === null || !(property in error)) {
    return '';
  }

  const value = (error as Record<string, unknown>)[property];
  return typeof value === 'string' ? value.toLowerCase() : '';
};

export const getAuthErrorMessage = (error: unknown, operation: AuthOperation) => {
  const code = getErrorDetail(error, 'code');
  const message = getErrorDetail(error, 'message');
  const details = `${code} ${message}`;

  if (details.includes('invalid_credentials') || details.includes('invalid login credentials')) {
    return 'Неверный email или пароль.';
  }

  if (details.includes('email_not_confirmed') || details.includes('email not confirmed')) {
    return 'Подтвердите email перед входом.';
  }

  if (
    details.includes('user_already_exists') ||
    details.includes('user already registered') ||
    details.includes('already been registered')
  ) {
    return 'Пользователь с таким email уже зарегистрирован.';
  }

  return operation === 'login'
    ? 'Не удалось выполнить вход. Попробуйте ещё раз.'
    : 'Не удалось зарегистрироваться. Попробуйте ещё раз.';
};
