import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

// Inertia-level 419 handler (last resort — ถ้า global interceptor retry แล้วยังไม่ผ่าน)
router.on('invalid', (event) => {
    if (event.detail.response?.status === 419) {
        event.preventDefault();
        window.location.reload();
    }
});

// Refresh CSRF meta tag หลังทุก Inertia navigation
router.on('success', () => {
    const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (cookieMatch) {
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) {
            meta.setAttribute('content', decodeURIComponent(cookieMatch[1]));
        }
    }
});

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#EAB308', // Gold/Yellow for premium feel
    },
});
