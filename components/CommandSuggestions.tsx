import React from 'react';

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

interface CommandSuggestionsProps {
  isVisible: boolean;
  filter: string;
  onSelect: (command: Command) => void;
  selectedIndex: number;
}

const CommandSuggestions: React.FC<CommandSuggestionsProps> = ({
  isVisible,
  filter,
  onSelect,
  selectedIndex
}) => {
  if (!isVisible) return null;

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().startsWith(filter.toLowerCase().slice(1))
  );

  return (
    <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-lg shadow-lg border border-blue-500 overflow-hidden transition-all duration-200 transform origin-bottom">
      {filteredCommands.map((command, index) => (
        <div
          key={command.name}
          className={`p-3 cursor-pointer transition-colors ${
            index === selectedIndex
              ? 'bg-blue-500 text-white'
              : 'hover:bg-blue-50'
          }`}
          onClick={() => onSelect(command)}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">/{command.name}</span>
            <span className="text-sm opacity-70">
              {index === selectedIndex ? '按 Enter 选择' : '点击选择'}
            </span>
          </div>
          <p className="text-sm opacity-80 mt-1">{command.description}</p>
          <p className={`text-xs mt-1 ${
            index === selectedIndex ? 'text-blue-100' : 'text-gray-500'
          }`}>
            示例: {command.example}
          </p>
        </div>
      ))}
    </div>
  );
};

export default CommandSuggestions; 