when adding a plugin

this generates the new schema

```bash
bun x auth@latest generate --config lib/auth.ts --output prisma/admin-panel.prisma
```

then copy it into `schema.prisma`

run
```
bunx prisma migrate dev --name add-admin-plugin
```

and regenerate the client with
```
bunx prisma generate
```