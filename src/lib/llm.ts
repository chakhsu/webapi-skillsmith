

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

export interface CompletionResponse {
    content: string;
}

export class LLMService {
    private config: LLMConfig;

    constructor(config: LLMConfig) {
        this.config = config;
    }

    async testConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            await this.generate("Hello, are you there?", "system");
            return { success: true };
        } catch (e: any) {
            console.error("Connection test failed:", e);
            return { success: false, error: e.message || String(e) };
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

        const body: any = {
            messages: [
                { role: 'user', content: prompt }
            ],
            stream: false
        };

        if (systemPrompt) {
            body.messages.unshift({ role: 'system', content: systemPrompt });
        }

        body.model = modelName || 'gpt-4o';
        
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
}
