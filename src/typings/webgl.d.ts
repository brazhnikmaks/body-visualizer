type cameraAxisType = "x" | "y" | "both";

interface ICameraController {
	onchange_functions: (() => void)[];
	xRot: number;
	yRot: number;
	scaleFactor: number;
	dragging: boolean;
	curX: number;
	curY: number;
	axis?: cameraAxisType;
	element: HTMLElement;
	destroy: () => void;
	add_viewer: (callback: () => void) => void;
	remove_viewer: (callback: () => void) => void;
}

interface IMeshData {
	name: string;
	vertices: number[][];
	faces: number[][] | false;
}

interface IMesh {
	Positions: Float32Array;
	Indices?: Uint16Array;
	TexCoords: Float32Array;
	Normals?: Float32Array;
	faces: number[][] | false;
	structured: {
		x: number[][];
		tri?: number[][];
		vrt2tri?: number[][];
	};
}

interface IModelOptions {
	color?: Float32List;
	textureImage?: TexImageSource;
	scaleFactors: number[];
}

type uniformLocationsType = {
	world: WebGLUniformLocation | null;
	worldInverseTranspose: WebGLUniformLocation | null;
	worldViewProj: WebGLUniformLocation | null;
	viewInverse: WebGLUniformLocation | null;
	normalMatrix: WebGLUniformLocation | null;
	color: WebGLUniformLocation | null;
	texture: WebGLUniformLocation | null;
	scaleFactorLocations: (WebGLUniformLocation | null)[];
	meanScaleFactorLocation: WebGLUniformLocation | null;
};

type uniformsType = {
	normalMatrix: Float32Array;
	viewInverse: Float32Array;
	world: Float32Array;
	worldInverseTranspose: Float32Array;
	worldViewProj: Float32Array;
};

interface IModel {
	mesh: IMesh;
	offset_meshes: IMesh[];
	number_of_offset_meshes: number;
	setColor: (color: Float32List) => void;
	getColor: () => Float32List | undefined;
	setTextureImage: (image: TexImageSource) => void;
	getTextureImage: () => TexImageSource | undefined;
	setScaleFactor: (index: number, scaleFactor: number) => void;
	positions: IMesh["Positions"];
	indices: IMesh["Indices"];
	hasNormals: boolean;
	normals: Float32Array;
	hasTexCoords: boolean;
	texCoords: IMesh["TexCoords"];
	offset_normals: (index: number) => IMesh["Normals"];
	offset_positions: (index: number) => IMesh["Positions"];
	attach: (gl: WebGLRenderingContext) => uniformLocationsType;
	draw: (uniforms: uniformsType) => void;
}

interface IModelViewer {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	models: IModel[];
	controller: ICameraController;
	repaint: () => void;
	disconnect: () => void;
	attach: (controller: ICameraController) => void;
}

interface IModelViewerOptions {
	xRot: number;
	yRot: number;
	width: number;
	height: number;
	models: IModel[];
}

type loaderCallbackType = (
	response: AxiosResponse,
	url: string,
	load_succeeded: boolean,
) => void;

interface IFileLoader {
	urls_to_load: string[];
	callback_functions: loaderCallbackType[];
}

interface IPrioritizedFileLoader {
	lists_of_urls_to_load: string[][];
	callback_functions: (() => void)[];
	current_priority: number;
	load_counts: number[];
}

interface IModelLoader {
	canvas: HTMLCanvasElement | null;
	shape_info_url: string;
	shape_data_directory: string;
	file_loader: IFileLoader;
	startModelViewerFunction: (canvas: HTMLCanvasElement, model: IModel) => void;
	mesh_loader: IPrioritizedFileLoader;
	meshes: {
		[key: string]: IMesh;
	};
	filenames: string[];
	means: number[];
	covariance: number[][];
	template_url: string;
	offset_urls: string[];
	order_offset_names: {
		[key: string]: number;
	};
	offset_names: string[];
	offset_filenames: string[];
	offset_meshes: IMesh[];
	template_mesh: IMesh;
	current_model: IModel;
}