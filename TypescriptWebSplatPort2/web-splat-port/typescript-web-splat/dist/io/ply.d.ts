import { GenericGaussianPointCloud, PointCloudReader } from './mod.js';
export declare class PlyReader implements PointCloudReader {
    private header;
    private data;
    private dataView;
    private offset;
    private shDeg;
    private numPoints;
    private mipSplatting?;
    private kernelSize?;
    private backgroundColor?;
    constructor(data: ArrayBuffer);
    private parseHeader;
    private readFloat32;
    private readLine;
    private fileShDeg;
    private getNumPoints;
    private getMipSplatting;
    private getKernelSize;
    private getBackgroundColor;
    read(): GenericGaussianPointCloud;
    static magicBytes(): Uint8Array;
    static fileEnding(): string;
}
//# sourceMappingURL=ply.d.ts.map