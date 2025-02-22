import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface ModelSelectorProps {
  models: string[];
  selectedModels: string[];
  onChange: (models: string[]) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models = [],
  selectedModels = [],
  onChange,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newModel = inputValue.trim();
    if (!selectedModels.includes(newModel)) {
      onChange([...selectedModels, newModel]);
    }
    setInputValue('');
  };

  const handleRemoveModel = (modelToRemove: string) => {
    onChange(selectedModels.filter(model => model !== modelToRemove));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selectedModels.map(model => (
          <div
            key={model}
            className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
          >
            <span className="mr-1">{model}</span>
            <button
              type="button"
              onClick={() => handleRemoveModel(model)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddModel} className="flex space-x-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="输入模型名称，按回车添加"
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!inputValue.trim()}
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {models.length > 0 && (
        <div className="text-sm text-gray-500">
          推荐模型：
          <div className="flex flex-wrap gap-2 mt-1">
            {models.map(model => (
              <button
                key={model}
                type="button"
                onClick={() => {
                  if (!selectedModels.includes(model)) {
                    onChange([...selectedModels, model]);
                  }
                }}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {model}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector; 