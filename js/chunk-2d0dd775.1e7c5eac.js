(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["chunk-2d0dd775"],{8205:function(e,s,t){"use strict";t.r(s);var a=function(){var e=this,s=e.$createElement,t=e._self._c||s;return t("div",[t("div",{staticClass:"desc"},[t("div",{staticClass:"section__title"},[e._v(" Select rows ")]),t("p",{staticClass:"p-2 text-sm"}),t("tab-view",{attrs:{items:e.items},on:{"change-tab":e.changeTab}}),t("div",{staticClass:"p-4 bg-green-50 "},[e.showCode?t("div",[t("prism",{attrs:{language:"html"}},[e._v(e._s(e.code))])],1):t("VueyeTable",{attrs:{data:e.users,columns:e.columns,"select-rows":"",title:"Users"},model:{value:e.selectedUsers,callback:function(s){e.selectedUsers=s},expression:"selectedUsers"}})],1)],1),t("hr"),e.showCode?e._e():t("div",{staticClass:"max-h-96"},[t("prism",{attrs:{language:"javascript"}},[e._v(" "+e._s(e.selectedUsers)+" ")])],1)])},l=[],c=t("bc3a"),n=t.n(c),r=t("dd80"),d={name:"SelectRows",data:function(){return{code:r["a"].selectRows,showCode:!1,items:[{header:"Preview"},{header:"Code"}],users:[],selectedUsers:[],columns:[{key:"id",label:"ID",sortable:!0,type:"number",display:!0},{key:"name",label:"Name",sortable:!0,display:!0},{key:"username",label:"User name",sortable:!0,display:!0},{key:"address.city",label:"City",display:!0,sortable:!0}]}},methods:{changeTab:function(e){this.showCode="Code"===e.header}},created:function(){var e=this;n.a.get("https://jsonplaceholder.typicode.com/users").then((function(s){e.users=s.data})).catch((function(e){}))}},i=d,o=t("2877"),u=Object(o["a"])(i,a,l,!1,null,null,null);s["default"]=u.exports}}]);
//# sourceMappingURL=chunk-2d0dd775.1e7c5eac.js.map