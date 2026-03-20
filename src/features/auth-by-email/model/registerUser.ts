import { createProfile } from '@/entities/user/api/createProfile';
import { signUp } from '@/features/auth-by-email/api/signUp';

type RegisterUserParams = {
  email: string;
  password: string;
  displayName?: string;
};

export const registerUser = async ({ email, password, displayName }: RegisterUserParams) => {
  const authData = await signUp({
    email,
    password,
    displayName,
  });

  const user = authData.user;

  if (!user?.id || !user.email) {
    throw new Error('Не удалось получить данные пользователя после регистрации');
  }

  await createProfile({
    id: user.id,
    email: user.email,
    displayName,
    role: 'student',
  });

  return authData;
};
