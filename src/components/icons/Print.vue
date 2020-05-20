<template>
  <svg
    :height="height"
    :width="width"
    :fill="fill"
    x="0px"
    y="0px"
    viewBox="0 0 512 512"
    xml:space="preserve"
    style="transform:rotate(180deg)"
  >
    <path
      d="M384 448v-85h-256v85h256zM405 256c12 0 22 9 22 21s-10 22 -22 22s-21 -10 -21 -22s9 -21 21 -21zM341 107v106h-170v-106h170zM405 341c35 0 64 -29 64 -64v-128h-85v-85h-256v85h-85v128c0 35 29 64 64 64h298z" />

    


  </svg>
</template>

<script>
export default {
  name: "print",
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
