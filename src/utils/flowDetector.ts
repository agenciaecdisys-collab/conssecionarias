export function detectGeneratedFlow(content: string): string | null {
  if (content.includes('## FLUXO DE ATENDIMENTO — FASES OBRIGATÓRIAS EM ORDEM')) {
    const startIndex = content.indexOf('## FLUXO DE ATENDIMENTO');
    return content.substring(startIndex).trim();
  }

  const match = content.match(/```(?:markdown)?\n?(## FLUXO DE ATENDIMENTO[\s\S]*?)```/);
  if (match) return match[1].trim();

  return null;
}
