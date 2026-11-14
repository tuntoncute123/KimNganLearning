import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Shared helpers must not be absorbed by a lazy PDF/Word vendor chunk.
          includeDependenciesRecursively: false,
          groups: [
            { name: 'preload-helper', test: /\0vite\/.*preload/ },
            { name: 'react-vendor', test: /node_modules\/(react|react-dom|scheduler)\// },
            { name: 'pdf-vendor', test: /node_modules\/pdfjs-dist\// },
            { name: 'docx-vendor', test: /node_modules\/(docx-preview|jszip)\// },
            { name: 'icons-vendor', test: /node_modules\/(lucide-react|@ant-design\/icons)\// },
          ],
        },
      },
    },
  },
})
