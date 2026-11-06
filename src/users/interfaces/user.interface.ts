export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  email: string;
  username: string;
  password: string;
}

export type PublicUser = Omit<User, 'password'>;
