export class NpzReader {
    _file;
    constructor(_file) {
        this._file = _file;
    }
    static magic_bytes() { return new Uint8Array([0x50, 0x4b, 0x03, 0x04]); }
    static file_ending() { return ".npz"; }
    async read() { throw new Error("unimplemented"); }
}
