const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';

function resolveApiPath(value: RequestInfo | URL, authRoleType: string): RequestInfo | URL {
  if (typeof value !== 'string') return value;
  if (!value.startsWith('/api/erp/')) return value;

  const suffix = value.slice('/api/erp/'.length);
  if (suffix === 'login' || suffix === 'register') {
    return `/api/auth/${suffix}`;
  }

  const routeScope = authRoleType === 'Manager' ? 'manager' : 'engineer';
  return `/api/${routeScope}/${suffix}`;
}

export function createApiFetch(
  authToken: string,
  authRoleType: string,
  onUnauthorized?: () => void
) {
  return function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers || {});
    const token = authToken || localStorage.getItem('syncspace_auth_token') || '';

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const resolved = resolveApiPath(input, authRoleType);
    const requestTarget =
      typeof resolved === 'string' && resolved.startsWith('/api/')
        ? `${apiBaseUrl}${resolved}`
        : resolved;

    return fetch(requestTarget, { ...init, headers }).then(response => {
      if (response.status === 401) {
        onUnauthorized?.();
      }
      return response;
    });
  };
}
