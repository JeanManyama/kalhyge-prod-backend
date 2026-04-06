import { Article } from "./Article.js";
import { Machine } from "./Machine.js";
import { Production } from "./Production.js";
import { Role } from "./Role.js";
import { Timer } from "./Timer.js";
import { User } from "./User.js";

//Association entre Article et Machine
Article.belongsToMany(Machine, {
	foreignKey: "article_id",
	otherKey: "machine_id",
	through: Production,
	as: "machines",
});
Machine.belongsToMany(Article, {
	foreignKey: "machine_id",
	otherKey: "article_id",
	through: Production,
	as: "articles",
});

// Association entre Role et User

Role.hasMany(User, {
	foreignKey: "role_id",
	as: "users", // alias pour accéder aux utilisateurs d'un rôle
});

User.belongsTo(Role, {
	foreignKey: "role_id",
	as: "role", // alias pour accéder au rôle d'un utilisateur
});

// Association User et Timer
User.hasOne(Timer, {
	foreignKey: "user_id",
	onDelte: "CASCADE",
	as: "timer",
});
Timer.belongsTo(User, {
	foreignKey: "user_id",
	as: "user",
});

Machine.hasMany(Production, {
	foreignKey: "machine_id",
	as: "productions",
});

Production.belongsTo(Machine, {
	foreignKey: "machine_id",
	as: "machines",
});
Article.hasMany(Production, {
	foreignKey: "article_id",
	as: "productions",
});

Production.belongsTo(Article, {
	foreignKey: "article_id",
	as: "articles",
});

// Association Timer et Production
Timer.hasMany(Production, {
	foreignKey: "timer_id",
	as: "productions", // Alias pour accéder aux productions d'un timer
});

Production.belongsTo(Timer, {
	foreignKey: "timer_id",
	as: "timer", // Alias pour accéder au timer associé à une production
});

// // Définir les associations belongsTo vers Article et Machine
// Production.belongsTo(Article, { foreignKey: 'article_id', as: 'article' });
// Production.belongsTo(Machine, { foreignKey: 'machine_id', as: 'machine' });

// // Optionnel : Définir les associations inverse si nécessaire
// Article.hasMany(Production, { foreignKey: 'article_id', as: 'productions' });
// Machine.hasMany(Production, { foreignKey: 'machine_id', as: 'productions' });

export { Article, Machine, Production, Role, Timer, User };
