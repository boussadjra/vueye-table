<template>
  <svg
    :height="height"
    :width="width"
    :fill="fill"
    x="0px"
    y="0px"
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    style="transform:rotate(180deg)"
  >
   <path 
d="M277 320v43h-42v-43h42zM277 149v128h-42v-128h42zM256 469c118 0 213 -95 213 -213s-95 -213 -213 -213s-213 95 -213 213s95 213 213 213z" />
  </svg>
</template>

<script>
export default {
  name: "info",
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
