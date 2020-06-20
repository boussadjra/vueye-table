import Vue from 'vue';
const store = Vue.observable({
	allData: [],
	currentPageItems: [],
	handledData: [],
	selectedRows:[]

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
  }
  
};

export { store, mutations };
