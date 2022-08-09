import ArrayUtil from "./ArrayUtil";
import GLUTIL from "./GLUTIL";

export default class Model implements IModel {
	mesh: IMesh;
	offset_meshes: IMesh[];
	number_of_offset_meshes: number;
	setColor: (color: Float32List) => void;
	getColor: () => Float32List | undefined;
	setTextureImage: (image: TexImageSource) => void;
	getTextureImage: () => TexImageSource | undefined;
	setScaleFactor: (index: number, scaleFactor: number) => void;
	attach: (gl: WebGLRenderingContext) => uniformLocationsType;
	draw: (uniforms: uniformsType) => void;

	public static create_normal_model(template: IMesh, offset_meshes: IMesh[]) {
		const tri = template.structured.tri;
		const vrt2tri = template.structured.vrt2tri;
		const tx = template.structured.x;
		const scaled_normal: number[][] = new Array(tri ? tri.length : 0);
		const dscaled_normal: number[][][] = new Array(offset_meshes.length);
		for (let oo = 0; oo < offset_meshes.length; ++oo) {
			dscaled_normal[oo] = new Array(tri ? tri.length : 0);
		}
		if (tri) {
			for (let ii = 0; ii < tri.length; ++ii) {
				const t = tri[ii];
				scaled_normal[ii] = ArrayUtil.cross(
					ArrayUtil.sub(tx[t[1]], tx[t[0]]),
					ArrayUtil.sub(tx[t[2]], tx[t[0]]),
				);
				for (let oo = 0; oo < offset_meshes.length; ++oo) {
					const ox = offset_meshes[oo].structured.x;
					dscaled_normal[oo][ii] = ArrayUtil.add(
						ArrayUtil.cross(
							ArrayUtil.sub(tx[t[1]], tx[t[0]]),
							ArrayUtil.sub(
								ArrayUtil.sub(ox[t[2]], tx[t[2]]),
								ArrayUtil.sub(ox[t[0]], tx[t[0]]),
							),
						),
						ArrayUtil.cross(
							ArrayUtil.sub(
								ArrayUtil.sub(ox[t[1]], tx[t[1]]),
								ArrayUtil.sub(ox[t[0]], tx[t[0]]),
							),
							ArrayUtil.sub(tx[t[2]], tx[t[0]]),
						),
					);
				}
			}
		}
		const template_normals = ArrayUtil.initArray1D(3 * tx.length, 0.0);
		for (let i = 0; i < tx.length; ++i) {
			const vertex_faces = vrt2tri && vrt2tri[i];
			if (vertex_faces) {
				for (let j = 0; j < vertex_faces.length; j++) {
					template_normals[3 * i] += scaled_normal[vertex_faces[j]][0];
					template_normals[3 * i + 1] += scaled_normal[vertex_faces[j]][1];
					template_normals[3 * i + 2] += scaled_normal[vertex_faces[j]][2];
				}
			}
		}
		const dnormals: number[][] = new Array(offset_meshes.length);
		for (let oo = 0; oo < offset_meshes.length; ++oo) {
			dnormals[oo] = ArrayUtil.initArray1D(3 * tx.length, 0.0);
			for (let i = 0; i < tx.length; ++i) {
				const vertex_faces = vrt2tri && vrt2tri[i];
				if (vertex_faces) {
					for (let j = 0; j < vertex_faces.length; j++) {
						dnormals[oo][3 * i] += dscaled_normal[oo][vertex_faces[j]][0];
						dnormals[oo][3 * i + 1] += dscaled_normal[oo][vertex_faces[j]][1];
						dnormals[oo][3 * i + 2] += dscaled_normal[oo][vertex_faces[j]][2];
					}
				}
			}
		}
		return {
			template_point_normals: template_normals,
			dtemplate_point_normals: dnormals,
		};
	}

	constructor(mesh: IMesh, offset_meshes: IMesh[]) {
		const normal_model = Model.create_normal_model(mesh, offset_meshes);
		mesh.Normals = new Float32Array(normal_model.template_point_normals);
		for (let oo = 0; oo < offset_meshes.length; ++oo) {
			offset_meshes[oo].Normals = new Float32Array(
				normal_model.dtemplate_point_normals[oo],
			);
		}

		const options: IModelOptions = {
			scaleFactors: [],
		};

		this.mesh = mesh;
		this.offset_meshes = offset_meshes;
		this.number_of_offset_meshes = offset_meshes.length;

		options.scaleFactors = Array(this.number_of_offset_meshes);
		for (let i = 0; i < this.number_of_offset_meshes; i++) {
			options.scaleFactors[i] = 0;
		}

		this.setColor = (color: Float32List) => {
			options["color"] = color;
		};
		this.getColor = () => {
			return options["color"];
		};

		this.setTextureImage = (image: TexImageSource) => {
			options["textureImage"] = image;
		};
		this.getTextureImage = () => {
			return options["textureImage"];
		};

		this.setScaleFactor = function (index: number, scaleFactor: number) {
			options.scaleFactors[index] = scaleFactor;
		};

		let attachedGL: WebGLRenderingContext | null,
			vbo: WebGLBuffer | null,
			texture: WebGLTexture | null,
			elementVbo: WebGLBuffer | null,
			positionsOffset: number,
			normalsOffset: number,
			texCoordsOffset: number,
			positionsOffsetsAttributeLocations: number[],
			normalsOffsetsAttributeLocations: number[],
			positionsOffsetsOffsets: number[],
			normalsOffsetsOffsets: number[],
			numElements: number,
			shaderProgram: WebGLProgram | null,
			uniformLocations: uniformLocationsType,
			attributeLocations: {
				position: number;
				normal: number;
				texCoord: number;
			};

		this.attach = (gl: WebGLRenderingContext): uniformLocationsType => {
			if (attachedGL?.canvas === gl.canvas)
				throw new Error("Already attached to a gl context");
			attachedGL = gl;
			uniformLocations = {} as uniformLocationsType;
			attributeLocations = {} as {
				position: number;
				normal: number;
				texCoord: number;
			};
			if (options.textureImage) {
				texture = gl.createTexture();
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texImage2D(
					gl.TEXTURE_2D,
					0,
					gl.RGBA,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					options.textureImage,
				);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.bindTexture(gl.TEXTURE_2D, null);
			}
			const offset_related_attribute_declarations: string[] = [];
			const offset_related_uniform_declarations: string[] = [];
			const position_offsets_addition_expression: string[] = [];
			const normal_offsets_addition_expression: string[] = [];
			for (let i = 1; i <= this.number_of_offset_meshes; i++) {
				offset_related_attribute_declarations.push(
					"attribute vec3 aPositionOffsets" + i + ";",
				);
				offset_related_attribute_declarations.push(
					"attribute vec3 aNormalOffsets" + i + ";",
				);
				offset_related_uniform_declarations.push(
					"uniform float scaleFactor" + i + ";",
				);
				position_offsets_addition_expression.push(
					" + scaleFactor" + i + " * aPositionOffsets" + i + ".xyz",
				);
				normal_offsets_addition_expression.push(
					" + scaleFactor" + i + " * aNormalOffsets" + i + ".xyz",
				);
			}

			const vertexShaderSource = [
				"#ifdef GL_ES",
				"precision highp float;",
				"#endif",
				"",
				"attribute vec3 aPosition;",
				"attribute vec3 aNormal;",
				"attribute vec2 aTexture;",
				"",
				offset_related_attribute_declarations.join("\n"),
				offset_related_uniform_declarations.join("\n"),
				"uniform float meanScaleFactor;",
				"uniform mat4 world;",
				"uniform mat4 worldInverseTranspose;",
				"uniform mat4 worldViewProj;",
				"uniform mat4 viewInverse;",
				"uniform mat4 normalMatrix;",
				"",
				"varying vec3 vLighting;",
				"varying vec2 vTexture;",
				"",
				"void main() {",
				"  gl_Position = worldViewProj * vec4( meanScaleFactor * aPosition.xyz" +
					position_offsets_addition_expression.join("\n") +
					", 1.0);",
				"  vec3 ambientLight = vec3(0.2, 0.2, 0.2);",
				"  vec3 directionalLightColor = vec3(0.9, 0.9, 0.75);",
				"  vec3 directionalVector = vec3(0.0, 0.0, 1.0);",
				"  vec3 directionalVector2 = 0.41*vec3(1.0, 2.0, 1.0);",
				"  vec3 specDirection = 0.667*vec3(0.5, 1.0, 1.0);",
				"  vec3 normalVector = normalize(vec3( aNormal.xyz" +
					normal_offsets_addition_expression.join("\n") +
					" ));",
				"  vec4 transformedNormal = normalMatrix * vec4(normalVector, 1.0);",
				"  float directional = abs(dot(transformedNormal.xyz, directionalVector));",
				"  float directional2 = abs(dot(transformedNormal.xyz, directionalVector2));",
				"  float directional3 = pow(max(dot(transformedNormal.xyz, specDirection),0.0), 10.0);",
				"  vLighting = ambientLight + (directionalLightColor * directional) + 0.3*(directionalLightColor * directional2) + 0.6*(directionalLightColor * directional3);",
				"}",
			].join("\n");

			const fragmentShaderSource = [
				"#ifdef GL_ES",
				"precision highp float;",
				"#endif",
				"",
				"varying vec3 vLighting;",
				"varying vec2 vTexture;",
				"",
				"uniform vec4 color;",
				"uniform sampler2D textureSampler;",
				"void main() {",
				texture
					? "    vec4 col = texture2D(textureSampler, vTexture);"
					: "    vec4 col = color;",
				"    gl_FragColor = vec4(col.rgb*vLighting,col.a);",
				"}",
			].join("\n");

			const vertexShader = GLUTIL.loadShader(
				gl,
				gl.VERTEX_SHADER,
				vertexShaderSource,
			);

			const fragmentShader = GLUTIL.loadShader(
				gl,
				gl.FRAGMENT_SHADER,
				fragmentShaderSource,
			);

			shaderProgram = gl.createProgram();
			if (shaderProgram) {
				if (vertexShader) gl.attachShader(shaderProgram, vertexShader);
				if (fragmentShader) gl.attachShader(shaderProgram, fragmentShader);
				GLUTIL.checkGLError(gl);
				gl.linkProgram(shaderProgram);
				attributeLocations.position = gl.getAttribLocation(
					shaderProgram,
					"aPosition",
				);
				attributeLocations.normal = gl.getAttribLocation(
					shaderProgram,
					"aNormal",
				);
				attributeLocations.texCoord = gl.getAttribLocation(
					shaderProgram,
					"aTexture",
				);
				GLUTIL.checkGLError(gl);
				positionsOffsetsAttributeLocations = Array(
					this.number_of_offset_meshes,
				);
				normalsOffsetsAttributeLocations = Array(this.number_of_offset_meshes);
				for (let i = 0; i < this.number_of_offset_meshes; i++) {
					positionsOffsetsAttributeLocations[i] = gl.getAttribLocation(
						shaderProgram,
						"aPositionOffsets" + (i + 1),
					);
					normalsOffsetsAttributeLocations[i] = gl.getAttribLocation(
						shaderProgram,
						"aNormalOffsets" + (i + 1),
					);
				}
				GLUTIL.checkGLError(gl);
				// @ts-ignore
				shaderProgram.pMatrixUniform = gl.getUniformLocation(
					shaderProgram,
					"uPMatrix",
				);
				// @ts-ignore
				shaderProgram.mvMatrixUniform = gl.getUniformLocation(
					shaderProgram,
					"uMVMatrix",
				);
				uniformLocations.world = gl.getUniformLocation(shaderProgram, "world");
				uniformLocations.worldInverseTranspose = gl.getUniformLocation(
					shaderProgram,
					"worldInverseTranspose",
				);
				uniformLocations.worldViewProj = gl.getUniformLocation(
					shaderProgram,
					"worldViewProj",
				);
				uniformLocations.viewInverse = gl.getUniformLocation(
					shaderProgram,
					"viewInverse",
				);
				uniformLocations.normalMatrix = gl.getUniformLocation(
					shaderProgram,
					"normalMatrix",
				);
				uniformLocations.color = gl.getUniformLocation(shaderProgram, "color");
				uniformLocations.texture = gl.getUniformLocation(
					shaderProgram,
					"textureSampler",
				);
				uniformLocations.scaleFactorLocations = Array(
					this.number_of_offset_meshes,
				);
				for (let i = 0; i < this.number_of_offset_meshes; i++) {
					uniformLocations.scaleFactorLocations[i] = gl.getUniformLocation(
						shaderProgram,
						"scaleFactor" + (i + 1),
					);
				}
				uniformLocations.meanScaleFactorLocation = gl.getUniformLocation(
					shaderProgram,
					"meanScaleFactor",
				);
				GLUTIL.checkGLError(gl);
			}

			vbo = gl.createBuffer();
			const positions_byte_length = this.positions.byteLength;
			const normals_byte_length = this.normals.byteLength;
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				positions_byte_length +
					normals_byte_length +
					this.texCoords.byteLength +
					this.number_of_offset_meshes * positions_byte_length +
					this.number_of_offset_meshes * normals_byte_length,
				gl.STATIC_DRAW,
			);
			positionsOffset = 0;
			normalsOffset = positionsOffset + positions_byte_length;
			texCoordsOffset = normalsOffset + normals_byte_length;
			GLUTIL.checkGLError(gl);

			const initial_offsets_offset =
				texCoordsOffset + this.texCoords.byteLength;
			positionsOffsetsOffsets = Array(this.number_of_offset_meshes);
			normalsOffsetsOffsets = Array(this.number_of_offset_meshes);
			for (let i = 0; i < this.number_of_offset_meshes; i++) {
				positionsOffsetsOffsets[i] =
					initial_offsets_offset +
					i * (positions_byte_length + normals_byte_length);
				normalsOffsetsOffsets[i] =
					positionsOffsetsOffsets[i] + positions_byte_length;
			}
			GLUTIL.checkGLError(gl);

			gl.bufferSubData(gl.ARRAY_BUFFER, positionsOffset, this.positions);
			gl.bufferSubData(gl.ARRAY_BUFFER, normalsOffset, this.normals);
			gl.bufferSubData(gl.ARRAY_BUFFER, texCoordsOffset, this.texCoords);
			GLUTIL.checkGLError(gl);

			for (let i = 0; i < this.number_of_offset_meshes; i++) {
				gl.bufferSubData(
					gl.ARRAY_BUFFER,
					positionsOffsetsOffsets[i],
					this.offset_positions(i),
				);
				const offset_normals = this.offset_normals(i);
				if (offset_normals)
					gl.bufferSubData(
						gl.ARRAY_BUFFER,
						normalsOffsetsOffsets[i],
						offset_normals,
					);
				GLUTIL.checkGLError(gl);
			}

			elementVbo = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementVbo);
			numElements = 0;
			if (this.indices) {
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
				numElements = this.indices.length;
			}
			GLUTIL.checkGLError(gl);
			return uniformLocations;
		};

		this.draw = (uniforms: uniformsType): void => {
			if (!attachedGL)
				throw new Error("Cannot draw unless attached to a context");
			const gl = attachedGL;
			attachedGL.useProgram(shaderProgram);
			gl.uniformMatrix4fv(uniformLocations.world, false, uniforms.world);
			gl.uniformMatrix4fv(
				uniformLocations.worldInverseTranspose,
				false,
				uniforms.worldInverseTranspose,
			);
			gl.uniformMatrix4fv(
				uniformLocations.worldViewProj,
				false,
				uniforms.worldViewProj,
			);
			gl.uniformMatrix4fv(
				uniformLocations.viewInverse,
				false,
				uniforms.viewInverse,
			);
			gl.uniformMatrix4fv(
				uniformLocations.normalMatrix,
				false,
				uniforms.normalMatrix,
			);
			let scale_factor_sum = 0.0;
			for (let i = 0; i < this.number_of_offset_meshes; i++) {
				const currentScaleFactor =
					options.scaleFactors && options.scaleFactors[i]
						? options.scaleFactors[i]
						: 0;
				gl.uniform1f(
					uniformLocations.scaleFactorLocations[i],
					currentScaleFactor,
				);
				scale_factor_sum += currentScaleFactor;
			}
			gl.uniform1f(
				uniformLocations.meanScaleFactorLocation,
				1.0 - scale_factor_sum,
			);
			if (options.color) {
				gl.uniform4fv(uniformLocations.color, options.color);
			}
			if (texture) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, texture);
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.vertexAttribPointer(
				attributeLocations.position,
				3,
				gl.FLOAT,
				false,
				0,
				positionsOffset,
			);
			gl.enableVertexAttribArray(attributeLocations.position);
			gl.vertexAttribPointer(
				attributeLocations.normal,
				3,
				gl.FLOAT,
				false,
				0,
				normalsOffset,
			);
			gl.enableVertexAttribArray(attributeLocations.normal);
			GLUTIL.checkGLError(gl);

			if (attributeLocations.texCoord !== -1) {
				gl.vertexAttribPointer(
					attributeLocations.texCoord,
					2,
					gl.FLOAT,
					false,
					0,
					texCoordsOffset,
				);
				gl.enableVertexAttribArray(attributeLocations.texCoord);
			}
			GLUTIL.checkGLError(gl);

			for (var i = 0; i < this.number_of_offset_meshes; i++) {
				gl.vertexAttribPointer(
					positionsOffsetsAttributeLocations[i],
					3,
					gl.FLOAT,
					false,
					0,
					positionsOffsetsOffsets[i],
				);
				gl.enableVertexAttribArray(positionsOffsetsAttributeLocations[i]);
				gl.vertexAttribPointer(
					normalsOffsetsAttributeLocations[i],
					3,
					gl.FLOAT,
					false,
					0,
					normalsOffsetsOffsets[i],
				);
				gl.enableVertexAttribArray(normalsOffsetsAttributeLocations[i]);
				GLUTIL.checkGLError(gl);
			}

			gl.drawElements(gl.TRIANGLES, numElements, gl.UNSIGNED_SHORT, 0);
			GLUTIL.checkGLError(gl);
		};
	}

	public get positions() {
		return this.mesh.Positions;
	}

	public get indices() {
		return this.mesh.Indices;
	}

	public get hasNormals() {
		return this.mesh.Normals ? true : false;
	}

	public get normals() {
		if (this.hasNormals) {
			return this.mesh.Normals as Float32Array;
		} else {
			throw new Error("This Model has no Normals");
		}
	}

	public get hasTexCoords() {
		return this.mesh.TexCoords ? true : false;
	}

	public get texCoords() {
		if (this.hasTexCoords) {
			return this.mesh.TexCoords;
		} else {
			throw new Error("This Model has no Texture Coordinates");
		}
	}

	public offset_normals(index: number) {
		return this.offset_meshes[index].Normals;
	}

	public offset_positions(index: number) {
		return this.offset_meshes[index].Positions;
	}
}
