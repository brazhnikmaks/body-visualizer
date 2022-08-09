import CameraController from "./modules/CameraController";
import ModelLoader from "./modules/ModelLoader";
import ModelViewer from "./modules/ModelViewer";
import ConditionalMultivariateGaussian from "./modules/ConditionalMultivariateGaussian";

class BodyVisualizer implements IBodyVisualizer {
	canvas: HTMLCanvasElement;
	modelViewer: IModelViewer;
	modelLoader: IModelLoader;
	model_color: number[];
	min_values: {
		[key in meshNameType]?: number;
	};
	max_values: {
		[key in meshNameType]?: number;
	};
	mu: number[];
	conditional_multivariate_gaussian: any;
	scale_factors: number[];
	update_in_progress: boolean;

	constructor(canvas: HTMLCanvasElement) {
		this.modelLoader;
		this.canvas = canvas;
		this.model_color = [0.5, 0.65, 1, 1];
		this.min_values = {
			stature: 100,
			weight: 35,
			chest: 50,
			waist: 40,
			hips: 60,
			inseam: 55,
			age: 18,
		};
		this.max_values = {
			stature: 220,
			weight: 450,
			chest: 200,
			waist: 200,
			hips: 200,
			inseam: 100,
			age: 99,
		};
		this.mu = [];
		this.scale_factors = [];
		this.update_in_progress = false;

		this.loadMesh();
	}

	private startViewer(canvas: HTMLCanvasElement, model: IModel) {
		if (this.modelViewer) this.modelViewer.disconnect();
		this.modelLoader.current_model.setColor(this.model_color);

		const controller = new CameraController("y");
		this.modelViewer = new ModelViewer([model], canvas, controller);

		this.setupValues();
	}

	public refreshModel() {
		this.modelViewer.repaint();
	}

	private loadMesh = () => {
		const shape_info_url = "/models/female/shapeinfo.json";
		const shape_data_directory = "/models/female/";
		this.modelLoader = new ModelLoader(
			this.canvas,
			shape_info_url,
			shape_data_directory,
			this.startViewer.bind(this),
		);
	};

	public updateContainer(canvas: HTMLCanvasElement) {
		if (!canvas) return;
		this.modelViewer.setCanvas(canvas);
	}

	private setupValues() {
		const { means, covariance } = this.modelLoader;
		this.mu = [...means];
		const sigma: number[][] = covariance.map((c) => [...c]);
		const unconditioned_indices: number[] = [];
		this.modelLoader.offset_meshes.forEach((m, i) => {
			unconditioned_indices.push(i);
			this.scale_factors.push(0);
		});

		this.conditional_multivariate_gaussian =
			new ConditionalMultivariateGaussian(
				this.mu,
				sigma,
				unconditioned_indices,
				[],
				[],
			);
	}

	public updateModel(
		offset_mesh_name: meshNameType,
		value: number | null,
		animate: boolean = false,
	) {
		if (this.update_in_progress) return;
		this.update_in_progress = true;
		const old_scale_factors = [...this.scale_factors];
		const diff = 5;
		const meshIndex =
			this.modelLoader.offset_meshes_names.indexOf(offset_mesh_name);
		if (meshIndex == -1) throw new Error("incorrect mesh name");

		if (value == null) {
			this.conditional_multivariate_gaussian.uncondition_on_indices([
				meshIndex,
			]);
		} else {
			this.conditional_multivariate_gaussian.condition_on_indices(
				[meshIndex],
				[value],
			);
		}

		for (let i = 0; i < this.modelLoader.offset_meshes.length; i++) {
			const val = this.conditional_multivariate_gaussian.all_values[i];
			this.scale_factors[i] = (val - this.mu[i]) / diff;
		}

		if (animate) {
			const number_of_increments = 8;
			let inc = 0;
			const interval = setInterval(() => {
				inc++;
				if (inc > number_of_increments) {
					this.update_in_progress = false;
					return clearInterval(interval);
				}

				for (let i = 0; i < this.modelLoader.offset_meshes.length; i++) {
					((index) => {
						this.modelLoader.current_model.setScaleFactor(
							index,
							old_scale_factors[index] +
								(inc / number_of_increments) *
									(this.scale_factors[index] - old_scale_factors[index]),
						);
					})(i);
				}

				this.refreshModel();
			}, 30);
		} else {
			for (let i = 0; i < this.modelLoader.offset_meshes.length; i++) {
				((index) => {
					this.modelLoader.current_model.setScaleFactor(
						index,
						this.scale_factors[index],
					);
				})(i);
			}
			this.refreshModel();
			this.update_in_progress = false;
		}
	}
}

(window as any).BodyVisualizer = BodyVisualizer;
