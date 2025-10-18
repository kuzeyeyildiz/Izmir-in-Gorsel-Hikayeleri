import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://vpverokfkjfyisyjhkse.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdmVyb2tma2pmeWlzeWpoa3NlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MDQxODcsImV4cCI6MjA2NzQ4MDE4N30.uKQzsyFBe8BHGWw6fqF7SHVClihXKO3OuaXgJlgQptc",
);
