export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface AiConversation {
  id: string;
  title: string;
  messages: AiMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AiProviderConfig {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface AiChatRequest {
  messages: AiMessage[];
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useProjectContext?: boolean;
  contextHours?: number;
  conversationId?: string;
  stream?: boolean;
}

export interface AiChatResponse {
  success: boolean;
  message?: AiMessage;
  error?: string;
  conversationId?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AiProvider {
  name: string;
  models: string[];
  baseUrl?: string;
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    name: 'openai',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    baseUrl: 'https://api.openai.com/v1'
  },
  {
    name: 'anthropic',
    models: ['claude-3-5-sonnet-latest', 'claude-3-opus-latest', 'claude-3-haiku-latest'],
    baseUrl: 'https://api.anthropic.com/v1'
  },
  {
    name: 'mimo',
    models: ['mimo-v2.5-pro', 'mimo-v2.5', 'mimo-v2-pro', 'mimo-v2-flash'],
    baseUrl: 'https://api.xiaomimimo.com/v1'
  },
  {
    name: 'ollama',
    models: ['llama3', 'mistral', 'codellama'],
    baseUrl: 'http://localhost:11434/v1'
  },
  {
    name: 'custom',
    models: [],
    baseUrl: ''
  }
];
