export type UserRole = 'super_admin' | 'hostel_admin' | 'resident' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  hostelId?: string;
  mustChangePassword?: boolean;
}

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const storeAuth = (token: string, user: User) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getRoleRedirectPath = (role: UserRole): string => {
  const paths = {
    super_admin: '/super-admin',
    hostel_admin: '/admin',
    resident: '/resident',
    staff: '/staff',
  };
  return paths[role];
};
