const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? 'API error');
  }
  return res.json();
}

// ─── Circuits ─────────────────────────────────────────────────────────────────

export const circuitsApi = {
  list: (skip = 0, limit = 50, tag?: string) =>
    request(`/circuits?skip=${skip}&limit=${limit}${tag ? `&tag=${tag}` : ''}`),

  get: (id: string) => request(`/circuits/${id}`),

  create: (data: Record<string, unknown>) =>
    request('/circuits/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    request(`/circuits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/circuits/${id}`, { method: 'DELETE' }),

  clone: (id: string, name?: string) =>
    request(`/circuits/${id}/clone${name ? `?new_name=${encodeURIComponent(name)}` : ''}`, { method: 'POST' }),

  getMetrics: (id: string) => request(`/circuits/${id}/metrics`),

  getQasm: (id: string, version = 2) =>
    request<{ qasm: string; version: number }>(`/circuits/${id}/qasm?version=${version}`),

  listTemplates: () =>
    request<{ templates: Array<{ id: string; name: string; num_qubits: number; description: string }> }>(
      '/circuits/templates/list'
    ),

  getTemplate: (templateId: string) =>
    request<Record<string, unknown>>(`/circuits/templates/${templateId}`),
};

// ─── Simulation ───────────────────────────────────────────────────────────────

export const simulationApi = {
  run: (data: Record<string, unknown>) =>
    request('/simulation/run', { method: 'POST', body: JSON.stringify(data) }),

  expectation: (circuit: Record<string, unknown>, operators: string[]) =>
    request('/simulation/expectation', {
      method: 'POST',
      body: JSON.stringify({ circuit, operators }),
    }),

  fidelity: (circuit1: Record<string, unknown>, circuit2: Record<string, unknown>) =>
    request('/simulation/fidelity', {
      method: 'POST',
      body: JSON.stringify({ circuit1, circuit2 }),
    }),
};

// ─── Transpiler ───────────────────────────────────────────────────────────────

export const transpilerApi = {
  transpile: (data: Record<string, unknown>) =>
    request('/transpiler/', { method: 'POST', body: JSON.stringify(data) }),

  listBackends: () => request('/transpiler/backends'),
};

// ─── Noise ───────────────────────────────────────────────────────────────────

export const noiseApi = {
  getPresets: () =>
    request<{ presets: Array<{ id: string; name: string; config: Record<string, number> }> }>(
      '/noise/presets'
    ),

  validate: (config: Record<string, number>) =>
    request('/noise/validate', { method: 'POST', body: JSON.stringify(config) }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analyticsApi = {
  analyze: (circuit: Record<string, unknown>) =>
    request('/analytics/analyze', { method: 'POST', body: JSON.stringify({ circuit }) }),

  compare: (circuits: Record<string, unknown>[]) =>
    request('/analytics/compare', { method: 'POST', body: JSON.stringify({ circuits }) }),
};

// ─── Gate Catalog ─────────────────────────────────────────────────────────────

export const gatesApi = {
  getCatalog: () =>
    request<Record<string, unknown>>('http://localhost:8000/api/v1/gates/catalog'),
};
