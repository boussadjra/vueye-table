import "vueye-table/style.css";
import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { VueyeTablePlugin } from "vueye-table";

import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(VueyeTablePlugin);
  },
} satisfies Theme;
