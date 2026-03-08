import { supabase } from "@/lib";

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_user_account");
  if (error) throw error;
  await supabase.auth.signOut();
}
