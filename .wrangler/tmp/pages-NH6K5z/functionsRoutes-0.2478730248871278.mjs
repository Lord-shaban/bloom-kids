import { onRequestDelete as __api_registrations__id__js_onRequestDelete } from "C:\\Users\\miar4\\Desktop\\bloom kids\\functions\\api\\registrations\\[id].js"
import { onRequestPatch as __api_registrations__id__js_onRequestPatch } from "C:\\Users\\miar4\\Desktop\\bloom kids\\functions\\api\\registrations\\[id].js"
import { onRequestPost as __api_login_js_onRequestPost } from "C:\\Users\\miar4\\Desktop\\bloom kids\\functions\\api\\login.js"
import { onRequestPost as __api_register_js_onRequestPost } from "C:\\Users\\miar4\\Desktop\\bloom kids\\functions\\api\\register.js"
import { onRequestGet as __api_registrations_js_onRequestGet } from "C:\\Users\\miar4\\Desktop\\bloom kids\\functions\\api\\registrations.js"

export const routes = [
    {
      routePath: "/api/registrations/:id",
      mountPath: "/api/registrations",
      method: "DELETE",
      middlewares: [],
      modules: [__api_registrations__id__js_onRequestDelete],
    },
  {
      routePath: "/api/registrations/:id",
      mountPath: "/api/registrations",
      method: "PATCH",
      middlewares: [],
      modules: [__api_registrations__id__js_onRequestPatch],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_login_js_onRequestPost],
    },
  {
      routePath: "/api/register",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_register_js_onRequestPost],
    },
  {
      routePath: "/api/registrations",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_registrations_js_onRequestGet],
    },
  ]