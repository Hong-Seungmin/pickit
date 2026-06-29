import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../package.json";

// Manifest V3. Permissions are kept minimal per spec:
//   contextMenus — register/handle right-click items
//   storage      — persist user-defined config (sync + local fallback)
//   tabs         — open/replace tabs on click (needs tab.title + tabs.update)
// No host_permissions / <all_urls>: we never touch page DOM.
export default defineManifest({
  manifest_version: 3,
  name: "__MSG_extName__",
  description: "__MSG_extDescription__",
  default_locale: "en",
  version: pkg.version,
  icons: {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  options_ui: {
    page: "src/options/index.html",
    open_in_tab: true,
  },
  // The in-page selection popup runs on all pages. It only reads the current
  // text selection and renders an isolated shadow-DOM toolbar; actions are
  // executed by the background worker.
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/content.ts"],
      run_at: "document_idle",
    },
  ],
  permissions: ["contextMenus", "storage", "tabs"],
});
