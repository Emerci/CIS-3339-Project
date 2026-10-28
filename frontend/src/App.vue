<!-- This is the main frontend file. It displays a navigation bar and rendered components. -->

<template>
  <main class="flex flex-row">
    <div id="_container" class="min-h-screen">
      <header class="w-full">
        <section class="text-center">
          <!-- MIGRATION: changed backslashes to forward slashes so the path works on Mac/Linux, and added alt text -->
          <img class="m-auto" src="@/assets/DanPersona.svg" alt="User avatar" />
        </section>
        <!--Navigation bar-->
        <nav class="mt-10">
          <ul class="flex flex-col gap-4">
            <!-- Dashboard link -->
            <li>
              <router-link to="/">
                <span style="position: relative; top: 6px" class="material-icons">dashboard</span>
                Dashboard
              </router-link>
            </li>
            <!--Login link - Link only shows is user is logged out-->
            <li v-if="!user.isLoggedIn">
              <router-link to="/login">
                <span style="position:relative; top: 6px" class="material-icons">login</span>
                Login
              </router-link>
            </li>
            <!--Logout link - Link only shows is user is logged in-->
            <li v-if="user.isLoggedIn" @click.prevent="user.logout" style="cursor: pointer;">
              <span style="position:relative; top: 6px" class="material-icons">logout</span>
              Logout
            </li>
            <!--Client Intake Form link - only shows if user is an editor-->
            <li v-if="user.role === 'editor'">
              <router-link to="/clientform">
                <span style="position: relative; top: 6px" class="material-icons">people</span>
                Client Intake Form
              </router-link>
            </li>
            <!--Create Event link - only shows if user is an editor-->
            <li v-if="user.role === 'editor'">
              <router-link to="/eventform">
                <span style="position: relative; top: 6px" class="material-icons">event</span>
                Create Event
              </router-link>
            </li>
            <!--Create Service link - only shows if user is an editor-->
            <li v-if="user.role === 'editor'">
              <router-link to="/serviceform">
                <span style="position: relative; top: 6px" class="material-icons">volunteer_activism</span>
                Create Service
              </router-link>
            </li>
            <!--Find Client link - only shows if user is logged in-->
            <li v-if="user.isLoggedIn">
              <router-link to="/findclient">
                <span style="position: relative; top: 6px" class="material-icons">search</span>
                Find Client
              </router-link>
            </li>
            <!--Find Event link - only shows if user is logged in-->
            <li v-if="user.isLoggedIn">
              <router-link to="/findevents">
                <span style="position: relative; top: 6px" class="material-icons">search</span>
                Find Event
              </router-link>
            </li>
            <!--Find Service link - only shows if user is logged in-->
            <li v-if="user.isLoggedIn">
              <router-link to="/findservice">
                <span style="position: relative; top: 6px" class="material-icons">search</span>
                Find Service
              </router-link>
            </li>
          </ul>
        </nav>
      </header>
    </div>
    <div class="grow w-4/5">
      <!--Organization Name Header-->
      <section class="justify-end items-center h-24 flex"
        style="background: linear-gradient(250deg, #c8102e 70%, #efecec 50.6%)">
        <h1 class="mr-20 text-3xl text-white"> {{ orgName }}</h1>
      </section>
      <!--Page Content-->
      <div>
        <router-view></router-view>
      </div>
    </div>
  </main>
</template>

<script setup>
// MIGRATION (Sprint 2): Converted from Options API (setup/data/created/methods) to Composition API <script setup>
import { ref } from 'vue'
import { useLoggedInUserStore } from './store/loggedInUser'
import { getOrgName } from './api/api'
import { useToast } from 'vue-toastification'

// Notifications
const toast = useToast()

// MIGRATION: user store was returned from setup(); now just a top-level const
const user = useLoggedInUserStore()

// MIGRATION: data() { orgName } -> ref()
// shows "Dataplatform" until the real organization name loads
const orgName = ref('Dataplatform')

// MIGRATION: async created() -> a plain async function called directly in <script setup>
// (code at the top level of <script setup> runs at the same time created() used to)
async function loadOrgName() {
  try {
    orgName.value = await getOrgName()
  } catch (error) {
    // MIGRATION: the old code was "catch { throw (error) }" - error was never declared,
    // so it threw a ReferenceError and hid the real problem.
    // Now the real error goes to the console and the user sees a readable message.
    console.error('Failed to load organization name:', error)
    toast.error(error.message || 'Could not load organization name')
  }
}
loadOrgName()

// MIGRATION: removed the old logout() method - it called this.$store.dispatch(), which is Vuex,
// but this project uses Pinia, so it would have crashed. It was also never used:
// the Logout link in the template calls user.logout from the Pinia store directly.
</script>

<style scoped>
#_container {
  background-color: #c8102e;
  color: white;
  padding: 18px;
}
</style>