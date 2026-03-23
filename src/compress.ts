/** Deflate-raw compresses `data` using the browser/Node 18+ CompressionStream API. */
export async function compress(data: Uint8Array): Promise<Uint8Array> {
    const stream = new CompressionStream("deflate-raw");
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(data as unknown as Uint8Array<ArrayBuffer>);
    writer.close();

    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
    return out;
}

/** Deflate-raw decompresses `data` using the browser/Node 18+ DecompressionStream API. */
export async function decompress(data: Uint8Array): Promise<Uint8Array> {
    const stream = new DecompressionStream("deflate-raw");
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(data as unknown as Uint8Array<ArrayBuffer>);
    writer.close();

    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
    return out;
}
