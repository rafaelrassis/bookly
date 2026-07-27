/** Crawlers de preview de link (WhatsApp, Telegram, redes sociais). Usado
 * pra deixar passar sem sessão em rotas atrás do login — sem isso, o
 * middleware/guard de auth redireciona pra /login antes do crawler ler as
 * meta tags de Open Graph, e o compartilhamento nunca mostra o card certo. */
const CRAWLER_UA =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|Slackbot|LinkedInBot|Discordbot|SkypeUriPreview|Googlebot|Applebot|Pinterest|redditbot|vkShare|W3C_Validator|Iframely|Embedly|Bufferbot/i;

export function isSocialCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_UA.test(userAgent);
}
