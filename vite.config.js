import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheKeyWillBeUsed: async ({ request }) => {
                return `${request.url}?${Date.now()}`
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              }
            }
          },
          // 🔔 CACHE PARA NOTIFICAÇÕES E ASSETS
          {
            urlPattern: /\/sounds\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'notification-sounds-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              }
            }
          },
          {
            urlPattern: /\/icons\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'notification-icons-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
              }
            }
          }
        ]
      },
      includeAssets: [
        'favicon.ico', 
        'apple-touch-icon.png', 
        'masked-icon.svg',
        'firebase-messaging-sw.js', // 🔔 INCLUIR SERVICE WORKER FCM
        'sounds/*.mp3', // 🔊 INCLUIR SONS DE NOTIFICAÇÃO
        'icons/*.png' // 🔔 INCLUIR ÍCONES DE NOTIFICAÇÃO
      ],
      manifest: {
        name: 'Gestão de Chamados - Montagem de Stands',
        short_name: 'Gestão Chamados',
        description: 'Sistema completo de gestão de chamados para montagem de stands e eventos com notificações push em tempo real',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        categories: ['productivity', 'business'],
        // 🔔 CONFIGURAÇÃO FCM NO MANIFEST
        gcm_sender_id: '103953800507',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ],
        shortcuts: [
          {
            name: 'Novo Chamado',
            short_name: 'Novo',
            description: 'Criar um novo chamado rapidamente',
            url: '/novo-chamado',
            icons: [
              {
                src: '/icons/shortcut-new.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Visualizar dashboard principal',
            url: '/dashboard',
            icons: [
              {
                src: '/icons/shortcut-dashboard.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          },
          {
            name: 'Notificações',
            short_name: 'Notificações',
            description: 'Ver notificações recentes',
            url: '/dashboard?tab=notifications',
            icons: [
              {
                src: '/icons/shortcut-notifications.png',
                sizes: '192x192',
                type: 'image/png'
              }
            ]
          }
        ],
        // 🔔 PERMISSÕES PARA NOTIFICAÇÕES
        permissions: [
          'notifications',
          'push'
        ],
        notification_permission: 'required',
        prefer_related_applications: false,
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        edge_side_panel: {
          preferred_width: 400
        },
        launch_handler: {
          client_mode: 'focus-existing'
        }
      },
      // 🔔 CONFIGURAÇÕES ESPECÍFICAS PARA FCM
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'firebase-messaging-sw.js',
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // 🔧 CONFIGURAÇÕES DE BUILD
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar Firebase em chunk próprio
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging'],
          // Separar React em chunk próprio
          react: ['react', 'react-dom', 'react-router-dom'],
          // Separar UI components
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          // Separar utilitários
          utils: ['date-fns', 'clsx', 'class-variance-authority']
        }
      }
    },
    // 🔔 OTIMIZAÇÕES PARA NOTIFICAÇÕES
    assetsInlineLimit: 0, // Não fazer inline de assets para garantir que sons e ícones sejam servidos corretamente
    chunkSizeWarningLimit: 1000
  },
  // 🔧 CONFIGURAÇÕES DE DESENVOLVIMENTO
  server: {
    port: 3000,
    host: true,
    // 🔔 HEADERS PARA DESENVOLVIMENTO COM FCM
    headers: {
      'Service-Worker-Allowed': '/',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  // 🔧 CONFIGURAÇÕES DE PREVIEW
  preview: {
    port: 4173,
    host: true,
    headers: {
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache'
    }
  },
  // 🔧 OTIMIZAÇÕES
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'firebase/messaging',
      'react',
      'react-dom',
      'react-router-dom'
    ],
    exclude: ['firebase-admin'] // Excluir dependências server-side
  },
  // 🔧 CONFIGURAÇÕES DE AMBIENTE
  define: {
    // Definir variáveis globais para FCM
    __FCM_VAPID_KEY__: JSON.stringify('BM2dED2E6_MUpgzK4f-9eeNEmFPjVQjQNhFtmDJr3SYGwC-_qzZp5lpt-vM_07NilFujTlbv9apf9TugL1-jUng'),
    __FCM_SENDER_ID__: JSON.stringify('103953800507'),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.1.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})

