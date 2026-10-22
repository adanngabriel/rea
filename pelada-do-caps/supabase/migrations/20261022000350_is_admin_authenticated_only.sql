-- is_admin() só é usado por usuários logados.
revoke execute on function public.is_admin() from anon;
