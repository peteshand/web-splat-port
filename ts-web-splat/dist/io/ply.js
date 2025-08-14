export class PlyReader {
    file;
    constructor(file) {
        this.file = file;
    }
    static magic_bytes() { return new TextEncoder().encode("ply\n"); }
    static file_ending() { return ".ply"; }
    async read() {
        // TODO: parse PLY; for skeleton, throw
        throw new Error("unimplemented");
    }
}
