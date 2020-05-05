<template>
  <svg
    id="icon-search"
 
    x="0px"
    y="0px"
  :height="height"
    :width="width"
    :fill="fill"
    viewBox="0 0 100 100"
  >
    <path
      d="M80.65 66.78a33.55 33.55 0 01-47.44-47.44 33.55 33.55 0 1147.44 47.44zm6.73-54.16a43.06 43.06 0 00-65.32 55.71L2 88.39A6.8 6.8 0 0011.61 98l20.06-20.06a43.06 43.06 0 0055.71-65.32z"
    ></path>
  </svg>
</template>

<script>
export default {
  name: "search",
    props:{
	  fill:{
		  default:"#000"
	  },
	  height:{
		  default:'20px'
	  },
	  width:{
		  default:'20px'
	  }
  }
};
</script>

<style>
</style>
