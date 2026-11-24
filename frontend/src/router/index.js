import { createRouter, createWebHistory } from 'vue-router'
import { useLoggedInUserStore } from '../store/loggedInUser'
import { useToast } from 'vue-toastification'

// make all paths and names lowercase for consistency
const routes = [
  {
    path: '/',
    component: () => import('../views/home.vue')
  },
  {
    path: "/login",
    name: "login",
    component: () => import('../views/login.vue')
  },
  {
    path: '/clientform',
    name: 'clientform',
    // only editors can create records (viewers are redirected by the guard below)
    meta: { requiresAuth: true, requiresEditor: true },
    component: () => import('../views/clientform.vue')
  },
  {
    path: '/findclient',
    name: 'findclient',
    meta: { requiresAuth: true },
    component: () => import('../views/findclient.vue')
  },
  {
    path: '/clientdetails/:id',
    name: 'clientdetails',
    meta: { requiresAuth: true },
    component: () => import('../views/clientdetails.vue')
  },
  {
    path: '/eventform',
    name: 'eventform',
    // only editors can create records (viewers are redirected by the guard below)
    meta: { requiresAuth: true, requiresEditor: true },
    component: () => import('../views/eventform.vue')
  },
  {
    path: '/findevents',
    name: 'findevents',
    meta: { requiresAuth: true },
    component: () => import('../views/findevents.vue')
  },
  {
    path: '/eventdetails/:id',
    name: 'eventdetails',
    meta: { requiresAuth: true },
    component: () => import('../views/eventDetails.vue')
  },
  {
    path: '/serviceform',
    name: 'serviceform',
    // only editors can create records (viewers are redirected by the guard below)
    meta: { requiresAuth: true, requiresEditor: true },
    component: () => import('../views/serviceform.vue')
  },
  {
    path: '/findservice',
    name: 'findservice',
    meta: { requiresAuth: true },
    component: () => import('../views/findservice.vue')
  },
  {
    path: '/servicedetails/:id',
    name: 'servicedetails',
    meta: { requiresAuth: true },
    component: () => import('../views/servicedetails.vue')
  }
]
const router = createRouter({
  history: createWebHistory(),
  routes
})

// protecting the routes (one global guard)
router.beforeEach((to) => {
  const store = useLoggedInUserStore()

  // pages that need a login
  if (to.meta.requiresAuth && !store.isLoggedIn) {
    return {
      path: '/login',
      // save the location we were at to come back later
      query: { redirect: to.fullPath },
    }
  }

  // editor-only pages: a viewer who types the URL directly is sent home instead
  if (to.meta.requiresEditor && store.role !== 'editor') {
    useToast().error('You do not have permission to open that page.')
    return { path: '/' }
  }
})

export default router

