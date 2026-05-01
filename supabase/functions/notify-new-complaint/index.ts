import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header (optional for public complaint submissions)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Create Supabase client
    // If token provided, use it; otherwise use anon key (for public submissions)
    const clientHeaders = token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: {
          headers: clientHeaders,
        },
      }
    );

    // Parse request body
    const { complaintId, ticketNumber } = await req.json();

    if (!complaintId || !ticketNumber) {
      return new Response(
        JSON.stringify({
          error: "Missing complaintId or ticketNumber",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Query all users with target roles: super_admin, admin, pengawas, petugas
    // Using relationship to join with roles table
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, roles(name)")
      .not("role_id", "is", null);

    // Filter users by target roles
    const targetRoles = ["super_admin", "admin", "pengawas", "petugas"];
    const filteredUsers = users?.filter((user: any) => {
      const roleName = user.roles?.name;
      return roleName && targetRoles.includes(roleName);
    }) || [];

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch users",
          details: usersError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If no users found, return success (no notifications needed)
    if (!filteredUsers || filteredUsers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No users found for notification",
          count: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create notification records for all users
    const notifications = filteredUsers.map((user: any) => ({
      user_id: user.id,
      title: `Aduan Baru #${ticketNumber}`,
      desc: `Aduan baru telah masuk. Nomor tiket: ${ticketNumber}`,
      type: "warning",
      read: false,
      timestamp: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) {
      console.error("Error inserting notifications:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to create notifications",
          details: insertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${notifications.length} notifications`,
        count: notifications.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
