'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Trash, X, Plus } from 'lucide-react';
import { ApiConfig } from '../types/api-config';

const Settings: React.FC = () => {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  useEffect(() => {
    // 从 localStorage 加载配置
    const savedConfigs = localStorage.getItem('api_configs');
    if (savedConfigs) {
      const parsedConfigs = JSON.parse(savedConfigs);
      setConfigs(parsedConfigs);
    }

    // 获取当前选中的配置
    const savedCurrentConfigId = localStorage.getItem('current_config_id');
    if (savedCurrentConfigId) {
      setCurrentConfigId(savedCurrentConfigId);
    }
  }, []);

  const handleAddConfig = () => {
    setEditingConfigId(null);
    setShowForm(true);
  };

  const handleEditConfig = (configId: string) => {
    setEditingConfigId(configId);
    setShowForm(true);
  };

  const handleDeleteConfig = (configId: string) => {
    const updatedConfigs = configs.filter(config => config.id !== configId);
    setConfigs(updatedConfigs);
    localStorage.setItem('api_configs', JSON.stringify(updatedConfigs));
    
    // 如果删除的是当前选中的配置，重置当前配置
    if (configId === currentConfigId) {
      setCurrentConfigId(updatedConfigs.length > 0 ? updatedConfigs[0].id : null);
      localStorage.setItem('current_config_id', updatedConfigs.length > 0 ? updatedConfigs[0].id : '');
    }
  };

  const handleSelectConfig = (configId: string) => {
    setCurrentConfigId(configId);
    localStorage.setItem('current_config_id', configId);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    // 表单提交逻辑（未实现）
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-2xl font-bold mb-6 text-white">设置</h1>
        
        {/* API 配置列表 */}
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-8 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">API 配置</h2>
            <button
              onClick={handleAddConfig}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              添加配置
            </button>
          </div>
          
          {configs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              暂无配置，请添加新的 API 配置
            </div>
          ) : (
            <div className="space-y-6">
              {configs.map((config) => (
                <div 
                  key={config.id} 
                  className={`border rounded-lg p-4 ${
                    currentConfigId === config.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                    <div className="flex items-center mb-2 sm:mb-0">
                      <input
                        type="radio"
                        id={`config-${config.id}`}
                        name="current-config"
                        checked={currentConfigId === config.id}
                        onChange={() => handleSelectConfig(config.id)}
                        className="mr-2 h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                      />
                      <label 
                        htmlFor={`config-${config.id}`} 
                        className="font-medium text-gray-900 dark:text-white cursor-pointer"
                      >
                        {config.name}
                      </label>
                      <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {config.provider}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditConfig(config.id)}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(config.id)}
                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400"
                        title="删除"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API 地址</h3>
                      <p className="text-gray-800 dark:text-gray-200 break-all bg-gray-100 dark:bg-gray-700 p-2 rounded">
                        {config.baseUrl}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">可用模型</h3>
                      <div className="flex flex-wrap gap-2">
                        {config.selectedModels && config.selectedModels.map((model) => (
                          <span 
                            key={model} 
                            className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* 添加/编辑配置表单 */}
        {showForm && (
          <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-white">
              {editingConfigId ? '编辑配置' : '添加新配置'}
            </h2>
            
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  配置名称
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                  placeholder="输入配置名称"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  API 提供商
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                  placeholder="例如：OpenAI, Anthropic"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  API 密钥
                </label>
                <div className="relative">
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                    placeholder="输入 API 密钥"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300">
                    更改
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  API 地址
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                  placeholder="输入 API 地址"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  选择模型
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <div className="flex items-center bg-blue-900/40 text-blue-300 px-3 py-1 rounded-full">
                    <span>qwen-max-latest</span>
                    <button className="ml-2 text-blue-300 hover:text-blue-200">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center bg-blue-900/40 text-blue-300 px-3 py-1 rounded-full">
                    <span>qwen-plus</span>
                    <button className="ml-2 text-blue-300 hover:text-blue-200">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-700 text-white"
                    placeholder="输入模型名称，按回车添加"
                  />
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">推荐模型：</p>
                <div className="flex gap-2">
                  <a href="#" className="text-blue-400 hover:text-blue-300">qwen-plus</a>
                  <a href="#" className="text-blue-400 hover:text-blue-300">qwen-max</a>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  {editingConfigId ? '保存修改' : '添加配置'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings; 