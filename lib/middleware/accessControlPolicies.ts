import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access';

const statement = {
    ...defaultStatements,
    post: ['create', 'update', 'delete'],
    report: ['view', 'resolve', 'delete'],
} as const;

export const ac = createAccessControl(statement);

export const user = ac.newRole({
    post: ['create', 'update', 'delete'],
});

export const moderator = ac.newRole({
    post: ['create', 'update', 'delete'],
    report: ['view', 'resolve', 'delete'],
});

export const admin = ac.newRole({
    post: ['create', 'update', 'delete'],
    report: ['view', 'resolve', 'delete'],
    ...adminAc.statements,
});