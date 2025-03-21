import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Loader2, Terminal, MessageSquare, Settings, Copy, Check, Trash, Download, Plus, Pencil, X, ChevronDown } from 'lucide-react';
import { ChatMessage, sendMessage, ApiResponse } from '../lib/api';
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
      "当前集群的api-server地址是什么?",
      "当前kubeconfig都有什么权限?",
      "请将集群当前节点node name、cpu、内存、可用区、ip输出在表格中",
      "帮我切换到ems-uat-2集群",
      "查询集群的版本信息",
      "集群中 CPU 和内存Top3 Pod,并分析原因?"
    ]
  },
  {
    title: "查询K8s资源",
    examples: [
      "account pod的镜像版本是什么?",
      "middle-device pod的镜像版本?",
      "ems-uat ns下所有pod的镜像版本,输出在表格中: pod name、镜像版本",
      "device-gateway pod中当前目录的novastar_timen内容是什么?",
      "ems-common-front cm的外部网关是什么?",
      "ems-uat ns下所有pod的资源分配情况,输出在表格中: pod name、memory request、memory limit、cpu rquest、cpu limit"
    ]
  },
  {
    title: "查询日志/event",
    examples: [
      "account pod的日志,只展示最后10条",
      "集群的最近20条event",
      "ems-uat ns中的iotdb-datanode-0 pod中的/iotdb/logs/log_datanode_all.log 中包含energy的日志,只输出最后一条"
    ]
  },
  {
    title: "查询监控告警(Prometheus) - 开发中",
    examples: [
      "iotdb-datanode-0 pod 最近七天的内存趋势?",
      "查询集群node的磁盘使用情况?"
    ]
  },
  {
    title: "查询日志(Loki/efk)- 开发中",
    examples: [
      "查询pod 告警时间点的日志",
      "查询iotdb-datanode-0 pod 的最新的error日志"
    ]
  },
  {
    title: "告警故障自愈- 开发中",
    examples: [
      "pod/node 磁盘空间满了,帮我分析原因,并给出解决方案，等待执行",
      "多集群联动？例如帮我比较uat和prod的auth 服务的镜像版本?如果不一致,请帮我修改image为最新版本",
      "帮我检查mysql的test库的test_config表的test字段最新的一笔数据是什么?如果为空,请帮我运行XXX流水线"
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
  const [forceSessionsRefresh, setForceSessionsRefresh] = useState<number>(0);
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [pendingRequests, setPendingRequests] = useState<{[sessionId: string]: boolean}>({});

  // 组件挂载时设置为浅色模式
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

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
    
    // 返回新创建的会话ID
    return newSession.id;
  };

  // 切换会话
  const switchSession = (sessionId: string) => {
    // 先保存当前会话的状态
    if (sessionsState.currentSessionId) {
      // 从localStorage获取最新会话状态，避免数据丢失
      try {
        const savedSessions = JSON.parse(localStorage.getItem('chat_sessions') || '{}') as ChatSessionsState;
        const currentSessionMessages = messages;
        
        // 更新当前会话的消息
        const updatedSessions = savedSessions.sessions.map(session => 
          session.id === sessionsState.currentSessionId
            ? { ...session, messages: currentSessionMessages, updatedAt: Date.now() }
            : session
        );
        
        const updatedSessionsState = {
          ...savedSessions,
          sessions: updatedSessions,
        };
        
        // 保存到localStorage
        localStorage.setItem('chat_sessions', JSON.stringify(updatedSessionsState));
        
        console.log("已保存当前会话状态:", sessionsState.currentSessionId);
      } catch (error) {
        console.error("保存当前会话状态失败:", error);
      }
    }

    console.log("切换到会话:", sessionId);
    
    // 从localStorage获取最新状态
    const savedSessions = JSON.parse(localStorage.getItem('chat_sessions') || '{}') as ChatSessionsState;
    
    // 切换到新会话
    const session = savedSessions.sessions.find(s => s.id === sessionId);
    if (session) {
      // 使用新会话的state更新UI
      const newSessionsState = {
        ...savedSessions,
        currentSessionId: sessionId,
      };
      
      // 更新localStorage
      localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
      
      // 更新状态
      setSessionsState(newSessionsState);
      setMessages(session.messages || []);
      
      // 根据该会话是否有挂起的请求来设置加载状态
      const isSessionLoading = !!pendingRequests[sessionId];
      setIsLoading(isSessionLoading);
      
      setInput('');
      setError(null);
      
      console.log("已加载会话:", sessionId, "消息数:", session.messages?.length || 0, "加载状态:", isSessionLoading);
    }
  };

  // 删除会话
  const deleteSession = (sessionId: string) => {
    // 清除该会话的挂起请求状态
    setPendingRequests(prev => {
      const newState = {...prev};
      delete newState[sessionId];
      return newState;
    });
    
    const newSessions = sessionsState.sessions.filter(s => s.id !== sessionId);
    const newSessionsState = {
      sessions: newSessions,
      currentSessionId: newSessions.length > 0 ? newSessions[0].id : null,
    };
    
    setSessionsState(newSessionsState);
    if (newSessions.length > 0) {
      setMessages(newSessions[0].messages);
      // 检查新选中的会话是否有挂起的请求
      setIsLoading(!!pendingRequests[newSessions[0].id]);
    } else {
      setMessages([]);
      setIsLoading(false);
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
    console.log("开始更新会话名称:", sessionId, "新名称:", newName);
    
    // 从localStorage获取最新会话状态
    const latestSessions = JSON.parse(localStorage.getItem('chat_sessions') || '{"sessions":[]}') as ChatSessionsState;
    
    // 确保会话存在
    if (!latestSessions.sessions.some(s => s.id === sessionId)) {
      console.error("会话不存在:", sessionId);
      return;
    }
    
    // 检查会话名称是否已经是新名称 - 避免重复更新
    const existingSession = latestSessions.sessions.find(s => s.id === sessionId);
    if (existingSession && existingSession.name === newName) {
      console.log("会话名称已经是新名称，无需更新:", newName);
      return;
    }
    
    // 使用最新会话状态更新名称
    const newSessions = latestSessions.sessions.map(session =>
      session.id === sessionId
        ? { ...session, name: newName }
        : session
    );
    
    const newSessionsState = {
      ...latestSessions,
      sessions: newSessions,
    };
    
    console.log("更新后的会话状态:", newSessionsState);
    
    // 先更新localStorage，确保状态持久化
    localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
    
    // 然后更新组件状态
    setSessionsState(prev => {
      // 构建一个全新的状态对象，避免引用问题
      const updatedState = JSON.parse(JSON.stringify(newSessionsState));
      console.log("更新UI状态:", updatedState);
      return updatedState;
    });
    
    // 强制刷新会话列表
    setForceSessionsRefresh(prev => prev + 1);
    
    // 确保会话列表UI能强制刷新
    setTimeout(() => {
      try {
        // 重新读取localStorage，确保获取最新状态
        const storedState = JSON.parse(localStorage.getItem('chat_sessions') || '{}') as ChatSessionsState;
        
        // 验证重命名是否成功
        const session = storedState.sessions.find(s => s.id === sessionId);
        if (session && session.name !== newName) {
          console.warn("会话名称未更新，尝试再次更新:", sessionId);
          
          // 如果名称没更新，重新应用更改
          const fixedSessions = storedState.sessions.map(s => 
            s.id === sessionId ? {...s, name: newName} : s
          );
          
          const fixedState = {
            ...storedState,
            sessions: fixedSessions
          };
          
          localStorage.setItem('chat_sessions', JSON.stringify(fixedState));
          setSessionsState(fixedState);
          // 再次强制刷新
          setForceSessionsRefresh(prev => prev + 1);
        } else {
          console.log("会话名称已成功更新:", session?.name);
        }
      } catch (err) {
        console.error("会话名称更新检查失败:", err);
      }
    }, 200);
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
    let currentSessionId = sessionsState.currentSessionId;
    if (!currentSessionId) {
      currentSessionId = createNewSession();
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

    // 重要：在消息处理前先获取当前会话的最新消息
    const latestSessions = JSON.parse(localStorage.getItem('chat_sessions') || '{"sessions":[]}') as ChatSessionsState;
    const currentSession = latestSessions.sessions.find(s => s.id === currentSessionId);
    let currentMessages = messages;
    
    // 如果localStorage中的消息和当前显示的不同，使用localStorage中的消息
    if (currentSession && JSON.stringify(currentSession.messages) !== JSON.stringify(messages)) {
      console.log("使用localStorage中的消息，避免数据不一致");
      currentMessages = currentSession.messages;
      setMessages(currentMessages); // 同步UI显示
    }
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: processedInput,
      timestamp: Date.now(),
      type: 'command',
    };
    
    // 如果是会话的第一条消息或默认名称，重命名会话
    if (currentSession) {
      // 检查会话是否使用默认名称（以"会话"开头）
      if (currentSession.name.match(/^会话\s\d+$/) || currentSession.messages.length === 0) {
        const newName = generateSessionName(processedInput);
        console.log("重命名会话:", currentSessionId, "新名称:", newName); // 调试日志
        updateSessionName(currentSessionId, newName);
      }
    }

    // 更新消息和状态
    const newMessages = [...currentMessages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    // 标记该会话正在等待响应
    setPendingRequests(prev => ({...prev, [currentSessionId!]: true}));
    setShowCommands(false);

    // 立即更新会话状态
    const updatedSessions = latestSessions.sessions.map(session => 
      session.id === currentSessionId
        ? { ...session, messages: newMessages, updatedAt: Date.now() }
        : session
    );
    
    const newSessionsState = {
      ...latestSessions,
      sessions: updatedSessions,
      currentSessionId: currentSessionId,
    };
    
    setSessionsState(newSessionsState);
    localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
    console.log("已保存用户消息到会话:", currentSessionId);

    try {
      const response = await sendMessage(processedInput, currentModel, cluster);
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        type: 'command',
      };
      
      // 重要：再次获取最新会话状态，以防在请求过程中状态已改变
      const latestSessionsAfterResponse = JSON.parse(localStorage.getItem('chat_sessions') || '{"sessions":[]}') as ChatSessionsState;
      const targetSession = latestSessionsAfterResponse.sessions.find(s => s.id === currentSessionId);
      
      if (targetSession) {
        // 获取会话最新的消息 - 确保使用最新状态
        const sessionMessages = [...targetSession.messages, assistantMessage];
        
        // 更新会话状态
        const updatedSessions = latestSessionsAfterResponse.sessions.map(session => 
          session.id === currentSessionId
            ? { ...session, messages: sessionMessages, updatedAt: Date.now() }
            : session
        );
        
        const updatedSessionsState = {
          ...latestSessionsAfterResponse,
          sessions: updatedSessions,
        };
        
        // 更新localStorage
        localStorage.setItem('chat_sessions', JSON.stringify(updatedSessionsState));
        console.log("已保存AI回复到会话:", currentSessionId);
        
        // 如果当前还在这个会话，更新UI
        if (sessionsState.currentSessionId === currentSessionId) {
          console.log("当前显示会话仍是:", currentSessionId, "更新UI");
          setMessages(sessionMessages);
        } else {
          console.log("当前显示会话已切换为:", sessionsState.currentSessionId, "不更新UI");
        }
        
        // 如果会话名称仍是默认名称，重新尝试更新名称
        if (targetSession.name.match(/^会话\s\d+$/)) {
          const newName = generateSessionName(processedInput);
          updateSessionName(currentSessionId, newName);
        }
        
        // 更新状态
        setSessionsState(prev => ({
          ...prev,
          sessions: prev.currentSessionId === currentSessionId ? 
            updatedSessions : // 如果当前会话ID未改变，更新会话列表
            prev.sessions.map(s => s.id === currentSessionId ? // 如果已改变，仅更新特定会话
              updatedSessions.find(us => us.id === currentSessionId) || s : s)
        }));
      }
      
      // 清除该会话的等待状态
      setPendingRequests(prev => {
        const newState = {...prev};
        delete newState[currentSessionId!];
        return newState;
      });
      
      // 如果当前显示的是发送请求的会话，重置加载状态
      if (sessionsState.currentSessionId === currentSessionId) {
        setIsLoading(false);
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
      
      // 获取最新的会话状态
      const latestSessionsAfterError = JSON.parse(localStorage.getItem('chat_sessions') || '{"sessions":[]}') as ChatSessionsState;
      const targetSession = latestSessionsAfterError.sessions.find(s => s.id === currentSessionId);
      
      if (targetSession) {
        // 获取会话最新的消息 - 确保使用最新状态
        const sessionMessages = [...targetSession.messages, errorMessage];
        
        // 更新会话状态
        const updatedSessions = latestSessionsAfterError.sessions.map(session => 
          session.id === currentSessionId
            ? { ...session, messages: sessionMessages, updatedAt: Date.now() }
            : session
        );
        
        const updatedSessionsState = {
          ...latestSessionsAfterError,
          sessions: updatedSessions,
        };
        
        // 更新localStorage
        localStorage.setItem('chat_sessions', JSON.stringify(updatedSessionsState));
        console.log("已保存错误回复到会话:", currentSessionId);
        
        // 如果当前还在这个会话，更新UI
        if (sessionsState.currentSessionId === currentSessionId) {
          console.log("当前显示会话仍是:", currentSessionId, "更新UI错误消息");
          setMessages(sessionMessages);
        } else {
          console.log("当前显示会话已切换为:", sessionsState.currentSessionId, "不更新UI错误消息");
        }
        
        // 如果会话名称仍是默认名称，重新尝试更新名称
        if (targetSession.name.match(/^会话\s\d+$/)) {
          const newName = generateSessionName(processedInput);
          updateSessionName(currentSessionId, newName);
        }
        
        // 更新状态
        setSessionsState(prev => ({
          ...prev,
          sessions: prev.currentSessionId === currentSessionId ? 
            updatedSessions : // 如果当前会话ID未改变，更新会话列表
            prev.sessions.map(s => s.id === currentSessionId ? // 如果已改变，仅更新特定会话
              updatedSessions.find(us => us.id === currentSessionId) || s : s)
        }));
      }
      
      // 清除该会话的等待状态
      setPendingRequests(prev => {
        const newState = {...prev};
        delete newState[currentSessionId!];
        return newState;
      });
      
      // 如果当前显示的是发送请求的会话，重置加载状态
      if (sessionsState.currentSessionId === currentSessionId) {
        setIsLoading(false);
      }
      
      if (error.message?.includes('API 配置')) {
        setTimeout(() => router.push('/settings'), 2000);
      }
    } finally {
      // 这里不再设置isLoading，因为已经在try和catch中处理了
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
    // 从localStorage获取最新状态，确保显示最新的会话名称
    try {
      const savedSessions = localStorage.getItem('chat_sessions');
      if (savedSessions) {
        const latestSessions = JSON.parse(savedSessions) as ChatSessionsState;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        return {
          today: latestSessions.sessions.filter(s => new Date(s.createdAt) >= today),
          yesterday: latestSessions.sessions.filter(s => {
            const date = new Date(s.createdAt);
            return date >= yesterday && date < today;
          }),
          lastWeek: latestSessions.sessions.filter(s => {
            const date = new Date(s.createdAt);
            return date >= lastWeek && date < yesterday;
          }),
          older: latestSessions.sessions.filter(s => new Date(s.createdAt) < lastWeek),
        };
      }
    } catch (error) {
      console.error("获取会话分组失败:", error);
    }
    
    // 回退到组件状态
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
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
    
    // 从localStorage获取最新状态
    try {
      const savedSessions = JSON.parse(localStorage.getItem('chat_sessions') || '{}') as ChatSessionsState;
      
      // 使用最新会话状态更新名称
      const newSessions = savedSessions.sessions.map(session =>
        session.id === sessionId
          ? { ...session, name: editSessionName.trim() }
          : session
      );
      
      const newSessionsState = {
        ...savedSessions,
        sessions: newSessions,
      };
      
      // 先更新localStorage
      localStorage.setItem('chat_sessions', JSON.stringify(newSessionsState));
      console.log("手动重命名会话:", sessionId, "新名称:", editSessionName.trim());
      
      // 再更新UI状态
      setSessionsState(newSessionsState);
      setForceSessionsRefresh(prev => prev + 1); // 强制刷新
    } catch (error) {
      console.error("重命名会话失败:", error);
    }
    
    // 退出编辑模式
    setIsEditingSession(null);
  };

  // 渲染会话列表项
  const renderSessionItem = (session: ChatSession) => (
    <div
      key={`${session.id}-${forceSessionsRefresh}`}
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
            <div className="flex items-center">
              <span className="truncate">{session.name}</span>
              {pendingRequests[session.id] && (
                <span className={`ml-2 flex items-center text-xs ${
                  session.id === sessionsState.currentSessionId
                    ? 'text-white/80' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  <span className="animate-pulse">处理中</span>
                </span>
              )}
            </div>
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
        <div 
          className={`bg-gradient-to-r from-blue-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 relative transition-all duration-300 ease-in-out ${
            showHelp ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="p-5">
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
              
              <div className="space-y-2">
                {questionCategories.map((category) => (
                  <div 
                    key={category.title} 
                    className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === category.title ? null : category.title)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <h4 className="text-blue-600 dark:text-blue-400 font-medium">{category.title}</h4>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                          expandedCategory === category.title ? 'transform rotate-180' : ''
                        }`}
                      />
                    </button>
                    
                    <div 
                      className={`transition-all duration-200 ease-in-out ${
                        expandedCategory === category.title 
                          ? 'max-h-[500px] opacity-100' 
                          : 'max-h-0 opacity-0 overflow-hidden'
                      }`}
                    >
                      <div className="px-4 pb-4">
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 pl-2">
                          {category.examples.map((example, index) => (
                            <li key={index} className="flex items-start">
                              <div className="min-w-4 text-blue-500 mr-2">•</div>
                              <span 
                                className={`text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors ${
                                  category.title.includes('开发中') ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                onClick={() => {
                                  if (!category.title.includes('开发中')) {
                                    setInput(example);
                                    inputRef.current?.focus();
                                    setExpandedCategory(null); // 选择后关闭手风琴
                                  }
                                }}
                              >
                                {example}
                                {category.title.includes('开发中') && (
                                  <span className="ml-2 text-xs text-gray-500">(开发中)</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

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
            
            <div className="h-12 flex items-center justify-center">
              {isLoading && sessionsState.currentSessionId && (
                <div className="flex items-center justify-center space-x-2 text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="animate-pulse">正在处理...</span>
                </div>
              )}
            </div>
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