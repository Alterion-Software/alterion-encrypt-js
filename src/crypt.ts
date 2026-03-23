import { gcm } from "@noble/ciphers/aes.js";
import { randomBytes } from "@noble/hashes/utils.js";

/** AES-256-GCM encrypts `plaintext` with `key`. Returns 12-byte nonce || ciphertext+tag. */
export function aesEncrypt(plaintext: Uint8Array, key: Uint8Array): Uint8Array {
    const iv         = randomBytes(12);
    const ciphertext = gcm(key, iv).encrypt(plaintext);
    const out        = new Uint8Array(12 + ciphertext.length);
    out.set(iv);
    out.set(ciphertext, 12);
    return out;
}

/** AES-256-GCM decrypts a buffer produced by {@link aesEncrypt}. Throws on authentication failure. */
export function aesDecrypt(data: Uint8Array, key: Uint8Array): Uint8Array {
    return gcm(key, data.slice(0, 12)).decrypt(data.slice(12));
}
