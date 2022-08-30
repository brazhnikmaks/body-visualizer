import FileLoader from "./FileLoader";
import Mesh from "./Mesh";
import Model from "./Model";

export default class ModelLoader implements IModelLoader {
	canvas: HTMLCanvasElement;
	shape_info_url: string;
	shape_data_directory: string;
	startModelViewerFunction: (canvas: HTMLCanvasElement, model: IModel) => void;
	meshes: {
		[key in meshNameType]: IMesh;
	};
	means: number[];
	covariance: number[][];
	offset_meshes_names: meshNameType[];
	template_url: string;
	offset_urls: string[];
	offset_meshes: IMesh[];
	template_mesh: IMesh;
	current_model: IModel;
	measurement_names: meshNameType[];

	constructor(
		canvas: HTMLCanvasElement,
		shape_info_url: string,
		shape_data_directory: string,
		measurement_names: meshNameType[],
		startModelViewerFunction: (
			canvas: HTMLCanvasElement,
			model: IModel,
		) => void,
	) {
		this.canvas = canvas;
		this.startModelViewerFunction = startModelViewerFunction;
		this.measurement_names = measurement_names;
		this.shape_data_directory = shape_data_directory;
		this.meshes = {} as {
			[key in meshNameType]: IMesh;
		};
		this.offset_meshes_names = [];
		this.means = [];
		this.covariance = [];

		new FileLoader(
			[shape_info_url],
			[
				((model_loader) => (response) => {
					const { offset_meshes_names, means, covariance } = response.data;
					model_loader.finish_loading_shape_info(
						offset_meshes_names,
						means,
						covariance,
					);
					return model_loader.load_meshes();
				})(this),
			],
		);
	}

	private finish_loading_shape_info(
		offset_meshes_names: meshNameType[],
		means: number[],
		covariance: number[][],
	) {
		this.offset_urls = [];
		this.meshes = {} as {
			[key in meshNameType]: IMesh;
		};
		this.offset_meshes_names = offset_meshes_names;
		this.means = means;
		this.covariance = covariance;
		this.template_url = this.shape_data_directory + "mean" + ".json";
		for (let i = 0; i < offset_meshes_names.length; i++) {
			const nameIndex = offset_meshes_names.indexOf(this.measurement_names[i]);
			this.offset_urls.push(
				this.shape_data_directory + offset_meshes_names[nameIndex] + ".json",
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

	private template_loaded(name: string) {
		this.template_mesh = this.meshes[name];
		this.offset_meshes = new Array(this.offset_meshes_names.length);

		let loadedCount = 0;
		const offsets_callback = ((model_loader) => (response) => {
			const { name, vertices, faces } = response.data;
			const dataIndex = this.measurement_names.indexOf(name);
			model_loader.create_mesh(name, vertices, faces);
			this.offset_meshes[dataIndex] = this.meshes[name];
			loadedCount++;
			if (loadedCount === this.offset_urls.length) {
				return model_loader.create_model();
			}
		})(this);

		new FileLoader(
			this.offset_urls,
			new Array(this.offset_urls.length).fill(offsets_callback),
		);
	}

	private create_model() {
		this.current_model = new Model(this.template_mesh, this.offset_meshes);
		this.startModelViewerFunction(this.canvas, this.current_model);
	}

	private load_meshes() {
		const template_callback = ((model_loader) => (response) => {
			const { name, vertices, faces } = response.data;
			model_loader.create_mesh(name, vertices, faces);
			return model_loader.template_loaded(name);
		})(this);

		new FileLoader([this.template_url], [template_callback]);
	}
}
