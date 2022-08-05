import CameraController from "./modules/CameraController";
import ModelLoader from "./modules/ModelLoader";
import ModelViewer from "./modules/ModelViewer";

let modelViewer: IModelViewer;
let model: IModel;
const model_color = [0.5, 0.65, 1, 1];
let model_loader: IModelLoader;
const order = {
	chest: 1,
	exercise: 6,
	height: 3,
	hips: 2,
	inseam: 5,
	waist: 0,
	weight: 4,
};
const names = [
	"Height",
	"Weight",
	"Chest",
	"Waist",
	"Hips",
	"Inseam",
	"Exercise",
];

const refreshModel = () => {
	try {
		modelViewer.repaint();
	} catch (e) {
		try {
			modelViewer.repaint();
		} catch (e) {
			modelViewer.repaint();
		}
	}
};

const startViewer = (canvas: HTMLCanvasElement, model: IModel): void => {
	if (modelViewer) modelViewer.disconnect();
	model_loader.current_model.setColor(model_color);
	const gl = canvas.getContext("webgl");

	const controller = new CameraController(canvas, "y");
	modelViewer = new ModelViewer([model], canvas, controller);
};

const loadMesh = (canvas: HTMLCanvasElement) => {
	const shape_info_url = "/models/male/shapeinfo.js";
	const shape_data_directory = "/models/male/";
	model_loader = new ModelLoader(
		canvas,
		shape_info_url,
		shape_data_directory,
		order,
		names,
		startViewer,
	);
	(window as any).model_loader = model_loader;
};

window.addEventListener("load", () => {
	const canvas = document.querySelector("#body-viewer");
	if (!canvas) return;
	loadMesh(canvas as HTMLCanvasElement);
});
