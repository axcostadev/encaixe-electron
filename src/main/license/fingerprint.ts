import { createHash } from "crypto"
import { machineIdSync } from "node-machine-id"
import os from "os"

export function getHardwareFingerprint(): string {
	const machineId = machineIdSync()
	const hostname = os.hostname()
	const platform = os.platform()
	return createHash("sha256")
		.update(`${machineId}|${hostname}|${platform}`)
		.digest("hex")
}
