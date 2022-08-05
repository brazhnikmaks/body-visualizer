export default class ArrayUtil {
	public static initArray1D(length: number, value: number) {
		const one_d_array: number[] = new Array(length);
		for (let i = length; i; ) {
			one_d_array[--i] = value;
		}
		return one_d_array;
	}

	public static flatten_two_d_array(two_d_array: number[][]) {
		if (!two_d_array.length) return [];
		const height = two_d_array.length;
		const width = two_d_array[0].length;
		const length = height * width;
		const one_d_array: number[] = new Array(length);
		let index = length;
		for (let i = height; i; ) {
			--i;
			for (let j = width; j; ) {
				one_d_array[--index] = two_d_array[i][--j];
			}
		}
		return one_d_array;
	}

	public static cross(a: number[], b: number[]): number[] {
		return [
			a[1] * b[2] - a[2] * b[1],
			a[2] * b[0] - a[0] * b[2],
			a[0] * b[1] - a[1] * b[0],
		];
	}

	public static add(a: number[], b: number[]): number[] {
		return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
	}

	public static sub(a: number[], b: number[]): number[] {
		return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
	}
}
