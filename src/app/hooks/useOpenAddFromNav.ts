import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Abre automaticamente o modal de "adicionar" de uma tela quando se chega
 * nela navegando com `state: { openAdd: true }` — usado pelas "Ações
 * rápidas" da busca global (Ctrl+K), que assim conseguem abrir "Nova
 * Transação"/"Nova Categoria"/etc. de qualquer lugar do site sem duplicar
 * lógica de formulário numa página própria só pra isso.
 *
 * Limpa o state da navegação em seguida (replace) — sem isso, um F5 ou
 * voltar pra essa rota de novo reabriria o modal sem o usuário pedir.
 */
export function useOpenAddFromNav(setShow: (value: boolean) => void) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if ((location.state as { openAdd?: boolean } | null)?.openAdd) {
      setShow(true);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
