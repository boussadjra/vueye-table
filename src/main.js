import Vue from 'vue'
import App from './App.vue'
import VueComp from '@vue/composition-api'
import router from './router'
import VueyeTable from "./components/VueyeTable.vue"
import './styles/index.scss'
import 'prismjs'
import './styles/prism-nocture-birds.css'
import Prism from 'vue-prism-component'
import TabView from "@/devComponents/navigation/TabView.vue";
Vue.config.productionTip = false
Vue.use(VueComp)
Vue.component('VueyeTable',VueyeTable)
Vue.component('Prism',Prism)
Vue.component('TabView',TabView)
new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
