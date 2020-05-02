import Vue from 'vue'
import App from './App.vue'
import VueComp from '@vue/composition-api'
Vue.config.productionTip = false

Vue.use(VueComp)

new Vue({
  render: h => h(App),
}).$mount('#app')
