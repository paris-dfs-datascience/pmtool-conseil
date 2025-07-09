// Frontend API service for Claude code assistant
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface CodeGenerationRequest {
  session_id?: string;
  prompt: string;
  language?: string;
  context_files?: Array<{
    name: string;
    content: string;
    path?: string;
    size?: number;
  }>;
  repository_info?: {
    full_name: string;
    url: string;
    description?: string;
  };
  current_code?: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface CodeGenerationResponse {
  session_id: string;
  generated_code: string;
  explanation: string;
  suggestions: string[];
  chat_history: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  status: string;
}

export interface ChatSession {
  session_id: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  context_files: Array<any>;
  repository_info?: any;
  current_code: string;
  language: string;
  created_at: string;
  last_updated: string;
}

class CodeAssistantAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE}/code-assistant`;
  }

  // Session Management
  async createSession(): Promise<{session_id: string; status: string}> {
    const response = await fetch(`${this.baseUrl}/session/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  }

  async getSession(sessionId: string): Promise<ChatSession> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}`);
    if (!response.ok) throw new Error('Session not found');
    return response.json();
  }

  async deleteSession(sessionId: string): Promise<{status: string}> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete session');
    return response.json();
  }

  // Code Generation
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Code generation failed');
    }
    
    return response.json();
  }

  // Streaming Code Generation
  async generateCodeStream(
    request: CodeGenerationRequest,
    onChunk: (chunk: string, sessionId: string) => void,
    onError: (error: string) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/generate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('Streaming failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                onError(parsed.error);
                return;
              }
              if (parsed.chunk) {
                onChunk(parsed.chunk, parsed.session_id);
              }
            } catch (e) {
              console.warn('Failed to parse stream data:', data);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // GitHub Integration
  async connectToGitHub(token: string, repoUrl: string) {
    const response = await fetch(`${this.baseUrl}/github/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, repo_url: repoUrl }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'GitHub connection failed');
    }
    
    return response.json();
  }

  async getGitHubFileContent(owner: string, repo: string, path: string, token: string) {
    const response = await fetch(
      `${this.baseUrl}/github/file/${owner}/${repo}?path=${encodeURIComponent(path)}&token=${token}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch file content');
    return response.json();
  }

  // File Upload
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'File upload failed');
    }
    
    return response.json();
  }

  // Status
  async getStatus() {
    const response = await fetch(`${this.baseUrl}/status`);
    if (!response.ok) throw new Error('Failed to get status');
    return response.json();
  }

  async getSupportedLanguages() {
    const response = await fetch(`${this.baseUrl}/languages`);
    if (!response.ok) throw new Error('Failed to get languages');
    return response.json();
  }
}

export const codeAssistantAPI = new CodeAssistantAPI();