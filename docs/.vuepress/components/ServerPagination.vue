<template>
  <div id="app">
    <VueyeTable
      :data="answers"
      :columns="columns"
      title="answers"
      :server="serverRequest"
      @update-request="updateRequest"
    >
      <template v-slot:title="{item}">
       <a :href="item.link" target="_blank" rel="noopener noreferrer">
       {{item.title}}
       </a>
      </template>
      <template v-slot:score="{item}">
        <h3 :style="{color:item.is_accepted?'#4d4':'#777'}" v-if="item.score">
          +
          <span>{{item.is_accepted?(item.score*10)+15:(item.score*10)}}</span>
        </h3>
      </template>
      <template v-slot:creation_date="{item}">
        <span>{{new Date(Number(item.creation_date+'000')).toDateString()}}</span>
      </template>
    </VueyeTable>
  </div>
</template>

<script>
import axios from "axios";
export default {
  name: "App",
  data: () => ({
    answers: [],
    columns: [
      {
        key: "answer_id",
        label: "ID",
        sortable: true,
        type: "number",
        display: true
      },
      {
        key: "title",
        label: "Title",
        sortable: true,
        display: true
      },
      {
        key: "score",
        label: "Score",
        display: true,
        sortable: true
      },
      {
        key: "creation_date",
        label: "Date",
        sortable: true,
        display: true
      },
       {
        key: "is_accepted",
        label: "Accepted",
        sortable: true,
        
      },
       {
        key: "link",
        label: "Link",
        sortable: true,
      }
    ],

    serverRequest: {
      total: null,
      perPage: 10,
      page: 1
    }
  }),
  methods: {
    updateRequest(page, perPage) {
      this.serverRequest = { ...this.serverRequest, page, perPage };

      this.getData();
    },
    getData() {
      axios
        .get(
          `https://api.stackexchange.com/2.2/users/8172857/answers?page=${
            this.serverRequest.page
          }&pagesize=${
            this.serverRequest.perPage
          }&order=desc&sort=activity&site=stackoverflow&filter=!)sAFO_2))PMwRocnks3p`
        )
        .then(result => {
          this.answers = result.data.items;

          this.serverRequest.total = result.data.total;
          this.serverRequest.perPage = result.data.page_size;
          this.serverRequest.page = result.data.page;
        })
        .catch(err => {});
    }
  },

  created() {
    // this.getData();
  }
};
</script>

<style lang="scss">
#app {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  box-shadow: 0 0 2px #aaa;
}
</style>
