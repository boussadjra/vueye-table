import Vue from 'vue';
const store = Vue.observable({
	allData: [],
	currentPageItems: [],
	handledData: [],
	selectedRows:[],
currentPage:1
});

const mutations = {
	setAllData(data) {
		store.allData = data;
	},
	setHandledData(data) {
		store.handledData = data;
	},
	setCurrentPageItems(data) {
		store.currentPageItems = data;
  },

  setSelectedRows(data){
	store.selectedRows=data
  },

  setCurrentPage(page){
	  store.currentPage=page
  }

  
};

export { store, mutations };
