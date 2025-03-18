'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot as BotIcon } from 'lucide-react';
import Chat from '../components/Chat';
import { ApiConfig } from '../types/api-config';

export default function Home() {
  const router = useRouter();
  const [, setConfigs] = useState<ApiConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ApiConfig | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    // 检查用户是否已登录
    const token = localStorage.getItem('jwt');
    if (!token) {
      router.push('/login');
      return;
    }

    // 加载 API 配置
    const savedConfigs = localStorage.getItem('api_configs');
    if (savedConfigs) {
      const parsedConfigs = JSON.parse(savedConfigs);
      setConfigs(parsedConfigs);
      // 选择第一个配置作为默认配置
      if (parsedConfigs.length > 0) {
        const firstConfig = parsedConfigs[0];
        setSelectedConfig(firstConfig);
        // 选择第一个可用的模型
        if (firstConfig.selectedModels.length > 0) {
          setSelectedModel(firstConfig.selectedModels[0]);
        }
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* 导航栏 */}
      <nav className="fixed top-0 w-full h-[60px] bg-gray-800 shadow-md z-50">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BotIcon className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">K8s AI Agent</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => router.push('/')}
              className="text-white hover:text-gray-300 transition-colors"
            >
              聊天
            </button>
            <button 
              onClick={() => router.push('/settings')}
              className="text-white hover:text-gray-300 transition-colors"
            >
              设置
            </button>
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <main className="pt-[60px] h-screen">
        <div className="h-full">
          <div className="h-full bg-gray-800 bg-opacity-90">
            {selectedConfig ? (
              <Chat model={selectedModel} cluster="default" />
            ) : (
              <div className="text-center text-gray-400 py-8">
                请先在设置页面配置 API
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
