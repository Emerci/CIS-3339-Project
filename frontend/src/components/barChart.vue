<template>
  <div>
    <canvas class="p-10" ref="attendanceChart"></canvas>
  </div>
</template>

<script setup>
// MIGRATION (Sprint 2): Converted from Options API (props/mounted) to Composition API <script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, registerables, Colors } from 'chart.js'

Chart.register(...registerables)
Chart.register(Colors)

// MIGRATION: props: { label, chartData } -> defineProps()
const props = defineProps({
  label: {
    type: Array
  },
  chartData: {
    type: Array
  }
})

// MIGRATION: this.$refs.attendanceChart -> template ref with the same name as ref="attendanceChart"
const attendanceChart = ref(null)

// Holds the Chart.js instance so it can be updated and destroyed later
// (plain variable, not ref - Chart.js objects should not be made reactive)
let chart = null

// MIGRATION: async mounted() -> onMounted()
// MIGRATION: removed "await" - new Chart() is not a promise, so awaiting it did nothing
onMounted(() => {
  chart = new Chart(attendanceChart.value, {
    type: 'bar',
    data: {
      labels: props.label,
      datasets: [
        {
          borderWidth: 1,
          data: props.chartData
        }
      ]
    },
    options: {
      scales: {
        y: {
          ticks: {
            stepSize: 1
          }
        },
        x: {
          gridLines: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: 'Attendance Chart'
        }
      },
      responsive: true,
      maintainAspectRatio: true
    }
  })
})

// MIGRATION: added watch() - the Options API version never reacted to prop changes,
// so the chart went stale if the data changed. Now it redraws with the new data.
watch(
  () => [props.label, props.chartData],
  ([newLabels, newData]) => {
    if (!chart) return
    chart.data.labels = newLabels
    chart.data.datasets[0].data = newData
    chart.update()
  }
)

// MIGRATION: added onBeforeUnmount() - the Options API version never destroyed the chart,
// which leaked the canvas and its event listeners every time you left the page
onBeforeUnmount(() => {
  if (chart) {
    chart.destroy()
    chart = null
  }
})
</script>