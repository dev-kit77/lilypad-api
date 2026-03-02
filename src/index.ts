import { Elysia } from 'elysia'
import { authController } from './controllers/auth.controller';
import { contentController } from './controllers/content.controller';
import { specialController } from './controllers/special.controller';
import { userController } from './controllers/user.controller';


const PORT = process.env.PORT || 3000;
export const app = new Elysia();

app
  .group('/api', (app: Elysia) =>
    app
      .use(authController)
      .use(contentController)
      .use(specialController)
      .use(userController)
  )
  .listen(PORT, () => {
    console.log(`🦊 Elysia is running at ${app.server?.hostname}:${PORT}`);
  });
