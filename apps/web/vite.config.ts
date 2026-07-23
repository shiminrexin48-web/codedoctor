import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const providerProxy = {
  '/api/deepseek': {
    target: 'https://api.deepseek.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/deepseek/, '')
  },
  '/api/providers/deepseek': {
    target: 'https://api.deepseek.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/deepseek/, '')
  },
  '/api/providers/openai': {
    target: 'https://api.openai.com/v1',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/openai/, '')
  },
  '/api/providers/qwen': {
    target: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/qwen/, '')
  },
  '/api/providers/gemini': {
    target: 'https://generativelanguage.googleapis.com/v1beta/openai',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/gemini/, '')
  },
  '/api/providers/moonshot': {
    target: 'https://api.moonshot.cn/v1',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/moonshot/, '')
  },
  '/api/providers/zhipu': {
    target: 'https://open.bigmodel.cn/api/paas/v4',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/zhipu/, '')
  },
  '/api/providers/siliconflow': {
    target: 'https://api.siliconflow.cn/v1',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/siliconflow/, '')
  },
  '/api/providers/openrouter': {
    target: 'https://openrouter.ai/api/v1',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/openrouter/, '')
  },
  '/api/providers/groq': {
    target: 'https://api.groq.com/openai/v1',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/groq/, '')
  },
  '/api/providers/mistral': {
    target: 'https://api.mistral.ai/v1',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/mistral/, '')
  },
  '/api/providers/ollama': {
    target: 'http://127.0.0.1:11434/v1',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/providers\/ollama/, '')
  }
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: providerProxy
  },
  preview: {
    proxy: providerProxy
  }
});
