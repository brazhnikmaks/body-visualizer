import { $M } from "./Sylvester";

export default class ConditionalMultivariateGaussian {
	mu: number[];
	sorted_mu: number[];
	sigma_by_column: number[][];
	unconditioned_indices: number[];
	conditioned_indices: number[];
	conditioned_values: number[];
	max_index: number;
	all_values: number[];
	is_conditioned: boolean[];
	is_active: boolean[];
	all_indices: number[];
	number_of_variables: number;
	number_of_unconditioned_variables: number;
	number_of_conditioned_variables: number;
	mu_1: number[];
	mu_2: number[];
	conditioned_values_by_index: number[];
	previous_conditioned_values_by_index: number[];
	max_number_of_conditioned_variables: number;
	sigma_21_and_22: {};
	sigma_21_times_sigma_22_inverse: {};
	active_index_to_condition_indices_index: {};
	partition_changed: boolean;
	sigma_22: number[][];
	sigma_22_inverse: number[][];
	sigma_22_inverse_tranpose: number[][];
	sigma_22_inverse_times_offsets: number[];
	previous_sigma_22_inverse_times_offsets: number[];
	conditioned_value_offsets: number[];

	constructor(
		mu: number[],
		sigma_by_column: number[][],
		unconditioned_indices: number[],
		conditioned_indices: number[],
		conditioned_values: number[],
	) {
		this.mu = mu;
		this.sorted_mu = [];
		this.max_index = mu.length;
		this.sigma_by_column = sigma_by_column;
		this.all_values = new Array(this.max_index);
		this.is_conditioned = new Array(this.max_index);
		this.is_active = new Array(this.max_index);
		this.all_indices = unconditioned_indices.concat(conditioned_indices).sort();
		this.number_of_variables = this.all_indices.length;
		this.number_of_unconditioned_variables = unconditioned_indices.length;
		this.number_of_conditioned_variables = conditioned_indices.length;
		this.sorted_mu = new Array(this.number_of_variables);
		this.max_number_of_conditioned_variables = 100;
		this.mu_1 = [];
		this.mu_2 = [];
		this.conditioned_values_by_index = [];
		this.previous_conditioned_values_by_index = [];
		this.sigma_21_and_22 = {};
		this.sigma_21_times_sigma_22_inverse = {};
		this.active_index_to_condition_indices_index = {};
		this.sigma_22 = [];
		this.sigma_22_inverse = [];
		this.sigma_22_inverse_tranpose = [];
		this.sigma_22_inverse_times_offsets = [];
		this.previous_sigma_22_inverse_times_offsets = [];
		this.conditioned_value_offsets = [];

		let index: number;
		for (let i = this.number_of_variables; i; ) {
			index = this.all_indices[--i];
			this.sorted_mu[i] = mu[index];
		}
		for (let i = this.number_of_unconditioned_variables; i; ) {
			index = unconditioned_indices[--i];
			this.is_conditioned[index] = false;
			this.is_active[index] = false;
			this.mu_1[index] = mu[index];
		}
		for (let i = this.number_of_conditioned_variables; i; ) {
			index = conditioned_indices[--i];
			this.is_conditioned[index] = true;
			this.is_active[index] = false;
			this.mu_2[index] = mu[index];
			this.sigma_21_and_22[index] = this.sigma_by_column[index];
			this.conditioned_values_by_index[index] = conditioned_values[i];
			this.previous_conditioned_values_by_index[index] = conditioned_values[i];
		}
		this.unconditioned_indices = new Array(this.number_of_variables);
		this.conditioned_indices = new Array(
			this.max_number_of_conditioned_variables,
		);
		this.set_index_partition();
		this.set_sigma_22();
		this.set_conditioned_value_offsets();
		this.set_all_values();
	}

	private static dot_product(v_1: number[], v_2: number[]): number {
		let sum = 0;
		for (let i = v_1.length; i; ) {
			--i;
			sum += v_1[i] * v_2[i];
		}
		return sum;
	}

	private static matrix_times_vector(m_1: number[][], v_1: number[]): number[] {
		const dp = ConditionalMultivariateGaussian.dot_product;
		const product: number[] = new Array(v_1.length);
		for (let i = m_1.length; i; ) {
			--i;
			product[i] = dp(m_1[i], v_1);
		}
		return product;
	}

	private static matrix_transpose(matrix: number[][]): number[][] {
		let transpose_matrix: number[][] = [];
		if (matrix.length) {
			let transpose_matrix = new Array(matrix[0].length);
			for (var i = 0; i < matrix[0].length; i++) {
				transpose_matrix[i] = new Array(matrix.length);
				for (var j = 0; j < matrix.length; j++) {
					transpose_matrix[i][j] = matrix[j][i];
				}
			}
		}
		return transpose_matrix;
	}

	private static matrix_invert(matrix: number[][]): number[][] {
		if (!matrix.length) {
			return [];
		}
		if (matrix.length == 1) {
			return [[1 / matrix[0][0]]];
		} else {
			// @ts-ignore
			return $M(matrix).inverse().elements;
		}
	}

	public set_index_partition() {
		let index: number;
		let u = this.number_of_unconditioned_variables,
			c = this.number_of_conditioned_variables;
		for (let i = this.number_of_variables; i; ) {
			index = this.all_indices[--i];
			if (this.is_conditioned[index]) {
				this.conditioned_indices[--c] = index;
			} else {
				this.unconditioned_indices[--u] = index;
			}
			if (this.is_active[index]) {
				delete this.sigma_21_times_sigma_22_inverse[index];
				this.is_active[index] = false;
			}
		}
		this.active_index_to_condition_indices_index = {};
	}

	public uncondition_on_indices(newly_unconditioned_indices: number[]) {
		let index: number;
		this.partition_changed = false;
		for (let i = newly_unconditioned_indices.length; i; ) {
			index = newly_unconditioned_indices[--i];
			if (this.is_conditioned[index]) {
				this.is_conditioned[index] = false;
				++this.number_of_unconditioned_variables;
				--this.number_of_conditioned_variables;
				this.mu_1[index] = this.mu[index];
				delete this.mu_2[index];
				delete this.sigma_21_and_22[index];
				delete this.conditioned_values_by_index[index];
				this.partition_changed = true;
			}
		}
		if (!this.partition_changed) {
			return this.all_values;
		}
		this.set_index_partition();
		this.set_sigma_22();
		this.set_conditioned_value_offsets();
		return this.set_all_values();
	}

	public condition_on_indices(
		newly_conditioned_indices: number[],
		newly_conditioned_values: number[],
	) {
		let index: number;
		this.partition_changed = false;
		for (var i = newly_conditioned_indices.length; i; ) {
			index = newly_conditioned_indices[--i];
			if (!this.is_conditioned[index]) {
				this.is_conditioned[index] = true;
				++this.number_of_conditioned_variables;
				--this.number_of_unconditioned_variables;
				this.mu_2[index] = this.mu[index];
				this.sigma_21_and_22[index] = this.sigma_by_column[index];
				delete this.mu_1[index];
				this.partition_changed = true;
			}
			this.conditioned_values_by_index[index] = newly_conditioned_values[i];
			this.previous_conditioned_values_by_index[index] =
				newly_conditioned_values[i];
		}
		if (this.partition_changed) {
			this.set_index_partition();
			this.set_sigma_22();
			this.set_conditioned_value_offsets();
			return this.set_all_values();
		} else {
			this.sigma_22_inverse_times_offsets =
				ConditionalMultivariateGaussian.matrix_times_vector(
					this.sigma_22_inverse,
					this.conditioned_value_offsets,
				);
			this.set_conditioned_value_offsets();
			return this.update_all_values();
		}
	}

	public set_conditioned_value_offsets() {
		this.conditioned_value_offsets = new Array(
			this.number_of_conditioned_variables,
		);
		let index: number;
		for (let i = this.number_of_conditioned_variables; i; ) {
			index = this.conditioned_indices[--i];
			this.conditioned_value_offsets[i] =
				this.conditioned_values_by_index[index] - this.mu_2[index];
		}
		return this.conditioned_value_offsets;
	}

	public set_sigma_22() {
		let i: number, temp_column: number[];
		this.sigma_22 = new Array(this.number_of_conditioned_variables);
		for (i = this.number_of_conditioned_variables; i; ) {
			temp_column = this.sigma_21_and_22[this.conditioned_indices[--i]];
			this.sigma_22[i] = new Array(this.number_of_conditioned_variables);
			for (let j = this.number_of_conditioned_variables; j; ) {
				--j;
				this.sigma_22[i][j] = temp_column[this.conditioned_indices[j]];
			}
		}
		this.sigma_22_inverse = ConditionalMultivariateGaussian.matrix_invert(
			this.sigma_22,
		);
		this.sigma_22_inverse_tranpose =
			ConditionalMultivariateGaussian.matrix_transpose(this.sigma_22_inverse);
	}

	public set_all_values() {
		let index_u: number, i: number;
		for (i = this.number_of_unconditioned_variables; i; ) {
			index_u = this.unconditioned_indices[--i];
			this.all_values[index_u] = this.mu[index_u];
		}
		if (this.number_of_conditioned_variables > 0) {
			this.sigma_22_inverse_times_offsets =
				ConditionalMultivariateGaussian.matrix_times_vector(
					this.sigma_22_inverse,
					this.conditioned_value_offsets,
				);
			let c: number, j: number, temp_column: number[], index_c: number;
			for (i = this.number_of_conditioned_variables; i; ) {
				index_c = this.conditioned_indices[--i];
				temp_column = this.sigma_21_and_22[index_c];
				c = this.sigma_22_inverse_times_offsets[i];
				for (j = this.number_of_unconditioned_variables; j; ) {
					index_u = this.unconditioned_indices[--j];
					this.all_values[index_u] += c * temp_column[index_u];
				}
				this.all_values[index_c] = this.conditioned_values_by_index[index_c];
			}
		}
		return this.all_values;
	}

	public update_all_values(threshold?: number) {
		if (!threshold) {
			threshold = 0.00001;
		}
		if (this.number_of_conditioned_variables > 0) {
			this.previous_sigma_22_inverse_times_offsets =
				this.sigma_22_inverse_times_offsets;
			this.sigma_22_inverse_times_offsets =
				ConditionalMultivariateGaussian.matrix_times_vector(
					this.sigma_22_inverse,
					this.conditioned_value_offsets,
				);
			let c: number,
				i: number,
				j: number,
				temp_column: number[],
				index_u: number,
				index_c: number;
			for (i = this.number_of_conditioned_variables; i; ) {
				index_c = this.conditioned_indices[--i];
				temp_column = this.sigma_21_and_22[index_c];
				c =
					this.sigma_22_inverse_times_offsets[i] -
					this.previous_sigma_22_inverse_times_offsets[i];
				if (Math.abs(c) > threshold) {
					for (j = this.number_of_unconditioned_variables; j; ) {
						index_u = this.unconditioned_indices[--j];
						this.all_values[index_u] += c * temp_column[index_u];
					}
				} else {
					this.sigma_22_inverse_times_offsets[i] =
						this.previous_sigma_22_inverse_times_offsets[i];
				}
				this.all_values[index_c] = this.conditioned_values_by_index[index_c];
			}
		}
		return this.all_values;
	}

	public update_conditioned_values(
		previously_conditioned_indices: number[],
		newly_conditioned_values: number[],
		threshold: number,
	) {
		var index;
		for (var i = previously_conditioned_indices.length; i; ) {
			index = previously_conditioned_indices[--i];
			if (!this.is_conditioned[index]) {
				return this.condition_on_indices(
					previously_conditioned_indices,
					newly_conditioned_values,
				);
			} else {
				this.previous_conditioned_values_by_index[index] =
					this.conditioned_values_by_index[index];
				this.conditioned_values_by_index[index] = newly_conditioned_values[i];
			}
		}
		this.update_conditioned_value_offsets();
		return this.update_all_values(threshold);
	}

	public update_conditioned_value_offsets() {
		let index: number;
		for (let i = this.number_of_conditioned_variables; i; ) {
			index = this.conditioned_indices[--i];
			this.conditioned_value_offsets[i] +=
				this.conditioned_values_by_index[index] -
				this.previous_conditioned_values_by_index[index];
		}
		return this.conditioned_value_offsets;
	}

	public set_indices_as_active(active_indices: number[], values) {
		let index: number,
			just_updated = false;
		for (var i = active_indices.length; i; ) {
			if (!this.is_conditioned[active_indices[--i]]) {
				this.condition_on_indices(active_indices, values);
				just_updated = true;
			}
		}
		for (var i = active_indices.length; i; ) {
			index = active_indices[--i];
			this.is_active[index] = true;
			this.previous_conditioned_values_by_index[index] =
				this.conditioned_values_by_index[index];
			this.conditioned_values_by_index[index] = values[i];
		}
		for (var i = this.number_of_conditioned_variables; i; ) {
			index = this.conditioned_indices[--i];
			if (
				this.is_active[index] &&
				this.active_index_to_condition_indices_index[index] == null
			) {
				this.active_index_to_condition_indices_index[index] = i;
				this.sigma_21_times_sigma_22_inverse[index] =
					this.offset_vector_for_column(i);
			}
		}
		if (!just_updated) {
			this.update_conditioned_value_offsets();
			return this.update_all_values();
		} else {
			return this.all_values;
		}
	}

	public offset_vector_for_column(column_index: number) {
		const sigma_22_column_for_index =
			this.sigma_22_inverse_tranpose[column_index];
		const vector: number[] = new Array(this.max_index);
		for (let j = this.number_of_unconditioned_variables; j; ) {
			vector[this.unconditioned_indices[--j]] = 0;
		}
		let index: number, temp_column: number[];
		for (let i = this.number_of_conditioned_variables; i; ) {
			temp_column = this.sigma_21_and_22[this.conditioned_indices[--i]];
			const c = sigma_22_column_for_index[i];
			for (let j = this.number_of_unconditioned_variables; j; ) {
				index = this.unconditioned_indices[--j];
				vector[index] += c * temp_column[index];
			}
		}
		return vector;
	}

	public update_active_values(
		active_indices: number[],
		new_values: number[],
		threshold: number,
	) {
		for (let i = active_indices.length; i; ) {
			if (!this.is_active[active_indices[--i]]) {
				this.update_conditioned_values(active_indices, new_values, threshold);
			}
		}
		if (!threshold) {
			threshold = 0.00001;
		}
		let index_a: number,
			new_value: number,
			previous_value: number,
			i: number,
			j: number,
			c: number,
			temp_column: number[],
			index_u: number;
		for (i = active_indices.length; i; ) {
			index_a = active_indices[--i];
			previous_value = this.conditioned_values_by_index[index_a];
			new_value = new_values[i];
			c = new_value - previous_value;
			if (Math.abs(c) > threshold) {
				this.previous_conditioned_values_by_index[index_a] = previous_value;
				this.conditioned_values_by_index[index_a] = new_value;
				this.conditioned_value_offsets[
					this.active_index_to_condition_indices_index[index_a]
				] += c;
				this.all_values[index_a] = new_value;
				temp_column = this.sigma_21_times_sigma_22_inverse[index_a];
				for (j = this.number_of_unconditioned_variables; j; ) {
					index_u = this.unconditioned_indices[--j];
					this.all_values[index_u] += c * temp_column[index_u];
				}
			}
		}
		var index_c;
		for (let i = this.number_of_conditioned_variables; i; ) {
			index_c = this.conditioned_indices[--i];
			this.all_values[index_c] = this.conditioned_values_by_index[index_c];
		}
		return this.all_values;
	}

	public get_values(indices: number[]) {
		const values: number[] = new Array(indices.length);
		for (var i = indices.length; i; ) {
			--i;
			values[i] = this.all_values[indices[i]];
		}
		return values;
	}
}
