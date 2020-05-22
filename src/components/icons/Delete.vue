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
      d="M405 427v-43h-298v43h74l22 21h106l22 -21h74zM128 107v256h256v-256c0 -23 -20 -43 -43 -43h-170c-23 0 -43 20 -43 43z"
    ></path>
  </svg>
</template>

<script>
export default {
  name: "delete",
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
