<div align="center">
  <img src="public/skillsmith-logo.png" alt="Web API SkillSmith Logo" width="120" />
</div>

# Web API SkillSmith

**Web API SkillSmith** is a Chrome Extension that bridges the gap between human web interaction and AI Agent capabilities. It tracks web operations, records API requests, and provides a powerful **Prompt Workbench** to generate tool definitions and system prompts for AI Agents.

## ✨ Features

- **Session Recording**: Capture HTTP traffic (Method, URL, Headers, Body) during user interactions.
- **Deep Capture**: Leverages `chrome.debugger` for full request/response body visibility.
- **Prompt Workbench**:
    - **Skill Generation**: Convert recorded traces into AI tool definitions (OpenA, Claude, etc.).
    - **Interactive Playground**: Test and refine prompts directly within the extension.
    - **Context Awareness**: Use session metadata to generate more accurate prompts.
- **Dashboard**:
  - **Grouped View**: Organize sessions by domain.
  - **Inspection**: Detailed view of every request.
  - **JSONL Export**: Export data for fine-tuning or analysis.
- **Persistent Storage**: Uses IndexedDB for handling large datasets.
- **Internationalization**: Full English and Chinese support.

## 🛠️ Technology Stack

- **Framework**: React + Vite + TypeScript
- **Extension**: Manifest V3
- **UI**: Shadcn UI + Tailwind CSS
- **AI**: Integrated LLM Service (OpenAI, Custom)

## 🚀 Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/chakhsu/webapi-skillsmith.git
   cd webapi-skillsmith
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build:
   ```bash
   npm run build
   ```

4. Load into Chrome:
   - Go to `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `dist` directory

## 📖 Usage

### 1. Record Actions
- Click the **WebAPISkillSmith** icon.
- Enter a session description (e.g., "Login Flow").
- Click **Start Recording**.
- Perform actions on the target website.
- Click **Stop Recording**.

### 2. Generate Skills
- Open the Dashboard.
- Select a session or domain group.
- Click **Generate Prompt** (Sparkles icon).
- Configure your LLM settings.
- describe your goal (e.g., "Create a Python tool for this API").
- Click **Generate** to get your Agent Skill definition.

## 🤝 Contributing

MIT License

