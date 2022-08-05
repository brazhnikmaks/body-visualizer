import FileLoader from "./FileLoader";
import PrioritizedFileLoader from "./PrioritizedFileLoader";
import Mesh from "./Mesh";
import Model from "./Model";

export default class ModelLoader implements IModelLoader {
	canvas: HTMLCanvasElement;
	shape_info_url: string;
	shape_data_directory: string;
	file_loader: IFileLoader;
	startModelViewerFunction: (canvas: HTMLCanvasElement, model: IModel) => void;
	mesh_loader!: IPrioritizedFileLoader;
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

	constructor(
		canvas: HTMLCanvasElement,
		shape_info_url: string,
		shape_data_directory: string,
		order_offset_names: {
			[key: string]: number;
		},
		offset_names: string[],
		startModelViewerFunction: (
			canvas: HTMLCanvasElement,
			model: IModel,
		) => void,
	) {
		this.canvas = canvas;
		this.startModelViewerFunction = startModelViewerFunction;
		this.shape_data_directory = shape_data_directory;
		this.meshes = {};
		this.filenames = [];
		this.means = [];
		this.covariance = [];
		this.order_offset_names = order_offset_names;
		this.offset_names = offset_names;
		this.offset_filenames = [];
		this.file_loader = new FileLoader(
			[shape_info_url],
			[
				(
					(model_loader) => () =>
						model_loader.create_models()
				)(this),
			],
		);
	}

	private finish_loading_shape_info(
		filenames: string[],
		means: number[],
		covariance: number[][],
	) {
		this.filenames = filenames;
		this.means = means;
		this.covariance = covariance;
		this.template_url = this.shape_data_directory + "mean" + ".js";
		this.offset_filenames = Array(filenames.length);
		this.offset_urls = [];
		this.meshes = {};
		for (let i = 0; i < filenames.length; i++) {
			this.offset_filenames[i] =
				filenames[this.order_offset_names[this.offset_names[i].toLowerCase()]];
			this.offset_urls.push(
				this.shape_data_directory + this.offset_filenames[i] + ".js",
			);
		}
	}

	private create_mesh(
		name: string,
		vertices: number[][],
		faces: number[][] | false,
	) {
		this.meshes[name] = new Mesh(vertices, faces, false);
		this.meshes[name].faces = faces;
	}

	private template_loaded() {
		this.template_mesh = this.meshes["mean"];
		this.offset_meshes = [];
		this.current_model = new Model(this.template_mesh, this.offset_meshes);
	}

	private offsets_loaded() {
		this.offset_meshes = [];
		for (var i = 0; i < this.filenames.length; i++) {
			this.offset_meshes[i] = this.meshes[this.offset_filenames[i]];
		}
		this.current_model = new Model(this.template_mesh, this.offset_meshes);
		this.startModelViewerFunction(this.canvas, this.current_model);
	}

	private create_models() {
		const template_callback = (
			(model_loader) => () =>
				model_loader.template_loaded()
		)(this);
		const offsets_callback = (
			(model_loader) => () =>
				model_loader.offsets_loaded()
		)(this);

		this.mesh_loader = new PrioritizedFileLoader(
			[[this.template_url], this.offset_urls],
			[template_callback, offsets_callback],
		);
	}
}
