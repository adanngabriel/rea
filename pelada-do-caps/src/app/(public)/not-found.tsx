import { SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="container-page py-16">
      <EmptyState icon={SearchX} title="Página não encontrada" action={<Link href="/" className="btn-primary">Voltar ao início</Link>}>
        O endereço pode ter mudado ou o conteúdo ainda não foi publicado.
      </EmptyState>
    </div>
  );
}
