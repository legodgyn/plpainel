function translateStatus(status?: string | null) {
  switch (status) {
    case "paid":
      return "Pago";
    case "pending":
      return "Pendente";
    case "in_process":
      return "Em processamento";
    case "approved":
      return "Aprovado";
    case "rejected":
    case "failed":
      return "Falhou";
    default:
      return "Desconhecido";
  }
}