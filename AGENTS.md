# Web API SkillSmith Project Context for Agents

This document provides high-level context, architectural decisions, and coding limitations for AI agents working on this codebase.

## 🎯 Project Goal
**Web API SkillSmith** (formerly ActionTrace) is a Chrome Extension that records HTTP traffic and uses an embedded **LLM Prompt Workbench** to transform these traces into **AI Agent Skills** or **Tool Definitions**.

## 🏗 Architecture
- **Type**: Chrome Extension (Manifest V3).
- **Core Technology**:
  - `chrome.debugger` for network interception.
  - `IndexedDB` for converting infinite stream of requests into session-based records.
  - `LLMService` for generating prompts from data.

## 🧩 Key Components

### 1. LLM Prompt Workbench
The core differentiator. It takes raw HTTP records + Session Metadata and feeds them into an LLM (OpenAI/Azure/Custom) with a specialized **Meta Prompt**.
- **Location**: `src/options/components/PromptWorkbenchDialog.tsx`
- **Function**: Allows users to iterate on the "Skill Definition" prompt using their own browsing data as the few-shot or context examples.

### 2. Background Service
- `src/background/debugger.ts`: Critical component. It manages the `chrome.debugger` lifecycle.
- **Constraints**: 
    - Must handle browser warning banners.
    - Must handle large response bodies (streaming/chunking in future, currently full memory).

### 3. Database (`src/lib/db.ts`)
- **Name**: Internal DB name is kept as `SkillSmithDB` to preserve legacy user data.
- **Class**: `SkillSmithDatabase`.

## ⚠️ Development Rules
1. **Name Consistency**: Use "WebAPISkillSmith" in UI strings.
2. **Data Safety**: Do not change the `IndexedDB` name without a migration plan.
3. **LLM Usage**: Use `LLMService` abstraction. Do not hardcode API calls in components.
