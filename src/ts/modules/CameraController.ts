export default class CameraController implements ICameraController {
	onchange_functions: (() => void)[];
	xRot: number;
	yRot: number;
	scaleFactor: number;
	dragging: boolean;
	curX: number;
	curY: number;
	axis: cameraAxisType;
	element!: HTMLElement;
	private destroy: () => void;

	constructor(axis: cameraAxisType) {
		this.xRot = 0;
		this.yRot = 0;
		this.scaleFactor = 3.0;
		this.dragging = false;
		this.curX = 0;
		this.curY = 0;
		this.axis = axis || "both";
		this.onchange_functions = [];
	}

	private start(e: MouseEvent | TouchEvent) {
		const eT = e as TouchEvent;
		const eM = e as MouseEvent;
		const isVertical = this.axis === "x" || this.axis === "both";
		const isHorizontal = this.axis === "y" || this.axis === "both";
		if (eT.touches) {
			if (isHorizontal) this.curX = eT.touches[0].pageX;
			if (isVertical) this.curY = eT.touches[0].pageY;
		} else {
			if (isHorizontal) this.curX = eM.clientX;
			if (isVertical) this.curY = eM.clientY;
		}

		this.dragging = true;
		e.preventDefault();
	}

	private end(e: MouseEvent | TouchEvent) {
		this.dragging = false;
	}

	private move(e: MouseEvent | TouchEvent) {
		if (!this.dragging) return;
		const eT = e as TouchEvent;
		const eM = e as MouseEvent;
		const isVertical = this.axis === "x" || this.axis === "both";
		const isHorizontal = this.axis === "y" || this.axis === "both";
		let curX: number, curY: number;
		if (eT.touches) {
			if (isHorizontal) curX = eT.touches[0].pageX;
			else curX = this.curX;
			if (isVertical) curY = eT.touches[0].pageY;
			else curY = this.curY;
		} else {
			if (isHorizontal) curX = eM.clientX;
			else curX = this.curX;
			if (isVertical) curY = eM.clientY;
			else curY = this.curY;
		}

		if (isHorizontal) {
			const deltaX = (this.curX - curX) / this.scaleFactor;
			this.curX = curX;
			this.yRot = (this.yRot + deltaX) % 360;
		}

		if (isVertical) {
			const deltaY = (this.curY - curY) / this.scaleFactor;
			this.curY = curY;
			this.xRot = this.xRot + deltaY;
		}

		for (var i = 0; i < this.onchange_functions.length; i++) {
			this.onchange_functions[i]();
		}
	}

	private setEvents() {
		const start = this.start.bind(this);
		const end = this.end.bind(this);
		const move = this.move.bind(this);

		this.element.addEventListener("mousedown", start, false);
		this.element.addEventListener("touchstart", start, false);
		document.addEventListener("mouseup", end, false);
		document.addEventListener("touchend", end, false);
		document.addEventListener("mousemove", move, false);
		document.addEventListener("touchmove", move, false);

		return () => {
			this.element.removeEventListener("mousedown", start);
			this.element.removeEventListener("touchstart", start);
			document.removeEventListener("mouseup", end);
			document.removeEventListener("touchend", end);
			document.removeEventListener("mousemove", move);
			document.removeEventListener("touchmove", move);
		};
	}

	public add_viewer(element: HTMLElement, callback: () => void) {
		this.element = element;
		this.onchange_functions.push(callback);
		this.destroy = this.setEvents();
	}

	public remove_viewer(callback: () => void) {
		this.onchange_functions = this.onchange_functions.filter(
			(onchange_function) => onchange_function !== callback,
		);
		this.destroy && this.destroy();
	}
}
