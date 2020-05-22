<template>
  <svg
    :height="height"
    :width="width"
    :fill="fill"
    x="0px"
    y="0px"
    viewBox="0 0 512 512"
    xml:space="preserve"
    style="transform:rotate(-90deg)"
  >
    <path
    d="M442 362l-39 -39l-80 80l39 39c8 8 22 8 30 0l50 -50c8 -8 8 -22 0 -30zM64 144l236 236l80 -80l-236 -236h-80v80z" />

  </svg>
</template>

<script>
export default {
  name: "edit",
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
