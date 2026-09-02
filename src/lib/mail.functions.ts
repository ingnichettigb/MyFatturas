import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

/** Codifica RFC 2047 per intestazioni non ASCII (oggetto, nomi). */
const header = (v: string) =>
  /^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`;

/** Invia la lettera di trasmissione con il PDF allegato tramite il Gmail dello studio. */
export const inviaMailConPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        a: z.string().min(3),
        cc: z.string().optional(),
        oggetto: z.string().min(1),
        corpo: z.string(),
        nomeAllegato: z.string().min(1),
        pdfBase64: z.string().min(10),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const boundary = `ngb_${crypto.randomUUID().replace(/-/g, "")}`;
    const raw = [
      `To: ${data.a}`,
      ...(data.cc ? [`Cc: ${data.cc}`] : []),
      `Subject: ${header(data.oggetto)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(data.corpo, "utf8").toString("base64"),
      `--${boundary}`,
      `Content-Type: application/pdf; name="${data.nomeAllegato}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${data.nomeAllegato}"`,
      "",
      data.pdfBase64,
      `--${boundary}--`,
    ].join("\r\n");

    const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
        "X-Connection-Api-Key": process.env["GOOGLE_MAIL_API_KEY"]!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: Buffer.from(raw, "utf8").toString("base64url") }),
    });
    if (!res.ok) {
      const testo = await res.text();
      console.error(`Invio Gmail fallito [${res.status}]: ${testo}`);
      throw new Error(`Invio fallito [${res.status}]: ${testo}`);
    }
    return { ok: true };
  });
