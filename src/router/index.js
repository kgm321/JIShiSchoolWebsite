import { createWebHistory, createRouter } from 'vue-router'

import Main from './../main/Main.vue'
import NotFound from './../main/NotFound.vue'

export const routes = [
    { path: '/', component: Main },
    {
        path: '/imrouter',
        redirect: () => {
            window.location.href = '/jsshader/shader.html';
            return { path: '/' };
        },
    },
    // Catch-all route for 404 - must be last
    { path: '/:pathMatch(.*)*', component: NotFound }
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})
