(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["chunk-2d0d6d00"],{"73c1":function(e,t,s){"use strict";s.r(t);var l=function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("div",[s("div",{staticClass:"desc"},[s("div",{staticClass:"section__title"},[e._v("Table body cells custom rendering")]),e._m(0),s("tab-view",{attrs:{items:e.items},on:{"change-tab":e.changeTab}}),s("div",{staticClass:"p-4 bg-green-50"},[e.showCode?s("div",[s("prism",{attrs:{language:"html"}},[e._v(e._s(e.code))])],1):e._e(),s("VueyeTable",{attrs:{data:e.todos,columns:e.columns,title:"Todos"},scopedSlots:e._u([{key:"cell.completed",fn:function(t){var l=t.item;return[s("td",{style:{background:e.colors[l.userId-1],color:"white"},attrs:{"data-label":"Completed"}},[e._v(" "+e._s(l.userId)+" ")])]}},{key:"completed",fn:function(t){var s=t.item;return[e._v(e._s(s.completed?"Yes":"No"))]}}])})],1)],1)])},o=[function(){var e=this,t=e.$createElement,s=e._self._c||t;return s("p",{staticClass:"p-2 text-sm"},[e._v(" If you want to take the control over the whole cell you can prefix the "),s("code",{staticClass:"bg-green-100 text-green-700 p-1"},[e._v("column")]),e._v("key with "),s("code",{staticClass:"bg-green-100 text-green-700 p-1"},[e._v("cell.")]),e._v("keyword and here you're able to style and render the "),s("code",{staticClass:"bg-green-100 text-green-700 p-1"},[e._v("td")]),e._v("element as you want Note that you should add "),s("code",{staticClass:"bg-green-100 text-green-700 p-1"},[e._v("data-label")]),e._v("attribute with column name, this's useful for small screens ")])}],n=(s("fb6a"),s("d3b7"),s("25f0"),s("134f")),a=s("dd80"),r={name:"FullCellCustomRendering",data:function(){return{code:a["a"].fullCellCustomRendering,showCode:!1,items:[{header:"Preview"},{header:"Code"}],todos:n["a"],columns:[{key:"id",label:"ID",sortable:!0,display:!0},{key:"userId",label:"User ID",sortable:!0,display:!0},{key:"title",label:"Title",display:!0},{key:"completed",label:"Completed",display:!0}],colors:["#004D40","#00695C","#2e003e","#3d2352","#05386B","#379683","#022140","#265077","#0c0023","#fc0023"]}},computed:{employees:function(e){function t(){return e.apply(this,arguments)}return t.toString=function(){return e.toString()},t}((function(){return employees.slice()}))},methods:{changeTab:function(e){this.showCode="Code"===e.header}},mounted:function(){}},d=r,c=s("2877"),i=Object(c["a"])(d,l,o,!1,null,null,null);t["default"]=i.exports}}]);
//# sourceMappingURL=chunk-2d0d6d00.87217d82.js.map