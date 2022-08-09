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
			responseType: "json",
		}).then(create_success_callback(this, url, url_index));
		// .catch(create_error_callback(this, url, url_index));
	}

	private finish_loading_url(
		response: AxiosResponse,
		url: string,
		url_index: number,
		load_succeeded: boolean,
	) {
		if (this.callback_functions[url_index]) {
			this.callback_functions[url_index](response, url, load_succeeded);
		}
	}
}
