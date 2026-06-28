// ════════════════════════════════════════════════════════════════
//  Operaciones de ADMIN — usa la service_role key (solo en servidor).
//  Verifica SIEMPRE que quien llama sea un admin antes de actuar.
//
//  Variables de entorno necesarias en Netlify:
//    SUPABASE_URL              (igual que el Project URL)
//    SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role)
// ════════════════════════════════════════════════════════════════

const URL = process.env.SUPABASE_URL;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

// Cabeceras para llamar a Supabase con permisos de servidor
function srvHeaders() {
  return { apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json" };
}

// Verifica el token del usuario y devuelve su id si es válido
async function getCallerId(token) {
  const r = await fetch(`${URL}/auth/v1/user`, {
    headers: { apikey: SRV, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u.id || null;
}

// ¿Ese usuario es admin?
async function isAdmin(userId) {
  const r = await fetch(`${URL}/rest/v1/profiles?id=eq.${userId}&select=role`, { headers: srvHeaders() });
  if (!r.ok) return false;
  const rows = await r.json();
  return rows[0]?.role === "admin";
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });
  if (!URL || !SRV) return json(503, { error: "NO_SUPABASE_CONFIG" });

  // 1) Autenticar a quien llama
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "No autorizado" });

  const callerId = await getCallerId(token);
  if (!callerId) return json(401, { error: "Sesión inválida" });
  if (!(await isAdmin(callerId))) return json(403, { error: "Solo administradores" });

  // 2) Ejecutar la acción pedida
  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Cuerpo inválido" }); }
  const { action } = payload;

  try {
    // ── Listar todos los estudiantes con su progreso ──
    if (action === "list") {
      const [pr, st] = await Promise.all([
        fetch(`${URL}/rest/v1/profiles?select=id,email,display_name,role,created_at&order=created_at.asc`, { headers: srvHeaders() }),
        fetch(`${URL}/rest/v1/student_state?select=user_id,data,updated_at`, { headers: srvHeaders() }),
      ]);
      const profiles = await pr.json();
      const states = await st.json();
      const byId = {};
      states.forEach(s => { byId[s.user_id] = s; });

      const students = profiles.map(p => {
        const s = byId[p.id];
        const prof = s?.data?.prof || {};
        const msgs = s?.data?.msgs || [];
        return {
          id: p.id,
          email: p.email,
          name: prof.name || p.display_name || "",
          role: p.role,
          level: prof.level || "Por determinar",
          lessons: prof.lessons || 0,
          phase: prof.phase || "onboarding",
          messages: msgs.filter(m => m.role === "user").length,
          created_at: p.created_at,
          last_active: s?.updated_at || null,
        };
      });
      return json(200, { students });
    }

    // ── Crear un estudiante ──
    if (action === "create") {
      const { email, password, name } = payload;
      if (!email || !password) return json(400, { error: "Faltan correo o contraseña" });
      if (password.length < 6) return json(400, { error: "La contraseña debe tener al menos 6 caracteres" });

      const r = await fetch(`${URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: srvHeaders(),
        body: JSON.stringify({
          email, password, email_confirm: true,
          user_metadata: { display_name: name || "" },
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        const m = d.msg || d.message || d.error_description || "No se pudo crear";
        return json(r.status, { error: m.includes("already") ? "Ese correo ya tiene cuenta" : m });
      }
      return json(200, { ok: true, id: d.id, email: d.email });
    }

    // ── Eliminar un estudiante ──
    if (action === "delete") {
      const { id } = payload;
      if (!id) return json(400, { error: "Falta el id" });
      if (id === callerId) return json(400, { error: "No puedes eliminarte a ti mismo" });
      const r = await fetch(`${URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: srvHeaders() });
      if (!r.ok) return json(r.status, { error: "No se pudo eliminar" });
      return json(200, { ok: true });
    }

    return json(400, { error: "Acción desconocida" });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
