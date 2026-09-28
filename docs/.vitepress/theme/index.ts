import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "vueye-table/style.css";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { VueyeTablePlugin } from "vueye-table";

import DemoFrame from "./components/DemoFrame.vue";
import EditLog from "./components/EditLog.vue";
import HomePage from "./components/HomePage.vue";
import StatePanel from "./components/StatePanel.vue";

// The site's styles come after the default theme's, so they win at equal specificity.
import "./styles/tokens.css";
import "./styles/site.css";
import "./styles/table.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(VueyeTablePlugin);
    app.component("HomePage", HomePage);
    app.component("DemoFrame", DemoFrame);
    app.component("StatePanel", StatePanel);
    app.component("EditLog", EditLog);
  },
} satisfies Theme;
