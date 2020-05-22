module.exports = {
	title: 'Vueye table',
    description: 'A data table created using Vue.js',
    themeConfig:{
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Guide', link: '/guide/' },
            { text: 'Github', link: 'https://github.com/boussadjra/vueye-table' },
          
        ],
        sidebar:  [
            {
                title: 'Guide',
                collapsable: true,
                children: [
            {title: 'Installation',link: '/'}
                ]
            }
            ]
    }
};
