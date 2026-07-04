// Force IPv4-first DNS resolution across the Node runtime. Some hosting
// environments (notably Railway) return AAAA records before A records for
// managed Postgres pools like Neon. Without this, default Node DNS prefers
// the IPv6 record, the IPv6 outbound path is unavailable, and the DB
// handshake hangs/fails. Prefer the IPv4 result exclusively.
//
// Honor DNS_FORCE_IPV4=0 to disable. Safe to import at module top; idempotent.

import * as dns from 'node:dns'

const FORCE: boolean = (process.env.DNS_FORCE_IPV4 ?? '1') !== '0'
let installed = false

// Internal helpers — keep loose typing to compile under strict TS.
type AnyCallback = (err: NodeJS.ErrnoException | null, address: string, family: number) => void

function wrapLookup(): void {
    if (installed || !FORCE) return

    // Pull the raw lookup out as any to bypass Node's overloaded union.
    const rawModule = dns as unknown as Record<string, unknown>
    const raw = rawModule['lookup'] as (...args: unknown[]) => unknown

    function patched(this: unknown, ...args: unknown[]): unknown {
        // Pull the trailing callback; the user may pass hostname+options+cb
        // or hostname+cb or hostname+family+cb (legacy). We coerce options
        // to {family: 4} and pass through.
        let callback: AnyCallback
        let options: unknown
        if (args.length >= 3) {
            options = args[1]
            callback = args[2] as AnyCallback
        } else if (args.length === 2) {
            const second = args[1]
            if (typeof second === 'function') {
                callback = second as AnyCallback
                options = undefined
            } else {
                options = second
                callback = (err: NodeJS.ErrnoException | null, address: string, family: number) =>
                    void callback
            }
        } else {
            const arr = args as unknown as Array<unknown>
            callback = (arr[arr.length - 1] as AnyCallback) ?? (() => {})
        }
        const opts: unknown = (typeof options === 'object' && options !== null)
            ? { family: 4, hints: (dns as { ADDRCONFIG: number }).ADDRCONFIG, ...options }
            : { family: 4, hints: (dns as { ADDRCONFIG: number }).ADDRCONFIG }
        return raw.call(dns, args[0], opts, callback)
    }

    rawModule['lookup'] = patched

    // Pin global resolver order where supported (Node 16+).
    const r = dns as unknown as { setDefaultResultOrder?: (s: string) => void }
    if (r.setDefaultResultOrder) {
        try {
            r.setDefaultResultOrder('ipv4first')
        } catch {
            // older node; ignore
        }
    }
    installed = true
}

// Eager install on import.
wrapLookup()

export function installIPv4First(): void {
    wrapLookup()
}

export default installIPv4First
