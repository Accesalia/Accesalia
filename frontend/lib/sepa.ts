// lib/sepa.ts
//
// Fichero de transferencias SEPA (ISO 20022, pain.001.001.03, la "norma 34
// XML" de la banca española) para pagar las nominas en bloque desde
// CaixaBankNow (Monica, 11-sep-2026). Una transferencia por persona, marcada
// como nomina (codigo SALA), con un solo cargo en la cuenta de Accesalia.
//
// Antes de meter una cuenta en el fichero se comprueba su digito de control:
// una cuenta mal escrita se queda fuera y se avisa, en vez de rebotar.

/** IBAN sin espacios y en mayusculas. */
export const ibanLimpio = (iban: string) => iban.replace(/\s+/g, "").toUpperCase();

/** ¿Es un IBAN valido? Comprueba el formato y el digito de control (modulo 97). */
export function ibanValido(iban: string | null | undefined): boolean {
  if (!iban) return false;
  const s = ibanLimpio(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  if (s.startsWith("ES") && s.length !== 24) return false;
  const reordenado = s.slice(4) + s.slice(0, 4);
  let resto = 0;
  for (const c of reordenado) {
    const v = /[A-Z]/.test(c) ? String(c.charCodeAt(0) - 55) : c;
    for (const d of v) resto = (resto * 10 + Number(d)) % 97;
  }
  return resto === 1;
}

/**
 * Texto que admite SEPA: letras sin tilde, cifras y / - ? : ( ) . , ' + y
 * espacio. Ñ -> N, á -> a... y cortado al largo maximo del campo.
 */
export function textoSepa(t: string, max: number): string {
  const s = t
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9/\-?:().,'+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.slice(0, max);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const importe = (n: number) => n.toFixed(2);

export type Ordenante = { razonSocial: string; nif: string; sufijo: string; iban: string; bic: string | null };
export type Pago = { nombre: string; iban: string; importe: number; referencia: string };

export function ficheroSepa(o: {
  ordenante: Ordenante;
  pagos: Pago[];
  fechaEjecucion: string; // YYYY-MM-DD
  concepto: string; // "NOMINA AGOSTO 2026"
  idMensaje: string; // unico por fichero, max 35
}): string {
  const total = o.pagos.reduce((s, p) => s + Math.round(p.importe * 100), 0) / 100;
  const ahora = new Date().toISOString().slice(0, 19);
  const nombre = esc(textoSepa(o.ordenante.razonSocial, 70));
  const idOrdenante = esc(textoSepa(o.ordenante.nif + o.ordenante.sufijo, 35).replace(/\s/g, ""));
  const agente = o.ordenante.bic
    ? `<DbtrAgt><FinInstnId><BIC>${esc(o.ordenante.bic.toUpperCase())}</BIC></FinInstnId></DbtrAgt>`
    : `<DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>`;

  const transferencias = o.pagos
    .map(
      (p) => `
      <CdtTrfTxInf>
        <PmtId><EndToEndId>${esc(textoSepa(p.referencia, 35))}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${importe(p.importe)}</InstdAmt></Amt>
        <Cdtr><Nm>${esc(textoSepa(p.nombre, 70))}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${ibanLimpio(p.iban)}</IBAN></Id></CdtrAcct>
        <Purp><Cd>SALA</Cd></Purp>
        <RmtInf><Ustrd>${esc(textoSepa(o.concepto, 140))}</Ustrd></RmtInf>
      </CdtTrfTxInf>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${esc(textoSepa(o.idMensaje, 35))}</MsgId>
      <CreDtTm>${ahora}</CreDtTm>
      <NbOfTxs>${o.pagos.length}</NbOfTxs>
      <CtrlSum>${importe(total)}</CtrlSum>
      <InitgPty>
        <Nm>${nombre}</Nm>
        <Id><OrgId><Othr><Id>${idOrdenante}</Id></Othr></OrgId></Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${esc(textoSepa(o.idMensaje, 35))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${o.pagos.length}</NbOfTxs>
      <CtrlSum>${importe(total)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><CtgyPurp><Cd>SALA</Cd></CtgyPurp></PmtTpInf>
      <ReqdExctnDt>${o.fechaEjecucion}</ReqdExctnDt>
      <Dbtr><Nm>${nombre}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${ibanLimpio(o.ordenante.iban)}</IBAN></Id><Ccy>EUR</Ccy></DbtrAcct>
      ${agente}
      <ChrgBr>SLEV</ChrgBr>${transferencias}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
`;
}
