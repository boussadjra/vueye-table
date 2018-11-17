<template>
	<div class="main-page">

		<div class="logo"></div>

		<div class="main-container">
			<h2>VUEYE DATA TABLE </h2>
			
			<vueye-table class="table-container"  checkable tableStyle="bordered" :theme="theme3"  :per-page-values="[5,10,25,50]" title="TODOS"   :rows_data="todos" v-on:checked-rows="getChecked"></vueye-table>
		</div>
 

</div>
</template>

<script>
import VueyeTable from "./components/VueyeTable.vue";

export default {
	name: "app",
	data() {
		return {
		todos:[],
			theme: {
				backgroundColor: "#20232a",
				color: "#61dafb",
				borderBottom: "1px solid #61dafb",
				rowClick: {
					backgroundColor: "#202322"
				}
			}, theme2: {
				backgroundColor: "#41b883",
				color: "#000",
				borderBottom: "1px solid #35495e",
				rowClick: {
					backgroundColor: "41b883"
				}
			}, theme3: {
				backgroundColor: "#141443",
				color: "#eee",
				rows:{
					borderBottom: "1px solid #eee"
				},
				rowClick: {
					backgroundColor: "#0D0B2F"
				}
			}, theme4: {
				backgroundColor: "#fff",
				color: "#333435",
				rows:{
					borderBottom: "1px solid #333435"
				},
				rowClick: {
					backgroundColor: "#efefef"
				}
			}, theme5: {
				backgroundColor: "#141443",
				color: "#223bbb",
				rows:{
					borderBottom: "1px solid #223bbb"
				},
				rowClick: {
					backgroundColor: "#0D0B2F"
				}
			}
		};
	},
	components: {
		VueyeTable
	},
	methods: {
    getChecked(rows) {//
    	console.log(rows);
    }
},
mounted() {
  this.axios.get("https://jsonplaceholder.typicode.com/todos").then(res=>{
this.todos=res.data;
  })
}
};
</script>

<style lang="scss">
body {
	

  // background:linear-gradient(#17bbfc,#0655d4,#9806d4);
  // background: linear-gradient( #537895,#09203f);
  //background: linear-gradient(#13547a , #80d0c7);
  // background-image: linear-gradient(to right, #43e97b 0%, #38f9d7 100%);
  //background-image: linear-gradient(to top, #fcc5e4 0%, #fda34b 15%, #ff7882 35%, #c8699e 52%, #7046aa 71%, #0c1db8 87%, #020f75 100%);
  background: #0D0B2F;
//background: #f6f6f6;
// background-image: linear-gradient(-225deg, #A445B2 0%, #D41872 52%, #FF0066 100%);
// background-image: linear-gradient(-225deg, #231557 0%, #44107A 29%, #FF1361 67%, #FFF800 100%);
margin: 0;
font-size: 12pt;
height: 100%;
padding: 50px;
}

h2 {
	color: #fff;
	font-family:montserrat;
	text-align: center;
}

.main-page {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	height: 100%;
}

.main-container {
	width: 95%;
	height: auto;
  margin: 30px;
}
.table-container{
   box-shadow: 0 0 6px #6816ec;

}
/*
.logo {
    background-image: url(https://raw.githubusercontent.com/boussadjra/vueye-table/master/src/assets/vueye.png);
    width: 150px;
    height: 125px;
    background-repeat: no-repeat;
    background-size: cover;
    margin: 10px;
    }*/
    </style>
