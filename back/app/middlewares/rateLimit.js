import rateLimit from "express-rate-limit";

export const signupLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 min
	max: 5, // 5 inscriptions / min
	message: "Trop d'inscriptions, réessaie plus tard.",
	standardHeaders: true,
	legacyHeaders: false,
});

const loginAttempts = new Map();

// brute force middleware
export const bruteForceProtection = (req, res, next) => {
	const ip = req.ip;
	const now = Date.now();

	const data = loginAttempts.get(ip);

	if (data?.blockedUntil && now < data.blockedUntil) {
		return res.status(429).json({
			message: "Trop de tentatives, réessaie plus tard.",
		});
	}

	if (data?.blockedUntil && now > data.blockedUntil) {
		loginAttempts.delete(ip);
	}

	next();
};

// fonction à appeler dans controller
export const registerFailedAttempt = (ip) => {
	const now = Date.now();
	const data = loginAttempts.get(ip) || { count: 0 };

	data.count += 1;

	if (data.count >= 5) {
		data.blockedUntil = now + 15 * 60 * 1000;
	}

	loginAttempts.set(ip, data);
};

export const resetAttempts = (ip) => {
	loginAttempts.delete(ip);
};
