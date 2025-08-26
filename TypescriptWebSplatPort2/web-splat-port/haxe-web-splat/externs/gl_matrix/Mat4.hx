package gl_matrix;

@:jsRequire("gl-matrix", "mat4") @:forward @:forwardStatics extern abstract Mat4(ts.AnyOf2<js.lib.Float32Array, ts.Tuple16<Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float>>) from ts.AnyOf2<js.lib.Float32Array, ts.Tuple16<Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float>> to ts.AnyOf2<js.lib.Float32Array, ts.Tuple16<Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float, Float>> {
	/**
		Creates a new identity mat4
	**/
	static function create():Mat4;
	/**
		Creates a new mat4 initialized with values from an existing matrix
	**/
	static function clone(a:ReadonlyMat4):Mat4;
	/**
		Copy the values from one mat4 to another
	**/
	static function copy(out:Mat4, a:ReadonlyMat4):Mat4;
	/**
		Create a new mat4 with the given values
	**/
	static function fromValues(m00:Float, m01:Float, m02:Float, m03:Float, m10:Float, m11:Float, m12:Float, m13:Float, m20:Float, m21:Float, m22:Float, m23:Float, m30:Float, m31:Float, m32:Float, m33:Float):Mat4;
	/**
		Set the components of a mat4 to the given values
	**/
	static function set(out:Mat4, m00:Float, m01:Float, m02:Float, m03:Float, m10:Float, m11:Float, m12:Float, m13:Float, m20:Float, m21:Float, m22:Float, m23:Float, m30:Float, m31:Float, m32:Float, m33:Float):Mat4;
	/**
		Set a mat4 to the identity matrix
	**/
	static function identity(out:Mat4):Mat4;
	/**
		Transpose the values of a mat4
	**/
	static function transpose(out:Mat4, a:ReadonlyMat4):Mat4;
	/**
		Inverts a mat4
	**/
	static function invert(out:Mat4, a:ReadonlyMat4):Mat4;
	/**
		Calculates the adjugate of a mat4
	**/
	static function adjoint(out:Mat4, a:ReadonlyMat4):Mat4;
	/**
		Calculates the determinant of a mat4
	**/
	static function determinant(a:ReadonlyMat4):Float;
	/**
		Multiplies two mat4s
	**/
	static function multiply(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4):Mat4;
	/**
		Translate a mat4 by the given vector
	**/
	static function translate(out:Mat4, a:ReadonlyMat4, v:ReadonlyVec3):Mat4;
	/**
		Scales the mat4 by the dimensions in the given vec3 not using vectorization
	**/
	static function scale(out:Mat4, a:ReadonlyMat4, v:ReadonlyVec3):Mat4;
	/**
		Rotates a mat4 by the given angle around the given axis
	**/
	static function rotate(out:Mat4, a:ReadonlyMat4, rad:Float, axis:ReadonlyVec3):Mat4;
	/**
		Rotates a matrix by the given angle around the X axis
	**/
	static function rotateX(out:Mat4, a:ReadonlyMat4, rad:Float):Mat4;
	/**
		Rotates a matrix by the given angle around the Y axis
	**/
	static function rotateY(out:Mat4, a:ReadonlyMat4, rad:Float):Mat4;
	/**
		Rotates a matrix by the given angle around the Z axis
	**/
	static function rotateZ(out:Mat4, a:ReadonlyMat4, rad:Float):Mat4;
	/**
		Creates a matrix from a vector translation
		This is equivalent to (but much faster than):
		
		     mat4.identity(dest);
		     mat4.translate(dest, dest, vec);
	**/
	static function fromTranslation(out:Mat4, v:ReadonlyVec3):Mat4;
	/**
		Creates a matrix from a vector scaling
		This is equivalent to (but much faster than):
		
		     mat4.identity(dest);
		     mat4.scale(dest, dest, vec);
	**/
	static function fromScaling(out:Mat4, v:ReadonlyVec3):Mat4;
	/**
		Creates a matrix from a given angle around a given axis
		This is equivalent to (but much faster than):
		
		     mat4.identity(dest);
		     mat4.rotate(dest, dest, rad, axis);
	**/
	static function fromRotation(out:Mat4, rad:Float, axis:ReadonlyVec3):Mat4;
	/**
		Creates a matrix from the given angle around the X axis
		This is equivalent to (but much faster than):
		
		     mat4.identity(dest);
		     mat4.rotateX(dest, dest, rad);
	**/
	static function fromXRotation(out:Mat4, rad:Float):Mat4;
	/**
		Creates a matrix from the given angle around the Y axis
		This is equivalent to (but much faster than):
		
		     mat4.identity(dest);
		     mat4.rotateY(dest, dest, rad);
	**/
	static function fromYRotation(out:Mat4, rad:Float):Mat4;
	/**
		Creates a matrix from the given angle around the Z axis
		This is equivalent to (but much faster than):
		
		     mat4.identity(dest);
		     mat4.rotateZ(dest, dest, rad);
	**/
	static function fromZRotation(out:Mat4, rad:Float):Mat4;
	/**
		Creates a matrix from a quaternion rotation and vector translation
		This is equivalent to (but much faster than):
		
		     mat4.identity(dest);
		     mat4.translate(dest, vec);
		     let quatMat = mat4.create();
		     quat4.toMat4(quat, quatMat);
		     mat4.multiply(dest, quatMat);
	**/
	static function fromRotationTranslation(out:Mat4, q:Dynamic, v:ReadonlyVec3):Mat4;
	/**
		Creates a new mat4 from a dual quat.
	**/
	static function fromQuat2(out:Mat4, a:ReadonlyQuat2):Mat4;
	/**
		Returns the translation vector component of a transformation
		  matrix. If a matrix is built with fromRotationTranslation,
		  the returned vector will be the same as the translation vector
		  originally supplied.
	**/
	static function getTranslation(out:Vec3, mat:ReadonlyMat4):Vec3;
	/**
		Returns the scaling factor component of a transformation
		  matrix. If a matrix is built with fromRotationTranslationScale
		  with a normalized Quaternion paramter, the returned vector will be
		  the same as the scaling vector
		  originally supplied.
	**/
	static function getScaling(out:Vec3, mat:ReadonlyMat4):Vec3;
	/**
		Returns a quaternion representing the rotational component
		  of a transformation matrix. If a matrix is built with
		  fromRotationTranslation, the returned quaternion will be the
		  same as the quaternion originally supplied.
	**/
	static function getRotation(out:Quat, mat:ReadonlyMat4):Quat;
	/**
		Creates a matrix from a quaternion rotation, vector translation and vector scale
		This is equivalent to (but much faster than):
		
		     mat4.identity(dest);
		     mat4.translate(dest, vec);
		     let quatMat = mat4.create();
		     quat4.toMat4(quat, quatMat);
		     mat4.multiply(dest, quatMat);
		     mat4.scale(dest, scale)
	**/
	static function fromRotationTranslationScale(out:Mat4, q:Dynamic, v:ReadonlyVec3, s:ReadonlyVec3):Mat4;
	/**
		Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
		This is equivalent to (but much faster than):
		
		     mat4.identity(dest);
		     mat4.translate(dest, vec);
		     mat4.translate(dest, origin);
		     let quatMat = mat4.create();
		     quat4.toMat4(quat, quatMat);
		     mat4.multiply(dest, quatMat);
		     mat4.scale(dest, scale)
		     mat4.translate(dest, negativeOrigin);
	**/
	static function fromRotationTranslationScaleOrigin(out:Mat4, q:Dynamic, v:ReadonlyVec3, s:ReadonlyVec3, o:ReadonlyVec3):Mat4;
	/**
		Calculates a 4x4 matrix from the given quaternion
	**/
	static function fromQuat(out:Mat4, q:ReadonlyQuat):Mat4;
	/**
		Generates a frustum matrix with the given bounds
	**/
	static function frustum(out:Mat4, left:Float, right:Float, bottom:Float, top:Float, near:Float, far:Float):Mat4;
	/**
		Generates a perspective projection matrix with the given bounds.
		The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
		which matches WebGL/OpenGL's clip volume.
		Passing null/undefined/no value for far will generate infinite projection matrix.
	**/
	static function perspectiveNO(out:Mat4, fovy:Float, aspect:Float, near:Float, far:Float):Mat4;
	/**
		Generates a perspective projection matrix suitable for WebGPU with the given bounds.
		The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
		which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
		Passing null/undefined/no value for far will generate infinite projection matrix.
	**/
	static function perspectiveZO(out:Mat4, fovy:Float, aspect:Float, near:Float, far:Float):Mat4;
	/**
		Generates a perspective projection matrix with the given field of view.
		This is primarily useful for generating projection matrices to be used
		with the still experiemental WebVR API.
	**/
	static function perspectiveFromFieldOfView(out:Mat4, fov:Dynamic, near:Float, far:Float):Mat4;
	/**
		Generates a orthogonal projection matrix with the given bounds.
		The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
		which matches WebGL/OpenGL's clip volume.
	**/
	static function orthoNO(out:Mat4, left:Float, right:Float, bottom:Float, top:Float, near:Float, far:Float):Mat4;
	/**
		Generates a orthogonal projection matrix with the given bounds.
		The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
		which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
	**/
	static function orthoZO(out:Mat4, left:Float, right:Float, bottom:Float, top:Float, near:Float, far:Float):Mat4;
	/**
		Generates a look-at matrix with the given eye position, focal point, and up axis.
		If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
	**/
	static function lookAt(out:Mat4, eye:ReadonlyVec3, center:ReadonlyVec3, up:ReadonlyVec3):Mat4;
	/**
		Generates a matrix that makes something look at something else.
	**/
	static function targetTo(out:Mat4, eye:ReadonlyVec3, target:Dynamic, up:ReadonlyVec3):Mat4;
	/**
		Returns a string representation of a mat4
	**/
	static function str(a:ReadonlyMat4):String;
	/**
		Returns Frobenius norm of a mat4
	**/
	static function frob(a:ReadonlyMat4):Float;
	/**
		Adds two mat4's
	**/
	static function add(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4):Mat4;
	/**
		Subtracts matrix b from matrix a
	**/
	static function subtract(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4):Mat4;
	/**
		Multiply each element of the matrix by a scalar.
	**/
	static function multiplyScalar(out:Mat4, a:ReadonlyMat4, b:Float):Mat4;
	/**
		Adds two mat4's after multiplying each element of the second operand by a scalar value.
	**/
	static function multiplyScalarAndAdd(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4, scale:Float):Mat4;
	/**
		Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
	**/
	static function exactEquals(a:ReadonlyMat4, b:ReadonlyMat4):Bool;
	/**
		Returns whether or not the matrices have approximately the same elements in the same position.
	**/
	static function equals(a:ReadonlyMat4, b:ReadonlyMat4):Bool;
	/**
		Generates a perspective projection matrix with the given bounds.
		The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
		which matches WebGL/OpenGL's clip volume.
		Passing null/undefined/no value for far will generate infinite projection matrix.
	**/
	static function perspective(out:Mat4, fovy:Float, aspect:Float, near:Float, far:Float):Mat4;
	/**
		Generates a orthogonal projection matrix with the given bounds.
		The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
		which matches WebGL/OpenGL's clip volume.
	**/
	static function ortho(out:Mat4, left:Float, right:Float, bottom:Float, top:Float, near:Float, far:Float):Mat4;
	/**
		Multiplies two mat4s
	**/
	static function mul(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4):Mat4;
	/**
		Subtracts matrix b from matrix a
	**/
	static function sub(out:Mat4, a:ReadonlyMat4, b:ReadonlyMat4):Mat4;
}