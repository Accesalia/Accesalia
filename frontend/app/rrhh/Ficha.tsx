import Link from "next/link";
import type { ReactNode } from "react";
import {
  ausenciasDe,
  contratosVigentes,
  datosPersonales,
  horarioVigente,
  nombreCompleto,
  salariosVigentes,
  saldos,
  vigenteEn,
  type Persona,
} from "../../lib/rrhh";
import { documentosDe, PERSONALES, TIPO_DOC } from "../../lib/rrhhDocumentos";
import { bajaEmpleado, deshacerBaja, guardarFicha, registrarAusencia } from "./acciones";
import { ListaDocumentos, mesAnterior } from "./Documentos";
import { ChipEstado, ChipTipo, diasTxt, EUR, fechaLarga, tramo } from "./Piezas";
import { SubirDocumento } from "./SubirDocumento";

// La ficha del empleado. La ven RRHH y direccion, con la cuenta y el neto para
// las transferencias (las hace RRHH). El bruto anual, solo direccion (Monica,
// 11-sep-2026: para costes y KPIs).

const campo =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-lima focus:ring-2 focus:ring-lima/30";
const boton = "rounded-full bg-lima px-4 py-2 text-sm font-semibold text-carbon transition hover:bg-lima-dark hover:text-white";

function Bloque({ titulo, children, editar }: { titulo: string; children: ReactNode; editar?: ReactNode }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-carbon/45">{titulo}</h4>
      {children}
      {editar && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-sm font-semibold text-lima-dark hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Editar</span>
            <span className="hidden group-open:inline">Cerrar</span>
          </summary>
          <div className="mt-2 rounded-xl bg-hueso p-3">{editar}</div>
        </details>
      )}
    </div>
  );
}

function Pares({ filas }: { filas: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {filas.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-carbon/45">{k}</dt>
          <dd className="min-w-0 break-words tabular-nums">{v ?? <span className="text-carbon/35">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

const Falta = ({ texto = "falta" }: { texto?: string }) => (
  <span className="rounded-md bg-[#f6e9e8] px-1.5 py-0.5 text-xs font-semibold text-alerta">{texto}</span>
);

function Form({ persona, parte, children }: { persona: string; parte: string; children: ReactNode }) {
  return (
    <form action={guardarFicha} className="grid gap-2">
      <input type="hidden" name="persona" value={persona} />
      <input type="hidden" name="parte" value={parte} />
      {children}
      <div>
        <button type="submit" className={boton}>Guardar</button>
      </div>
    </form>
  );
}

const Campo = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="grid gap-1 text-xs font-semibold text-carbon/55">
    {label}
    {children}
  </label>
);

export async function Ficha({ persona, hoy, direccion, volverA }: { persona: Persona; hoy: string; direccion: boolean; volverA: string }) {
  const anio = Number(hoy.slice(0, 4));
  const id = persona.id;
  const [datosM, contratoM, horario, saldoM, salarioM, aus, docs] = await Promise.all([
    datosPersonales([id]),
    contratosVigentes([id], hoy),
    horarioVigente(id, hoy),
    saldos(anio, [id]),
    direccion ? salariosVigentes([id], hoy) : Promise.resolve(new Map()),
    ausenciasDe(id),
    documentosDe(id),
  ]);
  const datos = datosM.get(id) ?? null;
  const contrato = contratoM.get(id) ?? null;
  const saldo = saldoM.get(id)!;
  const salario = salarioM.get(id) ?? null;
  const vigentes = persona.funciones.filter((f) => vigenteEn(f, hoy));
  const pasadas = persona.funciones.filter((f) => f.hasta && f.hasta < hoy);
  const futuras = persona.funciones.filter((f) => f.desde && f.desde > hoy);

  return (
    <div id="ficha" className="mt-4 scroll-mt-24 rounded-2xl border border-lima/40 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-black/5 pb-4">
        <div>
          <h3 className="text-2xl font-bold text-carbon">{nombreCompleto(persona)}</h3>
          <p className="text-sm text-carbon/50">
            {persona.email ?? "Sin correo: no entra en la app"}
            {!persona.activo && " · ya no trabaja en Accesalia"}
          </p>
        </div>
        <Link href={volverA} className="text-sm font-semibold text-carbon/50 hover:text-carbon">
          Cerrar la ficha ✕
        </Link>
      </div>

      {persona.fechaBaja && (
        <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${persona.activo ? "bg-amber-50 text-amber-900" : "bg-hueso text-carbon/70"}`}>
          <span>
            {persona.activo ? "Se va. Su último día es el " : "Se fue. Su último día fue el "}
            <b>{fechaLarga(persona.fechaBaja)}</b>
            {persona.motivoBaja && <> · {persona.motivoBaja}</>}
            {persona.activo && ". Al día siguiente dejará de poder entrar en la app."}
          </span>
          <form action={deshacerBaja}>
            <input type="hidden" name="persona" value={id} />
            <button type="submit" className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs font-semibold text-carbon/70 hover:border-lima hover:text-carbon">
              Deshacer la baja
            </button>
          </form>
        </div>
      )}

      <div className="mt-5 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        <Bloque
          titulo="Datos personales"
          editar={
            <Form persona={id} parte="datos">
              <Campo label="DNI o NIE"><input name="dni" defaultValue={datos?.dni ?? ""} className={campo} /></Campo>
              <Campo label="Dirección (para comunicaciones)"><input name="direccion" defaultValue={datos?.direccion ?? ""} className={campo} /></Campo>
              <Campo label="Cuenta para la nómina (IBAN)"><input name="iban" defaultValue={datos?.iban ?? ""} placeholder="ES00 0000 0000 0000 0000 0000" className={campo} /></Campo>
              <Campo label="Neto de un mes normal (€)"><input name="neto" inputMode="decimal" defaultValue={datos?.netoMensual ?? ""} className={campo} /></Campo>
              <Campo label="Notas"><input name="notas" defaultValue={datos?.notas ?? ""} className={campo} /></Campo>
            </Form>
          }
        >
          <Pares
            filas={[
              ["DNI", datos?.dni ?? <Falta />],
              ["Dirección", datos?.direccion ?? <Falta />],
              ["Cuenta", datos?.iban ? datos.iban.replace(/(.{4})/g, "$1 ").trim() : <Falta texto="falta: sin ella no se le puede pagar" />],
              ["Neto al mes", datos?.netoMensual != null ? EUR.format(datos.netoMensual) : <Falta />],
              ...(datos?.notas ? ([["Notas", datos.notas]] as [string, ReactNode][]) : []),
            ]}
          />
        </Bloque>

        <Bloque
          titulo="Contrato"
          editar={
            <Form persona={id} parte="contrato">
              <input type="hidden" name="id" value={contrato?.id ?? ""} />
              <Campo label="Tipo"><input name="tipo" defaultValue={contrato?.tipo ?? ""} placeholder="Indefinido, temporal, prácticas…" className={campo} /></Campo>
              <Campo label="Categoría del convenio"><input name="categoria" defaultValue={contrato?.categoria ?? ""} className={campo} /></Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Horas a la semana"><input name="horas" inputMode="decimal" defaultValue={contrato?.horasSemana ?? ""} className={campo} /></Campo>
                <Campo label="Desde"><input type="date" name="desde" required defaultValue={contrato?.desde ?? ""} className={campo} /></Campo>
              </div>
            </Form>
          }
        >
          {contrato ? (
            <Pares
              filas={[
                ["Tipo", contrato.tipo],
                ["Categoría", contrato.categoria],
                ["Horas", contrato.horasSemana != null ? `${contrato.horasSemana} h/semana` : null],
                ["Desde", fechaLarga(contrato.desde)],
              ]}
            />
          ) : (
            <p className="text-sm"><Falta texto="sin contrato en la app" /></p>
          )}
        </Bloque>

        <Bloque
          titulo="Horario"
          editar={
            <Form persona={id} parte="horario">
              <input type="hidden" name="id" value={horario?.id ?? ""} />
              <Campo label="Tipo de jornada"><input name="tipo_jornada" defaultValue={horario?.tipoJornada ?? ""} placeholder="Completa, reducida, intensiva…" className={campo} /></Campo>
              <div className="grid grid-cols-2 gap-2">
                {(["lunes", "martes", "miercoles", "jueves", "viernes"] as const).map((d) => (
                  <Campo key={d} label={d === "miercoles" ? "Miércoles" : d[0].toUpperCase() + d.slice(1)}>
                    <input name={d} defaultValue={horario?.[d] ?? ""} placeholder="9:00 - 18:00" className={campo} />
                  </Campo>
                ))}
                <Campo label="Comida"><input name="comida" defaultValue={horario?.tiempoComida ?? ""} placeholder="1 h" className={campo} /></Campo>
                <Campo label="Horas a la semana"><input name="horas" inputMode="decimal" defaultValue={horario?.horasSemana ?? ""} className={campo} /></Campo>
                <Campo label="Desde"><input type="date" name="desde" required defaultValue={horario?.desde ?? hoy} className={campo} /></Campo>
              </div>
            </Form>
          }
        >
          {horario ? (
            <Pares
              filas={[
                ["Jornada", horario.tipoJornada],
                ["L – J", [horario.lunes, horario.martes, horario.miercoles, horario.jueves].every((x) => x === horario.lunes) ? horario.lunes : "varía, ver editar"],
                ["Viernes", horario.viernes],
                ["Comida", horario.tiempoComida],
                ["Semana", horario.horasSemana != null ? `${horario.horasSemana} h` : null],
              ]}
            />
          ) : (
            <p className="text-sm"><Falta texto="sin horario en la app" /></p>
          )}
        </Bloque>

        <Bloque
          titulo={`Vacaciones ${anio}`}
          editar={
            <Form persona={id} parte="saldo">
              <input type="hidden" name="anio" value={anio} />
              <div className="grid grid-cols-2 gap-2">
                <Campo label={`Días de ${anio}`}><input name="derecho" inputMode="decimal" required defaultValue={saldo.cargado ? saldo.derecho : 22} className={campo} /></Campo>
                <Campo label={`Que trae de ${anio - 1}`}><input name="arrastrados" inputMode="decimal" defaultValue={saldo.cargado ? saldo.arrastrados : 0} className={campo} /></Campo>
              </div>
              <p className="text-xs text-carbon/50">22 según convenio; menos si entró a mitad de año.</p>
            </Form>
          }
        >
          {saldo.cargado ? (
            <Pares
              filas={[
                ["Le tocan", `${saldo.derecho}${saldo.arrastrados ? ` + ${saldo.arrastrados} de ${anio - 1}` : ""}`],
                ["Aprobados", diasTxt(saldo.disfrutados + saldo.cierres)],
                ["Pedidos", diasTxt(saldo.pedidos)],
                ["Le quedan", <b key="q">{diasTxt(saldo.quedan)}</b>],
              ]}
            />
          ) : (
            <p className="text-sm"><Falta texto={`sin días de ${anio} cargados`} /></p>
          )}
        </Bloque>

        <Bloque titulo="Funciones">
          {vigentes.length === 0 && pasadas.length === 0 && futuras.length === 0 ? (
            <p className="text-sm text-carbon/45">Ninguna.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {vigentes.map((f, i) => (
                <li key={`v${i}`}>
                  {f.nombre}
                  {f.hasta && <span className="text-carbon/50"> · hasta el {fechaLarga(f.hasta)} (cubre a alguien)</span>}
                  {!f.hasta && f.desde && <span className="text-carbon/45"> · desde {fechaLarga(f.desde)}</span>}
                </li>
              ))}
              {futuras.map((f, i) => (
                <li key={`f${i}`} className="text-ajeno">
                  {f.nombre} · del {tramo(f.desde!, f.hasta ?? f.desde!)}
                </li>
              ))}
              {pasadas.map((f, i) => (
                <li key={`p${i}`} className="text-carbon/40">
                  <s>{f.nombre}</s> · hasta el {fechaLarga(f.hasta!)}
                </li>
              ))}
            </ul>
          )}
        </Bloque>

        {direccion && (
          <Bloque
            titulo="Salario · solo dirección"
            editar={
              <Form persona={id} parte="salario">
                <div className="grid grid-cols-2 gap-2">
                  <Campo label="Bruto anual (€)"><input name="bruto" inputMode="decimal" required defaultValue={salario?.brutoAnual ?? ""} className={campo} /></Campo>
                  <Campo label="Desde"><input type="date" name="desde" required defaultValue={salario?.desde ?? hoy} className={campo} /></Campo>
                </div>
                <p className="text-xs text-carbon/50">Si cambias la fecha, se guarda como sueldo nuevo y el anterior queda en la historia.</p>
              </Form>
            }
          >
            {salario ? (
              <Pares
                filas={[
                  ["Bruto anual", <b key="b">{EUR.format(salario.brutoAnual)}</b>],
                  ["Desde", fechaLarga(salario.desde)],
                ]}
              />
            ) : (
              <p className="text-sm"><Falta texto="sin salario en la app" /></p>
            )}
          </Bloque>
        )}
      </div>

      <div className="mt-7 grid gap-7 border-t border-black/5 pt-5 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-carbon/45">Ausencias</h4>
          {aus.length === 0 ? (
            <p className="text-sm text-carbon/45">Ninguna en la app todavía.</p>
          ) : (
            <ul className="divide-y divide-black/5 text-sm">
              {aus.slice(0, 10).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="font-semibold">{tramo(a.desde, a.hasta)}</b>
                    <span className="text-carbon/50">· {diasTxt(a.dias)}</span>
                    <ChipTipo tipo={a.tipo} />
                  </span>
                  <ChipEstado a={a} hoy={hoy} />
                </li>
              ))}
            </ul>
          )}
          <details className="group mt-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-lima-dark hover:underline [&::-webkit-details-marker]:hidden">
              + Apuntar una baja, un permiso o unas vacaciones
            </summary>
            <form action={registrarAusencia} className="mt-2 grid gap-2 rounded-xl bg-hueso p-3">
              <input type="hidden" name="persona" value={id} />
              <Campo label="Qué es">
                <select name="tipo" className={campo} defaultValue="baja_medica">
                  <option value="baja_medica">Baja</option>
                  <option value="permiso_retribuido">Permiso retribuido</option>
                  <option value="ausencia_justificada">Ausencia justificada</option>
                  <option value="vacaciones">Vacaciones</option>
                  <option value="otra">Otra</option>
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Desde"><input type="date" name="desde" required className={campo} /></Campo>
                <Campo label="Hasta"><input type="date" name="hasta" required className={campo} /></Campo>
              </div>
              <Campo label="Notas (solo las ven RRHH y dirección)"><input name="notas" className={campo} /></Campo>
              <p className="text-xs text-carbon/50">Entra ya aprobada. Quien asigna trabajo verá que no está, pero no el motivo.</p>
              <div><button type="submit" className={boton}>Apuntar</button></div>
            </form>
          </details>
        </div>
        <div>
          <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-carbon/45">Documentos y nóminas</h4>
          <ListaDocumentos
            docs={docs}
            puedeBorrar
            volver={`${volverA}${volverA.includes("?") ? "&" : "?"}p=${id}#ficha`}
            vacio="Todavía no hay documentos suyos en la app."
          />
          <div className="mt-3">
            <SubirDocumento
              personaId={id}
              tipos={PERSONALES.map((t) => ({ valor: t, etiqueta: TIPO_DOC[t] }))}
              mesPorDefecto={mesAnterior(hoy)}
            />
          </div>
        </div>
      </div>

      {persona.activo && !persona.fechaBaja && (
        <details className="group mt-6 border-t border-black/5 pt-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-carbon/55 hover:text-alerta [&::-webkit-details-marker]:hidden">
            Dar de baja…
          </summary>
          <form action={bajaEmpleado} className="mt-3 grid max-w-xl gap-2 rounded-xl bg-hueso p-4">
            <input type="hidden" name="persona" value={id} />
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Último día que trabaja"><input type="date" name="ultimo" required defaultValue={hoy} className={campo} /></Campo>
              <Campo label="Motivo">
                <select name="motivo" required defaultValue="" className={campo}>
                  <option value="" disabled>Elige…</option>
                  <option>Baja voluntaria</option>
                  <option>Despido</option>
                  <option>Fin de contrato</option>
                  <option>No supera el periodo de prueba</option>
                  <option>Jubilación</option>
                  <option>Otro</option>
                </select>
              </Campo>
            </div>
            <Campo label="Detalle (opcional; solo lo ven RRHH y dirección)"><input name="detalle" className={campo} /></Campo>
            <p className="text-xs text-carbon/55">
              Se cierran con esa fecha sus funciones, su contrato, su horario y su sueldo, y se retira lo que tenga pedido para
              después. Al día siguiente deja de poder entrar en la app y pasa a ex-empleados. Su ficha y su historia se conservan.
            </p>
            <div>
              <button type="submit" className="rounded-full border border-alerta/40 bg-white px-4 py-2 text-sm font-semibold text-alerta transition hover:bg-alerta hover:text-white">
                Dar de baja
              </button>
            </div>
          </form>
        </details>
      )}
    </div>
  );
}
