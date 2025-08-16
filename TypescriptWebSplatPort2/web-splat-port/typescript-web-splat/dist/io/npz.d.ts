import { GenericGaussianPointCloud, PointCloudReader } from './mod.js';
export declare class NpzReader implements PointCloudReader {
    private npzFile;
    private shDeg;
    private kernelSize?;
    private mipSplatting?;
    private backgroundColor?;
    constructor(data: ArrayBuffer);
    private parseNpz;
    private calculateShDeg;
    private getBackgroundColor;
    private getNpzValue;
    private getNpzArrayOptional;
    private tryGetNpzArray;
    private parseTypedArray;
    read(): GenericGaussianPointCloud;
    static magicBytes(): Uint8Array;
    static fileEnding(): string;
}
//# sourceMappingURL=npz.d.ts.map