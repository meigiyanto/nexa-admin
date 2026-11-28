import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.axios = axios;
window.Pusher = Pusher;

// Use an explicit API origin when the frontend and API are hosted separately.
// Otherwise, keep requests on the current origin to support local and production deployments.
const apiBaseUrl = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
const apiProtocol = window.location.protocol;

axios.defaults.baseURL = apiBaseUrl;
axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_WSS_PORT || 443),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || apiProtocol.replace(':', '')) === 'https',
    enabledTransports: ['ws', 'wss'],
    withCredentials: true,
    authEndpoint: `${apiBaseUrl}/broadcasting/auth`,
    auth: {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': decodeURIComponent(document.cookie.split('; ').find(cookie => cookie.startsWith('XSRF-TOKEN='))?.split('=').slice(1).join('=') || ''),
        },
    },
});
