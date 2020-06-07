module.exports = {
	title: 'Vueye table',
    description: 'A data table created using Vue.js',
    base:'/vueye-table/',
    markdown: {
        config: md => {
          md.set({ breaks: true })
      },
    },
    themeConfig:{
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Guide', link: '/guide/' },
            { text: 'Github', link: 'https://github.com/boussadjra/vueye-table' },
          
        ],
        sidebar:  'auto'/*[
            {
                title: 'Guide',
                collapsable: true,
                children: [
            {text: 'Installation',link: '/guide/Installation'}
                ]
            }
            ]*/
    }
}
