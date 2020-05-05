<template>
<svg
    :height="height"
    :width="width"
    :fill="fill"
    x="0px"
    y="0px"
    viewBox="0 0 512 512"
    style="transform:rotate(180deg);"
    xml:space="preserve"
  >
    <path
    
d="M373 256c18 0 32 14 32 32s-14 32 -32 32s-32 -14 -32 -32s14 -32 32 -32zM309 341c18 0 32 14 32 32s-14 32 -32 32s-32 -14 -32 -32s14 -32 32 -32zM203 341c18 0 32 14 32 32s-14 32 -32 32s-32 -14 -32 -32s14 -32 32 -32zM139 256c18 0 32 14 32 32s-14 32 -32 32
s-32 -14 -32 -32s14 -32 32 -32zM256 448c106 0 192 -77 192 -171c0 -59 -48 -106 -107 -106h-37c-18 0 -32 -14 -32 -32c0 -8 3 -15 8 -21s8 -14 8 -22c0 -18 -14 -32 -32 -32c-106 0 -192 86 -192 192s86 192 192 192z" />
 
  </svg>
</template>

<script>
export default {
    name: "palette",
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
