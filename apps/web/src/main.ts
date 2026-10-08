import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles.css'

// The design library and exploration gallery do not initialize the 3D scene.
if (window.location.hash === '#/renders') {
  window.location.replace(new URL('./renders.html', window.location.href).href)
} else {
  const component = window.location.hash === '#/explorations'
    ? import('./ExplorationsApp.vue')
    : import('./App.vue')
  component.then(({ default: app }) => createApp(app).use(createPinia()).mount('#app'))
}
