import { Settings } from "lucide-react";
import { EmptyState } from "../ui/empty-state";

/** Exibido quando o banco ainda não foi configurado ou não há edição atual. */
export function SetupNotice({ reason }: { reason: "env" | "edition" }) {
  return (
    <main id="conteudo" className="container-page py-16">
      <EmptyState icon={Settings} title={reason === "env" ? "Site em configuração" : "Nenhuma edição ativa"}>
        {reason === "env"
          ? "O banco de dados ainda não foi conectado. Siga o guia em docs/GUIA.md para configurar o Supabase."
          : "Cadastre ou marque uma edição como atual no painel administrativo."}
      </EmptyState>
    </main>
  );
}
