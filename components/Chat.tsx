import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Loader2, Terminal, MessageSquare, Settings, Copy, Check, Trash, Download, Plus, Pencil, X, ChevronDown } from 'lucide-react';
import { ChatMessage, sendMessage } from '../lib/api';
import CommandSuggestions from './CommandSuggestions';
import { useRouter } from 'next/navigation';
import { ApiConfig, ChatSession, ChatSessionsState, DEFAULT_SESSIONS_STATE } from '../types/api-config';
import { generateUUID } from '../lib/utils';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

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

interface QuestionCategory {
  title: string;
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  command: string;
}


interface ChatProps {
  model: string;
  cluster: string;
}

// 添加问题类别和示例
const questionCategories = [
  {
    title: "查询集群信息",
    examples: [
      "集群名称是什么？",
      "集群的节点信息是什么？",
      "请将集群当前节点node name、cpu、内存、可用区、ip输出在表格中",
      "帮我切换到ems-uat-2集群"
    ]
  },
  {
    title: "查询K8s资源",
    examples: [
      "account pod的镜像版本是什么？",
      "device-gateway pod中当前目录的novastar_timen内容是什么？",
      "iotdb-datanode-0 pod的env中的dn_rpc_port端口是什么？",
      "ems-common-front cm的外部网关是什么？",
      "请帮我输出ems-uat ns下所有pod的资源分配情况，输出在表格中: pod name、memory request、memory limit、cpu rquest、cpu limit"
    ]
  },
  {
    title: "查询日志/event",
    examples: [
      "account pod的日志,只展示最后10条",
      "集群的最近20条event",
      "查询pod内的日志,需要提供pod name、日志路径"
    ]
  }
];

const Chat: React.FC<ChatProps> = ({ model: initialModel, cluster }) => {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<ApiConfig | null>(null);
  const [currentModel, setCurrentModel] = useState(initialModel);
  const [sessionsState, setSessionsState] = useState<ChatSessionsState>(DEFAULT_SESSIONS_STATE);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [isEditingSession, setIsEditingSession] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(true);
  const { theme, setTheme } = useTheme();

  // 组件挂载时设置为浅色模式
  useEffect(() => {
    setTheme('light');
  }, []);

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
        const parsedConfigs = JSON.parse(savedConfigs) as ApiConfig[];
        setConfigs(parsedConfigs);
        
        if (parsedConfigs.length > 0) {
          // 获取当前选中的配置ID
          const currentConfigId = localStorage.getItem('current_config_id');
          let configToUse: ApiConfig | null = null;
          
          if (currentConfigId) {
            configToUse = parsedConfigs.find(c => c.id === currentConfigId) || null;
          }
          
          // 如果没有当前配置，使用第一个配置
          if (!configToUse) {
            configToUse = parsedConfigs[0];
            localStorage.setItem('current_config_id', configToUse.id);
          }
          
          setCurrentConfig(configToUse);
          
          // 设置当前模型
          if (configToUse && configToUse.selectedModels.length > 0) {
            setCurrentModel(configToUse.selectedModels[0]);
          }
        } else {
          setCurrentConfig(null);
        }
      } else {
        setConfigs([]);
        setCurrentConfig(null);
      }
    };

    // 初始加载
    loadConfig();

    // 监听 storage 变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'api_configs' || e.key === 'current_config_id') {
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
    if (sessionsState.currentSessionId && messages) {
      const updatedSessions = sessionsState.sessions.map(session => 
        session.id === sessionsState.currentSessionId
          ? { ...session, messages: [...messages], updatedAt: Date.now() }
          : session
      );
      
      const newSessionsState = {
        ...sessionsState,
        sessions: updatedSessions,
      };
      
      setSessionsState(newSessionsState);
      localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
    }
  }, [messages, sessionsState.currentSessionId]);

  // 创建新会话
  const createNewSession = () => {
    // 先保存当前会话的状态
    if (sessionsState.currentSessionId) {
      const updatedSessions = sessionsState.sessions.map(session => 
        session.id === sessionsState.currentSessionId
          ? { ...session, messages: [...messages], updatedAt: Date.now() }
          : session
      );
      setSessionsState(prev => ({
        ...prev,
        sessions: updatedSessions
      }));
    }

    // 创建新会话
    const newSession: ChatSession = {
      id: generateUUID(),
      name: `会话 ${sessionsState.sessions.length + 1}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: currentModel,
      cluster,
    };

    // 更新会话状态
    const newSessionsState = {
      sessions: [...(sessionsState.sessions || []), newSession],
      currentSessionId: newSession.id,
    };

    // 重置状态
    setIsLoading(false);
    setInput('');
    setError(null);
    setMessages([]);
    setSessionsState(newSessionsState);
    localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
  };

  // 切换会话
  const switchSession = (sessionId: string) => {
    // 先保存当前会话的状态
    if (sessionsState.currentSessionId) {
      const updatedSessions = sessionsState.sessions.map(session => 
        session.id === sessionsState.currentSessionId
          ? { ...session, messages: [...messages], updatedAt: Date.now() }
          : session
      );
      setSessionsState(prev => ({
        ...prev,
        sessions: updatedSessions
      }));
    }

    // 切换到新会话
    const session = sessionsState.sessions.find(s => s.id === sessionId);
    if (session) {
      setSessionsState(prev => ({ 
        ...prev, 
        currentSessionId: sessionId 
      }));
      setMessages(session.messages || []);
      setIsLoading(false);
      setInput('');
      setError(null);
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
    if (isComposing) {
      return;
    }

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
    if (!input.trim() || isLoading) return;

    // 关闭问题示例
    setShowHelp(false);

    if (!currentConfig) {
      setError('请先在设置页面配置 API');
      return;
    }

    // 如果没有活动会话，创建一个新会话
    if (!sessionsState.currentSessionId) {
      createNewSession();
    }

    // 处理输入内容
    let processedInput = input;
    if (!input.startsWith('/')) {
      processedInput = `/execute ${input}`;
    }

    // 检查命令格式
    const parts = processedInput.slice(1).split(' ');
    const action = parts[0].toLowerCase();
    
    if (parts.length < 2) {
      setError('请输入完整的命令，例如: /diagnose pod-name -n namespace');
      return;
    }
    
    if (!commands.some(cmd => cmd.name === action)) {
      setError(`不支持的命令: ${action}`);
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: processedInput,
      timestamp: Date.now(),
      type: 'command',
    };

    // 保存当前会话 ID，以防在请求过程中切换会话
    const currentSessionId = sessionsState.currentSessionId;

    // 如果是会话的第一条消息，自动更新会话名称
    const currentSession = sessionsState.sessions.find(s => s.id === currentSessionId);
    if (currentSession && currentSession.messages.length === 0) {
      const newName = generateSessionName(processedInput);
      updateSessionName(currentSession.id, newName);
    }

    // 更新消息和状态
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setShowCommands(false);

    // 立即更新会话状态
    const updatedSessions = sessionsState.sessions.map(session => 
      session.id === currentSessionId
        ? { ...session, messages: newMessages, updatedAt: Date.now() }
        : session
    );
    
    const newSessionsState = {
      ...sessionsState,
      sessions: updatedSessions,
    };
    
    setSessionsState(newSessionsState);
    localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));

    try {
      const response = await sendMessage(processedInput, currentModel, cluster);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        type: 'command',
      };
      
      // 确保消息被添加到正确的会话中
      if (sessionsState.currentSessionId === currentSessionId) {
        const newMessages = [...messages, userMessage, assistantMessage];
        setMessages(newMessages);
        
        // 立即更新会话状态
        const updatedSessions = sessionsState.sessions.map(session => 
          session.id === currentSessionId
            ? { ...session, messages: newMessages, updatedAt: Date.now() }
            : session
        );
        
        const newSessionsState = {
          ...sessionsState,
          sessions: updatedSessions,
        };
        
        setSessionsState(newSessionsState);
        localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
      }
    } catch (error: any) {
      const responseData = error.response?.data;
      let errorContent = '';
      
      if (error.friendlyMessage) {
        errorContent = error.friendlyMessage;
      } else if (typeof responseData === 'string') {
        try {
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
        type: 'command',
      };
      
      // 确保错误消息被添加到正确的会话中
      if (sessionsState.currentSessionId === currentSessionId) {
        const newMessages = [...messages, userMessage, errorMessage];
        setMessages(newMessages);
        
        // 立即更新会话状态
        const updatedSessions = sessionsState.sessions.map(session => 
          session.id === currentSessionId
            ? { ...session, messages: newMessages, updatedAt: Date.now() }
            : session
        );
        
        const newSessionsState = {
          ...sessionsState,
          sessions: updatedSessions,
        };
        
        setSessionsState(newSessionsState);
        localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
      }
      
      if (error.message?.includes('API 配置')) {
        setTimeout(() => router.push('/settings'), 2000);
      }
    } finally {
      if (sessionsState.currentSessionId === currentSessionId) {
        setIsLoading(false);
      }
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
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
            className="flex-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-white px-2 py-1 rounded border border-gray-300 dark:border-gray-600"
            autoFocus
          />
          <button
            onClick={() => renameSession(session.id)}
            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsEditingSession(null)}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
              className="p-1 hover:text-blue-600 dark:hover:text-blue-300"
              title="重命名"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => exportSession(session.id)}
              className="p-1 hover:text-blue-600 dark:hover:text-blue-300"
              title="导出会话"
            >
              <Download className="w-3 h-3" />
            </button>
            <button
              onClick={() => deleteSession(session.id)}
              className="p-1 hover:text-red-600 dark:hover:text-red-300"
              title="删除会话"
            >
              <Trash className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  // 添加消息内容处理函数
  const processMessageContent = (message: ChatMessage): string => {
    let content = message.content;
    
    // 如果内容是 JSON 字符串，尝试解析它
    if (typeof content === 'string' && content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed.message) {
          // 尝试解析内部的 message 字段
          try {
            const innerParsed = JSON.parse(parsed.message);
            if (innerParsed.final_answer) {
              content = innerParsed.final_answer;
            }
          } catch {
            content = parsed.message;
          }
        }
      } catch (e) {
        console.error('Failed to parse message content:', e);
      }
    }

    // 移除命令前缀
    if (message.type === 'command' && content.startsWith('/execute ')) {
      content = content.slice(9);
    }

    return content;
  };

  // 切换 API 配置
  const handleConfigChange = (configId: string) => {
    const newConfig = configs.find(c => c.id === configId);
    if (newConfig) {
      setCurrentConfig(newConfig);
      // 保存当前选中的配置ID
      localStorage.setItem('current_config_id', configId);
      // 当切换配置时，自动选择第一个可用的模型
      if (newConfig.selectedModels.length > 0) {
        setCurrentModel(newConfig.selectedModels[0]);
      }
    }
  };

  // 切换模型
  const handleModelChange = (modelName: string) => {
    setCurrentModel(modelName);
  };

  // 添加处理问题点击的函数
  const handleQuestionClick = (command: string) => {
    setInput(command);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* 左侧边栏 - 仅保留会话列表 */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} flex-shrink-0 bg-gray-100 dark:bg-gray-800 transition-all duration-300 overflow-hidden`}>
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
                  <div className="flex items-center px-3 py-1 text-xs text-gray-600 dark:text-gray-400 uppercase font-medium">
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
      <div className="flex-1 flex flex-col h-full">
        {/* 顶部导航栏 */}
        <div className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center px-6 bg-white dark:bg-gray-800">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="ml-4 flex items-center space-x-4">
            {/* API 配置选择器 */}
            <select
              value={currentConfig?.id}
              onChange={(e) => handleConfigChange(e.target.value)}
              className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2"
            >
              {configs.map(config => (
                <option key={config.id} value={config.id}>
                  {config.name} ({config.provider})
                </option>
              ))}
            </select>

            {/* 模型选择器 */}
            {currentConfig && (
              <select
                value={currentModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white text-sm rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-2"
              >
                {currentConfig.selectedModels.map(modelName => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="ml-auto flex items-center space-x-3">
            {/* 主题切换按钮 */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
              title={theme === 'dark' ? '浅色模式' : '深色模式'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            
            <button
              onClick={() => router.push('/settings')}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 功能介绍区域 - 优化浅色模式配色 */}
        {showHelp && (
          <div className="bg-gradient-to-r from-blue-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 p-5 border-b border-gray-200 dark:border-gray-700 relative">
            <div className="max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
                  我可以帮您解决以下问题
                </h3>
                <button 
                  onClick={() => setShowHelp(false)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                  title="关闭帮助"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {questionCategories.map((category) => (
                  <div 
                    key={category.title} 
                    className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md"
                  >
                    <h4 className="text-blue-600 dark:text-blue-400 font-medium mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">{category.title}</h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 pl-2">
                      {category.examples.map((example, index) => (
                        <li key={index} className="flex items-start">
                          <div className="min-w-4 text-blue-500 mr-2">•</div>
                          <span className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors"
                                onClick={() => {
                                  setInput(example);
                                  inputRef.current?.focus();
                                }}>
                            {example}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 如果帮助栏被关闭，添加一个按钮可以重新打开 */}
        {!showHelp && (
          <div className="flex justify-center py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <button 
              onClick={() => setShowHelp(true)}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white flex items-center transition-colors"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              显示功能帮助
            </button>
          </div>
        )}

        {/* 消息区域 */}
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-5xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.timestamp}
                className={`flex items-start space-x-3 opacity-0 animate-fade-in ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-blue-100 dark:bg-gray-600' : 'bg-blue-500'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-blue-600 dark:text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                
                <div className={`flex flex-col space-y-1 max-w-[75%] ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                }`}>
                  <div className="flex items-center space-x-2">
                    {message.type === 'command' && (
                      <Terminal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    )}
                    {message.type === 'chat' && (
                      <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    )}
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`relative group rounded-lg p-4 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-blue-50 dark:bg-gray-700 text-gray-800 dark:text-white'
                        : 'bg-white dark:bg-blue-900/30 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-transparent'
                    }`}
                  >
                    <div className="markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h3: ({children}) => <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">{children}</h3>,
                          ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
                          li: ({children}) => <li className="text-base whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200">{children}</li>,
                          code: ({children}) => <code className="bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-300 px-1 py-0.5 rounded font-mono text-sm whitespace-pre-wrap break-words">{children}</code>,
                          p: ({children}) => <p className="mb-4 last:mb-0 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200">{children}</p>,
                          table: ({children}) => <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 mb-4">{children}</table>,
                          thead: ({children}) => <thead className="bg-gray-100 dark:bg-gray-700">{children}</thead>,
                          tbody: ({children}) => <tbody>{children}</tbody>,
                          tr: ({children}) => <tr className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">{children}</tr>,
                          th: ({children}) => <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-white border-r border-gray-300 dark:border-gray-600 last:border-r-0">{children}</th>,
                          td: ({children}) => <td className="px-4 py-2 border-r border-gray-300 dark:border-gray-600 last:border-r-0 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200">{children}</td>
                        }}
                      >
                        {processMessageContent(message)}
                      </ReactMarkdown>
                    </div>
                    <button
                      onClick={() => copyToClipboard(processMessageContent(message), message.timestamp)}
                      className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="复制内容"
                    >
                      {copiedMessageId === message.timestamp ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            
            {isLoading && (
              <div className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="animate-pulse">正在处理...</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-auto max-w-5xl px-6 mb-4">
            <div className="p-3 bg-red-500 text-white rounded-lg animate-fade-in">
              {error}
            </div>
          </div>
        )}
        
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto">
            <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="输入消息，按回车发送（Shift + 回车换行）"
                  className={`w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !currentConfig ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={!currentConfig}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || !currentConfig}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors duration-200 ${
                    isLoading || !input.trim() || !currentConfig
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat; 