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
d="M384 44V468C384 474.6 378.6 480 372 480H324C317.4 480 312 474.6 312 468V291.6L116.5 472.6C95.9 489.7 64 475.4 64 448V64C64 36.6 95.9 22.3 116.5 39.4L312 219.3V44C312 37.4 317.4 32 324 32H372C378.6 32 384 37.4 384 44z" /> </svg>
</template>

<script>
export default {
  name: "step-forward",
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
