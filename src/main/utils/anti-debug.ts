import { BrowserWindow } from "electron"
import { corruptCanary } from "./anti-tampering"

interface InspectorBinding {
	isEnabled?: () => boolean
}

type ProcessWithBinding = {
	binding?: (name: "inspector") => InspectorBinding | undefined
}

function getInspector(): InspectorBinding | undefined {
	return (process as unknown as ProcessWithBinding).binding?.("inspector")
}

let debugDetected = false

function detectDebugger(): boolean {
	try {
		// Check if DevTools is open in any window
		const windows = BrowserWindow.getAllWindows()
		for (const win of windows) {
			if (win.webContents.isDevToolsOpened()) {
				return true
			}
		}
		// Check for common debug environment variables
		if (
			process.env.ELECTRON_ENABLE_LOGGING ||
			process.env.ELECTRON_DEBUG_NOTIFICATIONS
		) {
			return true
		}
		// Check for inspector
		const inspector = getInspector()
		if (inspector?.isEnabled?.()) {
			return true
		}
	} catch (_) {
		// Ignore detection failures
	}
	return false
}

function antiDebugCheck(): boolean {
	if (debugDetected) return false
	if (detectDebugger()) {
		debugDetected = true
		corruptCanary()
		return false
	}
	return true
}

export { antiDebugCheck }
