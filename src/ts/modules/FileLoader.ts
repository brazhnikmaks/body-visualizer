import axios, { AxiosError, AxiosResponse } from "axios";

export default class FileLoader implements IFileLoader {
	urls_to_load: string[];
	callback_functions: ((
		response: AxiosResponse,
		url: string,
		load_succeeded: boolean,
	) => void)[];

	constructor(
		urls: string[],
		callbacks: ((
			response: AxiosResponse,
			url: string,
			load_succeeded: boolean,
		) => void)[],
	) {
		this.urls_to_load = urls;
		this.callback_functions = callbacks;
		for (let i = 0; i < this.urls_to_load.length; i++) {
			this.start_loading_url(i);
		}
	}

	private start_loading_url(url_index: number) {
		const url = this.urls_to_load[url_index];
		const create_success_callback = (
			file_loader: FileLoader,
			url: string,
			url_index: number,
		) => {
			return function (response: AxiosResponse) {
				file_loader.finish_loading_url(response, url, url_index, true);
			};
		};
		function create_error_callback(
			file_loader: FileLoader,
			url: string,
			url_index: number,
		) {
			return function (error: AxiosError) {
				// @ts-ignore
				file_loader.finish_loading_url(error.response, url, url_index, false);
			};
		}

		axios({
			method: "GET",
			url,
			responseType: "text",
		})
			.then(create_success_callback(this, url, url_index))
			.catch(create_error_callback(this, url, url_index));
	}

	private finish_loading_url(
		response: AxiosResponse,
		url: string,
		url_index: number,
		load_succeeded: boolean,
	) {
		let name,
			ordering,
			filenames,
			means,
			mean_vertices,
			mean_faces,
			mean_mesh,
			covariance,
			stature_plus_5mm_vertices,
			stature_plus_5mm_faces,
			weight_cube_root_plus_5kg_vertices,
			weight_cube_root_plus_5kg_faces,
			chest_circumference_plus_5mm_vertices,
			chest_circumference_plus_5mm_faces,
			waist_circumference_pref_plus_5mm_vertices,
			waist_circumference_pref_plus_5mm_faces,
			hip_circumference_maximum_plus_5mm_vertices,
			hip_circumference_maximum_plus_5mm_faces,
			inseam_right_plus_5mm_vertices,
			inseam_right_plus_5mm_faces,
			fitness_plus_5hours_vertices,
			fitness_plus_5hours_faces,
			inseam_right_plus_5mm_mesh,
			chest_circumference_plus_5mm_mesh,
			stature_plus_5mm_mesh,
			weight_cube_root_plus_5kg_mesh,
			waist_circumference_pref_plus_5mm_mesh,
			hip_circumference_maximum_plus_5mm_mesh,
			fitness_plus_5hours_mesh;
		if (this.callback_functions[url_index]) {
			eval(response.data);
			this.callback_functions[url_index](response, url, load_succeeded);
		}
	}
}
