// src/api/authService.js

export const signup = async ({ email, password, name }) => {
  const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Signup failed');
  }
  return response.json();
};

export const login = async ({ email, password }) => {
  const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Login failed');
  }
  return response.json();
};
