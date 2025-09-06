package pointcloud.types;

import haxe.extern.EitherType;

typedef QuantViewOrStruct = EitherType<ArrayBufferView, pointcloud.Quantization.GaussianQuantization>;
