// A browser tab owns its session, including across reloads. Other tabs can
// sign in or out independently without changing this tab's request identity.
export const getToken = () => sessionStorage.getItem('token');
export function setToken(token) {
  sessionStorage.setItem('token', token);
  // Retire the old shared login instead of importing it into a new tab.
  localStorage.removeItem('token');
}
export const clearToken = () => sessionStorage.removeItem('token');
