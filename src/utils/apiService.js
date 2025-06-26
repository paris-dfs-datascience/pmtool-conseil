// utils/apiService.js
import { auth } from '../firebase';


// Your Cloud Run base URL
const CLOUD_RUN_BASE_URL = 'https://lma-chat-api-443545551926.us-central1.run.app';

// Helper to get auth token
const getAuthToken = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
};

// Main API service class
class ApiService {
  constructor() {
    this.baseURL = CLOUD_RUN_BASE_URL;
  }

  // Core request method with auth
  async request(endpoint, options = {}) {
    try {
      const token = await getAuthToken();
      
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Convenience methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  // Specific methods for your app
  async claudeChat(messages, options = {}) {
    const response = await this.post('/claude/chat/claude', {
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 4096,
      ...options
    });
    return response.json();
  }

  async claudeStatus() {
    const response = await this.get('/claude/status/claude');
    return response.json();
  }

  // Add more specific methods as needed for your other endpoints
  async geminiChat(messages, options = {}) {
    const response = await this.post('/gemini/chat', {
      messages,
      ...options
    });
    return response.json();
  }

  async lmaKnowledge(query) {
    const response = await this.post('/lma/knowledge', { query });
    return response.json();
  }

  // Generic method for any endpoint
  async callEndpoint(endpoint, method = 'GET', data = null) {
    const options = { method };
    if (data) {
      options.body = JSON.stringify(data);
    }
    const response = await this.request(endpoint, options);
    return response.json();
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;

// Also export individual methods if you prefer
export const {
  request,
  get,
  post,
  put,
  delete: del,
  claudeChat,
  claudeStatus,
  geminiChat,
  lmaKnowledge,
  callEndpoint
} = apiService;