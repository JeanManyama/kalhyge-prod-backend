import { Role } from "../models/index.js";

export default {
	async getAll(_, res) {
		const roles = await Role.findAll();
		res.json(roles);
	},

	async getByRole(req, res, next) {
		const { roleId } = req.params;
		const roles = await Role.findAll({ where: { role_id: roleId } });

		res.json(roles);
	},

	async getOne(req, res, next) {
		const { id } = req.params;
		const role = await Role.findByPk(id);

		if (!role) {
			return next();
		}

		res.json(role);
	},

	async create(req, res) {
		const roleInput = req.body;

		const role = await Role.create(roleInput);
		res.status(201).json(role);
	},

	async update(req, res, next) {
		const { id } = req.params;
		const roleInput = req.body;

		const [, roles] = await Role.update(roleInput, {
			where: { id },
			returning: true,
		});

		if (!roles || !roles.length) {
			return next();
		}

		const [role] = roles;

		res.json(role);
	},
	async delete(req, res, next) {
		const { id } = req.params;

		const deleted = await Role.destroy({ where: { id } });

		if (!deleted) {
			return next();
		}

		res.status(204).json();
	},
};
