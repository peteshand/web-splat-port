import { vec3, quat } from 'gl-matrix';
import { Gaussian } from '../pointcloud.js';
import { buildCov, shDegFromNumCoefs, sigmoid } from '../utils.js';
import { GenericGaussianPointCloud, PointCloudReader } from './mod.js';

// Simple PLY header parser interface
interface PlyProperty {
    name: string;
    type: string;
}

interface PlyElement {
    name: string;
    count: number;
    properties: PlyProperty[];
}

interface PlyHeader {
    format: 'ascii' | 'binary_little_endian' | 'binary_big_endian';
    elements: PlyElement[];
    comments: string[];
}

export class PlyReader implements PointCloudReader {
    private header: PlyHeader;
    private data: ArrayBuffer;
    private dataView: DataView;
    private offset: number = 0;
    private shDeg: number;
    private numPoints: number;
    private mipSplatting?: boolean;
    private kernelSize?: number;
    private backgroundColor?: [number, number, number];

    constructor(data: ArrayBuffer) {
        this.data = data;
        this.dataView = new DataView(data);
        this.header = this.parseHeader();
        this.shDeg = this.fileShDeg();
        this.numPoints = this.getNumPoints();
        this.mipSplatting = this.getMipSplatting();
        this.kernelSize = this.getKernelSize();
        this.backgroundColor = this.getBackgroundColor();
    }

    private parseHeader(): PlyHeader {
        const decoder = new TextDecoder();
        let headerEnd = 0;
        
        // Find end of header
        const headerBytes = new Uint8Array(this.data);
        const endHeaderMarker = new TextEncoder().encode('end_header\n');
        
        for (let i = 0; i <= headerBytes.length - endHeaderMarker.length; i++) {
            let match = true;
            for (let j = 0; j < endHeaderMarker.length; j++) {
                if (headerBytes[i + j] !== endHeaderMarker[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                headerEnd = i + endHeaderMarker.length;
                break;
            }
        }

        const headerText = decoder.decode(headerBytes.slice(0, headerEnd));
        const lines = headerText.split('\n').filter(line => line.trim());
        
        const header: PlyHeader = {
            format: 'binary_little_endian',
            elements: [],
            comments: []
        };

        let currentElement: PlyElement | null = null;

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            
            if (parts[0] === 'format') {
                header.format = parts[1] as any;
            } else if (parts[0] === 'comment') {
                header.comments.push(line.substring(8));
            } else if (parts[0] === 'element') {
                if (currentElement) {
                    header.elements.push(currentElement);
                }
                currentElement = {
                    name: parts[1],
                    count: parseInt(parts[2]),
                    properties: []
                };
            } else if (parts[0] === 'property' && currentElement) {
                currentElement.properties.push({
                    name: parts[2] || parts[1],
                    type: parts[1]
                });
            }
        }

        if (currentElement) {
            header.elements.push(currentElement);
        }

        this.offset = headerEnd;
        return header;
    }

    private readFloat32(littleEndian: boolean = true): number {
        const value = this.dataView.getFloat32(this.offset, littleEndian);
        this.offset += 4;
        return value;
    }

    private readLine(shDeg: number, littleEndian: boolean): [Gaussian, number[][]] {
        // Position
        const pos = vec3.fromValues(
            this.readFloat32(littleEndian),
            this.readFloat32(littleEndian),
            this.readFloat32(littleEndian)
        );

        // Skip normals
        this.readFloat32(littleEndian);
        this.readFloat32(littleEndian);
        this.readFloat32(littleEndian);

        // Spherical harmonics
        const sh: number[][] = Array(16).fill(0).map(() => [0, 0, 0]);
        
        // First SH coefficient (DC component)
        sh[0][0] = this.readFloat32(littleEndian);
        sh[0][1] = this.readFloat32(littleEndian);
        sh[0][2] = this.readFloat32(littleEndian);

        // Rest of SH coefficients
        const numCoefs = (shDeg + 1) * (shDeg + 1);
        const shRest: number[] = [];
        for (let i = 0; i < (numCoefs - 1) * 3; i++) {
            shRest.push(this.readFloat32(littleEndian));
        }

        // Reorder SH coefficients from channel-first to coefficient-first
        for (let i = 0; i < numCoefs - 1; i++) {
            for (let j = 0; j < 3; j++) {
                sh[i + 1][j] = shRest[j * (numCoefs - 1) + i];
            }
        }

        // Opacity
        const opacity = sigmoid(this.readFloat32(littleEndian));

        // Scale
        const scale = vec3.fromValues(
            Math.exp(this.readFloat32(littleEndian)),
            Math.exp(this.readFloat32(littleEndian)),
            Math.exp(this.readFloat32(littleEndian))
        );

        // Rotation quaternion
        const rotation = quat.fromValues(
            this.readFloat32(littleEndian),
            this.readFloat32(littleEndian),
            this.readFloat32(littleEndian),
            this.readFloat32(littleEndian)
        );
        quat.normalize(rotation, rotation);

        // Build covariance matrix
        const cov = buildCov(rotation, scale);

        const gaussian: Gaussian = {
            xyz: { x: pos[0], y: pos[1], z: pos[2] },
            opacity: opacity,
            cov: cov
        };

        return [gaussian, sh];
    }

    private fileShDeg(): number {
        const vertexElement = this.header.elements.find(e => e.name === 'vertex');
        if (!vertexElement) {
            throw new Error('Missing vertex element');
        }

        const numShCoefs = vertexElement.properties.filter(p => p.name.startsWith('f_')).length;
        const shDeg = shDegFromNumCoefs(Math.floor(numShCoefs / 3));
        if (shDeg === null) {
            throw new Error(`Number of SH coefficients ${numShCoefs} cannot be mapped to SH degree`);
        }
        return shDeg;
    }

    private getNumPoints(): number {
        const vertexElement = this.header.elements.find(e => e.name === 'vertex');
        if (!vertexElement) {
            throw new Error('Missing vertex element');
        }
        return vertexElement.count;
    }

    private getMipSplatting(): boolean | undefined {
        const mipComment = this.header.comments.find(c => c.includes('mip'));
        if (mipComment) {
            const value = mipComment.split('=').pop();
            return value ? value.trim() === 'true' : undefined;
        }
        return undefined;
    }

    private getKernelSize(): number | undefined {
        const kernelComment = this.header.comments.find(c => c.includes('kernel_size'));
        if (kernelComment) {
            const value = kernelComment.split('=').pop();
            return value ? parseFloat(value.trim()) : undefined;
        }
        return undefined;
    }

    private getBackgroundColor(): [number, number, number] | undefined {
        const bgComment = this.header.comments.find(c => c.includes('background_color'));
        if (bgComment) {
            const value = bgComment.split('=').pop();
            if (value) {
                const parts = value.split(',').map(v => parseFloat(v.trim()));
                if (parts.length === 3) {
                    return [parts[0], parts[1], parts[2]];
                }
            }
        }
        return undefined;
    }

    read(): GenericGaussianPointCloud {
        const gaussians: Gaussian[] = [];
        const shCoefs: number[][][] = [];
        
        const littleEndian = this.header.format === 'binary_little_endian';
        
        if (this.header.format === 'ascii') {
            throw new Error('ASCII PLY format not supported');
        }

        for (let i = 0; i < this.numPoints; i++) {
            const [gaussian, sh] = this.readLine(this.shDeg, littleEndian);
            gaussians.push(gaussian);
            shCoefs.push(sh);
        }

        return GenericGaussianPointCloud.fromGaussians(
            gaussians,
            shCoefs,
            this.shDeg,
            {
                kernelSize: this.kernelSize,
                mipSplatting: this.mipSplatting,
                backgroundColor: this.backgroundColor
            }
        );
    }

    static magicBytes(): Uint8Array {
        return new TextEncoder().encode('ply');
    }

    static fileEnding(): string {
        return 'ply';
    }
}
