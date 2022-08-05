import { AxiosResponse } from "axios";
import FileLoader from "./FileLoader";

export default class PrioritizedFileLoader implements IPrioritizedFileLoader {
	lists_of_urls_to_load: string[][];
	callback_functions: (() => void)[];
	current_priority: number;
	load_counts: number[];
	current_file_loader: IFileLoader | null;

	constructor(url_arrays: string[][], callbacks: (() => void)[]) {
		this.lists_of_urls_to_load = url_arrays;
		this.callback_functions = callbacks;
		this.current_priority = 0;
		this.load_counts = new Array(url_arrays.length).fill(0);
		this.current_file_loader = null;

		this.start_loading_current_priority();
	}

	private file_loaded(priority: number, url_index: number) {
		this.load_counts[priority]++;
		if (
			this.load_counts[priority] == this.lists_of_urls_to_load[priority].length
		) {
			if (this.callback_functions[priority]) {
				this.callback_functions[priority]();
			}
			if (priority + 1 < this.lists_of_urls_to_load.length) {
				this.current_priority = priority + 1;
				this.start_loading_current_priority();
			}
		}
	}

	private create_callbacks(priority: number): loaderCallbackType[] {
		const callback_list: loaderCallbackType[] = [];
		for (let i = 0; i < this.lists_of_urls_to_load[priority].length; i++) {
			callback_list.push(
				(
					(
						prioritized_file_loader: PrioritizedFileLoader,
						url_priority: number,
						url_index: number,
					) =>
					(response: AxiosResponse, url: string, load_succeeded: boolean) =>
						prioritized_file_loader.file_loaded(url_priority, url_index)
				)(this, priority, i),
			);
		}
		return callback_list;
	}

	private start_loading_current_priority() {
		if (this.load_counts[this.current_priority] == 0) {
			this.current_file_loader = new FileLoader(
				this.lists_of_urls_to_load[this.current_priority],
				this.create_callbacks(this.current_priority),
			);
		}
	}
}
