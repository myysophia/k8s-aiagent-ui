import React, { useState, useEffect } from 'react';
import { Trash2, Save, Lock, AlertCircle } from 'lucide-react';
import { ApiConfig, ApiConfigFormData, PROVIDERS } from '../types/api-config';
import ModelSelector from './ModelSelector';

interface ApiConfigCardProps {
  config: ApiConfig;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<ApiConfig>) => void;
}

const ApiConfigCard: React.FC<ApiConfigCardProps> = ({
  config,
  onDelete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ApiConfigFormData>({
    name: config.name,
    provider: config.provider,
    apiKey: '',
    baseUrl: config.baseUrl,
    selectedModels: config.selectedModels,
  });
  const [error, setError] = useState<string | null>(null);

  // 当提供商改变时更新默认值
  useEffect(() => {
    if (formData.provider !== config.provider) {
      const provider = PROVIDERS[formData.provider];
      setFormData(prev => ({
        ...prev,
        baseUrl: provider.baseUrl,
        selectedModels: [],
      }));
    }
  }, [formData.provider, config.provider]);

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('请输入配置名称');
      return false;
    }

    if (!formData.baseUrl.trim()) {
      setError('请输入 API 地址');
      return false;
    }

    try {
      new URL(formData.baseUrl);
    } catch {
      setError('请输入有效的 API 地址');
      return false;
    }

    if (formData.selectedModels.length === 0) {
      setError('请至少选择一个模型');
      return false;
    }

    return true;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsEditing(true);
    setError(null);
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const updateData: Partial<ApiConfig> = {
      name: formData.name,
      provider: formData.provider,
      baseUrl: formData.baseUrl,
      selectedModels: formData.selectedModels,
      updatedAt: Date.now(),
    };

    if (formData.apiKey) {
      updateData.apiKey = formData.apiKey;
    }

    onUpdate(config.id, updateData);
    setIsEditing(false);
    setFormData(prev => ({ ...prev, apiKey: '' }));
    setError(null);
  };

  const currentProvider = PROVIDERS[formData.provider];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 relative animate-fade-in">
      <button
        onClick={() => onDelete(config.id)}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
        aria-label="删除配置"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            配置名称
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例如：OpenAI API"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API 提供商
          </label>
          <select
            name="provider"
            value={formData.provider}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(PROVIDERS).map(([key, provider]) => (
              <option key={key} value={key}>
                {provider.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">{currentProvider.description}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API 密钥
          </label>
          <div className="relative">
            {config.apiKey ? (
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span>{'••••••••' + config.apiKey.slice(-4)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, apiKey: '' }))}
                  className="px-3 py-2 text-sm text-blue-500 hover:text-blue-600"
                >
                  更改
                </button>
              </div>
            ) : (
              <input
                type="password"
                name="apiKey"
                value={formData.apiKey}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入新的 API 密钥"
                autoComplete="off"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API 地址
          </label>
          <input
            type="text"
            name="baseUrl"
            value={formData.baseUrl}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://api.openai.com/v1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            选择模型
          </label>
          <ModelSelector
            models={currentProvider.models}
            selectedModels={formData.selectedModels}
            onChange={(models) => {
              setFormData(prev => ({ ...prev, selectedModels: models }));
              setIsEditing(true);
              setError(null);
            }}
          />
        </div>

        {error && (
          <div className="flex items-center space-x-2 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {isEditing && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              保存更改
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiConfigCard; 