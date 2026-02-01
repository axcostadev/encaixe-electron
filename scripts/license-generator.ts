import { readFileSync } from "fs"
import { sign } from "crypto"
import { randomUUID } from "crypto"

// Simple arg parser
function getArg(name: string, fallback?: string) {
	const prefix = `--${name}=`
	const arg = process.argv.find((a) => a.startsWith(prefix))
	if (!arg) return fallback
	return arg.slice(prefix.length)
}

function canonicalize(value: any): any {
	if (Array.isArray(value)) return value.map(canonicalize)
	if (value && typeof value === "object") {
		return Object.keys(value)
			.sort()
			.reduce<Record<string, any>>((acc, key) => {
				acc[key] = canonicalize(value[key])
				return acc
			}, {})
	}
	return value
}

function canonicalStringify(payload: any) {
	return JSON.stringify(canonicalize(payload))
}

function generateLicense(privateKeyPem: string, payload: any) {
	const canonical = canonicalStringify(payload)
	const signature = sign(null, Buffer.from(canonical), privateKeyPem)
	const token = `${Buffer.from(canonical).toString("base64url")}.${signature.toString("base64url")}`
	return { token, signature: signature.toString("base64"), payload }
}

function main() {
	const privPath = getArg("key", "resources/license/test-private-key.pem")
	const productId = getArg("product", "cutting-room")
	const customerId = getArg("customer", "demo-customer")
	const hwFingerprint = getArg("fingerprint")
	const expiresInDays = Number(getArg("expires", "365"))
	const graceDays = Number(getArg("grace", "0"))
	const productPath = getArg("productPath")
	const allowed = getArg("allowed")
	const revocationListVersion = Number(getArg("revocation", "1"))
	const version = Number(getArg("version", "2")) as 1 | 2
	const featuresArg = getArg("features", "full")
	const features = featuresArg.split(",").map((f) => f.trim()).filter(Boolean)
	const allowedFingerprints = allowed
		? allowed.split(",").map((f) => f.trim()).filter(Boolean)
		: []

	const privateKey = readFileSync(privPath, "utf8")
	const now = new Date()
	const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)

	const payload = {
		licenseId: randomUUID(),
		productId,
		customerId,
		issuedAt: now.toISOString(),
		expiresAt: expiresAt.toISOString(),
		features,
		maxActivations: 1,
		hwFingerprint: hwFingerprint || undefined,
		allowedFingerprints,
		graceDays: Number.isFinite(graceDays) ? graceDays : 0,
		revocationListVersion: Number.isFinite(revocationListVersion) ? revocationListVersion : undefined,
		productPath: productPath || undefined,
		nonce: randomUUID(),
		version: version === 1 ? 1 : 2,
	}

	const { token } = generateLicense(privateKey, payload)
	console.log("License token (base64url):")
	console.log(token)
	console.log("\nPayload:")
	console.log(JSON.stringify(payload, null, 2))
	console.log("\nDicas:")
	if (!hwFingerprint) {
		console.log("- Passe --fingerprint=<codigo> para travar em um hardware específico.")
	}
	console.log("- Passe --allowed=f1,f2 para whitelist de fingerprints adicionais.")
	console.log("- Passe --grace=7 para um período de carência em dias após expiração.")
	console.log("- Passe --productPath=/app para atrelar ao path de instalação.")
	console.log("- Passe --version=1 para compatibilidade antiga (default 2).")
}

main()
