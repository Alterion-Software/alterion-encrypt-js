import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

/** Derives a 32-byte AES wrap key from the ECDH shared secret via HKDF-SHA256,
 *  binding both parties' public keys into the derivation via the salt.
 *  Mirrors `derive_wrap_key` in the alterion-encrypt Rust crate. */
export function deriveWrapKey(
    sharedSecret: Uint8Array,
    clientPk:     Uint8Array,
    serverPk:     Uint8Array,
): Uint8Array {
    const salt = new Uint8Array(64);
    salt.set(clientPk);
    salt.set(serverPk, 32);
    return hkdf(sha256, sharedSecret, salt, new TextEncoder().encode("alterion-wrap"), 32);
}

/** Derives a 32-byte HMAC key from the session AES key via HKDF-SHA256 with a distinct
 *  info label, keeping the HMAC key domain-separated from the AES encryption key.
 *  Mirrors `derive_response_mac_key` in the alterion-encrypt Rust crate. */
export function deriveResponseMacKey(encKey: Uint8Array): Uint8Array {
    return hkdf(sha256, encKey, undefined, new TextEncoder().encode("alterion-response-mac"), 32);
}
