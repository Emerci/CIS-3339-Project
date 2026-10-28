<!-- This is the home view - which shows a dashboard -->
<template>
  <main>
    <div>
      <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
        Dashboard
      </h1>
      <br />
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="ml-10"></div>
        <div class="flex flex-col col-span-2">
          <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
              Events Attendance
          </h1>
      
          <div v-if="!recentEvents.length" class="flex justify-center mt-10">No events found.</div>
          <table v-if="recentEvents.length" class="min-w-full shadow-md rounded">
            <thead class="bg-gray-50 text-xl">
              <tr class="p-4 text-left">
                <th class="p-4 text-left">Event Name</th>
                <th class="p-4 text-left">Event Date</th>
                <th class="p-4 text-left">Number of Attendees</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-300"> 
              <tr
                @click="editEvent(event._id)"
                v-for="event in recentEvents"
                :key="event._id"
              >
                <td class="p-2 text-left">{{ event.name }}</td>
                <td class="p-2 text-left">{{ formatDate(event.date) }}</td>
                <td class="p-2 text-left">{{ event.attendees.length }}</td>
              </tr>
            </tbody>
          </table>
          
          <div v-if="recentEvents.length">
            <AttendanceChart
              v-if="!loading && !error"
              :label="labels"
              :chart-data="chartData"
            ></AttendanceChart>

            <!-- Start of loading animation -->
            <div class="mt-40" v-if="loading">
              <p
                class="text-6xl font-bold text-center text-gray-500 animate-pulse"
              >
                Loading...
              </p>
            </div>
            <!-- End of loading animation -->

            <!-- Start of error alert -->
            <div class="mt-12 bg-red-50" v-if="error">
              <h3 class="px-4 py-1 text-4xl font-bold text-white bg-red-800">
                {{ error.title }}
              </h3>
              <p class="p-4 text-lg font-bold text-red-900">
                {{ error.message }}
              </p>
            </div>
            <!-- End of error alert -->
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
        <div class="ml-10"></div>
        <div class="flex flex-col col-span-2">
          <h1 class="font-bold text-4xl text-red-700 tracking-widest text-center mt-10">
              Clients by Zip Code
          </h1>
          
          <div v-if="!zips.length" class="flex justify-center mt-10">No clients found.</div>
          <table v-if="zips.length" class="min-w-full shadow-md rounded">
            <thead class="bg-gray-50 text-xl">
              <tr class="p-4 text-left">
                <th class="p-4 text-left">Zip Number</th>
                <th class="p-4 text-left">Client Count</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-300">
              <tr
                v-for="zip in zips"
                :key="zip._id"
              >
                <td class="p-2 text-left">{{ zip._id }}</td>
                <td class="p-2 text-left">{{ zip.count }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="zips.length" class="flex justify-center mt-10">
            <ZipChart
              v-if="!zipLoading && !zipError"
              :label="zipLabels"
              :chart-data="zipChartData"
            ></ZipChart>

            <!-- Start of loading animation -->
            <div class="mt-40" v-if="zipLoading">
              <p
                class="text-6xl font-bold text-center text-gray-500 animate-pulse"
              >
                Loading...
              </p>
            </div>
            <!-- End of loading animation -->

            <!-- Start of error alert -->
            <div class="mt-12 bg-red-50" v-if="zipError">
              <h3 class="px-4 py-1 text-4xl font-bold text-white bg-red-800">
                {{ zipError.title }}
              </h3>
              <p class="p-4 text-lg font-bold text-red-900">
                {{ zipError.message }}
              </p>
            </div>
            <!-- End of error alert -->
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
// MIGRATION (Sprint 2): Converted from Options API (components/data/mounted/methods) to Composition API <script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// MIGRATION: components: { AttendanceChart, ZipChart } is no longer needed -
// with <script setup>, imported components are registered automatically
import AttendanceChart from '../components/barChart.vue'
import ZipChart from '../components/donutZipChart.vue'
import { getAttendance, getClientsByZipCode } from '../api/api'

const router = useRouter()

// MIGRATION: data() -> individual ref() variables
// Events Attendance section state
const recentEvents = ref([])
const labels = ref([])
const chartData = ref([])
const loading = ref(false)
const error = ref(null)

// Clients by Zip Code section state
const zips = ref([])
const zipLabels = ref([])
const zipChartData = ref([])
const zipLoading = ref(false)
const zipError = ref(null)

// MIGRATION: methods: { formatDate } -> plain function (still callable from the template)
// method called to format the event date
function formatDate(date) {
  const isoDate = new Date(date)
  const year = isoDate.getUTCFullYear()
  const month = String(isoDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(isoDate.getUTCDate()).padStart(2, '0')
  return `${month}/${day}/${year}`
}

// Builds a readable error object (title + message) for the error alert boxes
function buildError(err) {
  if (err.response) {
    // client received an error response (5xx, 4xx)
    return { title: 'Server Response', message: err.message }
  } else if (err.request) {
    // client never received a response, or request never left
    return { title: 'Unable to Reach Server', message: err.message }
  }
  // There's probably an error in your code
  return { title: 'Application Error', message: err.message }
}

// MIGRATION: methods: { getAttendanceData } -> plain async function; this.x -> x.value
// Loads recent events and builds the bar chart labels/data
async function getAttendanceData() {
  try {
    error.value = null
    loading.value = true

    const attendance = await getAttendance()
    recentEvents.value = attendance
    labels.value = attendance.map((item) => `${item.name} (${formatDate(item.date)})`)
    chartData.value = attendance.map((item) => item.attendees.length)
  } catch (err) {
    error.value = buildError(err)
  }
  loading.value = false
}

// MIGRATION: methods: { getZipData } -> plain async function; this.x -> x.value
// Loads client counts by zip code and builds the donut chart labels/data
async function getZipData() {
  try {
    zipError.value = null
    zipLoading.value = true

    const zipdata = await getClientsByZipCode()
    zips.value = zipdata
    zipLabels.value = zipdata.map((item) => item._id)
    zipChartData.value = zipdata.map((item) => item.count)
  } catch (err) {
    zipError.value = buildError(err)
  }
  zipLoading.value = false
}

// MIGRATION: added editEvent - the template already called editEvent(event._id) on row click,
// but the Options API version never defined it, so clicking a row threw an error.
// It now opens that event's details page.
function editEvent(id) {
  router.push({ name: 'eventdetails', params: { id } })
}

// MIGRATION: mounted() -> onMounted()
// when the dashboard loads, fetch both sections
onMounted(() => {
  getAttendanceData()
  getZipData()
})
</script>