"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/[...nextauth]/route";
exports.ids = ["app/api/auth/[...nextauth]/route"];
exports.modules = {

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Fthebarrya%2FDocuments%2FProjectMCP%2FRADRIS%2Ffrontend%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fthebarrya%2FDocuments%2FProjectMCP%2FRADRIS%2Ffrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Fthebarrya%2FDocuments%2FProjectMCP%2FRADRIS%2Ffrontend%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fthebarrya%2FDocuments%2FProjectMCP%2FRADRIS%2Ffrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   headerHooks: () => (/* binding */ headerHooks),\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage),\n/* harmony export */   staticGenerationBailout: () => (/* binding */ staticGenerationBailout)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var _Users_thebarrya_Documents_ProjectMCP_RADRIS_frontend_src_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./src/app/api/auth/[...nextauth]/route.ts */ \"(rsc)/./src/app/api/auth/[...nextauth]/route.ts\");\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/[...nextauth]/route\",\n        pathname: \"/api/auth/[...nextauth]\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/[...nextauth]/route\"\n    },\n    resolvedPagePath: \"/Users/thebarrya/Documents/ProjectMCP/RADRIS/frontend/src/app/api/auth/[...nextauth]/route.ts\",\n    nextConfigOutput,\n    userland: _Users_thebarrya_Documents_ProjectMCP_RADRIS_frontend_src_app_api_auth_nextauth_route_ts__WEBPACK_IMPORTED_MODULE_2__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks, headerHooks, staticGenerationBailout } = routeModule;\nconst originalPathname = \"/api/auth/[...nextauth]/route\";\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZhdXRoJTJGJTVCLi4ubmV4dGF1dGglNUQlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRmF1dGglMkYlNUIuLi5uZXh0YXV0aCU1RCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRmF1dGglMkYlNUIuLi5uZXh0YXV0aCU1RCUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnRoZWJhcnJ5YSUyRkRvY3VtZW50cyUyRlByb2plY3RNQ1AlMkZSQURSSVMlMkZmcm9udGVuZCUyRnNyYyUyRmFwcCZwYWdlRXh0ZW5zaW9ucz10c3gmcGFnZUV4dGVuc2lvbnM9dHMmcGFnZUV4dGVuc2lvbnM9anN4JnBhZ2VFeHRlbnNpb25zPWpzJnJvb3REaXI9JTJGVXNlcnMlMkZ0aGViYXJyeWElMkZEb2N1bWVudHMlMkZQcm9qZWN0TUNQJTJGUkFEUklTJTJGZnJvbnRlbmQmaXNEZXY9dHJ1ZSZ0c2NvbmZpZ1BhdGg9dHNjb25maWcuanNvbiZiYXNlUGF0aD0mYXNzZXRQcmVmaXg9Jm5leHRDb25maWdPdXRwdXQ9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQXNHO0FBQ3ZDO0FBQzJEO0FBQzFIO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsdUdBQXVHO0FBQy9HO0FBQ2lKOztBQUVqSiIsInNvdXJjZXMiOlsid2VicGFjazovL3JhZHJpcy1mcm9udGVuZC8/ZGU4MyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvZnV0dXJlL3JvdXRlLWtpbmRcIjtcbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIvVXNlcnMvdGhlYmFycnlhL0RvY3VtZW50cy9Qcm9qZWN0TUNQL1JBRFJJUy9mcm9udGVuZC9zcmMvYXBwL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2F1dGgvWy4uLm5leHRhdXRoXVwiLFxuICAgICAgICBmaWxlbmFtZTogXCJyb3V0ZVwiLFxuICAgICAgICBidW5kbGVQYXRoOiBcImFwcC9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL3RoZWJhcnJ5YS9Eb2N1bWVudHMvUHJvamVjdE1DUC9SQURSSVMvZnJvbnRlbmQvc3JjL2FwcC9hcGkvYXV0aC9bLi4ubmV4dGF1dGhdL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgcmVxdWVzdEFzeW5jU3RvcmFnZSwgc3RhdGljR2VuZXJhdGlvbkFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIGhlYWRlckhvb2tzLCBzdGF0aWNHZW5lcmF0aW9uQmFpbG91dCB9ID0gcm91dGVNb2R1bGU7XG5jb25zdCBvcmlnaW5hbFBhdGhuYW1lID0gXCIvYXBpL2F1dGgvWy4uLm5leHRhdXRoXS9yb3V0ZVwiO1xuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBoZWFkZXJIb29rcywgc3RhdGljR2VuZXJhdGlvbkJhaWxvdXQsIG9yaWdpbmFsUGF0aG5hbWUsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Fthebarrya%2FDocuments%2FProjectMCP%2FRADRIS%2Ffrontend%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fthebarrya%2FDocuments%2FProjectMCP%2FRADRIS%2Ffrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./src/app/api/auth/[...nextauth]/route.ts":
/*!*************************************************!*\
  !*** ./src/app/api/auth/[...nextauth]/route.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ handler),\n/* harmony export */   POST: () => (/* binding */ handler)\n/* harmony export */ });\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/auth */ \"(rsc)/./src/lib/auth.ts\");\n\n\nconst handler = next_auth__WEBPACK_IMPORTED_MODULE_0___default()(_lib_auth__WEBPACK_IMPORTED_MODULE_1__.authOptions);\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvYXBwL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBaUM7QUFDUTtBQUV6QyxNQUFNRSxVQUFVRixnREFBUUEsQ0FBQ0Msa0RBQVdBO0FBRU8iLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9yYWRyaXMtZnJvbnRlbmQvLi9zcmMvYXBwL2FwaS9hdXRoL1suLi5uZXh0YXV0aF0vcm91dGUudHM/MDA5OCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTmV4dEF1dGggZnJvbSAnbmV4dC1hdXRoJztcbmltcG9ydCB7IGF1dGhPcHRpb25zIH0gZnJvbSAnQC9saWIvYXV0aCc7XG5cbmNvbnN0IGhhbmRsZXIgPSBOZXh0QXV0aChhdXRoT3B0aW9ucyk7XG5cbmV4cG9ydCB7IGhhbmRsZXIgYXMgR0VULCBoYW5kbGVyIGFzIFBPU1QgfTsiXSwibmFtZXMiOlsiTmV4dEF1dGgiLCJhdXRoT3B0aW9ucyIsImhhbmRsZXIiLCJHRVQiLCJQT1NUIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./src/app/api/auth/[...nextauth]/route.ts\n");

/***/ }),

/***/ "(rsc)/./src/lib/auth.ts":
/*!*************************!*\
  !*** ./src/lib/auth.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   authOptions: () => (/* binding */ authOptions)\n/* harmony export */ });\n/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth/providers/credentials */ \"(rsc)/./node_modules/next-auth/providers/credentials.js\");\n\nconst authOptions = {\n    providers: [\n        // Temporarily simplified to test NextAuth initialization\n        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n            name: \"credentials\",\n            credentials: {\n                email: {\n                    label: \"Email\",\n                    type: \"email\"\n                },\n                password: {\n                    label: \"Password\",\n                    type: \"password\"\n                }\n            },\n            async authorize (credentials) {\n                if (!credentials?.email || !credentials?.password) {\n                    return null;\n                }\n                try {\n                    // Use explicit backend URL - in Docker environment, always use service name\n                    // Since NextAuth authorize runs on the server side, it's always in Docker context\n                    const backendUrl = \"http://backend:3001/api\";\n                    const loginUrl = `${backendUrl}/auth/login`;\n                    console.log(\"\\uD83D\\uDD10 Attempting login to:\", loginUrl);\n                    const response = await fetch(loginUrl, {\n                        method: \"POST\",\n                        headers: {\n                            \"Content-Type\": \"application/json\"\n                        },\n                        body: JSON.stringify({\n                            email: credentials.email,\n                            password: credentials.password\n                        })\n                    });\n                    console.log(\"\\uD83D\\uDCE1 Login response status:\", response.status);\n                    if (!response.ok) {\n                        const errorText = await response.text();\n                        console.error(\"❌ Backend login failed:\", response.status, errorText);\n                        return null;\n                    }\n                    const data = await response.json();\n                    console.log(\"✅ Login response data:\", {\n                        hasToken: !!data.token,\n                        hasUser: !!data.user,\n                        userRole: data.user?.role\n                    });\n                    const { token, user } = data;\n                    if (token && user) {\n                        return {\n                            id: user.id,\n                            email: user.email,\n                            name: `${user.firstName} ${user.lastName}`,\n                            role: user.role,\n                            accessToken: token\n                        };\n                    }\n                    return null;\n                } catch (error) {\n                    console.error(\"Auth error:\", error instanceof Error ? error.message : \"Unknown error\");\n                    return null;\n                }\n            }\n        })\n    ],\n    callbacks: {\n        async jwt ({ token, user }) {\n            // Initial sign in\n            if (user) {\n                token.accessToken = user.accessToken;\n                token.role = user.role;\n            }\n            return token;\n        },\n        async session ({ session, token }) {\n            // Send properties to the client\n            if (token) {\n                session.accessToken = token.accessToken;\n                session.user.role = token.role;\n            }\n            return session;\n        }\n    },\n    pages: {\n        signIn: \"/auth/login\"\n    },\n    session: {\n        strategy: \"jwt\",\n        maxAge: 24 * 60 * 60\n    },\n    jwt: {\n        maxAge: 24 * 60 * 60\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9zcmMvbGliL2F1dGgudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFDa0U7QUFFM0QsTUFBTUMsY0FBK0I7SUFDMUNDLFdBQVc7UUFDVCx5REFBeUQ7UUFDekRGLDJFQUFtQkEsQ0FBQztZQUNsQkcsTUFBTTtZQUNOQyxhQUFhO2dCQUNYQyxPQUFPO29CQUFFQyxPQUFPO29CQUFTQyxNQUFNO2dCQUFRO2dCQUN2Q0MsVUFBVTtvQkFBRUYsT0FBTztvQkFBWUMsTUFBTTtnQkFBVztZQUNsRDtZQUNBLE1BQU1FLFdBQVVMLFdBQVc7Z0JBQ3pCLElBQUksQ0FBQ0EsYUFBYUMsU0FBUyxDQUFDRCxhQUFhSSxVQUFVO29CQUNqRCxPQUFPO2dCQUNUO2dCQUVBLElBQUk7b0JBQ0YsNEVBQTRFO29CQUM1RSxrRkFBa0Y7b0JBQ2xGLE1BQU1FLGFBQWE7b0JBRW5CLE1BQU1DLFdBQVcsQ0FBQyxFQUFFRCxXQUFXLFdBQVcsQ0FBQztvQkFDM0NFLFFBQVFDLEdBQUcsQ0FBQyxxQ0FBMkJGO29CQUV2QyxNQUFNRyxXQUFXLE1BQU1DLE1BQU1KLFVBQVU7d0JBQ3JDSyxRQUFRO3dCQUNSQyxTQUFTOzRCQUNQLGdCQUFnQjt3QkFDbEI7d0JBQ0FDLE1BQU1DLEtBQUtDLFNBQVMsQ0FBQzs0QkFDbkJmLE9BQU9ELFlBQVlDLEtBQUs7NEJBQ3hCRyxVQUFVSixZQUFZSSxRQUFRO3dCQUNoQztvQkFDRjtvQkFFQUksUUFBUUMsR0FBRyxDQUFDLHVDQUE2QkMsU0FBU08sTUFBTTtvQkFFeEQsSUFBSSxDQUFDUCxTQUFTUSxFQUFFLEVBQUU7d0JBQ2hCLE1BQU1DLFlBQVksTUFBTVQsU0FBU1UsSUFBSTt3QkFDckNaLFFBQVFhLEtBQUssQ0FBQywyQkFBMkJYLFNBQVNPLE1BQU0sRUFBRUU7d0JBQzFELE9BQU87b0JBQ1Q7b0JBRUEsTUFBTUcsT0FBTyxNQUFNWixTQUFTYSxJQUFJO29CQUNoQ2YsUUFBUUMsR0FBRyxDQUFDLDBCQUEwQjt3QkFDcENlLFVBQVUsQ0FBQyxDQUFDRixLQUFLRyxLQUFLO3dCQUN0QkMsU0FBUyxDQUFDLENBQUNKLEtBQUtLLElBQUk7d0JBQ3BCQyxVQUFVTixLQUFLSyxJQUFJLEVBQUVFO29CQUN2QjtvQkFFQSxNQUFNLEVBQUVKLEtBQUssRUFBRUUsSUFBSSxFQUFFLEdBQUdMO29CQUV4QixJQUFJRyxTQUFTRSxNQUFNO3dCQUNqQixPQUFPOzRCQUNMRyxJQUFJSCxLQUFLRyxFQUFFOzRCQUNYN0IsT0FBTzBCLEtBQUsxQixLQUFLOzRCQUNqQkYsTUFBTSxDQUFDLEVBQUU0QixLQUFLSSxTQUFTLENBQUMsQ0FBQyxFQUFFSixLQUFLSyxRQUFRLENBQUMsQ0FBQzs0QkFDMUNILE1BQU1GLEtBQUtFLElBQUk7NEJBQ2ZJLGFBQWFSO3dCQUNmO29CQUNGO29CQUVBLE9BQU87Z0JBQ1QsRUFBRSxPQUFPSixPQUFPO29CQUNkYixRQUFRYSxLQUFLLENBQUMsZUFBZUEsaUJBQWlCYSxRQUFRYixNQUFNYyxPQUFPLEdBQUc7b0JBQ3RFLE9BQU87Z0JBQ1Q7WUFDRjtRQUNGO0tBQ0Q7SUFDREMsV0FBVztRQUNULE1BQU1DLEtBQUksRUFBRVosS0FBSyxFQUFFRSxJQUFJLEVBQUU7WUFDdkIsa0JBQWtCO1lBQ2xCLElBQUlBLE1BQU07Z0JBQ1JGLE1BQU1RLFdBQVcsR0FBR04sS0FBS00sV0FBVztnQkFDcENSLE1BQU1JLElBQUksR0FBR0YsS0FBS0UsSUFBSTtZQUN4QjtZQUNBLE9BQU9KO1FBQ1Q7UUFDQSxNQUFNYSxTQUFRLEVBQUVBLE9BQU8sRUFBRWIsS0FBSyxFQUFFO1lBQzlCLGdDQUFnQztZQUNoQyxJQUFJQSxPQUFPO2dCQUNUYSxRQUFRTCxXQUFXLEdBQUdSLE1BQU1RLFdBQVc7Z0JBQ3ZDSyxRQUFRWCxJQUFJLENBQUNFLElBQUksR0FBR0osTUFBTUksSUFBSTtZQUNoQztZQUNBLE9BQU9TO1FBQ1Q7SUFDRjtJQUNBQyxPQUFPO1FBQ0xDLFFBQVE7SUFDVjtJQUNBRixTQUFTO1FBQ1BHLFVBQVU7UUFDVkMsUUFBUSxLQUFLLEtBQUs7SUFDcEI7SUFDQUwsS0FBSztRQUNISyxRQUFRLEtBQUssS0FBSztJQUNwQjtBQUNGLEVBQUUiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9yYWRyaXMtZnJvbnRlbmQvLi9zcmMvbGliL2F1dGgudHM/NjY5MiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZXh0QXV0aE9wdGlvbnMgfSBmcm9tICduZXh0LWF1dGgnO1xuaW1wb3J0IENyZWRlbnRpYWxzUHJvdmlkZXIgZnJvbSAnbmV4dC1hdXRoL3Byb3ZpZGVycy9jcmVkZW50aWFscyc7XG5cbmV4cG9ydCBjb25zdCBhdXRoT3B0aW9uczogTmV4dEF1dGhPcHRpb25zID0ge1xuICBwcm92aWRlcnM6IFtcbiAgICAvLyBUZW1wb3JhcmlseSBzaW1wbGlmaWVkIHRvIHRlc3QgTmV4dEF1dGggaW5pdGlhbGl6YXRpb25cbiAgICBDcmVkZW50aWFsc1Byb3ZpZGVyKHtcbiAgICAgIG5hbWU6ICdjcmVkZW50aWFscycsXG4gICAgICBjcmVkZW50aWFsczoge1xuICAgICAgICBlbWFpbDogeyBsYWJlbDogJ0VtYWlsJywgdHlwZTogJ2VtYWlsJyB9LFxuICAgICAgICBwYXNzd29yZDogeyBsYWJlbDogJ1Bhc3N3b3JkJywgdHlwZTogJ3Bhc3N3b3JkJyB9LFxuICAgICAgfSxcbiAgICAgIGFzeW5jIGF1dGhvcml6ZShjcmVkZW50aWFscykge1xuICAgICAgICBpZiAoIWNyZWRlbnRpYWxzPy5lbWFpbCB8fCAhY3JlZGVudGlhbHM/LnBhc3N3b3JkKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIFVzZSBleHBsaWNpdCBiYWNrZW5kIFVSTCAtIGluIERvY2tlciBlbnZpcm9ubWVudCwgYWx3YXlzIHVzZSBzZXJ2aWNlIG5hbWVcbiAgICAgICAgICAvLyBTaW5jZSBOZXh0QXV0aCBhdXRob3JpemUgcnVucyBvbiB0aGUgc2VydmVyIHNpZGUsIGl0J3MgYWx3YXlzIGluIERvY2tlciBjb250ZXh0XG4gICAgICAgICAgY29uc3QgYmFja2VuZFVybCA9ICdodHRwOi8vYmFja2VuZDozMDAxL2FwaSc7XG4gICAgICAgICAgXG4gICAgICAgICAgY29uc3QgbG9naW5VcmwgPSBgJHtiYWNrZW5kVXJsfS9hdXRoL2xvZ2luYDtcbiAgICAgICAgICBjb25zb2xlLmxvZygn8J+UkCBBdHRlbXB0aW5nIGxvZ2luIHRvOicsIGxvZ2luVXJsKTtcbiAgICAgICAgICBcbiAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGxvZ2luVXJsLCB7XG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgIGVtYWlsOiBjcmVkZW50aWFscy5lbWFpbCxcbiAgICAgICAgICAgICAgcGFzc3dvcmQ6IGNyZWRlbnRpYWxzLnBhc3N3b3JkLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBjb25zb2xlLmxvZygn8J+ToSBMb2dpbiByZXNwb25zZSBzdGF0dXM6JywgcmVzcG9uc2Uuc3RhdHVzKTtcblxuICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGF3YWl0IHJlc3BvbnNlLnRleHQoKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBCYWNrZW5kIGxvZ2luIGZhaWxlZDonLCByZXNwb25zZS5zdGF0dXMsIGVycm9yVGV4dCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICAgIGNvbnNvbGUubG9nKCfinIUgTG9naW4gcmVzcG9uc2UgZGF0YTonLCB7IFxuICAgICAgICAgICAgaGFzVG9rZW46ICEhZGF0YS50b2tlbiwgXG4gICAgICAgICAgICBoYXNVc2VyOiAhIWRhdGEudXNlcixcbiAgICAgICAgICAgIHVzZXJSb2xlOiBkYXRhLnVzZXI/LnJvbGUgXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgY29uc3QgeyB0b2tlbiwgdXNlciB9ID0gZGF0YTtcblxuICAgICAgICAgIGlmICh0b2tlbiAmJiB1c2VyKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICBpZDogdXNlci5pZCxcbiAgICAgICAgICAgICAgZW1haWw6IHVzZXIuZW1haWwsXG4gICAgICAgICAgICAgIG5hbWU6IGAke3VzZXIuZmlyc3ROYW1lfSAke3VzZXIubGFzdE5hbWV9YCxcbiAgICAgICAgICAgICAgcm9sZTogdXNlci5yb2xlLFxuICAgICAgICAgICAgICBhY2Nlc3NUb2tlbjogdG9rZW4sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dGggZXJyb3I6JywgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicpO1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICBjYWxsYmFja3M6IHtcbiAgICBhc3luYyBqd3QoeyB0b2tlbiwgdXNlciB9KSB7XG4gICAgICAvLyBJbml0aWFsIHNpZ24gaW5cbiAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgIHRva2VuLmFjY2Vzc1Rva2VuID0gdXNlci5hY2Nlc3NUb2tlbjtcbiAgICAgICAgdG9rZW4ucm9sZSA9IHVzZXIucm9sZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0b2tlbjtcbiAgICB9LFxuICAgIGFzeW5jIHNlc3Npb24oeyBzZXNzaW9uLCB0b2tlbiB9KSB7XG4gICAgICAvLyBTZW5kIHByb3BlcnRpZXMgdG8gdGhlIGNsaWVudFxuICAgICAgaWYgKHRva2VuKSB7XG4gICAgICAgIHNlc3Npb24uYWNjZXNzVG9rZW4gPSB0b2tlbi5hY2Nlc3NUb2tlbiBhcyBzdHJpbmc7XG4gICAgICAgIHNlc3Npb24udXNlci5yb2xlID0gdG9rZW4ucm9sZSBhcyBzdHJpbmc7XG4gICAgICB9XG4gICAgICByZXR1cm4gc2Vzc2lvbjtcbiAgICB9LFxuICB9LFxuICBwYWdlczoge1xuICAgIHNpZ25JbjogJy9hdXRoL2xvZ2luJyxcbiAgfSxcbiAgc2Vzc2lvbjoge1xuICAgIHN0cmF0ZWd5OiAnand0JyxcbiAgICBtYXhBZ2U6IDI0ICogNjAgKiA2MCwgLy8gMjQgaG91cnNcbiAgfSxcbiAgand0OiB7XG4gICAgbWF4QWdlOiAyNCAqIDYwICogNjAsIC8vIDI0IGhvdXJzXG4gIH0sXG59O1xuXG5kZWNsYXJlIG1vZHVsZSAnbmV4dC1hdXRoJyB7XG4gIGludGVyZmFjZSBTZXNzaW9uIHtcbiAgICBhY2Nlc3NUb2tlbj86IHN0cmluZztcbiAgICB1c2VyOiB7XG4gICAgICBpZDogc3RyaW5nO1xuICAgICAgZW1haWw6IHN0cmluZztcbiAgICAgIG5hbWU6IHN0cmluZztcbiAgICAgIHJvbGU6IHN0cmluZztcbiAgICB9O1xuICB9XG5cbiAgaW50ZXJmYWNlIFVzZXIge1xuICAgIHJvbGU6IHN0cmluZztcbiAgICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xuICB9XG59XG5cbmRlY2xhcmUgbW9kdWxlICduZXh0LWF1dGgvand0JyB7XG4gIGludGVyZmFjZSBKV1Qge1xuICAgIGFjY2Vzc1Rva2VuPzogc3RyaW5nO1xuICAgIHJvbGU/OiBzdHJpbmc7XG4gIH1cbn0iXSwibmFtZXMiOlsiQ3JlZGVudGlhbHNQcm92aWRlciIsImF1dGhPcHRpb25zIiwicHJvdmlkZXJzIiwibmFtZSIsImNyZWRlbnRpYWxzIiwiZW1haWwiLCJsYWJlbCIsInR5cGUiLCJwYXNzd29yZCIsImF1dGhvcml6ZSIsImJhY2tlbmRVcmwiLCJsb2dpblVybCIsImNvbnNvbGUiLCJsb2ciLCJyZXNwb25zZSIsImZldGNoIiwibWV0aG9kIiwiaGVhZGVycyIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5Iiwic3RhdHVzIiwib2siLCJlcnJvclRleHQiLCJ0ZXh0IiwiZXJyb3IiLCJkYXRhIiwianNvbiIsImhhc1Rva2VuIiwidG9rZW4iLCJoYXNVc2VyIiwidXNlciIsInVzZXJSb2xlIiwicm9sZSIsImlkIiwiZmlyc3ROYW1lIiwibGFzdE5hbWUiLCJhY2Nlc3NUb2tlbiIsIkVycm9yIiwibWVzc2FnZSIsImNhbGxiYWNrcyIsImp3dCIsInNlc3Npb24iLCJwYWdlcyIsInNpZ25JbiIsInN0cmF0ZWd5IiwibWF4QWdlIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./src/lib/auth.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/next-auth","vendor-chunks/@babel","vendor-chunks/jose","vendor-chunks/openid-client","vendor-chunks/oauth","vendor-chunks/@panva","vendor-chunks/preact-render-to-string","vendor-chunks/preact","vendor-chunks/oidc-token-hash","vendor-chunks/object-hash","vendor-chunks/cookie"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&page=%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2F%5B...nextauth%5D%2Froute.ts&appDir=%2FUsers%2Fthebarrya%2FDocuments%2FProjectMCP%2FRADRIS%2Ffrontend%2Fsrc%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fthebarrya%2FDocuments%2FProjectMCP%2FRADRIS%2Ffrontend&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();