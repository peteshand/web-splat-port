package gs.pointcloud.types;

import haxe.extern.EitherType;

typedef QuantViewOrStruct = EitherType<ArrayBufferView, gs.pointcloud.Quantization.GaussianQuantization>;
