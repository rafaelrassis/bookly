/// Login/cadastro por e-mail e senha foi substituído por OAuth (Google/Amazon),
/// mas o código fica guardado atrás desta flag — "true" reativa o fluxo
/// completo (Credentials provider, /signup, /forgot-password, troca de senha).
/// Pública (NEXT_PUBLIC_*) de propósito: não é segredo, e o login/página
/// inicial (client components) precisam do valor pra decidir o que renderizar.
export const emailLoginEnabled = process.env.NEXT_PUBLIC_EMAIL_LOGIN_ENABLED === "true";
