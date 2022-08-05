export default class GLUTIL {
	public static checkGLError(gl: WebGLRenderingContext | null) {
		if (!gl) throw new Error("gl is null");
		var error = gl.getError();
		if (error != gl.NO_ERROR) throw new Error("GL Error: " + error);
	}

	// public static loadTexture(
	// 	gl: WebGLRenderingContext | null,
	// 	src: string,
	// 	callback?: (texture: WebGLTexture) => void,
	// ) {
	// 	if (!gl) return;
	// 	const texture = gl.createTexture();
	// 	gl.bindTexture(gl.TEXTURE_2D, texture);
	// 	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	// 	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	// 	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
	// 	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
	// 	var image = new Image();
	// 	image.onload = function () {
	// 		gl.bindTexture(gl.TEXTURE_2D, texture);
	// 		gl.texImage2D(
	// 			gl.TEXTURE_2D,
	// 			0,
	// 			gl.RGBA,
	// 			gl.RGBA,
	// 			gl.UNSIGNED_BYTE,
	// 			image,
	// 		);
	// 		GLUTIL.checkGLError(gl);
	// 		if (callback && texture) callback(texture);
	// 	};
	// 	image.src = src;
	// 	return texture;
	// }

	public static loadShader(
		gl: WebGLRenderingContext | null,
		type: number,
		shaderSrc: string,
	) {
		if (!gl) return;
		const shader = gl.createShader(type);
		if (!shader) throw new Error("Unable to create shader");
		gl.shaderSource(shader, shaderSrc);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			var infoLog = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);
			throw new Error("Error compiling shader:\n" + infoLog);
		}
		return shader;
	}

	public static getContext(canvas: HTMLCanvasElement | null) {
		if (!canvas) throw new Error("Could not create WebGLContext of null");
		let gl: WebGLRenderingContext | null = null;
		try {
			gl = canvas.getContext("webgl");
		} catch (e) {}
		if (!gl) {
			throw new Error("Could not create WebGLContext");
		}
		return gl;
	}
}
