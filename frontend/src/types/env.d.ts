// Next.js global type definitions
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_API_URL: string;
      NEXT_PUBLIC_APP_URL: string;
      NEXT_PUBLIC_ENABLE_ANALYTICS: string;
      NEXT_PUBLIC_ENABLE_DEBUG: string;
    }
  }
}

declare module '*.css';
declare module '*.svg' {
  const content: string;
  export default content;
}

export {};
