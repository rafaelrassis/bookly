export async function sendMail(to: string, subject: string, body: string) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[mail:dev] → ${to} | ${subject}\n${body}`);
    return;
  }
  // TODO Spec futura: integrar SendGrid
}
