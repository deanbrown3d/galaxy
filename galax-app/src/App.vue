<template>
  <div id="app">
    <Dashboard v-if="settings === true"/>
    <galaxy v-if="settings !== true"/>
  </div>
</template>

<script>
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

import Dashboard from './components/Dashboard.vue'
import galaxy from './components/galaxy.vue'

export default {
  name: 'App',
  components: {
    Dashboard, galaxy
  },
  data() {
      return {
          settings: false
      }
  },
  mounted() {
    console.log("I am in mounted!!!")
    // this.settings = true
  },
  setup () {
    console.log("I am in setup!!!")
  }
}
</script>

<style>
  @import './assets/styles/global.css';
</style>