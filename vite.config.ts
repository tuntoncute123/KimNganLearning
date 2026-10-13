import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/pdfjs-dist/')) {
            return 'pdf-vendor';
          }
          if (id.includes('node_modules/docx-preview/')) {
            return 'docx-vendor';
          }
          if (id.includes('node_modules/lucide-react/') || id.includes('node_modules/@ant-design/icons/')) {
            return 'icons-vendor';
          }
        },
      },
    },
  },
})
