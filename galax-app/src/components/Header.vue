<template>
    <div class="header">
      Galaxy Simulator - deanbrown.org <span>{{ percentageDone ? (percentageDone + '%') : '' }}</span>
    </div>
</template>

<script>
    console.log("I am in header!!!")
    export default {
      name: 'Header',
      props: ['percentageDone'],
    }
</script>