

export type LLMProviderType = 'openai' | 'custom';

export interface LLMConfig {
    provider: LLMProviderType;
    apiKey: string;
    baseUrl?: string;
    modelName?: string;
    maxTokens?: number;
    temperature?: number;
    authType?: 'bearer' | 'api-key';
    metaPromptTemplate?: string;
}

export interface TokenUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface StreamResult {
    content: string;
    usage?: TokenUsage;
}

type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

type ChatCompletionRequestBody = {
    model: string;
    messages: ChatMessage[];
    stream: boolean;
    max_tokens?: number;
    temperature?: number;
};

export class LLMService {
    private config: LLMConfig;

    constructor(config: LLMConfig) {
        this.config = config;
    }

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            await this.generate("Hello, are you there?", "system");
            return { success: true };
        } catch (e: unknown) {
            console.error("Connection test failed:", e);
            if (e instanceof Error) {
                return { success: false, error: e.message };
            }
            return { success: false, error: String(e) };
        }
    }

    async generate(prompt: string, systemPrompt?: string): Promise<string> {
        const { apiKey, baseUrl, modelName, maxTokens, temperature, authType } = this.config;



        // User requested simple implementation: baseUrl IS the full URL.
        // If not provided, default to standard OpenAI endpoint.
        const url = baseUrl || 'https://api.openai.com/v1/chat/completions';

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (authType === 'api-key') {
            headers['api-key'] = apiKey;
        } else {
            // Default to Bearer
            headers['Authorization'] = `Bearer ${apiKey}`;
        }


        const body: ChatCompletionRequestBody = {
            model: modelName || 'gpt-4o',
            messages: [
                { role: 'user', content: prompt }
            ],
            stream: false
        };

        if (systemPrompt) {
            body.messages.unshift({ role: 'system', content: systemPrompt });
        }

        if (maxTokens !== undefined && maxTokens !== null && !isNaN(maxTokens)) {
            body.max_tokens = maxTokens;
        }

        if (temperature !== undefined && temperature !== null && !isNaN(temperature)) {
            body.temperature = temperature;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error("LLM Generation Error:", error);
            throw error;
        }
    }

    async generateStream(prompt: string, systemPrompt: string | undefined, onChunk: (chunk: string) => void): Promise<StreamResult> {
        const { apiKey, baseUrl, modelName, maxTokens, temperature, authType } = this.config;

        // User requested simple implementation: baseUrl IS the full URL.
        // If not provided, default to standard OpenAI endpoint.
        const url = baseUrl || 'https://api.openai.com/v1/chat/completions';

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (authType === 'api-key') {
            headers['api-key'] = apiKey;
        } else {
            // Default to Bearer
            headers['Authorization'] = `Bearer ${apiKey}`;
        }


        const body: ChatCompletionRequestBody = {
            model: modelName || 'gpt-4o',
            messages: [
                { role: 'user', content: prompt }
            ],
            stream: true,
            // stream_options is needed for some providers (like OpenAI) to include usage in the last chunk
            // However, not all providers support this or format it the same way.
            // For now, we try to parse it if present.
            // Note: TypeScript might complain if we add extra properties to body, so we cast to any if needed or update type.
        };

        // Add stream_options for OpenAI compatibility to get usage
        // @ts-expect-error - dynamic property
        body.stream_options = { include_usage: true };

        if (systemPrompt) {
            body.messages.unshift({ role: 'system', content: systemPrompt });
        }

        if (maxTokens !== undefined && maxTokens !== null && !isNaN(maxTokens)) {
            body.max_tokens = maxTokens;
        }

        if (temperature !== undefined && temperature !== null && !isNaN(temperature)) {
            body.temperature = temperature;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            if (!response.body) {
                throw new Error('ReadableStream not supported in this environment.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullText = "";
            let buffer = "";
            let usage: TokenUsage | undefined;

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    const lines = buffer.split('\n');
                    // Keep the last line in the buffer as it might be incomplete
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;

                        const dataStr = trimmed.slice(6);
                        if (dataStr === '[DONE]') continue;

                        try {
                            const json = JSON.parse(dataStr);
                            const content = json.choices?.[0]?.delta?.content || "";

                            // Check for usage information
                            if (json.usage) {
                                usage = json.usage;
                            }

                            if (content) {
                                fullText += content;
                                onChunk(content);
                            }
                        } catch {
                            // console.warn("Failed to parse SSE chunk", dataStr, e);
                        }
                    }
                }
            } finally {
                reader.releaseLock();
            }

            return { content: fullText, usage };
        } catch (error) {
            console.error("LLM Streaming Generation Error:", error);
            throw error;
        }
    }
}
