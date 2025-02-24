# K8s AI Agent

[English](#english) | [中文](#中文)

## English

### Introduction
K8s AI Agent is an intelligent Kubernetes operations assistant powered by Large Language Models (LLMs). It helps DevOps teams manage and diagnose Kubernetes clusters through natural language interaction.

### Key Features
1. **Intelligent Command Execution**
   - Natural language to Kubernetes command conversion
   - Execute kubectl operations via `/execute` command
   - Smart intent understanding and execution

2. **Problem Diagnosis**
   - Diagnose Pod and resource issues with `/diagnose`
   - Automatic log, event, and resource state analysis
   - Root cause analysis and solution recommendations

3. **Resource Analysis**
   - Analyze resource usage with `/analyze`
   - Monitor cluster resource utilization
   - Provide optimization suggestions

4. **Multi-Model Support**
   - Support multiple AI providers (OpenAI, Anthropic, etc.)
   - Configurable models for different scenarios
   - Flexible API configuration management

### Technical Stack
- Frontend: Next.js 13+, TypeScript, Tailwind CSS
- Authentication: LDAP Integration, JWT
- Security: API Key Management, Fine-grained Access Control
- UI/UX: Real-time Response, Markdown Support, Dark Theme

### Getting Started

1. **Installation**
```bash
# Clone the repository
git clone [https://github.com/yourusername/k8s-aiagent-ui.git](https://github.com/myysophia/k8s-aiagent-ui.git)

# Install dependencies
cd k8s-aiagent-ui
npm install

# Start development server
npm run dev
```

2. **Configuration**
- Configure LDAP authentication
- Set up API providers and keys
- Configure Kubernetes cluster access

3. **Usage**
- Access http://localhost:3000
- Log in with LDAP credentials
- Start interacting with your clusters

### Security Features
- Enterprise LDAP Authentication
- JWT Token Authentication
- API Key Management
- Operation Audit Logging

### License
MIT License

---

## 中文

### 项目介绍
K8s AI Agent 是一个基于大语言模型的 Kubernetes 智能运维助手，通过自然语言交互方式，帮助运维团队更高效地管理和诊断 Kubernetes 集群。

### 核心功能
1. **智能命令执行**
   - 自然语言转换为 Kubernetes 命令
   - 通过 `/execute` 命令执行 kubectl 操作
   - 智能理解用户意图并执行相应操作

2. **问题诊断**
   - 使用 `/diagnose` 诊断 Pod 和资源问题
   - 自动分析日志、事件和资源状态
   - 提供问题原因分析和解决方案

3. **资源分析**
   - 使用 `/analyze` 分析资源使用情况
   - 监控集群资源利用率
   - 提供优化建议

4. **多模型支持**
   - 支持多个 AI 模型提供商（OpenAI、Anthropic 等）
   - 可配置不同场景使用不同模型
   - 灵活的 API 配置管理

### 技术栈
- 前端：Next.js 13+、TypeScript、Tailwind CSS
- 认证：LDAP 集成、JWT
- 安全：API 密钥管理、细粒度访问控制
- 界面：实时响应、Markdown 支持、深色主题

### 快速开始

1. **安装**
```bash
# 克隆仓库
git clone https://github.com/yourusername/k8s-aiagent-ui.git

# 安装依赖
cd k8s-aiagent-ui
npm install

# 启动开发服务器
npm run dev
```

2. **配置**
- 配置 LDAP 认证
- 设置 API 提供商和密钥
- 配置 Kubernetes 集群访问

3. **使用**
- 访问 http://localhost:3000
- 使用 LDAP 凭据登录
- 开始与集群交互

### 安全特性
- 企业级 LDAP 认证
- JWT 令牌认证
- API 密钥管理
- 操作审计日志

### 使用场景
1. **日常运维**
   - 快速执行常用命令
   - 批量操作管理
   - 状态监控和告警

2. **问题排查**
   - 故障诊断
   - 日志分析
   - 性能优化
   - 配置审查

3. **资源管理**
   - 资源使用监控
   - 容量规划
   - 成本优化
   - 安全检查

### 开源协议
MIT License
