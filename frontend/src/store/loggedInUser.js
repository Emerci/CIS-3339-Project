// This pinia store contains state with respect to whether a user is logged in 
import { defineStore } from 'pinia'
import { useToast } from 'vue-toastification'
import { loginUser, logoutUser, setAuthHeader, removeAuthHeader, getStoredToken, clearStoredToken } from '../api/api' // import API calls
import jwt_decode from 'jwt-decode'; // import JSON Web Token decoder to decode the token into the user's information

//Notifications
const toast = useToast()

// Defining a store
export const useLoggedInUserStore = defineStore({
  id: 'loggedInUser',
  state: () => {
    return {
      name: "",
      role: "",
      isLoggedIn: false
    }
  },
  actions: {
    async login(username, password) {
      try {
        const token = await loginUser(username, password);
        // Get the user's name and role from the JWT token
        const decodedToken = jwt_decode(token);
        this.$patch({
          isLoggedIn: true,
          role: decodedToken.role,
          name: decodedToken.name
        });
        // go back to the page the user was trying to open (set by the router guard),
        // but only if it is a local path; otherwise go home
        const redirect = this.$router.currentRoute.value.query.redirect
        const safe = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
        this.$router.push(safe ? redirect : "/");
        toast.success("Login Sucessful!")

      } catch ( error ) {
        toast.error(error.message)
      }
    },
    // F4: called once at startup (main.js), before the router starts.
    // Looks for a saved token. If it is missing, expired or corrupted, it is cleared and the user
    // is treated as logged out. If it is still good, the Axios header and the Pinia state are restored
    // so refreshing the page does not log the user out. Returns true when a session was restored.
    // (The token is only decoded here to show the name and decide which pages to offer;
    // the server still verifies it on every request.)
    restoreSession() {
      const token = getStoredToken()
      if (!token) return false
      try {
        const decoded = jwt_decode(token) // throws if the token is corrupted
        const expired = !decoded.exp || decoded.exp * 1000 <= Date.now() // exp is in seconds
        if (expired || !decoded.role) throw new Error('Saved token is expired or incomplete')
        setAuthHeader(token)
        this.$patch({ isLoggedIn: true, role: decoded.role, name: decoded.name })
        return true
      } catch {
        clearStoredToken()
        removeAuthHeader()
        this.$patch({ name: "", role: "", isLoggedIn: false })
        return false
      }
    },
    // Called by the Axios interceptor on a 401 (api/api.js already removed the token)
    expireSession() {
      if (!this.isLoggedIn) return;
      this.$patch({ name: "", role: "", isLoggedIn: false });
      if (this.$router.currentRoute.value.path !== '/login') {
        this.$router.push('/login');
        toast.error('Your session has expired. Please log in again.');
      }
    },
    logout() {
      logoutUser();
      // Reset value after user log out
      this.$patch({
        name: "",
        role: "",
        isLoggedIn: false
      });
      this.$router.push("/");
      toast.info("You have been logged out!")
    }
  },
});
