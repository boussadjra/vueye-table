import "vueye-table/style.css";
import "./app.css";
import { createApp } from "vue";
import { VueyeTablePlugin } from "vueye-table";

import App from "./App.vue";

createApp(App).use(VueyeTablePlugin).mount("#app");
