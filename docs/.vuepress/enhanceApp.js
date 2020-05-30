
import VueyeTable from '../../src/components/VueyeTable.vue';
import App from '../../src/App.vue';
import VueComp from '@vue/composition-api'

export default ({
    Vue
  }) => {
Vue.use(VueComp);

    Vue.component('VueyeTable', VueyeTable);
    Vue.component('App', App);
  };