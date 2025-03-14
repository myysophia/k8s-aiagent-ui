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
  // baseURL: 'http://60.204.218.98:8080',
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false // 由于跨域，先设置为 false
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

// 定义 API 基础 URL，可以从环境变量中获取
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

// 发送消息
export async function sendMessage(message: string, model: string, cluster: string): Promise<any> {
  try {
    // 从本地存储获取当前配置
    const currentConfigId = localStorage.getItem('current_config_id');
    const savedConfigs = localStorage.getItem('api_configs');
    
    if (!savedConfigs || !currentConfigId) {
      throw new Error('API 配置未找到，请先在设置页面配置 API');
    }
    
    const configs = JSON.parse(savedConfigs);
    const currentConfig = configs.find(c => c.id === currentConfigId);
    
    if (!currentConfig) {
      throw new Error('当前选择的 API 配置未找到');
    }
    
    if (!currentConfig.apiKey) {
      throw new Error('API 密钥未设置，请在设置页面配置 API 密钥');
    }
    
    // 添加 X-API-KEY 头
    const headers = {
      'Content-Type': 'application/json',
      'X-API-KEY': currentConfig.apiKey
    };
    
    // 使用绝对 URL
    const response = await axios.post('http://localhost:8080/api/execute', {
      message,
      model,
      cluster
    }, { headers });
    
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    
    // 提供更友好的错误消息
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const friendlyMessage = '认证失败：API 密钥无效或已过期，请检查设置页面的 API 配置';
      const enhancedError = new Error(friendlyMessage);
      (enhancedError as any).friendlyMessage = friendlyMessage;
      (enhancedError as any).response = error.response;
      throw enhancedError;
    }
    
    throw error;
  }
}

export default api; 