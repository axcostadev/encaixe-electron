import { initializeDatabase } from "../src/main/service/db-persistent.js"

;(async () => {
	try {
		const res = await initializeDatabase()
		console.log("initializeDatabase result:", res)
		process.exit(0)
	} catch (e) {
		console.error("initializeDatabase error:", e)
		process.exit(1)
	}
})()
