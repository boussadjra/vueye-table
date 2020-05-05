<template>
  <svg
    :height="height"
    :width="width"
    :fill="fill"
    x="0px"
    y="0px"
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
   
  >
   <path  
d="M285.5 273L91.1 467.3C81.8 476.7 66.6 476.7 57.2 467.3L34.5 444.6C25.2 435.3 25.1 420.1 34.5 410.7L188.5 256 34.5 101.3C25.1 91.9 25.2 76.7 34.5 67.4L57.2 44.7C66.6 35.3 81.8 35.3 91.1 44.7L285.5 239C294.8 248.4 294.8 263.6 285.5 273z" /> </svg>
</template>

<script>
export default {
  name: "chevron-right",
  props: {
    fill: {
      default: "#000"
    },
    height: {
      default: "20px"
    },
    width: {
      default: "20px"
    }
  }
};
</script>

<style>
</style>
