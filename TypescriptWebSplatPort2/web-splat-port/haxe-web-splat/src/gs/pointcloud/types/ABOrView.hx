package gs.pointcloud.types;

import js.lib.ArrayBuffer;
import js.lib.ArrayBufferView;
import haxe.extern.EitherType;

typedef ABOrView = EitherType<ArrayBuffer, ArrayBufferView>;
