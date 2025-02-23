import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Loader2, Terminal, MessageSquare, Settings, Copy, Check, Trash, Download, Plus, Pencil, X, ChevronDown } from 'lucide-react';
import { ChatMessage, sendMessage } from '../lib/api';
import CommandSuggestions from './CommandSuggestions';
import { useRouter } from 'next/navigation';
import { ApiConfig, ChatSession, ChatSessionsState, DEFAULT_SESSIONS_STATE } from '../types/api-config';

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
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ApiConfig | null>(null);
  const [sessionsState, setSessionsState] = useState<ChatSessionsState>(DEFAULT_SESSIONS_STATE);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [isEditingSession, setIsEditingSession] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

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

  // 加载和监听 API 配置
  useEffect(() => {
    const loadConfig = () => {
      const savedConfigs = localStorage.getItem('api_configs');
      if (savedConfigs) {
        const configs = JSON.parse(savedConfigs) as ApiConfig[];
        setCurrentConfig(configs.length > 0 ? configs[0] : null);
      } else {
        setCurrentConfig(null);
      }
    };

    // 初始加载
    loadConfig();

    // 监听 storage 变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'api_configs') {
        loadConfig();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 加载会话状态
  useEffect(() => {
    const savedSessions = localStorage.getItem('chat_sessions');
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions) as ChatSessionsState;
      setSessionsState(sessions);
      
      // 如果有当前会话，加载其消息
      if (sessions.currentSessionId) {
        const currentSession = sessions.sessions.find(s => s.id === sessions.currentSessionId);
        if (currentSession) {
          setMessages(currentSession.messages);
        }
      }
    }
  }, []);

  // 保存会话状态
  useEffect(() => {
    if (sessionsState.currentSessionId) {
      const updatedSessions = sessionsState.sessions.map(session => 
        session.id === sessionsState.currentSessionId
          ? { ...session, messages, updatedAt: Date.now() }
          : session
      );
      
      const newSessionsState = {
        ...sessionsState,
        sessions: updatedSessions,
      };
      
      setSessionsState(newSessionsState);
      localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
    }
  }, [messages]);

  // 创建新会话
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      name: `会话 ${sessionsState.sessions.length + 1}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model,
      cluster,
    };

    const newSessionsState = {
      sessions: [...sessionsState.sessions, newSession],
      currentSessionId: newSession.id,
    };

    setSessionsState(newSessionsState);
    setMessages([]);
    localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
  };

  // 切换会话
  const switchSession = (sessionId: string) => {
    const session = sessionsState.sessions.find(s => s.id === sessionId);
    if (session) {
      setSessionsState(prev => ({ ...prev, currentSessionId: sessionId }));
      setMessages(session.messages);
    }
  };

  // 删除会话
  const deleteSession = (sessionId: string) => {
    const newSessions = sessionsState.sessions.filter(s => s.id !== sessionId);
    const newSessionsState = {
      sessions: newSessions,
      currentSessionId: newSessions.length > 0 ? newSessions[0].id : null,
    };
    
    setSessionsState(newSessionsState);
    if (newSessions.length > 0) {
      setMessages(newSessions[0].messages);
    } else {
      setMessages([]);
    }
    
    localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
  };

  // 导出会话
  const exportSession = (sessionId: string) => {
    const session = sessionsState.sessions.find(s => s.id === sessionId);
    if (session) {
      const exportData = {
        ...session,
        exportedAt: new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-session-${session.name}-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

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
    } else if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
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

  // 根据消息内容生成会话名称
  const generateSessionName = (content: string): string => {
    // 移除命令前缀
    const text = content.startsWith('/') 
      ? content.split(' ').slice(1).join(' ')
      : content;
    
    // 提取前20个字符，确保不会截断中文字符
    const truncated = text.slice(0, 20).trim();
    return truncated + (text.length > 20 ? '...' : '');
  };

  // 更新会话名称
  const updateSessionName = (sessionId: string, newName: string) => {
    const newSessions = sessionsState.sessions.map(session =>
      session.id === sessionId
        ? { ...session, name: newName }
        : session
    );
    
    const newSessionsState = {
      ...sessionsState,
      sessions: newSessions,
    };
    
    setSessionsState(newSessionsState);
    localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
  };

  // 修改 handleSubmit 函数
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!currentConfig) {
      setError('请先在设置页面配置 API');
      return;
    }

    // 如果没有活动会话，创建一个新会话
    if (!sessionsState.currentSessionId) {
      createNewSession();
    }

    // 检查命令格式
    if (input.startsWith('/')) {
      const parts = input.slice(1).split(' ');
      if (parts.length < 2) {
        setError('请输入完整的命令，例如: /diagnose pod-name -n namespace');
        return;
      }
      
      const action = parts[0].toLowerCase();
      if (!commands.some(cmd => cmd.name === action)) {
        setError(`不支持的命令: ${action}`);
        return;
      }
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
      type: input.startsWith('/') ? 'command' : 'chat',
    };

    // 如果是会话的第一条消息，自动更新会话名称
    const currentSession = sessionsState.sessions.find(s => s.id === sessionsState.currentSessionId);
    if (currentSession && currentSession.messages.length === 0) {
      const newName = generateSessionName(input);
      updateSessionName(currentSession.id, newName);
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowCommands(false);

    try {
      const response = await sendMessage(input, model, cluster);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        type: userMessage.type,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      // 检查是否有响应数据
      const responseData = error.response?.data;
      let errorContent = '';
      
      // 优先使用友好错误消息
      if (error.friendlyMessage) {
        errorContent = error.friendlyMessage;
      } else if (typeof responseData === 'string') {
        try {
          // 尝试解析 JSON 字符串
          const parsedData = JSON.parse(responseData);
          errorContent = parsedData.message;
        } catch {
          errorContent = responseData;
        }
      } else if (responseData?.message) {
        errorContent = responseData.message;
      } else {
        errorContent = error.message || '抱歉，处理您的请求时出现错误。请稍后重试。';
      }

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: errorContent,
        timestamp: Date.now(),
        type: userMessage.type,
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // 如果是配置错误，提示用户前往设置页面
      if (error.message?.includes('API 配置')) {
        setTimeout(() => router.push('/settings'), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (content: string, timestamp: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(timestamp);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // 获取会话分组
  const getSessionGroups = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    return {
      today: sessionsState.sessions.filter(s => new Date(s.createdAt) >= today),
      yesterday: sessionsState.sessions.filter(s => {
        const date = new Date(s.createdAt);
        return date >= yesterday && date < today;
      }),
      lastWeek: sessionsState.sessions.filter(s => {
        const date = new Date(s.createdAt);
        return date >= lastWeek && date < yesterday;
      }),
      older: sessionsState.sessions.filter(s => new Date(s.createdAt) < lastWeek),
    };
  };

  // 重命名会话
  const renameSession = (sessionId: string) => {
    if (!editSessionName.trim()) return;
    
    const newSessions = sessionsState.sessions.map(session =>
      session.id === sessionId
        ? { ...session, name: editSessionName.trim() }
        : session
    );
    
    const newSessionsState = {
      ...sessionsState,
      sessions: newSessions,
    };
    
    setSessionsState(newSessionsState);
    localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
    setIsEditingSession(null);
  };

  // 渲染会话列表项
  const renderSessionItem = (session: ChatSession) => (
    <div
      key={session.id}
      className={`group flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        session.id === sessionsState.currentSessionId
          ? 'bg-blue-500 text-white'
          : 'text-gray-300 hover:bg-gray-600'
      }`}
    >
      {isEditingSession === session.id ? (
        <div className="flex-1 flex items-center space-x-2">
          <input
            type="text"
            value={editSessionName}
            onChange={(e) => setEditSessionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                renameSession(session.id);
              } else if (e.key === 'Escape') {
                setIsEditingSession(null);
              }
            }}
            className="flex-1 bg-gray-700 text-white px-2 py-1 rounded"
            autoFocus
          />
          <button
            onClick={() => renameSession(session.id)}
            className="text-green-400 hover:text-green-300"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsEditingSession(null)}
            className="text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => switchSession(session.id)}
            className="flex-1 text-sm text-left truncate"
          >
            {session.name}
          </button>
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setIsEditingSession(session.id);
                setEditSessionName(session.name);
              }}
              className="p-1 hover:text-blue-300"
              title="重命名"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => exportSession(session.id)}
              className="p-1 hover:text-blue-300"
              title="导出会话"
            >
              <Download className="w-3 h-3" />
            </button>
            <button
              onClick={() => deleteSession(session.id)}
              className="p-1 hover:text-red-300"
              title="删除会话"
            >
              <Trash className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900">
      {/* 左侧边栏 */}
      <div className={`${showSidebar ? 'w-64' : 'w-0'} flex-shrink-0 bg-gray-800 transition-all duration-300 overflow-hidden`}>
        <div className="flex flex-col h-full p-2">
          <button
            onClick={createNewSession}
            className="flex items-center justify-center w-full px-3 py-2 mb-4 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            新建会话
          </button>

          <div className="flex-1 overflow-y-auto space-y-4">
            {Object.entries(getSessionGroups()).map(([period, sessions]) => 
              sessions.length > 0 && (
                <div key={period}>
                  <div className="flex items-center px-3 py-1 text-xs text-gray-400 uppercase">
                    <ChevronDown className="w-3 h-3 mr-1" />
                    {period === 'today' && '今天'}
                    {period === 'yesterday' && '昨天'}
                    {period === 'lastWeek' && '最近 7 天'}
                    {period === 'older' && '更早'}
                  </div>
                  <div className="space-y-1">
                    {sessions.map(renderSessionItem)}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部导航栏 */}
        <div className="h-14 border-b border-gray-700 flex items-center px-4">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {currentConfig && (
            <div className="ml-4 flex items-center space-x-2">
              <span className="text-sm text-white">{currentConfig.name}</span>
              <span className="text-xs text-gray-400">({currentConfig.provider})</span>
            </div>
          )}
          <button
            onClick={() => router.push('/settings')}
            className="ml-auto text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
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
                  <div className="flex items-center space-x-2">
                    {message.type === 'command' && (
                      <Terminal className="w-4 h-4 text-gray-400" />
                    )}
                    {message.type === 'chat' && (
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-gray-400 text-xs">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`relative group rounded-lg p-4 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gray-700 text-white'
                        : 'bg-blue-100 text-gray-800'
                    }`}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                    <button
                      onClick={() => copyToClipboard(message.content, message.timestamp)}
                      className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200"
                      title="复制内容"
                    >
                      {copiedMessageId === message.timestamp ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
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
            <div className="mx-4 mb-4 p-3 bg-red-500 text-white rounded-lg animate-fade-in">
              {error}
            </div>
          )}
          
          <div className="border-t border-gray-700 p-4">
            <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息，按回车发送（Shift + 回车换行）"
                  className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        </div>
      </div>
    </div>
  );
};

export default Chat; 