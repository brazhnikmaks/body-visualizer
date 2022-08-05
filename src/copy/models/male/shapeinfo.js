ordering = [
	"waist_circumference_pref_mm",
	"chest_circumference_mm",
	"hip_circumference_maximum_mm",
	"stature_mm",
	"weight_cube_root_kg",
	"inseam_right_mm",
	"fitness_hours",
];
filenames = [
	"waist_circumference_pref_plus_5mm",
	"chest_circumference_plus_5mm",
	"hip_circumference_maximum_plus_5mm",
	"stature_plus_5mm",
	"weight_cube_root_plus_5kg",
	"inseam_right_plus_5mm",
	"fitness_plus_5hours",
];
means = [
	8.944047e2, 1.021941e3, 1.029496e3, 1.774263e3, 4.350045, 7.96153e2, 4.559389,
];
covariance = [
	[
		1.016833e4, 8.356868e3, 6.343672e3, 2.546524e3, 2.247066e1, 2.35414e2,
		-4.467876e1,
	],
	[
		8.356868e3, 8.928956e3, 5.700942e3, 1.790792e3, 2.122468e1, 8.776439e1,
		-1.711339e1,
	],
	[
		6.343672e3, 5.700942e3, 5.324874e3, 2.119134e3, 1.677411e1, 5.787826e2,
		-2.230402e1,
	],
	[
		2.546524e3, 1.790792e3, 2.119134e3, 5.460447e3, 8.90875, 3.041366e3,
		-7.780974,
	],
	[
		2.247066e1, 2.122468e1, 1.677411e1, 8.90875, 6.11303e-2, 2.705408,
		-7.131429e-2,
	],
	[
		2.35414e2, 8.776439e1, 5.787826e2, 3.041366e3, 2.705408, 2.401288e3,
		2.883056,
	],
	[
		-4.467876e1, -1.711339e1, -2.230402e1, -7.780974, -7.131429e-2, 2.883056,
		1.111947e1,
	],
];
if (model_loader != undefined) {
	model_loader.finish_loading_shape_info(filenames, means, covariance);
}
