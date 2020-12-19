import {reactive} from "@vue/composition-api";
const sharedState = reactive({
	allData: [],
	currentPageItems: [],
	handledData: [],
	selectedRows:[],
currentPage:1
});
const store=()=>{
	
	
	const mutations = {
		setAllData(data) {
			sharedState.allData = data;
		},
		setHandledData(data) {
			sharedState.handledData = data;
		},
		setCurrentPageItems(data) {
			sharedState.currentPageItems = data;
	  },
	
	  setSelectedRows(data){
		sharedState.selectedRows=data
	  },
	
	  setCurrentPage(page){
		  sharedState.currentPage=page
	  }
	
	  
	};
	return {sharedState,mutations}
}

export default store;
