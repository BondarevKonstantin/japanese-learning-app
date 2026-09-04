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

  if (!authData.user) {
    throw new Error('Sign up completed without a user');
  }

  return authData;
};
