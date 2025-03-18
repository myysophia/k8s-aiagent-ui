import axios from 'axios';
import { ApiConfig } from '../types/api-config';

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

export interface ApiResponse {
  message: string;
  data?: unknown;
  error?: string;
}

// 自定义错误类型
interface EnhancedError extends Error {
  friendlyMessage: string;
  response?: unknown;
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

// 发送消息
export async function sendMessage(message: string, model: string, cluster: string): Promise<ApiResponse> {
  try {
    // 解析命令
    let instructions = '';
    let args = '';
    
    if (message.startsWith('/')) {
      const parts = message.slice(1).split(' ');
      instructions = parts[0].toLowerCase();
      args = parts.slice(1).join(' ');
    } else {
      // 如果用户没有输入/，默认添加 execute
      instructions = 'execute';
      args = message;
    }
    
    // 从本地存储获取当前配置
    const currentConfigId = localStorage.getItem('current_config_id');
    const savedConfigs = localStorage.getItem('api_configs');
    
    if (!savedConfigs || !currentConfigId) {
      throw new Error('API 配置未找到，请先在设置页面配置 API');
    }
    
    const configs = JSON.parse(savedConfigs);
    const currentConfig = configs.find((c: ApiConfig) => c.id === currentConfigId);
    
    if (!currentConfig) {
      throw new Error('当前选择的 API 配置未找到');
    }
    
    // 构建与后端期望的请求体结构匹配的对象
    const requestBody = {
      instructions: instructions,
      args: args,
      provider: currentConfig.provider,
      baseUrl: currentConfig.baseUrl,
      currentModel: model,
      cluster: cluster,
      selectedModels: currentConfig.selectedModels || []
    };
    
    console.log('Sending request body:', requestBody);
    
    // 使用 api 实例发送请求
    const response = await api.post<ApiResponse>('/api/execute', requestBody);
    
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
    
    // 提供更友好的错误消息
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // 使用拦截器中已经处理的友好消息
        if ('friendlyMessage' in error) {
          throw error;
        }
        
        const friendlyMessage = '认证失败：API 密钥或令牌无效，请检查设置或重新登录';
        
        // 创建增强的错误对象
        const enhancedError = new Error(friendlyMessage) as EnhancedError;
        enhancedError.friendlyMessage = friendlyMessage;
        enhancedError.response = error.response;
        
        throw enhancedError;
      }
    }
    
    throw error;
  }
}

export default api; 