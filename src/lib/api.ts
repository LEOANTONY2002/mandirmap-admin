const API_BASE = import.meta.env.SERVER_BASE_URL ?? "http://localhost:5000";

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: unknown }>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  get: <T>(path: string, token: string) => request<T>(path, {}, token),
  post: <T>(path: string, data: unknown, token: string) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }, token),
  patch: <T>(path: string, data: unknown, token: string) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }, token),
  delete: <T>(path: string, token: string) =>
    request<T>(path, { method: "DELETE" }, token),
  upload: async (file: File, token: string, folder = "admin") => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
      `${API_BASE}/admin/upload?folder=${encodeURIComponent(folder)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(payload || `Upload failed with ${response.status}`);
    }

    return response.json() as Promise<{ url: string }>;
  },
};
