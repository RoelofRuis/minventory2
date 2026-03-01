import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import axios from 'axios';
import './style.css';
import { initLogger } from './utils/logger';

initLogger();

axios.defaults.withCredentials = true;

const app = createApp(App);
app.use(router);
app.mount('#app');
