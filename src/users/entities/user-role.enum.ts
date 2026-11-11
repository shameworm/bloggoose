export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const satisfies Record<string, string>;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_VALUES = Object.values(USER_ROLES);
