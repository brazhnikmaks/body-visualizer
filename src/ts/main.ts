import CameraController from "./modules/CameraController";
import ModelLoader from "./modules/ModelLoader";
import ModelViewer from "./modules/ModelViewer";

let modelViewer: IModelViewer;
let model: IModel;
const model_color = [0.5, 0.65, 1, 1];
let model_loader: IModelLoader;

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

	const controller = new CameraController("y");
	modelViewer = new ModelViewer([model], canvas, controller);
};

const loadMesh = (canvas: HTMLCanvasElement) => {
	const shape_info_url = "/models/female/shapeinfo.json";
	const shape_data_directory = "/models/female/";
	model_loader = new ModelLoader(
		canvas,
		shape_info_url,
		shape_data_directory,
		startViewer,
	);
	(window as any).model_loader = model_loader;
};

window.addEventListener("load", () => {
	const canvas = document.querySelector("#body-viewer");
	if (!canvas) return;
	loadMesh(canvas as HTMLCanvasElement);
});
