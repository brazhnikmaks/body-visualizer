import GLUTIL from "./GLUTIL";
import Matrix4x4 from "./Matrix4x4";

export default class ModelViewer implements IModelViewer {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	models: IModel[];
	controller: ICameraController;
	repaint: () => void;
	disconnect: () => void;
	attach: (controller: ICameraController) => void;

	constructor(
		in_models: IModel[],
		canvas: HTMLCanvasElement,
		controller: ICameraController,
	) {
		this.canvas = canvas;

		this.gl = GLUTIL.getContext(canvas);
		GLUTIL.checkGLError(this.gl);

		this.models = [];
		for (let i = 0; i < in_models.length; i++) {
			const model = in_models[i];
			this.models.push(model);
			model.attach(this.gl);
		}

		const _self = this;

		this.init();

		this.repaint = () => {
			const gl = this.gl;
			GLUTIL.checkGLError(gl);
			this.draw(gl, {
				xRot: this.controller.xRot,
				yRot: this.controller.yRot,
				width: this.canvas.width,
				height: this.canvas.height,
				models: this.models,
			});
		};

		this.disconnect = () => {
			this.controller.remove_viewer(_self.repaint);
		};

		this.attach = (controller: ICameraController) => {
			if (this.controller) this.disconnect();
			this.controller = controller;
			this.controller.add_viewer(this.canvas, _self.repaint);
		};

		this.attach(controller);
		this.repaint();
	}

	public setGl(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.gl = GLUTIL.getContext(canvas);
		GLUTIL.checkGLError(this.gl);

		this.disconnect();

		this.models.forEach((model) => model.attach(this.gl));
		this.init();
		this.attach(this.controller);
		this.repaint();
	}

	public init() {
		const gl = this.gl;
		gl.clearColor(0.1, 0.1, 0.1, 1.0);
		gl.clearDepth(1.0);
		GLUTIL.checkGLError(gl);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.enable(gl.CULL_FACE);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		GLUTIL.checkGLError(gl);
		gl.depthFunc(gl.LEQUAL);
		GLUTIL.checkGLError(gl);
	}

	public draw(gl: WebGLRenderingContext, options: IModelViewerOptions) {
		GLUTIL.checkGLError(gl);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.viewport(0, 0, options.width, options.height);
		GLUTIL.checkGLError(gl);
		const model = new Matrix4x4();
		const view = new Matrix4x4();
		const projection = new Matrix4x4();
		GLUTIL.checkGLError(gl);
		projection.loadIdentity();
		projection.perspective(45, options.width / options.height, 0.1, 100);
		GLUTIL.checkGLError(gl);
		model.loadIdentity();
		model.translate(0.0, -1.0, -3.0);
		model.rotate(options.xRot, 1, 0, 0);
		model.rotate(options.yRot, 0, 1, 0);
		GLUTIL.checkGLError(gl);
		const mvp = new Matrix4x4();
		mvp.multiply(model);
		mvp.multiply(projection);
		const worldInverseTranspose = model.inverse();
		worldInverseTranspose.transpose();
		const viewInverse = view.inverse();
		const normalMatrix = new Matrix4x4().multiply(model).inverse().transpose();
		GLUTIL.checkGLError(gl);
		const uniforms: uniformsType = {
			world: new Float32Array(model.elements),
			worldInverseTranspose: new Float32Array(worldInverseTranspose.elements),
			worldViewProj: new Float32Array(mvp.elements),
			viewInverse: new Float32Array(viewInverse.elements),
			normalMatrix: new Float32Array(normalMatrix.elements),
		};
		for (let i = 0; i < options.models.length; i++) {
			gl.clear(gl.DEPTH_BUFFER_BIT);
			options.models[i].draw(uniforms);
			GLUTIL.checkGLError(gl);
		}
		gl.flush();
		GLUTIL.checkGLError(gl);
	}

	public enable = (property: string) => {
		this.gl.enable(this.gl[property]);
	};

	public disable = (property: string) => {
		this.gl.disable(this.gl[property]);
	};
}
