// src/lib/auditLogger.ts
import { supabase } from '../supabase';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export const logAuditActivity = async (
  action: AuditAction,
  module: string,
  details: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      timestamp: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email ?? 'Unknown',
      action,
      module,
      details,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
