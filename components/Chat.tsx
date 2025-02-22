import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { ChatMessage, sendCommand } from '../lib/api';
import CommandSuggestions from './CommandSuggestions';

interface Command {
  name: string;
  description: string;
  example: string;
}

const commands: Command[] = [
  {
    name: 'diagnose',
    description: '诊断 Pod 问题',
    example: '/diagnose pod-name -n namespace'
  },
  {
    name: 'analyze',
    description: '分析资源使用情况',
    example: '/analyze deployment/name -n namespace'
  },
  {
    name: 'execute',
    description: '执行 Kubernetes 命令',
    example: '/execute get pods -n namespace'
  },
  {
    name: 'help',
    description: '显示帮助信息',
    example: '/help [command]'
  }
];

interface ChatProps {
  model: string;
  cluster: string;
}

const Chat: React.FC<ChatProps> = ({ model, cluster }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 从 localStorage 加载历史消息
    const savedMessages = localStorage.getItem('chatHistory');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    // 保存最新的10条消息到 localStorage
    const latestMessages = messages.slice(-10);
    localStorage.setItem('chatHistory', JSON.stringify(latestMessages));
    // 滚动到最新消息
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => 
          prev < commands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const filteredCommands = commands.filter(cmd =>
          cmd.name.toLowerCase().startsWith(input.toLowerCase().slice(1))
        );
        if (filteredCommands[selectedCommandIndex]) {
          setInput('/' + filteredCommands[selectedCommandIndex].name + ' ');
          setShowCommands(false);
        }
      } else if (e.key === 'Escape') {
        setShowCommands(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    if (value === '/') {
      setShowCommands(true);
      setSelectedCommandIndex(0);
    } else if (value.startsWith('/')) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (input.startsWith('/') && !input.includes(' ')) {
      setError('请输入完整的命令，例如: /diagnose pod-name -n namespace');
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowCommands(false);

    try {
      const response = await sendCommand(input, model, cluster);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，处理您的请求时出现错误。请稍后重试。',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.timestamp}
            className={`flex items-start space-x-3 opacity-0 animate-fade-in ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'user' ? 'bg-gray-600' : 'bg-blue-500'
            }`}>
              {message.role === 'user' ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>
            
            <div className={`flex flex-col space-y-1 max-w-[75%] ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}>
              <div
                className={`rounded-lg p-4 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gray-700 text-white'
                    : 'bg-blue-100 text-gray-800'
                }`}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              <span className="text-gray-400 text-xs">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        
        {isLoading && (
          <div className="flex items-center justify-center space-x-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="animate-pulse">正在处理...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500 text-white rounded-lg animate-fade-in">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入 / 触发命令，或直接输入消息"
            className="w-full p-3 bg-white text-gray-700 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <CommandSuggestions
            isVisible={showCommands}
            filter={input}
            onSelect={(command) => {
              setInput('/' + command.name + ' ');
              setShowCommands(false);
              inputRef.current?.focus();
            }}
            selectedIndex={selectedCommandIndex}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              发送中
            </>
          ) : (
            <>
              发送
              <Send className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default Chat; 