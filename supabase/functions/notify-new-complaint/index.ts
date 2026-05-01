// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

console.info("notify-new-complaint function started");

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();
    const record = body?.record;

    if (!record) {
      return new Response("No record found", { status: 400 });
    }

    // =========================
    // 📦 Extract fields
    // =========================
    const {
      ticket_number,
      reporter_name,
      reporter_phone,
      description,
      category,
      location,
      status,
      priority,
      lat,
      lng
    } = record;

    // =========================
    // ⚠️ FILTER STATUS (WAJIB SESUAI ENUM)
    // =========================
    const STATUS_PENDING = "Belum dikerjakan";

    if (status !== STATUS_PENDING) {
      return new Response(
        JSON.stringify({ message: "Ignored (not pending)" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // =========================
    // 🔐 ENV
    // =========================
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAILS = Deno.env.get("ADMIN_EMAILS");
    const ADMIN_PHONES = Deno.env.get("ADMIN_PHONES");
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY || !ADMIN_EMAILS || !FROM_EMAIL) {
      throw new Error("Missing email ENV");
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ADMIN_PHONES) {
      throw new Error("Missing supabase ENV");
    }

    const emailList = ADMIN_EMAILS.split(",");
    const phoneList = ADMIN_PHONES.split(",");

    // =========================
    // 🧠 SAFE DATA
    // =========================
    const safeDescription = description ?? "-";
    const safeLocation = location ?? "-";
    const safeCategory = category ?? "-";
    const safePriority = priority ?? "Normal";
    const safePhone = reporter_phone ?? "-";

    const mapsUrl =
      lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;

    // =========================
    // 📧 SEND EMAIL
    // =========================
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: emailList,
        subject: `🚨 [${safePriority}] Aduan: ${ticket_number}`,
        html: `
          <h2>Aduan Baru Masuk</h2>
          <p><strong>Ticket:</strong> ${ticket_number}</p>
          <p><strong>Pelapor:</strong> ${reporter_name}</p>
          <p><strong>No HP:</strong> ${safePhone}</p>
          <p><strong>Kategori:</strong> ${safeCategory}</p>
          <p><strong>Status:</strong> ${status}</p>
          <p><strong>Lokasi:</strong> ${safeLocation}</p>
          ${
            mapsUrl
              ? `<p><a href="${mapsUrl}">📍 Lihat di Maps</a></p>`
              : ""
          }
          <p><strong>Deskripsi:</strong></p>
          <p>${safeDescription}</p>
          <hr/>
          <small>Sistem Notifikasi Otomatis</small>
        `
      })
    });

    // =========================
    // 🔔 INSERT NOTIFICATIONS
    // =========================
    for (const phone of phoneList) {
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "Aduan Baru",
          description: `Aduan ${ticket_number} (${safeCategory})`,
          time: new Date().toISOString(),
          type: "complaint",
          read: false,
          user_phone: phone.trim()
        })
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("ERROR:", err);

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});