#!/usr/bin/env node
// Cria (ou promove) um administrador do painel.
// Uso: npm run admin:create -- email@exemplo.com "senha-forte"
// Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const [email, password] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !password) {
  console.error('Uso: npm run admin:create -- email@exemplo.com "senha-forte"');
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env.local");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Use uma senha com pelo menos 10 caracteres.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser(target) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (found || data.users.length < 200) return found ?? null;
  }
  return null;
}

let user = await findUser(email);
if (user) {
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) throw error;
  console.log(`Usuário ${email} já existia: senha atualizada.`);
} else {
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  user = data.user;
  console.log(`Usuário ${email} criado.`);
}
const { error } = await supabase.from("admins").upsert({ user_id: user.id, display_name: email });
if (error) throw error;
console.log("Pronto! Esse usuário agora é administrador. Entre em /admin.");
