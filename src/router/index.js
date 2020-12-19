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
    redirect:'/guide/basic-example',
    children: [
     {
      path: 'basic-example',
      name: 'Basic Example',
  
      component: () => import('../views/guide/BasicExample.vue'),
     },
     {
      path: 'with-header',
      name: 'Table with header',
  
      component: () => import('../views/guide/WithHeader.vue'),
     },
     {
      path: 'crud-actions',
      name: 'CRUD actions',
  
      component: () => import('../views/guide/CRUDActions.vue'),
     },
     {
      path: 'table-body-custom-rendering',
      name: 'Table body custom rendering',
  
      component: () => import('../views/guide/CustomRendering.vue'),
     },
     {
      path: 'full-cell-custom-rendering',
      name: 'Table body cell custom rendering',
  
      component: () => import('../views/guide/FullCellCustomRendering.vue'),
     },
     {
      path: 'head-custom-rendering',
      name: 'Table head custom rendering',
  
      component: () => import('../views/guide/HeadCustomRendering.vue'),
     },
     {
      path: 'head-cell-custom-rendering',
      name: 'Table head cell custom rendering',
  
      component: () => import('../views/guide/HeadCellCustomRendering.vue'),
     },
     {
      path: 'expand-rows',
      name: 'Expand rows',
  
      component: () => import('../views/guide/ExpandRows.vue'),
     
     },
     {
      path: 'select-rows',
      name: 'Select rows',
  
      component: () => import('../views/guide/SelectRows.vue'),
     },
     {
      path: 'config-default-labels',
      name: 'Config default labels',
  
      component: () => import('../views/guide/ConfigDefaultLabels.vue'),
     },
     {
      path: 'server-pagination',
      name: 'Server Side pagination',
  
      component: () => import('../views/guide/ServerPagination.vue'),
     }
    ]
  }
]

const router = new VueRouter({
  mode:'history',
  base:process.env.NODE_ENV === 'production' ? '/vueye-table/' : '/',
  routes
})


router.afterEach((to, from, next) => {
  console.log('- to -------------------')
  console.log(to)
  console.log('--------------------')
})
export default router
