import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const { createClient } = await import('npm:@supabase/supabase-js@2.39.8');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')?.trim();
        const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

        const authHeader = req.headers.get('Authorization');
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;

        if (!token) {
            return Response.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
        }

        const supabaseAuth = createClient(SUPABASE_URL, SERVICE_KEY);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

        if (authError || !user) {
            return Response.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        const base44 = createClientFromRequest(req);
        const body = await req.json();

        function toUUID(id) {
            if (!id) return id;
            if (id.includes('-')) return id;
            const hex = id.replace(/[^a-fA-F0-9]/g, '');
            if (hex.length === 24) {
                const p = hex.padEnd(32, '0');
                return `${p.slice(0,8)}-${p.slice(8,12)}-${p.slice(12,16)}-${p.slice(16,20)}-${p.slice(20)}`;
            }
            return id;
        }
        
        const userId = toUUID(user.id);

        // Backend validation: check if user has already used free support
        const [profiles, sessions] = await Promise.all([
            base44.asServiceRole.entities.CustomerProfile.filter({ user_id: userId }),
            base44.asServiceRole.entities.SupportSession.filter({ customer_id: userId })
        ]);
        
        const profile = profiles[0];

        if ((profile && profile.free_support_used) || sessions.length > 0) {
            return Response.json({ 
                error: 'You have already used your complimentary Talk Freely session. Please use Find Support to connect with a therapist.'
            }, { status: 403 });
        }

        const customerName = user.user_metadata?.full_name || user.email || "Customer";

        // Create the session
        const session = await base44.asServiceRole.entities.SupportSession.create({
            customer_id: userId,
            customer_name: customerName,
            assigned_admin_id: "super_admin",
            session_type: body.session_type || "General",
            status: "pending",
        });

        // Mark the free session as used immediately
        if (profile) {
            await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
                free_support_used: true,
                free_support_session_id: session.id
            });
        } else {
            await base44.asServiceRole.entities.CustomerProfile.create({
                user_id: userId,
                full_name: customerName,
                free_support_used: true,
                free_support_session_id: session.id
            });
        }

        return Response.json({ session });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});