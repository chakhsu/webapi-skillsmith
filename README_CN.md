# Web API SkillSmith

**Web API SkillSmith** 是一款 Chrome 扩展，用于连接人类的网页交互与 AI Agent 能力。它会跟踪网页操作、记录 API 请求，并提供强大的 **Prompt Workbench**，用于为 AI Agents 生成工具定义的系统提示词。

## ✨ 功能特性

- **会话录制**：在用户交互期间捕获 HTTP 流量（Method、URL、Headers、Body）。
- **深度捕获**：基于 `chrome.debugger` 获取完整的请求/响应体。
- **Prompt Workbench**：
  - **技能生成**：将记录的轨迹转换为 AI 工具定义（OpenAI、Claude 等）。
  - **交互式操场**：在扩展内直接测试与优化提示词。
  - **上下文感知**：利用会话元数据生成更准确的提示。
- **仪表盘**：
  - **分组视图**：按域名组织会话。
  - **详细检查**：查看每个请求的细节。
  - **JSONL 导出**：导出数据用于微调或分析，可用于知识库。
- **持久化存储**：使用 IndexedDB 处理大规模数据集。
- **国际化**：提供完整的英文与中文支持。

## 🛠️ 技术栈

- **框架**：React + Vite + TypeScript
- **扩展**：Manifest V3
- **UI**：Shadcn UI + Tailwind CSS
- **AI**：集成 LLM 服务（OpenAI、Custom）

## 🚀 快速开始

### 安装

1. 克隆仓库：
   ```bash
   git clone https://github.com/chakhsu/webapi-skillsmith.git
   cd webapi-skillsmith
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 构建：
   ```bash
   npm run build
   ```

4. 加载到 Chrome：
   - 打开 `chrome://extensions`
   - 启用 **开发者模式**
   - 点击 **加载已解压的扩展程序**
   - 选择 `dist` 目录

## 📖 使用指南

### 1. 记录操作
- 点击 **WebAPISkillSmith** 图标
- 输入会话描述（例如「登录流程」）
- 点击 **Start Recording**
- 在目标网站执行操作
- 点击 **Stop Recording**

### 2. 生成技能
- 打开仪表盘
- 选择某个会话或域分组
- 点击 **Generate Prompt**（Sparkles 图标）
- 配置你的 LLM 设置
- 描述你的目标（例如「为该 API 创建一个 Python 工具」）
- 点击 **Generate** 获取 Agent Skill 定义

## 🤝 贡献

MIT 许可证
