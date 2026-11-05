export interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  username: string;
  password: string;
}

export type PublicUser = Omit<User, 'password'>;
