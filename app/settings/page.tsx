'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Bot as BotIcon } from 'lucide-react';
import { ApiConfig, DEFAULT_CONFIG } from '../../types/api-config';
import ApiConfigCard from '../../components/ApiConfigCard';
import FeedbackToast from '../../components/FeedbackToast';
import { generateUUID } from '../../lib/utils';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

export default function Settings() {
  const router = useRouter();
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      router.push('/login');
      return;
    }

    const savedConfigs = localStorage.getItem('api_configs');
    if (savedConfigs) {
      setConfigs(JSON.parse(savedConfigs));
    } else {
      // 创建默认配置
      const defaultConfig: ApiConfig = {
        ...DEFAULT_CONFIG,
        id: generateUUID(),
        name: 'Qwen',
        apiKey: '',
        selectedModels: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as ApiConfig;
      setConfigs([defaultConfig]);
      saveConfigs([defaultConfig]);
    }
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleAddConfig = () => {
    const newConfig: ApiConfig = {
      ...DEFAULT_CONFIG,
      id: generateUUID(),
      name: `配置 ${configs.length + 1}`,
      apiKey: '',
      selectedModels: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as ApiConfig;

    setConfigs(prev => [...prev, newConfig]);
    saveConfigs([...configs, newConfig]);
    showFeedback('success', '已添加新配置');
  };

  const handleDeleteConfig = (id: string) => {
    if (configs.length === 1) {
      showFeedback('error', '至少需要保留一个配置');
      return;
    }

    const newConfigs = configs.filter(config => config.id !== id);
    setConfigs(newConfigs);
    saveConfigs(newConfigs);
    showFeedback('success', '配置已删除');
  };

  const handleUpdateConfig = (id: string, data: Partial<ApiConfig>) => {
    const newConfigs = configs.map(config =>
      config.id === id ? { ...config, ...data } : config
    );
    setConfigs(newConfigs);
    saveConfigs(newConfigs);
    showFeedback('success', '配置已更新');
  };

  const saveConfigs = (newConfigs: ApiConfig[]) => {
    localStorage.setItem('api_configs', JSON.stringify(newConfigs));
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <nav className="fixed top-0 w-full h-[60px] bg-gray-800 shadow-md z-50">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BotIcon className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-white">API 设置</h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            返回聊天
          </button>
        </div>
      </nav>

      <main className="pt-20 px-4 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 bg-opacity-90 rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <p className="text-gray-300 text-sm">
                配置多个 API 端点和密钥，支持不同的模型提供商。每个配置可以选择多个模型，系统会自动选择合适的模型处理请求。
              </p>
            </div>

            <div className="space-y-4">
              {configs.map(config => (
                <ApiConfigCard
                  key={config.id}
                  config={config}
                  onDelete={handleDeleteConfig}
                  onUpdate={handleUpdateConfig}
                />
              ))}
            </div>

            <button
              onClick={handleAddConfig}
              className="mt-6 flex items-center px-4 py-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              添加新配置
            </button>
          </div>
        </div>
      </main>

      {feedback && (
        <FeedbackToast type={feedback.type} message={feedback.message} />
      )}
    </div>
  );
} 