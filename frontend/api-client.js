// Glassy PM — cliente da API (Vanilla JS, sem framework)
// Como usar no seu HTML atual: <script src="api-client.js"></script>
// O token JWT fica em localStorage (chave glassy_token). O back-end valida
// e filtra TUDO por user_id, então um usuário nunca vê dados de outro.
// Se o front está sendo servido pelo próprio back-end (local :4000 ou
// online no Render/Railway), a API é a mesma origem. Só usa localhost:4000
// quando o front foi aberto de outro lugar (ex.: arquivo local).
const API = window.PM_API_BASE
  || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? (window.location.port === '4000' ? window.location.origin : 'http://localhost:4000')
    : window.location.origin);

const PM_API = {
  get token() { return localStorage.getItem('glassy_token'); },
  set token(v) { v ? localStorage.setItem('glassy_token', v) : localStorage.removeItem('glassy_token'); },

  async request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { // token expirado -> volta para o login
      this.token = null;
      if (!location.pathname.endsWith('auth.html')) location.href = 'auth.html';
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  },

  // --- Auth ---
  register: (name, email, password) => PM_API.request('/api/auth/register', { method: 'POST', body: { name, email, password }, auth: false }),
  login: (email, password) => PM_API.request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => PM_API.request('/api/auth/me'),
  updateMe: (data) => PM_API.request('/api/auth/me', { method: 'PUT', body: data }),
  changePassword: (currentPassword, newPassword) => PM_API.request('/api/auth/change-password', { method: 'PUT', body: { currentPassword, newPassword } }),
  forgotPassword: (email) => PM_API.request('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token, newPassword) => PM_API.request('/api/auth/reset-password', { method: 'POST', body: { token, newPassword }, auth: false }),

  // --- CRUD ---
  listClients: () => PM_API.request('/api/clients'),
  createClient: (data) => PM_API.request('/api/clients', { method: 'POST', body: data }),
  updateClient: (id, data) => PM_API.request(`/api/clients/${id}`, { method: 'PUT', body: data }),
  deleteClient: (id) => PM_API.request(`/api/clients/${id}`, { method: 'DELETE' }),

  listProjects: () => PM_API.request('/api/projects'),
  createProject: (data) => PM_API.request('/api/projects', { method: 'POST', body: data }),
  updateProject: (id, data) => PM_API.request(`/api/projects/${id}`, { method: 'PUT', body: data }),
  deleteProject: (id) => PM_API.request(`/api/projects/${id}`, { method: 'DELETE' }),

  listSprints: (project_id) => PM_API.request(`/api/sprints${project_id ? `?project_id=${project_id}` : ''}`),
  createSprint: (data) => PM_API.request('/api/sprints', { method: 'POST', body: data }),
  updateSprint: (id, data) => PM_API.request(`/api/sprints/${id}`, { method: 'PUT', body: data }),
  deleteSprint: (id) => PM_API.request(`/api/sprints/${id}`, { method: 'DELETE' }),

  listTasks: (sprint_id) => PM_API.request(`/api/tasks${sprint_id ? `?sprint_id=${sprint_id}` : ''}`),
  createTask: (data) => PM_API.request('/api/tasks', { method: 'POST', body: data }),
  updateTask: (id, data) => PM_API.request(`/api/tasks/${id}`, { method: 'PUT', body: data }),
  // O coração do Kanban: salva coluna + posição no banco em tempo real
  moveTask: (id, status, position) => PM_API.request(`/api/tasks/${id}/move`, { method: 'PATCH', body: { status, position } }),
  deleteTask: (id) => PM_API.request(`/api/tasks/${id}`, { method: 'DELETE' }),

  listReminders: () => PM_API.request('/api/reminders'),
  createReminder: (data) => PM_API.request('/api/reminders', { method: 'POST', body: data }),
};

// Proteção de rota no front (complementa a do back-end, que é a que vale):
// em páginas que exigem login, chame: await PM_API.requireLogin();
PM_API.requireLogin = async () => {
  if (!PM_API.token) { location.href = 'auth.html'; throw new Error('Sem login'); }
  return PM_API.me();
};
window.PM_API = PM_API;
