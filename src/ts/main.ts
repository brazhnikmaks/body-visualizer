import CameraController from "./modules/CameraController";
import ModelLoader from "./modules/ModelLoader";
import ModelViewer from "./modules/ModelViewer";
import ConditionalMultivariateGaussian from "./modules/ConditionalMultivariateGaussian";

class BodyVisualizer implements IBodyVisualizer {
	canvas: HTMLCanvasElement;
	gender: "male" | "female";
	serverUrl: string;
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
	conditional_multivariate_gaussian: ConditionalMultivariateGaussian;
	scale_factors: number[];
	update_in_progress: boolean;
	measurement_names: meshNameType[];
	order_by_measurement!: {
		[key in meshNameType]?: number;
	};
	onLoad?: () => void;

	constructor(
		canvas: HTMLCanvasElement,
		gender: "male" | "female",
		serverUrl: string,
		onLoad?: () => void,
	) {
		this.modelLoader;
		this.canvas = canvas;
		this.gender = gender;
		this.serverUrl = serverUrl;
		this.onLoad = onLoad;
		this.measurement_names = [
			"height",
			"weight",
			"chest",
			"waist",
			"hips",
			"inseam",
			"age",
		];
		this.order_by_measurement = {};
		this.model_color = [0.5, 0.65, 1, 1];
		this.min_values = {
			height: 100,
			weight: 35,
			chest: 50,
			waist: 40,
			hips: 60,
			inseam: 55,
			age: 18,
		};
		this.max_values = {
			height: 220,
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
		this.onLoad && this.onLoad();
	}

	public refreshModel() {
		this.modelViewer.repaint();
	}

	private loadMesh = () => {
		const shape_info_url = `${this.serverUrl}/body-visualizer/models/${this.gender}/shapeinfo.json`;
		const shape_data_directory = `${this.serverUrl}/body-visualizer/models/${this.gender}/`;
		this.modelLoader = new ModelLoader(
			this.canvas,
			shape_info_url,
			shape_data_directory,
			this.measurement_names,
			this.startViewer.bind(this),
		);
	};

	public updateContainer(canvas: HTMLCanvasElement) {
		if (!canvas) return;
		this.modelViewer.setCanvas(canvas);
	}

	private setupValues() {
		const offsetMeshesNumber = this.modelLoader.offset_meshes_names.length;
		this.scale_factors = new Array(offsetMeshesNumber);
		this.mu = new Array(offsetMeshesNumber);
		const sigma: number[][] = new Array(offsetMeshesNumber);
		const unconditioned_indices: number[] = new Array(offsetMeshesNumber);
		const conditioned_indices = [];
		const conditioned_values = [];

		for (let i = 0; i < offsetMeshesNumber; i++) {
			this.order_by_measurement[this.modelLoader.offset_meshes_names[i]] = i;
		}

		for (let i = 0; i < offsetMeshesNumber; i++) {
			const offset_mesh_name = this.measurement_names[i];
			const data_index = this.order_by_measurement[offset_mesh_name] as number;
			this.mu[i] = this.modelLoader.means[data_index];
			unconditioned_indices[i] = i;
			sigma[i] = new Array(offsetMeshesNumber);
		}

		for (let i = 0; i < offsetMeshesNumber; i++) {
			const row_data_index = this.order_by_measurement[
				this.measurement_names[i]
			] as number;
			for (let j = 0; j < offsetMeshesNumber; j++) {
				const column_data_index = this.order_by_measurement[
					this.measurement_names[j]
				] as number;
				sigma[i][j] =
					this.modelLoader.covariance[row_data_index][column_data_index];
			}
		}

		this.conditional_multivariate_gaussian =
			new ConditionalMultivariateGaussian(
				this.mu,
				sigma,
				unconditioned_indices,
				conditioned_indices,
				conditioned_values,
			);

		for (let i = 0; i < offsetMeshesNumber; i++) {
			this.scale_factors[i] = 0;
		}
	}

	private updateView(modelHeight: number) {
		const zoomHeight = Math.min(Math.max(1640, modelHeight), 2200);
		const minPosition = {
			x: 0,
			y: -0.81,
			z: -2.2,
		};
		const maxPosition = {
			x: 0,
			y: -1.07,
			z: -2.9,
		};

		const heightDiff = zoomHeight - 1640;
		this.modelViewer.setPosition(
			0,
			minPosition.y - heightDiff * 4.6429e-4,
			minPosition.z - heightDiff * 0.00125,
		);
	}

	public updateModel(
		values: {
			[key in meshNameType]?: number;
		},
		animate: boolean = false,
	) {
		if (this.update_in_progress) return;
		this.update_in_progress = true;
		const old_scale_factors = [...this.scale_factors];
		const diff = 5;
		let zoomChange = false;
		let old_height;

		const meshes = Object.keys(values);

		for (let i = 0; i < meshes.length; i++) {
			const meshName = meshes[i] as meshNameType;
			let meshValue = values[meshName] as number | null;
			const meshIndex = this.measurement_names.indexOf(meshName);

			if (meshIndex === -1) {
				console.warn(`${meshName} is incorrect mesh name`);
				continue;
			}

			if (meshName === "height") {
				zoomChange = true;
				old_height = this.conditional_multivariate_gaussian.all_values[0];
			}

			if (meshValue === null) {
				this.conditional_multivariate_gaussian.uncondition_on_indices([
					meshIndex,
				]);
			} else {
				meshValue = Math.min(
					Math.max(meshValue, this.min_values[meshName] as number),
					this.max_values[meshName] as number,
				);
				switch (meshName) {
					case "weight":
						meshValue = Math.cbrt(meshValue);
						break;
					case "age":
						meshValue = meshValue - 13;
						break;
					default:
						meshValue = meshValue * 10.0;
						break;
				}
				this.conditional_multivariate_gaussian.condition_on_indices(
					[meshIndex],
					[meshValue],
				);
			}
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

				const curIncDiff = inc / number_of_increments;

				if (zoomChange)
					this.updateView(
						old_height +
							curIncDiff *
								(this.conditional_multivariate_gaussian.all_values[0] -
									old_height),
					);

				for (let i = 0; i < this.modelLoader.offset_meshes.length; i++) {
					((index) => {
						this.modelLoader.current_model.setScaleFactor(
							index,
							old_scale_factors[index] +
								curIncDiff *
									(this.scale_factors[index] - old_scale_factors[index]),
						);
					})(i);
				}

				this.refreshModel();
			}, 30);
		} else {
			if (zoomChange)
				this.updateView(this.conditional_multivariate_gaussian.all_values[0]);

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

// const canvas = document.getElementById("body-viewer");
// window.bodyVisualiser = new BodyVisualizer(canvas, "male", "http://localhost:5000");
