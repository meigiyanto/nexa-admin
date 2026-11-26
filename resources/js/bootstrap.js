import axios from 'axios';

window.axios = axios;

// Keep the API hostname identical to the hostname used by the browser.
// This prevents localhost and 127.0.0.1 from receiving different session cookies.
const apiHost = window.location.hostname;
const apiProtocol = window.location.protocol;

axios.defaults.baseURL = `${apiProtocol}//${apiHost}:8000`;
axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
