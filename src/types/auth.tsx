export interface AuthContext {
    firebaseToken: string | null;
    firebaseUser: any;
    onSignOut: () => void;
    onAuthRequired: () => void;
  }
  