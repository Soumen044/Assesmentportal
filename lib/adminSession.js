'use client';

import { useEffect, useState } from 'react';

export const ADMIN_LOGIN_PATH = '/admin/login';

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return window.atob(`${normalized}${padding}`);
}

export function getStoredAdminToken() {
  if (typeof window === 'undefined') {
    return '';
  }
  return localStorage.getItem('adminToken') || '';
}

export function decodeAdminToken(token) {
  if (!token || typeof window === 'undefined') {
    return null;
  }

  try {
    const [, payload = ''] = token.split('.');
    return JSON.parse(decodeBase64Url(payload));
  } catch (error) {
    return null;
  }
}

export function isAdminTokenExpired(token) {
  const payload = decodeAdminToken(token);
  if (!payload?.exp) {
    return true;
  }
  return (payload.exp * 1000) <= Date.now();
}

export function hasValidAdminToken() {
  const token = getStoredAdminToken();
  return Boolean(token) && !isAdminTokenExpired(token);
}

export function clearAdminSession({ redirectTo = ADMIN_LOGIN_PATH, forceRedirect = true } = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('adminToken');

  if (!forceRedirect) {
    return;
  }

  const nextPath = `${window.location.pathname}${window.location.search}`;
  if (nextPath !== redirectTo) {
    window.location.replace(redirectTo);
  }
}

export function useAdminSessionGuard() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getStoredAdminToken();
    if (!token || isAdminTokenExpired(token)) {
      clearAdminSession();
      setReady(false);
      return undefined;
    }

    setReady(true);

    const payload = decodeAdminToken(token);
    const expiresAt = Number(payload?.exp || 0) * 1000;
    const timeoutMs = Math.max(0, expiresAt - Date.now());

    const timeoutId = window.setTimeout(() => {
      clearAdminSession();
    }, timeoutMs);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return ready;
}
