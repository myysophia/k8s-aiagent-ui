import axios from 'axios';

interface ApiResponse {
  message: string;
  status: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const api = axios.create({
  baseURL: 'http://localhost:8080',
});

// 请求拦截器：添加认证信息
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt');
  const apiKey = localStorage.getItem('openai_api_key');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (apiKey) {
    config.headers['X-OpenAI-Key'] = apiKey;
  }
  return config;
});

export const login = async (username: string, password: string) => {
  const response = await api.post<{ token: string }>('/login', { username, password });
  return response.data;
};

export const sendCommand = async (
  command: string,
  model: string,
  cluster: string
): Promise<ApiResponse> => {
  const [action, ...args] = command.split(' ');
  
  const endpoint = {
    diagnose: '/diagnose',
    analyze: '/analyze',
    execute: '/execute',
  }[action.toLowerCase()] || '/analyze';

  return (await api.post(endpoint, {
    command,
    model,
    cluster,
    args: args.join(' '),
  })).data;
};

export default api; 