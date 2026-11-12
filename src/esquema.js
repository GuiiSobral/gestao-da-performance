// Correspondência entre os campos que o app usa (nomes das Listas GP_* do SharePoint) e as colunas das tabelas do Supabase.
// Fonte única: o SQL das tabelas (supabase/gerar-sql.mjs) e o backend Supabase saem daqui.
// Tipos: texto, data (dia, sem hora), datahora, simnao, numero, inteiro.

export const ESQUEMA = {
  GP_Clientes: { tabela: 'gp_clientes', campos: {
    Title: ['codigo', 'texto'], Nome: ['nome', 'texto'], ConsultorCodigo: ['consultor_codigo', 'texto'], SupervisorCodigo: ['supervisor_codigo', 'texto'],
    Situacao: ['situacao', 'texto'], NaNovaBase: ['na_nova_base', 'simnao'], PastaSharePoint: ['pasta_sharepoint', 'texto'],
    ArquivoOrigem: ['arquivo_origem', 'texto'], Interno: ['interno', 'simnao'] } },
  GP_Pessoas: { tabela: 'gp_pessoas', campos: {
    Title: ['codigo', 'texto'], Nome: ['nome', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], Empresa: ['empresa', 'texto'],
    Nominal: ['nominal', 'simnao'], Email: ['email', 'texto'], WhatsApp: ['whatsapp', 'texto'], Ativo: ['ativo', 'simnao'] } },
  GP_Frentes: { tabela: 'gp_frentes', campos: {
    Title: ['codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], Nome: ['nome', 'texto'], Area: ['area', 'texto'],
    DonoCodigo: ['dono_codigo', 'texto'], Apoio: ['apoio', 'texto'], Inicio: ['inicio', 'data'], FimPrevisto: ['fim_previsto', 'data'],
    Encerrada: ['encerrada', 'simnao'], DataEncerramento: ['data_encerramento', 'data'], StatusOrigem: ['status_origem', 'texto'],
    NotaMigracao: ['nota_migracao', 'texto'] } },
  GP_Demandas: { tabela: 'gp_demandas', campos: {
    Title: ['codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], Assunto: ['assunto', 'texto'], Tipo: ['tipo', 'texto'],
    FrenteCodigo: ['frente_codigo', 'texto'], Prioridade: ['prioridade', 'numero'], ResponsavelCodigo: ['responsavel_codigo', 'texto'],
    Area: ['area', 'texto'], PrazoDemanda: ['prazo_demanda', 'data'], Encerrada: ['encerrada', 'simnao'], DataEncerramento: ['data_encerramento', 'data'],
    Origem: ['origem', 'texto'], StatusOrigem: ['status_origem', 'texto'], NotaMigracao: ['nota_migracao', 'texto'] } },
  GP_Acoes: { tabela: 'gp_acoes', campos: {
    Title: ['codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], DemandaCodigo: ['demanda_codigo', 'texto'], OQue: ['o_que', 'texto'],
    Problema: ['problema', 'texto'], Causa: ['causa', 'texto'], ResponsavelCodigo: ['responsavel_codigo', 'texto'], Apoio: ['apoio', 'texto'],
    Area: ['area', 'texto'], Como: ['como', 'texto'], Quanto: ['quanto', 'numero'], Inicio: ['inicio', 'data'], PrazoOriginal: ['prazo_original', 'data'],
    Prazo: ['prazo', 'data'], Status: ['status', 'texto'], DataConclusao: ['data_conclusao', 'data'], MotivoCancelamento: ['motivo_cancelamento', 'texto'],
    Origem: ['origem', 'texto'], Registro: ['registro', 'data'], LinhaOrigem: ['linha_origem', 'inteiro'], ArquivoOrigem: ['arquivo_origem', 'texto'],
    StatusOrigem: ['status_origem', 'texto'], ResponsavelOrigem: ['responsavel_origem', 'texto'] } },
  GP_Reprogramacoes: { tabela: 'gp_reprogramacoes', campos: {
    Title: ['codigo', 'texto'], AcaoCodigo: ['acao_codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], PrazoAnterior: ['prazo_anterior', 'data'],
    PrazoNovo: ['prazo_novo', 'data'], Motivo: ['motivo', 'texto'], RegistradoEm: ['registrado_em', 'data'], RegistradoPor: ['registrado_por', 'texto'] } },
  GP_Foruns: { tabela: 'gp_foruns', campos: {
    Title: ['codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], Data: ['data', 'data'], Hora: ['hora', 'texto'], Local: ['local', 'texto'],
    Situacao: ['situacao', 'texto'], Convocados: ['convocados', 'texto'], Presentes: ['presentes', 'texto'], ConduzidoPor: ['conduzido_por', 'texto'],
    Participantes: ['participantes', 'texto'], Ata: ['ata', 'texto'] } },
  GP_Pauta: { tabela: 'gp_pauta', campos: {
    Title: ['codigo', 'texto'], ForumCodigo: ['forum_codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], Ordem: ['ordem', 'inteiro'],
    Tipo: ['tipo', 'texto'], RegistroCodigo: ['registro_codigo', 'texto'], Assunto: ['assunto', 'texto'], ResponsavelCodigo: ['responsavel_codigo', 'texto'],
    Origem: ['origem', 'texto'], ItemAnterior: ['item_anterior', 'texto'], Tratamento: ['tratamento', 'texto'], Desdobramentos: ['desdobramentos', 'texto'],
    Anotacao: ['anotacao', 'texto'] } },
  GP_Deliberacoes: { tabela: 'gp_deliberacoes', campos: {
    Title: ['codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], ForumCodigo: ['forum_codigo', 'texto'], Texto: ['texto', 'texto'],
    Tipo: ['tipo', 'texto'], ResponsavelCodigo: ['responsavel_codigo', 'texto'], DemandaCodigo: ['demanda_codigo', 'texto'],
    AcaoCodigo: ['acao_codigo', 'texto'], Data: ['data', 'data'] } },
  GP_Indicadores: { tabela: 'gp_indicadores', campos: {
    Title: ['codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], Area: ['area', 'texto'], Nome: ['nome', 'texto'], Formula: ['formula', 'texto'],
    Unidade: ['unidade', 'texto'], Polaridade: ['polaridade', 'texto'], Frequencia: ['frequencia', 'texto'], ResponsavelCodigo: ['responsavel_codigo', 'texto'],
    Situacao: ['situacao', 'texto'] } },
  GP_Medicoes: { tabela: 'gp_medicoes', campos: {
    Title: ['codigo', 'texto'], IndicadorCodigo: ['indicador_codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], Mes: ['mes', 'data'],
    Meta: ['meta', 'numero'], Realizado: ['realizado', 'numero'], Comentario: ['comentario', 'texto'] } },
  GP_Compromissos: { tabela: 'gp_compromissos', soSolve: true, campos: {
    Title: ['codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], OQue: ['o_que', 'texto'], Tipo: ['tipo', 'texto'],
    ResponsavelCodigo: ['responsavel_codigo', 'texto'], ContraparteCodigo: ['contraparte_codigo', 'texto'], Data: ['data', 'data'],
    DataOriginal: ['data_original', 'data'], Hora: ['hora', 'texto'], Recorrencia: ['recorrencia', 'texto'], Status: ['status', 'texto'],
    DataRealizacao: ['data_realizacao', 'data'], Resultado: ['resultado', 'texto'], SerieCodigo: ['serie_codigo', 'texto'],
    DemandaCodigo: ['demanda_codigo', 'texto'], Registro: ['registro', 'data'], RegistradoPor: ['registrado_por', 'texto'],
    SoSolve: ['so_solve', 'simnao'] } },
  GP_Acompanhamentos: { tabela: 'gp_acompanhamentos', soSolve: true, campos: {
    Title: ['codigo', 'texto'], ClienteCodigo: ['cliente_codigo', 'texto'], RegistroTipo: ['registro_tipo', 'texto'], RegistroCodigo: ['registro_codigo', 'texto'],
    Texto: ['texto', 'texto'], RegistradoEm: ['registrado_em', 'datahora'], RegistradoPor: ['registrado_por', 'texto'], SoSolve: ['so_solve', 'simnao'] } }
};

// Campos que vêm da migração das planilhas: a tela do cliente não os mostra (não são sigilosos, só não servem ao cliente).
export const SO_TELA_SOLVE = ['NaNovaBase', 'PastaSharePoint', 'ArquivoOrigem', 'StatusOrigem', 'NotaMigracao', 'LinhaOrigem', 'ResponsavelOrigem'];
