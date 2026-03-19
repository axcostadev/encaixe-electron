import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import { resolve } from "path"

export default defineConfig({
	define: {
		"process.env.APP_VERSION": JSON.stringify(process.env.npm_package_version),
		"process.env.NO_LICENSE": JSON.stringify(process.env.NO_LICENSE === "true" ? "true" : "false"),
	},
	publicDir: "resources",
	main: {
		plugins: [externalizeDepsPlugin()],
	},
	preload: {
		plugins: [externalizeDepsPlugin()],
	},
	renderer: {
		// root for renderer development server (where index.html lives)
		root: resolve('src/renderer'),
		resolve: {
			alias: {
				"@renderer": resolve("src/renderer/src"),
				// during development point to the router entry so imports resolve correctly
				"machine-work-state": process.env.NODE_ENV === 'development'
					? resolve("src/renderer/machine-work-state/frontend/src/Router.tsx")
					: resolve("dist/machine-work-state/machine-work-state.es.js"),
			},
		},
		server: {
			fs: {
				// allow access to our renderer sources from the development server
				// use absolute paths so vite can properly compare against the request id
				allow: [
					resolve(__dirname, "src/renderer/src"),
					resolve(__dirname, "src/renderer/machine-work-state/frontend/src"),
					// also add the renderer root itself in case resources are requested
					resolve(__dirname, "src/renderer"),
					// allow view-cutting-machine renderer sources and assets
					resolve(__dirname, "src/renderer/view-cutting-machine/src/renderer/src"),
					resolve(__dirname, "src/renderer/view-cutting-machine/src/renderer"),
					resolve(__dirname, "src/renderer/view-cutting-machine"),
				],
			},
		},

		plugins: [react(), tailwindcss()],
	},
})
