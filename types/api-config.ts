import { ChatMessage } from '../lib/api';

// 支持的 API 提供商及其默认配置
export interface ProviderConfig {
  name: string;          // 显示名称
  baseUrl: string;       // 默认 API 地址
  models: string[];      // 支持的模型列表
  keyPattern?: RegExp;   // API 密钥格式验证
  description: string;   // 提供商描述
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  OpenAI: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    keyPattern: /^sk-[A-Za-z0-9]{32,}$/,
    description: '支持 GPT-4 和 GPT-3.5 系列模型',
  },
  Anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus', 'claude-3-sonnet'],
    keyPattern: /^sk-ant-[A-Za-z0-9]{32,}$/,
    description: '支持 Claude 系列模型',
  },
  Custom: {
    name: '自定义',
    baseUrl: 'http://localhost:8080',
    models: [],
    description: '自定义 API 端点和模型',
  },
};

export interface ApiConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  selectedModels: string[];  // 用户选择的模型
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ApiConfigFormData {
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  selectedModels: string[];
}

export const DEFAULT_CONFIG: Partial<ApiConfig> = {
  provider: 'OpenAI',
  baseUrl: PROVIDERS.OpenAI.baseUrl,
  selectedModels: [],
  isActive: true,
};

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model: string;
  cluster: string;
}

export interface ChatSessionsState {
  sessions: ChatSession[];
  currentSessionId: string | null;
}

export const DEFAULT_SESSIONS_STATE: ChatSessionsState = {
  sessions: [],
  currentSessionId: null,
}; 