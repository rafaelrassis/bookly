/** Handle sempre com @ (ex.: "@ana.estante"). */
export const withAt = (u: string) => (u.startsWith("@") ? u : `@${u}`);
/** Handle sem @, para rotas /u/<slug> e comparações. */
export const withoutAt = (u: string) => u.replace(/^@/, "");
