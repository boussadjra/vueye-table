
import Vue from "vue";
const requireContext = require.context("./", true, /\.vue$/i,"sync");

const dynamicComponents = requireContext
  .keys()
  .map(file => [file.replace(/(^.\/)|(\.vue$)/g, ""), requireContext(file)])
  .reduce((components, [name, component]) => {
    components[name] = component.default || component;
    return components;
  }, {});
Object.keys(dynamicComponents).forEach(name => {
  Vue.component(name, dynamicComponents[name]);
});
const Icon = {
	name: 'icon',
	props: ['name', 'height', 'width', 'fill'],
	render(h) {
		return h(this.name, { props: this.$props });
	},
	/*	components: {
		ArrowRight,
		ArrowDown,
		Search,
		Place,
		Addon,
		Gift,
		LineChart,
		Dashboard,
		SuperMarket,
		Document,
		Calendar,
		Bell,
		Message,
		Settings,
		Logout,
	},*/

	mounted() {},
};

export default Icon;
