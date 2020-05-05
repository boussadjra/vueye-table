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
d="M64 468V44C64 37.4 69.4 32 76 32H124C130.6 32 136 37.4 136 44V220.4L331.5 39.4C352.1 22.3 384 36.6 384 64V448C384 475.4 352.1 489.7 331.5 472.6L136 292.7V468C136 474.6 130.6 480 124 480H76C69.4 480 64 474.6 64 468z" /> </svg>
</template>

<script>
export default {
  name: "step-backward",
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
