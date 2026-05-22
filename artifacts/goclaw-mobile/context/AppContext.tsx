import React, { createContext, useCallback, useContext, useState } from "react";

export type AgentStatus = "active" | "idle" | "summoning" | "offline";
export type AgentType = "open" | "predefined";

export interface Agent {
  id: string;
  key: string;
  displayName: string;
  description: string;
  type: AgentType;
  status: AgentStatus;
  model: string;
  provider: string;
}

export type TaskStatus = "pending" | "active" | "completed" | "failed" | "paused";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  agentName?: string;
  createdAt: Date;
}

export type FlowStatus = "active" | "paused" | "completed" | "error" | "draft";

export interface Flow {
  id: string;
  name: string;
  description: string;
  status: FlowStatus;
  stepCount: number;
  lastRunAt?: Date;
}

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  streaming?: boolean;
}

export interface Conversation {
  id: string;
  agentId: string;
  agentName: string;
  model: string;
  lastMessage: string;
  lastMessageAt: Date;
  unread: number;
}

const MOCK_AGENTS: Agent[] = [
  { id: "a1", key: "assistant", displayName: "Assistant", description: "General-purpose AI assistant for everyday tasks", type: "predefined", status: "active", model: "claude-3-5-sonnet", provider: "Anthropic" },
  { id: "a2", key: "coder", displayName: "Code Expert", description: "Specialized in code review, debugging, and architecture", type: "open", status: "active", model: "gpt-4o", provider: "OpenAI" },
  { id: "a3", key: "researcher", displayName: "Researcher", description: "Deep research and comprehensive analysis agent", type: "open", status: "idle", model: "gemini-pro", provider: "Google" },
  { id: "a4", key: "writer", displayName: "Writer", description: "Content creation, editing, and creative writing", type: "predefined", status: "active", model: "claude-3-5-haiku", provider: "Anthropic" },
  { id: "a5", key: "data-analyst", displayName: "Data Analyst", description: "Statistical analysis, visualization, and insights", type: "open", status: "idle", model: "gpt-4o-mini", provider: "OpenAI" },
  { id: "a6", key: "devops", displayName: "DevOps", description: "Infrastructure, CI/CD pipelines, and cloud operations", type: "open", status: "offline", model: "claude-3-opus", provider: "Anthropic" },
];

const MOCK_TASKS: Task[] = [
  { id: "t1", title: "Analyze Q2 sales report", description: "Extract insights from Q2 data and prepare summary", status: "active", priority: "high", agentName: "Data Analyst", createdAt: new Date(Date.now() - 3600000) },
  { id: "t2", title: "Refactor authentication module", description: "Migrate to OAuth 2.0 with refresh token rotation", status: "pending", priority: "high", agentName: "Code Expert", createdAt: new Date(Date.now() - 7200000) },
  { id: "t3", title: "Write API documentation", description: "Document all REST endpoints with examples", status: "completed", priority: "medium", agentName: "Writer", createdAt: new Date(Date.now() - 86400000) },
  { id: "t4", title: "Research competitors", description: "Analyze top 5 competitors in the market", status: "completed", priority: "low", agentName: "Researcher", createdAt: new Date(Date.now() - 172800000) },
  { id: "t5", title: "Set up staging environment", description: "Configure Kubernetes cluster for staging", status: "paused", priority: "medium", agentName: "DevOps", createdAt: new Date(Date.now() - 14400000) },
  { id: "t6", title: "Generate weekly newsletter", description: "Curate and write weekly tech newsletter", status: "failed", priority: "low", agentName: "Writer", createdAt: new Date(Date.now() - 21600000) },
];

const MOCK_FLOWS: Flow[] = [
  { id: "f1", name: "Customer Onboarding", description: "Automated onboarding flow for new users", status: "active", stepCount: 7, lastRunAt: new Date(Date.now() - 1800000) },
  { id: "f2", name: "Daily Report", description: "Generate and send daily summary reports", status: "active", stepCount: 4, lastRunAt: new Date(Date.now() - 3600000) },
  { id: "f3", name: "Code Review Pipeline", description: "Automated PR review with quality checks", status: "paused", stepCount: 5, lastRunAt: new Date(Date.now() - 86400000) },
  { id: "f4", name: "Lead Qualification", description: "Qualify and route incoming sales leads", status: "draft", stepCount: 6 },
  { id: "f5", name: "Bug Triage", description: "Classify and assign incoming bug reports", status: "error", stepCount: 3, lastRunAt: new Date(Date.now() - 7200000) },
];

const MOCK_CONVERSATIONS: Conversation[] = [
  { id: "c1", agentId: "a1", agentName: "Assistant", model: "claude-3-5-sonnet", lastMessage: "Sure! I'll help you draft that email right away.", lastMessageAt: new Date(Date.now() - 300000), unread: 2 },
  { id: "c2", agentId: "a2", agentName: "Code Expert", model: "gpt-4o", lastMessage: "The issue is in the async handler — missing await on line 42.", lastMessageAt: new Date(Date.now() - 3600000), unread: 0 },
  { id: "c3", agentId: "a3", agentName: "Researcher", model: "gemini-pro", lastMessage: "I found 12 relevant papers on the topic. Let me summarize...", lastMessageAt: new Date(Date.now() - 7200000), unread: 1 },
  { id: "c4", agentId: "a4", agentName: "Writer", model: "claude-3-5-haiku", lastMessage: "Here's the revised blog post with SEO improvements.", lastMessageAt: new Date(Date.now() - 86400000), unread: 0 },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  c1: [
    { id: "m1", role: "user", content: "Can you help me draft a follow-up email to a client?", createdAt: new Date(Date.now() - 600000) },
    { id: "m2", role: "assistant", content: "Of course! To write an effective follow-up email, I'll need a few details:\n\n• What was the initial conversation about?\n• How long ago was the last contact?\n• What's the goal of this follow-up?", createdAt: new Date(Date.now() - 590000) },
    { id: "m3", role: "user", content: "It was a sales call 3 days ago about our enterprise plan. I want to know if they're ready to move forward.", createdAt: new Date(Date.now() - 320000) },
    { id: "m4", role: "assistant", content: "Sure! I'll help you draft that email right away.", createdAt: new Date(Date.now() - 300000) },
  ],
};

interface AppContextType {
  agents: Agent[];
  tasks: Task[];
  flows: Flow[];
  conversations: Conversation[];
  getMessages: (conversationId: string) => Message[];
  sendMessage: (conversationId: string, content: string) => void;
  getAgent: (id: string) => Agent | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Record<string, Message[]>>(MOCK_MESSAGES);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);

  const getMessages = useCallback((conversationId: string) => {
    return messages[conversationId] ?? [];
  }, [messages]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    const userMsg: Message = {
      id: `${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date(),
    };
    const thinkingMsg: Message = {
      id: `${Date.now()}-thinking`,
      role: "assistant",
      content: "",
      createdAt: new Date(),
      streaming: true,
    };

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), userMsg, thinkingMsg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: content, lastMessageAt: new Date(), unread: 0 }
          : c
      )
    );

    const responses = [
      "I'm analyzing your request — give me a moment to think through the best approach.",
      "Great question! Here's what I think...\n\nBased on the context you've provided, the most effective approach would be to start with a clear framework.",
      "I can definitely help with that. Let me break it down step by step so it's easy to follow.",
    ];
    const reply = responses[Math.floor(Math.random() * responses.length)];

    setTimeout(() => {
      setMessages((prev) => {
        const conv = prev[conversationId] ?? [];
        return {
          ...prev,
          [conversationId]: conv.map((m) =>
            m.streaming ? { ...m, content: reply, streaming: false } : m
          ),
        };
      });
    }, 1500);
  }, []);

  const getAgent = useCallback((id: string) => MOCK_AGENTS.find((a) => a.id === id), []);

  return (
    <AppContext.Provider value={{ agents: MOCK_AGENTS, tasks: MOCK_TASKS, flows: MOCK_FLOWS, conversations, getMessages, sendMessage, getAgent }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
