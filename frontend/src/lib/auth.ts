export const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('mv2026_token') : null;
export const getUser = () => {
  if (typeof window === 'undefined') return null;
  const u = localStorage.getItem('mv2026_user');
  return u ? JSON.parse(u) : null;
};
export const setAuth = (token: string, user: any) => {
  localStorage.setItem('mv2026_token', token);
  localStorage.setItem('mv2026_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('mv2026_token');
  localStorage.removeItem('mv2026_user');
};
export const isAuthenticated = () => !!getToken();
