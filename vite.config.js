import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://10.10.10.21:3000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      allowedHosts: ['sportportal.kstouthart.nl']
    }
  };
})
