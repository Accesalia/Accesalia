// lib/pdf/firmarPdf.ts
//
// FIRMA DIGITAL DE UN PDF (Monica, 15-oct-2026). Lo puro: leer un certificado
// (.p12 / .pfx con su contraseña) y firmar un PDF con el, como haria Adobe con
// el mismo certificado. De donde sale el certificado y que se firma, en
// lib/firmaDigital.ts.
//
// La firma es la criptografica (la que Adobe valida en el panel de firmas) y,
// ademas, un SELLO VISIBLE al pie de la ultima pagina: "Firmado digitalmente por
// ... · NIF ... · fecha", para que quien lo lea en papel sepa que va firmado.

import forge from "node-forge";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { P12Signer } from "@signpdf/signer-p12";
import signpdf from "@signpdf/signpdf";

export type DatosCertificado = {
  /** El nombre del certificado (CN): "ACCESALIA SL", "DANIEL DE SOTO ...". */
  titular: string;
  /** El NIF que lleva dentro: el de la empresa en los de representante, el personal en los de autonomo. */
  nif: string | null;
  /** La empresa (O), si el certificado es de representante. */
  organizacion: string | null;
  /** Quien lo emite: "AC Representación", "AC FNMT Usuarios"... */
  emisor: string;
  validoDesde: Date;
  validoHasta: Date;
  /** Huella SHA-1 del certificado, en hexadecimal: lo identifica sin guardarlo a la vista. */
  huella: string;
};

const campo = (attrs: forge.pki.CertificateField[], ...nombres: string[]) =>
  attrs.find((a) => nombres.includes(a.shortName ?? "") || nombres.includes(a.name ?? "") || nombres.includes(a.type ?? ""))?.value as string | undefined;

// En los certificados españoles el NIF va en serialNumber (2.5.4.5), a veces
// con prefijo "IDCES-"; el de la empresa, en organizationIdentifier (2.5.4.97)
// como "VATES-B12345678".
const limpiaNif = (x: string | undefined) => (x ? x.replace(/^(IDC|VAT|NTR)[A-Z]{2}-/, "").trim() || null : null);

/** Abre el .p12 con su contraseña y devuelve de quien es. Si la contraseña no
 *  vale o el fichero no es un certificado, lanza un error con texto para la pantalla. */
export function leerCertificado(p12: Uint8Array, clave: string): DatosCertificado {
  let cert: forge.pki.Certificate | undefined;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.binary.raw.encode(p12));
    const p = forge.pkcs12.pkcs12FromAsn1(asn1, false, clave);
    const conClave = p.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
    if (!conClave.length) throw new Error("sin clave");
    // El certificado del firmante es el que casa con la clave privada (el .p12
    // puede traer tambien los de la autoridad).
    const certs = (p.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? []).map((b) => b.cert).filter((c): c is forge.pki.Certificate => !!c);
    const priv = conClave[0].key as forge.pki.rsa.PrivateKey | undefined;
    cert = certs.find((c) => priv && (c.publicKey as forge.pki.rsa.PublicKey).n?.equals(priv.n)) ?? certs[0];
  } catch {
    throw new Error("No se puede abrir el certificado: la contraseña no es la suya o el fichero no es un .p12 / .pfx.");
  }
  if (!cert) throw new Error("El fichero no trae ningún certificado.");
  const s = cert.subject.attributes;
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  return {
    titular: campo(s, "CN", "commonName") ?? "(sin nombre)",
    nif: limpiaNif(campo(s, "2.5.4.97")) ?? limpiaNif(campo(s, "serialNumber", "2.5.4.5")),
    organizacion: campo(s, "O", "organizationName") ?? null,
    emisor: campo(cert.issuer.attributes, "CN", "commonName") ?? campo(cert.issuer.attributes, "O") ?? "—",
    validoDesde: cert.validity.notBefore,
    validoHasta: cert.validity.notAfter,
    huella: forge.md.sha1.create().update(der).digest().toHex(),
  };
}

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/** Firma el PDF con el certificado. `firmante` es el nombre que sale en el
 *  sello ("Accesalia"); `nif`, el suyo. Devuelve el PDF firmado. */
export async function firmarPdf(
  pdf: Uint8Array,
  p12: Uint8Array,
  clave: string,
  o: { firmante: string; nif: string | null; motivo: string; cuando?: Date },
): Promise<Uint8Array> {
  const cuando = o.cuando ?? new Date();
  const doc = await PDFDocument.load(pdf);
  const paginas = doc.getPages();
  const ultima = paginas[paginas.length - 1];

  // El sello, al pie de la ultima pagina, pequeño y en gris.
  const letra = await doc.embedFont(StandardFonts.Helvetica);
  const texto = `Firmado digitalmente por ${o.firmante}${o.nif ? ` · NIF ${o.nif}` : ""} · ${FECHA.format(cuando)}`;
  ultima.drawText(texto, { x: 36, y: 14, size: 7, font: letra, color: rgb(0.35, 0.35, 0.35) });

  pdflibAddPlaceholder({
    pdfDoc: doc,
    pdfPage: ultima,
    reason: o.motivo,
    contactInfo: "",
    name: o.firmante,
    location: "Madrid",
    signingTime: cuando,
    // Firma invisible: el sello de arriba hace de parte visible.
    widgetRect: [0, 0, 0, 0],
    appName: "Accesalia",
    signatureLength: 16384,
  });
  const conHueco = await doc.save({ useObjectStreams: false });
  const firmado = await signpdf.sign(Buffer.from(conHueco), new P12Signer(Buffer.from(p12), { passphrase: clave }), cuando);
  return new Uint8Array(firmado);
}
