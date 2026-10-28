import { createApp, markRaw } from "vue";
import router from "./router";
import App from "./App.vue";
import "./index.css";
import Toast from "vue-toastification";
// Import the CSS or use your own!
import "vue-toastification/dist/index.css";
//state management library
import { createPinia } from 'pinia'
import { setUnauthorizedHandler } from './api/api'
import { useLoggedInUserStore } from './store/loggedInUser'

const app = createApp(App);

//create a pinia root store
const pinia = createPinia();
//pinia should be able to use router - has to be setup as plugin
pinia.use(({ store }) => {
  store.$router = markRaw(router)
});

//add pinia object to our instance
app.use(pinia)
app.use(router);

// On any 401 the interceptor clears the token; this clears Pinia and goes to /login
setUnauthorizedHandler(() => useLoggedInUserStore().expireSession());

const options = {
  position: 'bottom-right'
};
app.use(Toast, options);
app.mount("#app");
