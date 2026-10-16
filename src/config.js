// Configuração pública do app (nenhum segredo aqui: o acesso aos dados depende do login Microsoft de cada pessoa).
export const CONFIG = {
  // Registro "Gestão da Performance" no Entra ID da Solve Group
  tenantId: 'd9aa8303-f314-48db-babd-5abc9d8327b2',
  clientId: '0ab48a50-a3c9-4114-9d3c-4be210b55367',
  // Site do SharePoint onde ficam as listas GP_*
  siteHost: 'solvegroup940.sharepoint.com',
  sitePath: '/sites/SolveGroupBaseCentralizada',
  scopes: ['User.Read', 'Sites.ReadWrite.All']
};
