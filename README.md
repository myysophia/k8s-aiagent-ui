# K8s AI Agent

[English](#english) | [中文](#中文)

## English

### Introduction
K8s AI Agent is an intelligent Kubernetes operations assistant powered by Large Language Models (LLMs). It helps DevOps teams manage and diagnose Kubernetes clusters through natural language interaction.
<img width="1497" alt="image" src="https://github.com/user-attachments/assets/5df5bf15-c737-48ad-ae85-6d984563e470" />

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
   - Support multiple AI providers (OpenAI, Qwen, etc.)
   - Configurable models for different scenarios
   - Flexible API configuration management
<img width="1302" alt="image" src="https://github.com/user-attachments/assets/5ad4eae7-ea4f-4e04-b00d-ac1e1de84678" />

5. **Enhanced User Experience**
   - Light/Dark mode theme switching
   - Guided question suggestions
   - Session management with history
   - Markdown and code syntax highlighting

### Technical Stack
- Frontend: Next.js 15+, React 19, TypeScript, Tailwind CSS
- State Management: Local Storage for configurations and sessions
- UI Components: Lucide React for icons, React Markdown for content rendering
- Theming: next-themes for light/dark mode support
- Security: API Key Management, Fine-grained Access Control
- UI/UX: Real-time Response, Markdown Support, Responsive Design

### Getting Started

1. **Installation**
```bash
# Clone the repository
git clone https://github.com/myysophia/k8s-aiagent-ui.git

# Install dependencies
cd k8s-aiagent-ui
npm install

# Start development server
npm run dev
```

2. **Configuration**
- Set up API providers and keys in the Settings page
- Configure model selection
- Customize theme preferences

3. **Usage**
- Access http://localhost:3000
- Configure your API settings
- Start interacting with your clusters
- Use the suggested questions or type your own commands

### Security Features
- API Key Management
- Secure Storage of Configurations
- Operation Audit Logging

### License
MIT License
### Contact me
<img width="247" alt="image" src="https://github.com/user-attachments/assets/d883080c-87d1-46b4-b128-8bb6d0e73e69" />

---

## 中文

### 项目介绍
K8s AI Agent 是一个基于大语言模型的 Kubernetes 智能运维助手，通过自然语言交互方式，帮助运维团队更高效地管理和诊断 Kubernetes 集群。
<img width="1497" alt="image" src="https://github.com/user-attachments/assets/d69b11ff-380f-4121-a224-075759de4ba2" />


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
   - 支持多个 AI 模型提供商（OpenAI、Qwen 等）
   - 可配置不同场景使用不同模型
   - 灵活的 API 配置管理
<img width="1302" alt="image" src="https://github.com/user-attachments/assets/b4613240-43a4-4528-bbf2-3509421ef044" />

5. **增强用户体验**
   - 浅色/深色主题切换
   - 引导式问题建议
   - 会话管理与历史记录
   - Markdown 和代码语法高亮

### 技术栈
- 前端：Next.js 15+、React 19、TypeScript、Tailwind CSS
- 状态管理：本地存储配置和会话信息
- UI 组件：Lucide React 图标库、React Markdown 内容渲染
- 主题：next-themes 实现浅色/深色模式支持
- 安全：API 密钥管理、细粒度访问控制
- 界面：实时响应、Markdown 支持、响应式设计

### 快速开始

1. **安装**
```bash
# 克隆仓库
git clone https://github.com/myysophia/k8s-aiagent-ui.git

# 安装依赖
cd k8s-aiagent-ui
npm install

# 启动开发服务器
npm run dev
```

2. **配置**
- 在设置页面配置 API 提供商和密钥
- 配置模型选择
- 自定义主题偏好

3. **使用**
- 访问 http://localhost:3000
- 配置 API 设置
- 开始与集群交互
- 使用推荐问题或输入自定义命令

### 安全特性
- API 密钥管理
- 配置安全存储
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
### 联系方式
<img width="247" alt="image" src="https://github.com/user-attachments/assets/a33ae4fe-53b6-4c3d-99df-e79e06c07197" />

## CI/CD 和部署

### GitHub Actions 自动构建

本项目使用 GitHub Actions 自动构建 Docker 镜像并发布到 GitHub Container Registry (GHCR)。

工作流程将在以下情况下触发：
- 推送到 `main` 或 `develop` 分支
- 创建新的版本标签 (v*)
- 手动触发工作流程

#### 自动化流程

1. **构建阶段**：
   - 检出代码
   - 设置 Node.js 环境
   - 安装依赖
   - 运行代码检查
   - 构建 Docker 镜像
   - 推送镜像到 GHCR

2. **部署阶段**：
   - 根据分支或标签自动部署到相应环境
   - `main` 分支和版本标签 -> 生产环境
   - `develop` 分支 -> 测试环境

### 手动部署

如果需要手动构建和部署 Docker 镜像，可以按照以下步骤操作：

```bash
# 构建 Docker 镜像
docker build -t k8s-aiagent-ui:latest .

# 运行 Docker 容器
docker run -p 3000:3000 -e NEXT_PUBLIC_API_BASE_URL=/api k8s-aiagent-ui:latest
```

### Kubernetes 部署

项目包含了 Kubernetes 部署配置文件，位于 `k8s` 目录下：

```bash
# 创建命名空间
kubectl apply -f k8s/namespace.yaml

# 部署应用
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# 检查部署状态
kubectl get pods -n k8s-aiagent
kubectl get svc -n k8s-aiagent
kubectl get ingress -n k8s-aiagent
```

访问应用：
- URL: http://k8s-aiagent-ui.lab

### 环境变量配置

Docker 和 Kubernetes 部署中支持以下环境变量：

- `NEXT_PUBLIC_API_BASE_URL`: API 基础 URL，默认为 `/api`
- `PORT`: 应用监听端口，默认为 `3000`

