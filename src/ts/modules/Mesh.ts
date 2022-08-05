import ArrayUtil from "./ArrayUtil";

export default class Mesh implements IMesh {
	Positions: Float32Array;
	Indices?: Uint16Array;
	TexCoords: Float32Array;
	faces: number[][] | false;
	structured: {
		x: number[][];
		tri?: number[][];
		vrt2tri?: number[][];
	};

	constructor(
		vertices: number[][],
		faces: number[][] | false,
		textures: number[][] | false,
	) {
		this.Positions = new Float32Array(ArrayUtil.flatten_two_d_array(vertices));
		if (faces) {
			this.Indices = new Uint16Array(ArrayUtil.flatten_two_d_array(faces));
		}
		this.TexCoords = new Float32Array(
			textures
				? ArrayUtil.flatten_two_d_array(textures)
				: ArrayUtil.initArray1D(2 * vertices.length, 0),
		);
		if (faces) {
			const vertex_to_face_list: number[][] = vertices.map(() => []);
			for (let i = 0; i < faces.length; i++) {
				const face = faces[i];
				vertex_to_face_list[face[0]].push(i);
				vertex_to_face_list[face[1]].push(i);
				vertex_to_face_list[face[2]].push(i);
			}
			this.structured = {
				x: vertices,
				tri: faces,
				vrt2tri: vertex_to_face_list,
			};
		} else {
			this.structured = { x: vertices };
		}
	}
}
