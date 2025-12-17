下面是一份 **精炼、清晰、能直接给 AI IDE 使用的《技术需求文档》**。
内容包含：功能需求、数据结构、页面结构、插件架构、事件流、权限、技术选型（React 生态）、以及未来扩展性。

---

# **Chrome 插件技术需求文档（Network Logger to JSONL）**

## **1. 产品概述**

该 Chrome 扩展用于在用户指定的一段操作期间，自动记录浏览器产生的 **Network HTTP 请求日志**，并将结果整理成 **可编辑、可导出的 JSONL 文件**，用于大模型训练与知识库构建。

扩展包含两个用户可见界面：

* **Popup 页面**：用于控制记录流程
* **Options 页面**：作为后台管理界面，用于 Session 管理、数据导出、主题/语言设置

---

# **2. 系统整体架构**

```
┌───────────────────────────┐
│         Popup UI          │
│  - 输入操作描述            │
│  - 开始/结束记录           │
│  - 动态状态展示            │
└───────▲───────────────────┘
        │(控制命令)
┌───────┴───────────────────┐
│      Background Service     │
│  - 控制 HTTP 捕获开关       │
│  - 维护当前会话 Session      │
│  - 存储与调用 chrome.debugger│
│  - 将记录写入 IndexedDB     │
└───────▲────────────────────┘
        │(读取/更新数据)
┌───────┴────────────────────┐
│        Options UI           │
│  - Session 列表和详情       │
│  - 数据编辑与导出 JSONL     │
│  - 主题与语言配置           │
└─────────────────────────────┘
```

---

# **3. 功能需求**

## **3.1 Popup 页面**

### 🔸 状态一：未激活（Recording OFF）

元素：

* 输入框：用于输入用户即将进行的操作描述（operation_description）
* 按钮：

  * **开始记录**
  * **进入后台（跳转到 options.html）**

交互：

1. 用户输入操作描述
2. 点击「开始记录」
3. background service 开启 HTTP 捕获
4. Popup 切到激活状态

---

### 🔸 状态二：激活中（Recording ON）

元素：

* 实时状态展示

  * 已捕获 HTTP Request 数量（count）
  * 当前 Session ID（可选）
* 按钮：

  * **结束记录**
  * **进入后台**

交互：

1. 点击「结束记录」
2. background service 停止监听
3. Session 自动保存
4. Popup 回到未激活状态

---

## **3.2 Options 页面（后台管理）**

### 功能模块

#### **① Session 列表**

* 按照一级域名对 session 分组

* 按照域名显示所有历史 Session
  * session id
  * 创建时间
  * 操作描述
  * 请求数量
  * 按照时间倒序

提供操作：

* 查看详情
* 删除 Session
* 导出 JSONL
* 批量导出

---

#### **② Session 详情页**

显示内容：

* 操作描述
* 开始/结束时间
* 捕获的所有 HTTP 请求记录（可编辑）

每条记录包含：

* URL
* Method
* Request Headers
* Request Body
* Response Status
* Response Headers
* Response Body
* Timestamp

可进行：

* 编辑字段
* 删除某条记录

---

#### **③ JSONL 导出**

导出格式（每行一条 HTTP 记录）：

```jsonl
{"description": "...", "url": "", "method": "", "req": {}, "res": {}, "ts": 123456789 }
```

* 支持导出全部 Session / 某个 Session
* 支持文件名定制：`session-{session_id}.jsonl`

---

#### **④ 配置中心**

* 主题：

  * Light
  * Dark
* 语言：

  * 中文
  * 英文

设置需：

* popup 与 options 统一读取
* 存储于 chrome.storage.sync

---

# **4. 数据结构设计**

## **4.1 Session 数据结构**

```ts
interface Session {
  id: string;
  description: string;
  startTime: number;
  endTime: number;
  domain: string;
  records: HttpRecord[];
}
```

## **4.2 HTTP Record**

```ts
interface HttpRecord {
  id: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: any;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: any;
  timestamp: number;
}
```

---

# **5. 插件内部通信机制（必须）**

使用 Chrome 扩展通信方案：

### **Popup → Background**

```
start_recording(description)
stop_recording()
get_status()
```

### **Options → Background**

```
get_sessions()
get_session_detail(id)
delete_session(id)
export_jsonl(id)
```

---

# **6. Network 捕获方案**

必须使用：

### **chrome.debugger API**

原理：

1. background 附加到当前 activeTab
2. 启动 Network.enable
3. 监听以下事件：

   * `Network.requestWillBeSent`
   * `Network.responseReceived`
   * `Network.loadingFinished`
4. 收集 request/response body
5. 整合并写入 IndexedDB

这是唯一支持请求体与响应体完整捕获的 API。

---

# **7. 本地存储方案**

### 使用 IndexedDB 存储 Session 数据

技术栈：Dexie.js（与 React 生态兼容）

存储内容：

* domain 表
* Session 表
* HTTP Records 表

---

# **8. 技术选型（React 生态）**

| 模块     | 技术                                              |
| ------ | ----------------------------------------------- |
| UI 框架  | React + Vite                                    |
| UI 组件库 | Shadcn UI            |
| 状态管理   | Zustand                             |
| 数据存储   | IndexedDB + Dexie.js                            |
| 国际化    | i18next                                         |
| 样式     | TailwindCSS                                     |
| 构建     | Manifest V3 + Vite Plugin for Chrome Extensions |
| 格式导出   | 使用纯 JS 生成 JSONL blob                            |

---

# **9. JSONL 生成规则**

每条记录为一行：

```ts
function toJsonl(records: HttpRecord[]) {
  return records.map(r => JSON.stringify(r)).join("\n");
}
```

---

# **10. 权限配置（manifest.json）**

```json
{
  "manifest_version": 3,
  "name": "Network Logger JSONL",
  "version": "1.0.0",
  "permissions": [
    "debugger",
    "storage",
    "downloads",
    "activeTab",
    "scripting"
  ],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_popup": "popup.html"
  },
  "options_page": "options.html"
}
```

---

# **11. 事件流（核心逻辑）**

### 1）开始记录流程

```
Popup → Background: start_recording()
Background:
  attach debugger on active tab
  Network.enable
  create new session
  start capturing
Popup:
  更新 UI 为激活状态
```

### 2）捕获 HTTP 请求

```
Background:
  on requestWillBeSent → 创建 record
  on responseReceived → 填充 response 信息
  on loadingFinished → 请求完成 → 写入 IndexedDB
```

### 3）结束记录

```
Popup → Background: stop_recording()
Background:
  Network.disable
  detach debugger
  更新 session endTime
Popup:
  更新 UI → 未激活状态
```

---

# **12. 国际化与主题（Popup + Options）**

统一从：

* `chrome.storage.sync` 读取：

```ts
{
  theme: 'light' | 'dark' | 'system',
  locale: 'en' | 'zh'
}
```

默认值：

```ts
{
  theme: 'system',
  locale: 'en'
}
```

UI 需在两处同步：

* popup 打开时自动同步
* options 保存后自动广播更新
