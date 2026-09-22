import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves the project at https://<user>.github.io/RoStats/
export default defineConfig({
  base: '/RoStats/',
  plugins: [react(), tailwindcss()],
})
