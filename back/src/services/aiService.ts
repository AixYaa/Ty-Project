import { AiChatRequest, AiChatResponse, AiMessage } from '../types/ai';
import { ApiLogService } from './apiLogService';
import { AuditLogService } from './auditService';
import { SysService } from './sysService';

export class AiService {
  private static instance: AiService;
  private config: Record<string, any> = {};

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): AiService {
    if (!AiService.instance) {
      AiService.instance = new AiService();
    }
    return AiService.instance;
  }

  private loadConfig() {
    this.config = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
      MIMO_API_KEY: process.env.MIMO_API_KEY,
      MIMO_BASE_URL: process.env.MIMO_BASE_URL || 'https://api.xiaomimimo.com/v1',
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      DEFAULT_PROVIDER: process.env.AI_DEFAULT_PROVIDER || 'mimo',
      DEFAULT_MODEL: process.env.AI_DEFAULT_MODEL || 'mimo-v2.5'
    };
  }

  async chat(request: AiChatRequest): Promise<AiChatResponse> {
    const { messages, provider, model, temperature, maxTokens, useProjectContext, contextHours } = request;

    const selectedProvider = provider || this.config.DEFAULT_PROVIDER;
    const selectedModel = model || this.config.DEFAULT_MODEL;

    try {
      const enrichedMessages = useProjectContext
        ? await this.enrichMessagesWithProjectContext(messages, contextHours ?? 24)
        : messages;

      let response: AiChatResponse;

      switch (selectedProvider) {
        case 'openai':
          response = await this.callOpenAI(enrichedMessages, selectedModel, temperature, maxTokens);
          break;
        case 'anthropic':
          response = await this.callAnthropic(enrichedMessages, selectedModel, temperature, maxTokens);
          break;
        case 'mimo':
          response = await this.callMimo(enrichedMessages, selectedModel, temperature, maxTokens);
          break;
        case 'ollama':
          response = await this.callOllama(enrichedMessages, selectedModel, temperature, maxTokens);
          break;
        default:
          if (this.config[`${selectedProvider.toUpperCase()}_API_KEY`]) {
            response = await this.callCustom(enrichedMessages, selectedProvider, selectedModel, temperature, maxTokens);
          } else {
            return { success: false, error: `Unknown provider: ${selectedProvider}` };
          }
      }

      return response;
    } catch (error: any) {
      console.error('[AiService] Chat error:', error);
      return {
        success: false,
        error: error.message || 'AI service error'
      };
    }
  }

  async prepareMessages(messages: AiMessage[], useProjectContext?: boolean, contextHours?: number): Promise<AiMessage[]> {
    if (!useProjectContext) return messages;
    return this.enrichMessagesWithProjectContext(messages, contextHours ?? 24);
  }

  private async enrichMessagesWithProjectContext(messages: AiMessage[], hours: number): Promise<AiMessage[]> {
    try {
      const now = new Date();
      const start = new Date(now.getTime() - Math.max(1, Math.min(hours, 168)) * 60 * 60 * 1000);

      const [apiStats, apiLogs, auditLogs, entities] = await Promise.all([
        ApiLogService.getStatistics({ startDate: start.toISOString(), endDate: now.toISOString() }),
        ApiLogService.getLogs({
          page: 1,
          pageSize: 20,
          startDate: start.toISOString(),
          endDate: now.toISOString()
        }),
        AuditLogService.getLogs({
          page: 1,
          pageSize: 20,
          startDate: start.toISOString(),
          endDate: now.toISOString()
        }),
        SysService.getEntities({ pageNum: 1, pageSize: 50 })
      ]);

      const compactApiLogs = (apiLogs.list || []).slice(0, 10).map((item: any) => ({
        method: item.method,
        path: item.path,
        status: item.status,
        duration: item.duration,
        username: item.username,
        createdAt: item.createdAt
      }));

      const compactAuditLogs = (auditLogs.list || []).slice(0, 10).map((item: any) => ({
        username: item.username,
        method: item.method,
        path: item.path,
        status: item.status,
        collectionName: item.collectionName,
        documentId: item.documentId,
        createdAt: item.createdAt
      }));

      const compactEntities = (entities.list || []).slice(0, 30).map((entity: any) => ({
        name: entity.name,
        displayName: entity.displayName,
        fieldCount: Array.isArray(entity.fields) ? entity.fields.length : 0,
        fields: Array.isArray(entity.fields)
          ? entity.fields.slice(0, 8).map((f: any) => ({
              name: f.name || f.field || f.key,
              type: f.type || f.fieldType,
              required: !!f.required
            }))
          : []
      }));

      const contextPayload = {
        timeRange: {
          start: start.toISOString(),
          end: now.toISOString(),
          hours: Math.max(1, Math.min(hours, 168))
        },
        apiStatistics: apiStats,
        recentApiLogs: compactApiLogs,
        recentAuditLogs: compactAuditLogs,
        entities: compactEntities
      };

      const systemContext: AiMessage = {
        role: 'system',
        content:
          '你是该管理平台的内置AI运维助手。请优先基于提供的项目实时数据回答，不要编造不存在的接口、实体和统计。' +
          '当用户问到日志、错误率、慢接口、谁做了什么操作、有哪些实体字段时，优先使用上下文中的数据。' +
          '如果上下文不足，请明确指出并给出下一步建议。\n\n' +
          `项目实时上下文数据(JSON):\n${JSON.stringify(contextPayload)}`
      };

      return [systemContext, ...messages.filter(m => m.role !== 'system')];
    } catch (error: any) {
      console.warn('[AiService] Failed to build project context:', error?.message || error);
      return messages;
    }
  }

  private async callOpenAI(
    messages: AiMessage[],
    model: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<AiChatResponse> {
    const apiKey = this.config.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    const response = await fetch(`${this.config.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 4096
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `OpenAI API error: ${error}` };
    }

    const data = await response.json();
    return {
      success: true,
      message: {
        role: 'assistant',
        content: data.choices[0]?.message?.content || '',
        timestamp: Date.now()
      },
      usage: data.usage
    };
  }

  private async callAnthropic(
    messages: AiMessage[],
    model: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<AiChatResponse> {
    const apiKey = this.config.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Anthropic API key not configured' };
    }

    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.config.ANTHROPIC_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        messages: userMessages,
        system: systemMessage?.content,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 4096
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Anthropic API error: ${error}` };
    }

    const data = await response.json();
    return {
      success: true,
      message: {
        role: 'assistant',
        content: data.content[0]?.text || '',
        timestamp: Date.now()
      },
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };
  }

  private async callMimo(
    messages: AiMessage[],
    model: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<AiChatResponse> {
    const apiKey = this.config.MIMO_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Mimo API key not configured' };
    }

    const response = await fetch(`${this.config.MIMO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        model,
        messages: this.toMimoMessages(messages),
        temperature: temperature ?? 0.7,
        max_completion_tokens: maxTokens ?? 4096
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Mimo API error: ${error}` };
    }

    const data = await response.json();
    return {
      success: true,
      message: {
        role: 'assistant',
        content: data.choices[0]?.message?.content || '',
        timestamp: Date.now()
      },
      usage: data.usage
    };
  }

  async streamMimo(
    messages: AiMessage[],
    model: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      onData: (payload: string) => void;
    }
  ): Promise<{ fullContent: string; usage?: any }> {
    const apiKey = this.config.MIMO_API_KEY;
    if (!apiKey) {
      throw new Error('Mimo API key not configured');
    }

    const response = await fetch(`${this.config.MIMO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        model,
        messages: this.toMimoMessages(messages),
        temperature: options.temperature ?? 0.7,
        max_completion_tokens: options.maxTokens ?? 4096,
        stream: true
      })
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`Mimo stream API error: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullContent = '';
    let usage: any = undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || !line.startsWith('data:')) continue;
        const data = line.slice(5).trim();

        if (data === '[DONE]') {
          options.onData('[DONE]');
          continue;
        }

        try {
          const chunk = JSON.parse(data);
          const delta = chunk?.choices?.[0]?.delta;
          const contentPart = delta?.content;
          if (typeof contentPart === 'string' && contentPart.length > 0) {
            fullContent += contentPart;
          }
          if (chunk?.usage) {
            usage = chunk.usage;
          }
          options.onData(data);
        } catch {
          // Ignore malformed lines and continue stream
        }
      }
    }

    return { fullContent, usage };
  }

  private toMimoMessages(messages: AiMessage[]) {
    return messages.map((msg) => {
      if (msg.role === 'user') {
        return {
          role: 'user',
          content: [{ type: 'text', text: msg.content }]
        };
      }
      return {
        role: msg.role,
        content: msg.content
      };
    });
  }

  private async callOllama(
    messages: AiMessage[],
    model: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<AiChatResponse> {
    const response = await fetch(`${this.config.OLLAMA_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        options: {
          num_predict: maxTokens ?? 4096
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Ollama API error: ${error}` };
    }

    const data = await response.json();
    return {
      success: true,
      message: {
        role: 'assistant',
        content: data.message?.content || '',
        timestamp: Date.now()
      }
    };
  }

  private async callCustom(
    messages: AiMessage[],
    provider: string,
    model: string,
    temperature?: number,
    maxTokens?: number
  ): Promise<AiChatResponse> {
    const apiKey = this.config[`${provider.toUpperCase()}_API_KEY`];
    const baseUrl = this.config[`${provider.toUpperCase()}_BASE_URL`];

    if (!apiKey || !baseUrl) {
      return { success: false, error: `Custom provider ${provider} not properly configured` };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens ?? 4096
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Custom provider API error: ${error}` };
    }

    const data = await response.json();
    return {
      success: true,
      message: {
        role: 'assistant',
        content: data.choices[0]?.message?.content || '',
        timestamp: Date.now()
      },
      usage: data.usage
    };
  }

  getConfig() {
    return {
      defaultProvider: this.config.DEFAULT_PROVIDER,
      defaultModel: this.config.DEFAULT_MODEL,
      hasOpenAI: !!this.config.OPENAI_API_KEY,
      hasAnthropic: !!this.config.ANTHROPIC_API_KEY,
      hasMimo: !!this.config.MIMO_API_KEY
    };
  }
}

export const aiService = AiService.getInstance();
