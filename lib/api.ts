import axios from 'axios';
import { ApiConfig } from '../types/api-config';

interface ApiResponse {
  message: string;
  status: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: 'command' | 'chat';
  command?: {
    action: string;
    args: string;
  };
}

// 获取当前活跃的 API 配置
const getCurrentConfig = (): ApiConfig | null => {
  const savedConfigs = localStorage.getItem('api_configs');
  if (!savedConfigs) return null;
  
  const configs = JSON.parse(savedConfigs) as ApiConfig[];
  if (configs.length === 0) return null;

  // 获取当前选中的配置ID
  const currentConfigId = localStorage.getItem('current_config_id');
  if (currentConfigId) {
    // 返回当前选中的配置
    const currentConfig = configs.find(config => config.id === currentConfigId);
    if (currentConfig) {
      return currentConfig;
    }
  }
  
  // 如果没有选中的配置，返回第一个配置作为默认值
  return configs[0];
};

const api = axios.create({
  baseURL: 'http://localhost:8080',
});

// 请求拦截器：添加认证信息和 API 配置
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt');
  const currentConfig = getCurrentConfig();
  
  console.log('Request Headers:', {
    Authorization: token ? 'Bearer ' + token : 'Not Set',
    'X-API-Key': currentConfig?.apiKey ? 'Set' : 'Not Set',
  });
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (currentConfig) {
    config.headers['X-API-Key'] = currentConfig.apiKey;
  }
  
  return config;
});

// 添加响应拦截器
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.error('Authentication Error:', {
        status: error.response.status,
        message: error.response.data,
        headers: error.response.headers,
      });
      
      // 清除过期的 token
      localStorage.removeItem('jwt');
      
      // 构造友好的错误消息
      const errorMessage = '登录已过期，请重新登录';
      error.friendlyMessage = errorMessage;
      
      // 如果不是登录页面，则重定向
      if (!window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000); // 延迟 2 秒跳转，让用户看到提示
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (username: string, password: string) => {
  const response = await api.post<{ token: string }>('/login', { username, password });
  return response.data;
};

// 解析命令
const parseCommand = (input: string): { action: string; args: string } | null => {
  if (!input.startsWith('/')) return null;
  
  const parts = input.slice(1).split(' ');
  const action = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  
  return { action, args };
};

// 验证命令
const validateCommand = (action: string): boolean => {
  const validCommands = ['diagnose', 'analyze', 'execute', 'help'];
  return validCommands.includes(action);
};

// 发送消息
export const sendMessage = async (
  input: string,
  model: string,
  cluster: string
): Promise<ApiResponse> => {
  const currentConfig = getCurrentConfig();
  if (!currentConfig) {
    throw new Error('未找到有效的 API 配置');
  }

  const command = parseCommand(input);
  const baseRequestData = {
    provider: currentConfig.provider,
    baseUrl: currentConfig.baseUrl,
    selectedModels: [model],
    currentModel: model,
    cluster,
  };
  
  if (!command) {
    // 普通聊天消息，使用 chat 端点
    return (await api.post('/chat', {
      ...baseRequestData,
      message: input,
    })).data;
  }

  if (!validateCommand(command.action)) {
    throw new Error(`不支持的命令: ${command.action}`);
  }

  // 根据命令类型选择对应的端点
  const endpoint = `/${command.action}`;
  
  return (await api.post(endpoint, {
    ...baseRequestData,
    instructions: input,
    args: command.args,
  })).data;
};

export default api; 