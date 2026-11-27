import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.axios = axios;
window.Pusher = Pusher;

// Keep the API hostname identical to the hostname used by the browser.
// This prevents localhost and 127.0.0.1 from receiving different session cookies.
const apiHost = window.location.hostname;
const apiProtocol = window.location.protocol;

axios.defaults.baseURL = `${apiProtocol}//${apiHost}:8000`;
axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_REVERB_PORT || 8080),
    wssPort: Number(import.meta.env.VITE_REVERB_PORT || 443),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME || window.location.protocol.replace(':', '')) === 'https',
    enabledTransports: ['ws', 'wss'],
    withCredentials: true,
    authEndpoint: `${apiProtocol}//${apiHost}:8000/broadcasting/auth`,
    auth: {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    },
});
