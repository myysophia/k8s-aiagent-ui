import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="flex items-center space-x-2 bg-gray-700 dark:bg-gray-800 p-1 rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'light' 
            ? 'bg-blue-500 text-white' 
            : 'text-gray-400 hover:text-white hover:bg-gray-600'
        }`}
        aria-label="使用浅色模式"
        title="浅色模式"
      >
        <Sun size={18} />
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'dark' 
            ? 'bg-blue-500 text-white' 
            : 'text-gray-400 hover:text-white hover:bg-gray-600'
        }`}
        aria-label="使用深色模式"
        title="深色模式"
      >
        <Moon size={18} />
      </button>
      
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'system' 
            ? 'bg-blue-500 text-white' 
            : 'text-gray-400 hover:text-white hover:bg-gray-600'
        }`}
        aria-label="使用系统设置"
        title="跟随系统"
      >
        <Monitor size={18} />
      </button>
    </div>
  );
};

export default ThemeToggle; 