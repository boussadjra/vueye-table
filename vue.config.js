module.exports = {
	publicPath: process.env.NODE_ENV === 'production' ? '/vueye-table/' : '/',
	chainWebpack: config => {
	//process.env.NODE_ENV === 'production' ? config.externals(['@vue/composition-api']):{};
	},
	css: {
		extract: false,
	},
};
