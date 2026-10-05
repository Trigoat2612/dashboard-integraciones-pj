import { redirect } from "next/navigation";
import { authEnabled, isAuthenticated } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!authEnabled()) redirect("/");
  if (await isAuthenticated()) redirect("/");
  const params = await searchParams;

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="eyebrow"><span className="num">01</span> · Acceso privado</div>
        <h1 id="login-title">Observatorio de <em>integraciones</em></h1>
        <p className="lede">Ingresa la clave configurada para consultar y actualizar la base estadística.</p>
        <form method="post" action="/api/auth/login" className="login-form">
          <label htmlFor="password">Clave de acceso</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
          {params.error ? <p className="form-error">La clave no es válida.</p> : null}
          <button className="btn btn-primary" type="submit">Ingresar</button>
        </form>
      </section>
    </main>
  );
}
