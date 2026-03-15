;(() => {
	const fs = require("fs")
	const path = require("path")

	try {
		const projectRoot = process.cwd()
		const dataDir = path.join(projectRoot, "data")
		const settingsPath = path.join(dataDir, "settings.json")

		// Ensure data dir
		fs.mkdirSync(dataDir, { recursive: true })

		// Example settings for Laser group
		const settings = {
			baseDir:
				"\\\\va\\rede\\Grupos\\Horizonte\\Departamental\\CORTE\\Alyson\\Laser\\Work",
			machineGroups: {
				Laser: {
					name: "LASER",
					machineMap: {
						1: "02-2010",
						2: "02-2416",
						3: "02-1765",
						13: "02-1871",
					},
				},
			},
		}

		fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8")
		console.log("Wrote settings to", settingsPath)

		// Read back and show the Laser mapping that the app will pick in development
		const raw = fs.readFileSync(settingsPath, "utf8")
		const parsed = JSON.parse(raw)
		const laserMap =
			parsed.machineGroups?.Laser?.machineMap || parsed.machineMap || {}
		console.log("Laser machineMap from settings.json:")
		console.log(JSON.stringify(laserMap, null, 2))
	} catch (err) {
		console.error("Test failed:", err)
		process.exit(1)
	}
})()
