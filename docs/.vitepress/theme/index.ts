import './style.css';
import 'vueye-table/dist/style.css';

// https://vitepress.dev/guide/custom-theme
import Layout from './Layout.vue';

export default {
  Layout,
  enhanceApp({ app, router, siteData }) {
    // ...
  },
};
