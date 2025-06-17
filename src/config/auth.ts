// src/config/auth.ts
export const AUTHORIZED_EMAILS = [
    'matthew.paris@lemaraisadvisory.com',
    // Add more emails here if needed in the future
    // 'another.email@example.com',
  ];
  
  export const isAuthorizedUser = (email: string | null): boolean => {
    if (!email) return false;
    return AUTHORIZED_EMAILS.includes(email.toLowerCase());
  };