import { z } from 'zod';

const schemas = {
  buildSignupBodySchema: () => {
    return z.object({
      firstname: z.string().min(1),
      email: z.string().min(1).email(),
      password: z.string().min(12)
    });
  },

  buildLoginBodySchema: () => {
    return z.object({
      email: z.string().email(),
      password: z.string()
    });
  },

  buildRefreshTokenSchema: () => {
    return z.string().min(1);
  }, 
  // Mot de passe oublié
buildResetPasswordSchema: () => {
  return z.object({
    email: z.string().email(),
    newPassword: z.string().min(12)
  });
}

};

export default schemas;
