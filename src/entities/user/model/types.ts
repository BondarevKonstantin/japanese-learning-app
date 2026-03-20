export type UserRole = 'teacher' | 'student';

export type Profile = {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};
