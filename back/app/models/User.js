import { Model, DataTypes } from "sequelize";
import { sequelize } from "../database.js";

export class User extends Model {}

User.init(
	{
		firstname: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		email: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		password: {
			type: DataTypes.TEXT,
			allowNull: false,
		},
		role_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			// references: {
			// 	model: "Role",
			// 	key: "id",
			// },
		},
		refresh_token: {
			type: DataTypes.TEXT,
		},
		refresh_token_expires_at: {
			type: DataTypes.DATE,
		},
	},
	{
		sequelize,
		tableName: "user",
		timestamps: false,
	},
);
