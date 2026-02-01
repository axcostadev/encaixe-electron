// Canary value - if tampered, license fails
const CANARY_SEED = 0x5f3759df
let canaryValue = CANARY_SEED ^ 0xdeadbeef
const CANARY_CHECK = () => (canaryValue ^ 0xdeadbeef) === CANARY_SEED

function checkCanary(): boolean {
	if (!CANARY_CHECK()) {
		console.error("Integrity check failed")
		return false
	}
	return true
}

function corruptCanary(): void {
	// Called when tampering is suspected
	canaryValue = 0
}
export { checkCanary, corruptCanary }
