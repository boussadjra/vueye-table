<template>
  <div class="ve-card" :style="{width:width}">
    <div class="ve-card-header">
      <slot name="header"></slot>
    </div>
    <div class="ve-card-body">
      <slot name="body"></slot>
    </div>
    <div class="ve-card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: "card",
  props: {
    width: {
      type: String,
      default: "280px"
    }
  }
};
</script>

<style lang="scss" >
.ve-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 10px;
  box-shadow: 0 0 4px #aaa;
  min-width: 280px;
  width: fit-content;
  border-radius: 4px;
  &-body{
    max-height: 300px;
    overflow: auto;
    padding: 10px;

  }
  &-header,
  &-footer {
    display: flex;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #ddd;
  }
  &-footer {
    justify-content: space-around;
    border-bottom: none;
  }
}
</style>
