// src/components/ConsultingChat/types.ts

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  framework?: string;
  grounding_enabled?: boolean;
  sources_used?: number;
}

export interface ConsultingChatProps {
  onNewMessage?: (message: Message) => void;
  apiEndpoint?: string;
  placeholder?: string;
  welcomeMessage?: string;
  isLoading?: boolean;
  selectedFramework?: string;
  onFrameworkSelect?: (framework: string) => void;
  // Firebase props - matching your AuthContext interface
  firebaseToken: string | null;
  firebaseUser: any;
  onSignOut: () => void;
  onAuthRequired: () => void;
}

export interface Framework {
  name: string;
  description: string;
  endpoint: string;
  supportsGrounding: boolean;
  isImplemented: boolean;
  component: FrameworkComponent;
}

export interface FrameworkComponent {
  handleMessage: (params: FrameworkMessageParams) => Promise<FrameworkResponse>;
}

export interface FrameworkMessageParams {
  messages: Message[];
  enableGrounding: boolean;
  apiEndpoint: string;
  authHeaders: Record<string, string>;
}

export interface FrameworkResponse {
  message: string;
  grounding_enabled?: boolean;
  sources_used?: number;
}

export interface FrameworkSelectorProps {
  frameworks: Framework[];
  selectedFramework: string;
  onFrameworkSelect: (framework: string) => void;
  needsAuth: boolean;
}