import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'

Vue.use(VueRouter)

export const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/about',
    name: 'About',

    component: () => import('../views/About.vue')
  },
  {
    path: '/guide',
    name: 'Guide',

    component: () => import('../views/guide/Index.vue'),
    children: [
     {
      path: 'basic-example',
      name: 'Basic Example',
  
      component: () => import('../views/guide/BasicExample.vue'),
     }
    ]
  }
]

const router = new VueRouter({
  mode:'history',
  routes
})


router.afterEach((to, from, next) => {
  console.log('- to -------------------')
  console.log(to)
  console.log('--------------------')
})
export default router
