
import Vue from 'vue';
import wrap from '@vue/web-component-wrapper';
import VueyeTable from './components/VueyeTable';

const CustomElement = wrap(Vue, VueyeTable);

window.customElements.define('vueye-table', CustomElement);