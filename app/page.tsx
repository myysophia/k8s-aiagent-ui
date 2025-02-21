'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot as BotIcon } from 'lucide-react';
import Chat from '../components/Chat';

const models = ['gpt-4', 'gpt-3.5-turbo'];
const clusters = ['cluster1', 'cluster2'];

export default function Home() {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [selectedCluster, setSelectedCluster] = useState(clusters[0]);

  useEffect(() => {
    // 检查用户是否已登录
    const token = localStorage.getItem('jwt');
    if (!token) {
      router.push('/login');
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
      <main className="pt-20 px-4 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-800 bg-opacity-90 rounded-lg shadow-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full sm:w-32 p-2 bg-white text-gray-900 rounded-lg border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                
                <select
                  value={selectedCluster}
                  onChange={(e) => setSelectedCluster(e.target.value)}
                  className="w-full sm:w-32 p-2 bg-white text-gray-900 rounded-lg border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {clusters.map((cluster) => (
                    <option key={cluster} value={cluster}>
                      {cluster}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Chat model={selectedModel} cluster={selectedCluster} />
          </div>
        </div>
      </main>
    </div>
  );
}
