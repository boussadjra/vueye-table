<template>
    <div class="ve-table-outer-header">
   <h4> {{title}}</h4>
   <div> search</div>
    </div>
</template>

<script>
export default {
    name:'ve-header',
props:['title']
}
</script>

<style>
  .ve-table-outer-header{
      width: 100%;
        padding: 10px;
        display: flex;
        justify-content: space-between;

        align-items: center
        
    }
</style>
