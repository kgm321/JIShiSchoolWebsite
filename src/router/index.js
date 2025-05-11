import { createMemoryHistory, createRouter } from 'vue-router'

import Main from './../main/Main.vue'

export const routes = [
    { path: '/', component: Main },
    {
        path: '/imrouter',
        redirect: () => {
            window.location.href = '/jsshader/shader.html';
            return { path: '/' };
        },
    }
]

export const router = createRouter({
    history: createMemoryHistory(),
    routes,
})