import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            }
        }),
    ],
    build: {
        cssMinify: false,
        minify: true,
        chunkSizeWarningLimit: 500000,
    },
    server: {
        watch: {
            usePolling: true,
            ignored: [
                '**/storage/**',
                '**/bootstrap/cache/**',
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/vendor/**',
            ],
        },
    },
});
