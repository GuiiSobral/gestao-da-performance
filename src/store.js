// Modelo de dados da Gestão da Performance sobre as 10 listas GP_* e as regras de gravação.

export const AREAS = ['Administrativo', 'Comercial', 'Compras', 'Controladoria', 'Departamento Pessoal', 'Expedição',
  'Faturamento', 'Financeiro', 'Fiscal', 'Logística', 'Manutenção', 'Obras', 'Produção', 'Recursos Humanos', 'Técnico', 'Tecnologia'];

export const LISTS = {
  GP_Clientes: ['Title', 'Nome', 'ConsultorCodigo', 'SupervisorCodigo', 'Situacao', 'NaNovaBase', 'PastaSharePoint', 'ArquivoOrigem', 'Interno'],
  GP_Pessoas: ['Title', 'Nome', 'ClienteCodigo', 'Empresa', 'Nominal', 'Email', 'WhatsApp', 'Ativo'],
  GP_Frentes: ['Title', 'ClienteCodigo', 'Nome', 'Area', 'DonoCodigo', 'Apoio', 'Inicio', 'FimPrevisto', 'Encerrada', 'DataEncerramento', 'StatusOrigem', 'NotaMigracao'],
  GP_Demandas: ['Title', 'ClienteCodigo', 'Assunto', 'Tipo', 'FrenteCodigo', 'Prioridade', 'ResponsavelCodigo', 'Area', 'PrazoDemanda', 'Encerrada', 'DataEncerramento', 'Origem', 'StatusOrigem', 'NotaMigracao'],
  GP_Acoes: ['Title', 'ClienteCodigo', 'DemandaCodigo', 'OQue', 'Problema', 'Causa', 'ResponsavelCodigo', 'Apoio', 'Area', 'Como', 'Quanto', 'Inicio', 'PrazoOriginal', 'Prazo', 'Status', 'DataConclusao', 'MotivoCancelamento', 'Origem', 'Registro', 'LinhaOrigem', 'ArquivoOrigem', 'StatusOrigem', 'ResponsavelOrigem'],
  GP_Reprogramacoes: ['Title', 'AcaoCodigo', 'ClienteCodigo', 'PrazoAnterior', 'PrazoNovo', 'Motivo', 'RegistradoEm', 'RegistradoPor'],
  GP_Foruns: ['Title', 'ClienteCodigo', 'Data', 'Hora', 'Local', 'Situacao', 'Convocados', 'Presentes', 'ConduzidoPor', 'Participantes', 'Ata'],
  GP_Pauta: ['Title', 'ForumCodigo', 'ClienteCodigo', 'Ordem', 'Tipo', 'RegistroCodigo', 'Assunto', 'ResponsavelCodigo', 'Origem', 'ItemAnterior',
    'Tratamento', 'Desdobramentos', 'Anotacao'],
  GP_Deliberacoes: ['Title', 'ClienteCodigo', 'ForumCodigo', 'Texto', 'Tipo', 'ResponsavelCodigo', 'DemandaCodigo', 'AcaoCodigo', 'Data'],
  GP_Indicadores: ['Title', 'ClienteCodigo', 'Area', 'Nome', 'Formula', 'Unidade', 'Polaridade', 'Frequencia', 'ResponsavelCodigo', 'Situacao'],
  GP_Medicoes: ['Title', 'IndicadorCodigo', 'ClienteCodigo', 'Mes', 'Meta', 'Realizado', 'Comentario'],
  GP_Compromissos: ['Title', 'ClienteCodigo', 'OQue', 'Tipo', 'ResponsavelCodigo', 'ContraparteCodigo', 'Data', 'DataOriginal', 'Hora', 'Recorrencia',
    'Status', 'DataRealizacao', 'Resultado', 'SerieCodigo', 'DemandaCodigo', 'Registro', 'RegistradoPor']
};
// Listas que o app tolera não encontrar (o resto do app segue funcionando sem elas).
const OPCIONAIS = new Set(['GP_Compromissos', 'GP_Pauta']);
export const TIPOS_COMP = ['Solicitar', 'Entregar', 'Reunião', 'Outro'];
// Tipos de demanda que a pessoa escolhe ao criar ou editar; os outros (entrega, deliberação, desvio) nascem de outras telas.
export const TIPOS_DEM = ['Pendência', 'Questão crítica'];
const PREFIXO_DEM = { 'Questão crítica': 'QC', 'Pendência': 'PD', 'Entrega de frente': 'EF' };
// O que cada tela pode editar: só texto e classificação. Prazo, responsável e status têm botões próprios (com motivo e histórico).
const EDITAVEL = {
  acao: { lista: 'GP_Acoes', campos: { acao: 'OQue', problema: 'Problema', causa: 'Causa', como: 'Como', area: 'Area' }, obrig: ['acao'] },
  comp: { lista: 'GP_Compromissos', campos: { oque: 'OQue', tipo: 'Tipo', hora: 'Hora', contra: 'ContraparteCodigo' }, obrig: ['oque'] },
  dem: { lista: 'GP_Demandas', campos: { titulo: 'Assunto', tipo: 'Tipo', area: 'Area', prioridade: 'Prioridade' }, obrig: ['titulo'] }
};
export const REPETICOES = ['Única', 'Semanal', 'Mensal'];
// Fórum: situação, tipos de item da pauta e tratamento de cada item.
export const SITUACOES_FORUM = ['Agendado', 'Em andamento', 'Realizado', 'Cancelado'];
export const TOPICO = 'Tópico livre';
export const TIPOS_ITEM = ['Demanda', 'Ação', TOPICO];
export const TRATAMENTOS = ['Concluído', 'Repactuado', 'Cancelado', 'Encerrado', 'Mantido', 'Tratado', 'Não tratado'];

// Datas: o SharePoint guarda ao meio-dia UTC para não mudar de dia no fuso de Brasília.
export const d10 = v => (v ? String(v).slice(0, 10) : null);
export const toSP = d => (d ? `${d}T12:00:00Z` : undefined);
export function hojeISO() {
  const n = new Date();
  return new Date(n.getTime() - n.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
const localDay = iso => (iso ? hojeFrom(new Date(iso)) : null);
function hojeFrom(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
const str = v => (v === null || v === undefined ? '' : String(v));
const strip = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));
export const normTxt = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const PARADAS = new Set('a o e de da do das dos para com sem na no nas nos em por que os as um uma ao aos se sua seu ou'.split(' '));
const tokens = s => new Set(normTxt(s).split(' ').filter(w => w.length >= 3 && !PARADAS.has(w)).map(w => w.slice(0, 6)));
const fmtBR = (d, ano) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}${ano ? '/' + d.slice(0, 4) : ''}` : 'sem prazo');
const firstName = s => str(s).trim().split(/\s+/)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export class Store {
  constructor(backend, user) {
    this.be = backend;
    this.user = user || { name: 'Solve', username: '' };
    this.loadedAt = null;
    this.forumAtivo = null;   // fórum em andamento sendo conduzido na tela: o que muda nele vira desdobramento da pauta
    this.alvoPauta = null;    // item da pauta de onde a pessoa abriu o registro novo ou a deliberação
    this.avisos = [];
    this.clear();
  }

  clear() {
    this.clientes = []; this.pessoas = []; this.frentes = []; this.demandas = []; this.acoes = [];
    this.reprog = []; this.foruns = []; this.delib = []; this.indicadores = []; this.medicoes = []; this.compromissos = [];
    this.pauta = [];
  }

  async load() {
    const names = Object.keys(LISTS);
    const faltando = [];
    const res = await Promise.all(names.map(n => this.be.items(n, LISTS[n]).catch(e => {
      if (OPCIONAIS.has(n) && /não foi encontrada/.test(e.message || '')) { faltando.push(n); return []; }
      throw e;
    })));
    this.faltando = faltando;
    const raw = Object.fromEntries(names.map((n, i) => [n, res[i]]));
    this.build(raw);
    this.loadedAt = new Date();
  }

  build(raw) {
    this.clear();
    const F = it => it.fields || {};
    this.clientes = raw.GP_Clientes.map(it => { const f = F(it); return {
      itemId: it.id, etag: it.etag, id: f.Title, nome: f.Nome || f.Title, consultor: f.ConsultorCodigo || null, supervisor: f.SupervisorCodigo || null,
      situacao: f.Situacao || 'Ativo', naNovaBase: !!f.NaNovaBase, pasta: f.PastaSharePoint || '', arquivo: f.ArquivoOrigem || '', interno: !!f.Interno }; })
      .sort((a, b) => a.nome.localeCompare(b.nome));
    this.pessoas = raw.GP_Pessoas.map(it => { const f = F(it); return {
      itemId: it.id, etag: it.etag, id: f.Title, nome: f.Nome || f.Title, cli: f.ClienteCodigo || null, empresa: f.Empresa || 'Cliente',
      nominal: !!f.Nominal, email: str(f.Email).toLowerCase(), whats: f.WhatsApp || '', ativo: f.Ativo !== false }; });
    this.frentes = raw.GP_Frentes.map(it => { const f = F(it); return {
      itemId: it.id, etag: it.etag, id: f.Title, cli: f.ClienteCodigo, nome: f.Nome || f.Title, area: f.Area || '', dono: f.DonoCodigo || null,
      apoio: f.Apoio || '', inicio: d10(f.Inicio), fim: d10(f.FimPrevisto), encerrada: !!f.Encerrada, dataEnc: d10(f.DataEncerramento),
      statusOriginal: f.StatusOrigem || '', nota: f.NotaMigracao || '' }; });
    this.demandas = raw.GP_Demandas.map(it => { const f = F(it); return {
      itemId: it.id, etag: it.etag, id: f.Title, cli: f.ClienteCodigo, titulo: f.Assunto || f.Title, tipo: f.Tipo || 'Pendência', frente: f.FrenteCodigo || null,
      prioridade: f.Prioridade || null, resp: f.ResponsavelCodigo || null, area: f.Area || '', prazo: d10(f.PrazoDemanda),
      encerrada: !!f.Encerrada, dataEnc: d10(f.DataEncerramento), origem: f.Origem || '', statusOriginal: f.StatusOrigem || '', nota: f.NotaMigracao || '' }; });
    this.reprog = raw.GP_Reprogramacoes.map(it => { const f = F(it); return {
      itemId: it.id, etag: it.etag, id: f.Title, acao: f.AcaoCodigo, cli: f.ClienteCodigo, de: d10(f.PrazoAnterior), para: d10(f.PrazoNovo),
      motivo: f.Motivo || '', em: d10(f.RegistradoEm), por: f.RegistradoPor || '' }; });
    const rp = {};
    for (const r of this.reprog) (rp[r.acao] = rp[r.acao] || []).push(r);
    for (const k in rp) rp[k].sort((a, b) => (a.em || '').localeCompare(b.em || '') || a.id.localeCompare(b.id, 'pt', { numeric: true }));
    this.acoes = raw.GP_Acoes.map(it => { const f = F(it); return {
      itemId: it.id, etag: it.etag, id: f.Title, cli: f.ClienteCodigo, demanda: f.DemandaCodigo, acao: f.OQue || '', problema: f.Problema || '', causa: f.Causa || '',
      resp: f.ResponsavelCodigo || null, apoio: f.Apoio || '', area: f.Area || '', como: f.Como || '', quanto: f.Quanto ?? null,
      inicio: d10(f.Inicio), prazoOriginal: d10(f.PrazoOriginal), prazo: d10(f.Prazo), status: f.Status || 'Não iniciada',
      conclusao: d10(f.DataConclusao), motivoCancel: f.MotivoCancelamento || '', origem: f.Origem || '', registro: d10(f.Registro),
      linha: f.LinhaOrigem || null, arquivo: f.ArquivoOrigem || '', statusOriginal: f.StatusOrigem || '', respOriginal: f.ResponsavelOrigem || '',
      modifiedDay: localDay(it.modified), reprogramacoes: rp[f.Title] || [] }; });
    this.foruns = raw.GP_Foruns.map(it => this.forumDe(it));
    this.pauta = (raw.GP_Pauta || []).map(it => this.itemPautaDe(it));
    this.delib = raw.GP_Deliberacoes.map(it => { const f = F(it); return {
      itemId: it.id, etag: it.etag, id: f.Title, cli: f.ClienteCodigo, forum: f.ForumCodigo || null, texto: f.Texto || '', tipo: f.Tipo || 'Deliberado',
      resp: f.ResponsavelCodigo || null, demanda: f.DemandaCodigo || null, acaoId: f.AcaoCodigo || null, data: d10(f.Data) }; });
    this.indicadores = raw.GP_Indicadores.map(it => { const f = F(it); return {
      itemId: it.id, etag: it.etag, id: f.Title, cli: f.ClienteCodigo, area: f.Area || '', nome: f.Nome || f.Title, unidade: f.Unidade || '',
      polaridade: f.Polaridade || 'Maior é melhor', resp: f.ResponsavelCodigo || null, situacao: f.Situacao || 'Definido' }; });
    this.medicoes = raw.GP_Medicoes.map(it => { const f = F(it); return {
      itemId: it.id, etag: it.etag, id: f.Title, indicador: f.IndicadorCodigo, cli: f.ClienteCodigo, mes: d10(f.Mes),
      meta: f.Meta ?? null, realizado: f.Realizado ?? null, comentario: f.Comentario || '' }; });
    this.compromissos = (raw.GP_Compromissos || []).map(it => this.comp(it));
  }

  comp(it) {
    const f = it.fields || {};
    return { itemId: it.id, etag: it.etag, id: f.Title, cli: f.ClienteCodigo, oque: f.OQue || f.Title, tipo: f.Tipo || 'Outro',
      resp: f.ResponsavelCodigo || null, contra: f.ContraparteCodigo || '', data: d10(f.Data), dataOrig: d10(f.DataOriginal) || d10(f.Data),
      hora: f.Hora || '', rec: f.Recorrencia || 'Única', status: f.Status || 'Pendente', realizado: d10(f.DataRealizacao), resultado: f.Resultado || '',
      serie: f.SerieCodigo || null, demanda: f.DemandaCodigo || null, registro: d10(f.Registro), por: f.RegistradoPor || '' };
  }

  // ---------- consultas ----------
  pessoa(code) { return this.pessoas.find(p => p.id === code) || null; }
  nome(code) { const p = this.pessoa(code); return p ? p.nome : (code || ''); }
  nominal(code) { const p = this.pessoa(code); return !!(p && p.nominal); }
  cliente(code) { return this.clientes.find(c => c.id === code) || null; }
  interno(code) { const c = this.cliente(code); return !!(c && c.interno); }
  compromisso(id) { return this.compromissos.find(c => c.id === id) || null; }
  // Ocorrências da mesma série (compromisso que se repete), da mais antiga para a mais nova.
  serieDe(c) {
    if (!c || !c.serie) return c ? [c] : [];
    return this.compromissos.filter(x => x.serie === c.serie).sort((a, b) => (a.dataOrig || '').localeCompare(b.dataOrig || '') || a.id.localeCompare(b.id, 'pt', { numeric: true }));
  }
  // Pessoas que podem ser "com quem" num compromisso: as do cliente e as da Solve, nominais ou não.
  contrapartes(cli) {
    return this.pessoas.filter(p => p.ativo && (p.cli === cli || p.empresa === 'Solve') && p.id !== 'SOLVE')
      .sort((a, b) => (a.empresa === 'Solve') - (b.empresa === 'Solve') || a.nome.localeCompare(b.nome));
  }
  acao(id) { return this.acoes.find(a => a.id === id) || null; }
  demanda(id) { return this.demandas.find(d => d.id === id) || null; }
  frente(id) { return this.frentes.find(f => f.id === id) || null; }
  acoesDe(demId) { return this.acoes.filter(a => a.demanda === demId); }
  doCliente(lista, cli) { return lista.filter(x => x.cli === cli); }
  temDados(cli) { return this.acoes.some(a => a.cli === cli) || this.demandas.some(d => d.cli === cli); }
  pessoasPara(cli) {
    return this.pessoas.filter(p => p.nominal && p.ativo && (p.cli === cli || p.empresa === 'Solve'))
      .sort((a, b) => (a.empresa === 'Solve') - (b.empresa === 'Solve') || a.nome.localeCompare(b.nome));
  }
  eu() {
    const u = this.user || {};
    const mail = str(u.username).toLowerCase();
    return this.pessoas.find(p => mail && p.email === mail)
      || this.pessoas.find(p => p.empresa === 'Solve' && p.nominal && firstName(p.nome) === firstName(u.name))
      || null;
  }

  // ---------- códigos ----------
  // Próximo número livre do prefixo, considerando os códigos já usados (da tela e do SharePoint).
  proximo(ids, prefixo, digitos) {
    const re = new RegExp('^' + prefixo.replace(/[-]/g, '\\-') + '(\\d+)$');
    let max = 0;
    for (const id of ids) { const m = re.exec(id || ''); if (m) max = Math.max(max, Number(m[1])); }
    return prefixo + String(max + 1).padStart(digitos, '0');
  }

  // Cria um item com código novo. Lê na hora os códigos da lista no SharePoint, para não repetir
  // um código que outra pessoa criou depois que esta tela foi carregada.
  async criar(lista, local, gerar, montar) {
    const usados = new Set(local.map(x => x.id));
    for (const t of await this.be.titulos(lista)) usados.add(t);
    const code = gerar(usados);
    const it = await this.be.create(lista, strip(montar(code)));
    return { it, code };
  }

  // Grava no item só se ninguém o alterou desde a leitura; guarda a nova versão.
  async upd(lista, obj, fields) {
    const r = await this.be.update(lista, obj.itemId, fields, obj.etag);
    if (r && r.etag) obj.etag = r.etag;
  }

  // ---------- gravações (cada uma vai direto para a lista e atualiza a tela) ----------
  async concluir(a) {
    const hoje = hojeISO();
    await this.upd('GP_Acoes', a, { Status: 'Concluída', DataConclusao: toSP(hoje) });
    a.status = 'Concluída'; a.conclusao = hoje; a.modifiedDay = hoje;
    await this.noForum('acao', a, { k: 'concluida', cod: a.id, txt: a.acao, resp: a.resp });
  }

  // Desfaz uma conclusão feita por engano (volta ao status anterior e limpa a data).
  async desfazerConclusao(a, statusAnterior) {
    const st = statusAnterior === 'Não iniciada' ? 'Não iniciada' : 'Em andamento';
    await this.upd('GP_Acoes', a, { Status: st, DataConclusao: null });
    a.status = st; a.conclusao = null; a.modifiedDay = hojeISO();
    await this.tirarDoForum(['concluida'], a.id);
  }

  async iniciar(a) {
    await this.upd('GP_Acoes', a, { Status: 'Em andamento' });
    a.status = 'Em andamento'; a.modifiedDay = hojeISO();
  }

  async definirPrazo(a, prazo) {
    await this.upd('GP_Acoes', a, { Prazo: toSP(prazo), PrazoOriginal: toSP(prazo) });
    a.prazo = prazo; a.prazoOriginal = prazo; a.modifiedDay = hojeISO();
    await this.noForum('acao', a, { k: 'prazo', cod: a.id, txt: a.acao, resp: a.resp, prazo });
  }

  async reprogramar(a, prazo, motivo) {
    const hoje = hojeISO();
    const anterior = a.prazo;
    const por = this.user.name || this.user.username || 'Solve';
    // Primeiro a ação (recusa se outra pessoa mexeu nela); depois o histórico com o motivo.
    await this.upd('GP_Acoes', a, { Prazo: toSP(prazo) });
    let res;
    try {
      res = await this.criar('GP_Reprogramacoes', this.reprog, usados => {
        let n = a.reprogramacoes.length + 1;
        while (usados.has(`${a.id}-R${n}`)) n++;
        return `${a.id}-R${n}`;
      }, code => ({ Title: code, AcaoCodigo: a.id, ClienteCodigo: a.cli, PrazoAnterior: toSP(anterior), PrazoNovo: toSP(prazo),
        Motivo: motivo, RegistradoEm: toSP(hoje), RegistradoPor: por }));
    } catch (e) {
      // Sem histórico, o prazo volta ao anterior para não ficar mudança sem motivo.
      try { await this.upd('GP_Acoes', a, { Prazo: toSP(anterior) }); } catch (x) { /* a releitura mostra o estado real */ }
      throw e;
    }
    const r = { itemId: res.it.id, etag: res.it.etag, id: res.code, acao: a.id, cli: a.cli, de: anterior, para: prazo, motivo, em: hoje, por };
    this.reprog.push(r);
    a.reprogramacoes = [...a.reprogramacoes, r];
    a.prazo = prazo; a.modifiedDay = hoje;
    await this.noForum('acao', a, { k: 'repactuada', cod: a.id, txt: a.acao, resp: a.resp, prazo, de: anterior, mot: motivo });
  }

  async cancelar(a, motivo) {
    await this.upd('GP_Acoes', a, { Status: 'Cancelada', MotivoCancelamento: motivo });
    a.status = 'Cancelada'; a.motivoCancel = motivo; a.modifiedDay = hojeISO();
    await this.noForum('acao', a, { k: 'cancelada', cod: a.id, txt: a.acao, mot: motivo });
  }

  // Troca o responsável de uma ação, compromisso ou demanda aberta (na ação, também o apoio).
  // Não pede motivo: o prazo não muda e o histórico de versões da lista guarda quem trocou e quando.
  // Devolve o que havia antes, para o Desfazer.
  async trocarResponsavel(tipo, obj, resp, apoio) {
    const lista = { acao: 'GP_Acoes', comp: 'GP_Compromissos', dem: 'GP_Demandas' }[tipo];
    if (!lista) throw new Error(`tipo ${tipo} não existe`);
    const ant = { resp: obj.resp || null, apoio: obj.apoio || '' };
    const f = { ResponsavelCodigo: resp || null };
    const comApoio = tipo === 'acao' && apoio !== undefined;
    if (comApoio) f.Apoio = apoio || null;
    await this.upd(lista, obj, f);
    obj.resp = resp || null;
    if (comApoio) obj.apoio = apoio || '';
    if (tipo === 'acao') obj.modifiedDay = hojeISO();
    if (tipo !== 'comp' && (resp || null) !== ant.resp) await this.noForum(tipo, obj, { k: 'resp', cod: obj.id, txt: tipo === 'acao' ? obj.acao : obj.titulo, resp: resp || null, de: ant.resp });
    return ant;
  }

  async encerrarDemanda(d) {
    const hoje = hojeISO();
    await this.upd('GP_Demandas', d, { Encerrada: true, DataEncerramento: toSP(hoje) });
    d.encerrada = true; d.dataEnc = hoje;
    await this.noForum('dem', d, { k: 'encerrada', cod: d.id, txt: d.titulo });
  }

  // Cancela uma demanda sem ação aberta (ex.: questão crítica que deixou de fazer sentido), sem pedir motivo
  // e sem criar ação de fachada. Encerrada sem nenhuma ação concluída, ela aparece como Cancelada.
  async cancelarDemanda(d) {
    if (d.encerrada) throw new Error(`A demanda ${d.id} já está encerrada`);
    if (this.acoesDe(d.id).some(a => a.status !== 'Concluída' && a.status !== 'Cancelada')) throw new Error(`A demanda ${d.id} tem ações abertas: conclua ou cancele as ações antes`);
    const hoje = hojeISO();
    await this.upd('GP_Demandas', d, { Encerrada: true, DataEncerramento: toSP(hoje) });
    d.encerrada = true; d.dataEnc = hoje;
    await this.noForum('dem', d, { k: 'cancelDem', cod: d.id, txt: d.titulo });
  }

  async reabrirDemanda(d) {
    await this.upd('GP_Demandas', d, { Encerrada: false, DataEncerramento: null });
    d.encerrada = false; d.dataEnc = null;
    await this.tirarDoForum(['encerrada', 'cancelDem'], d.id);
  }

  // Demanda nova criada pela pessoa (ao registrar ou ao mover uma ação). Código pelo tipo: QC, PD ou EF.
  async novaDemanda({ cli, titulo, tipo, frente, resp, area, prazo, origem }) {
    const t = PREFIXO_DEM[tipo] ? tipo : 'Pendência';
    const tit = String(titulo || '').trim();
    if (!tit) throw new Error('Informe o título da demanda');
    const fr = frente ? this.frente(frente) : null;
    if (frente && (!fr || fr.cli !== cli)) throw new Error(`a frente ${frente} não é deste cliente`);
    const f = { ClienteCodigo: cli, Assunto: tit.slice(0, 255), Tipo: t, FrenteCodigo: fr ? fr.id : undefined, ResponsavelCodigo: resp, Area: area,
      PrazoDemanda: toSP(prazo), Encerrada: false, Origem: origem || 'Captura rápida' };
    const { it, code } = await this.criar('GP_Demandas', this.demandas, u => this.proximo(u, `${cli}-${PREFIXO_DEM[t]}-`, 2), c => ({ Title: c, ...f }));
    if (fr && fr.encerrada) {
      await this.upd('GP_Frentes', fr, { Encerrada: false, DataEncerramento: null });
      fr.encerrada = false; fr.dataEnc = null;
    }
    const d = { itemId: it.id, etag: it.etag, id: code, cli, titulo: f.Assunto, tipo: t, frente: fr ? fr.id : null, prioridade: null, resp: resp || null, area: area || '',
      prazo: prazo || null, encerrada: false, dataEnc: null, origem: f.Origem, statusOriginal: '', nota: '' };
    this.demandas.push(d);
    return d;
  }

  async novaAcao({ cli, acao, porque, dem, novaDem, resp, prazo, area, como, origem }) {
    const hoje = hojeISO();
    let demanda = dem ? this.demanda(dem) : null;
    if (dem && (!demanda || demanda.cli !== cli)) throw new Error(`a demanda ${dem} não é deste cliente`);
    if (!demanda) {
      demanda = await this.novaDemanda({ cli, titulo: (novaDem && novaDem.titulo) || acao, tipo: (novaDem && novaDem.tipo) || 'Pendência',
        frente: novaDem && novaDem.frente, resp, area, prazo, origem });
    } else if (demanda.encerrada) {
      await this.upd('GP_Demandas', demanda, { Encerrada: false });
      demanda.encerrada = false;
    }
    const f = { ClienteCodigo: cli, DemandaCodigo: demanda.id, OQue: acao.slice(0, 255), Problema: (porque || '').slice(0, 255),
      ResponsavelCodigo: resp, Area: area, Como: como, Inicio: toSP(hoje), PrazoOriginal: toSP(prazo), Prazo: toSP(prazo),
      Status: 'Não iniciada', Origem: origem, Registro: toSP(hoje) };
    const { it, code: id } = await this.criar('GP_Acoes', this.acoes, u => this.proximo(u, `${cli}-A`, 3), c => ({ Title: c, ...f }));
    const a = { itemId: it.id, etag: it.etag, id, cli, demanda: demanda.id, acao, problema: porque || '', causa: '', resp, apoio: '', area, como: como || '',
      quanto: null, inicio: hoje, prazoOriginal: prazo, prazo, status: 'Não iniciada', conclusao: null, motivoCancel: '', origem,
      registro: hoje, linha: null, arquivo: '', statusOriginal: '', respOriginal: '', modifiedDay: hoje, reprogramacoes: [] };
    this.acoes.push(a);
    await this.noForum('acao', a, { k: 'nova', cod: id, txt: acao, resp, prazo });
    return a;
  }

  // ---------- edição de texto e classificação ----------
  // Grava só o que mudou e devolve os valores anteriores (para o Desfazer chamar editar de novo com eles).
  async editar(tipo, obj, novos) {
    const cfg = EDITAVEL[tipo];
    if (!cfg) throw new Error(`tipo ${tipo} não existe`);
    const antes = {}, f = {};
    for (const [k, col] of Object.entries(cfg.campos)) {
      if (!(k in novos)) continue;
      let v = novos[k];
      if (k === 'prioridade') {
        v = v === '' || v === null || v === undefined ? null : Number(v);
        if (v !== null && !(Number.isInteger(v) && v >= 1 && v <= 7)) throw new Error('A prioridade vai de P1 a P7');
      } else {
        v = String(v ?? '').trim();
        if (k !== 'como') v = v.slice(0, 255);
      }
      if (cfg.obrig.includes(k) && !v) throw new Error('O texto principal não pode ficar vazio');
      const atual = k === 'prioridade' ? (obj[k] ?? null) : String(obj[k] ?? '');
      if (v === atual) continue;
      antes[k] = obj[k] ?? (k === 'prioridade' ? null : '');
      f[col] = v === '' ? null : v;
    }
    if (tipo === 'dem' && 'Tipo' in f) {
      if (!TIPOS_DEM.includes(obj.tipo) || !TIPOS_DEM.includes(f.Tipo)) throw new Error(`O tipo ${obj.tipo} não muda por aqui`);
    }
    if (tipo === 'comp' && 'Tipo' in f && !TIPOS_COMP.includes(f.Tipo)) throw new Error('Tipo de compromisso inválido');
    if (tipo === 'acao' && 'Area' in f && f.Area && !AREAS.includes(f.Area)) throw new Error('Área inválida');
    if (tipo === 'dem' && 'Area' in f && f.Area && !AREAS.includes(f.Area)) throw new Error('Área inválida');
    if (!Object.keys(f).length) throw Object.assign(new Error('Nada mudou'), { nadaMudou: true });
    await this.upd(cfg.lista, obj, f);
    for (const k of Object.keys(antes)) obj[k] = k === 'prioridade' ? f[cfg.campos[k]] : (f[cfg.campos[k]] ?? '');
    if (tipo === 'acao') obj.modifiedDay = hojeISO();
    return antes;
  }

  // ---------- mover ação para outra demanda ----------
  // Pendência que o app criou sozinho para esta ação (registro rápido sem demanda): só ela, sem frente e sem nada ligado.
  pendenciaSoDela(d, a) {
    if (!d || d.tipo !== 'Pendência' || d.frente || d.encerrada) return false;
    if (!['Captura rápida', 'Compromisso'].includes(d.origem)) return false;
    if (this.acoesDe(d.id).some(x => x !== a)) return false;
    if (this.delib.some(x => x.demanda === d.id && x.acaoId !== a.id)) return false;
    if (this.compromissos.some(c => c.demanda === d.id)) return false;
    return true;
  }

  // destino: código de uma demanda aberta do mesmo cliente, ou { titulo, tipo, frente } para criar uma nova.
  // Se a origem era a pendência criada só para esta ação, ela é cancelada (fica sem ações, então aparece como Cancelada).
  async moverAcao(a, destino) {
    this._semLog = true;
    try { return await this._moverAcao(a, destino); } finally { this._semLog = false; }
  }
  async _moverAcao(a, destino) {
    const de = this.demanda(a.demanda);
    const soDela = this.pendenciaSoDela(de, a);
    let para, criada = false;
    if (destino && typeof destino === 'object') {
      para = await this.novaDemanda({ cli: a.cli, titulo: destino.titulo, tipo: destino.tipo, frente: destino.frente, resp: a.resp, area: a.area, prazo: a.prazo, origem: 'Captura rápida' });
      criada = true;
    } else {
      para = this.demanda(destino);
      if (!para || para.cli !== a.cli) throw new Error('Escolha uma demanda deste cliente');
      if (para.encerrada) throw new Error(`A demanda ${para.id} está encerrada`);
      if (para.id === a.demanda) throw Object.assign(new Error('A ação já está nesta demanda'), { nadaMudou: true });
    }
    try {
      await this.upd('GP_Acoes', a, { DemandaCodigo: para.id });
    } catch (e) {
      if (criada) { try { await this.be.remove('GP_Demandas', para.itemId); this.demandas = this.demandas.filter(x => x !== para); } catch (x) { /* a releitura mostra */ } }
      throw e;
    }
    a.demanda = para.id; a.modifiedDay = hojeISO();
    let encerrou = false;
    if (soDela) {
      try { await this.cancelarDemanda(de); encerrou = true; } catch (e) { /* a demanda fica sem plano: a pessoa decide */ }
    }
    return { de: de ? de.id : null, para: para.id, criada, encerrou };
  }

  // Desfaz o mover: volta a ação, reabre a pendência de origem e apaga a demanda criada no movimento (se ficou vazia).
  async desfazerMover(a, r) {
    const de = this.demanda(r.de), para = this.demanda(r.para);
    if (r.encerrou && de) await this.reabrirDemanda(de);
    await this.upd('GP_Acoes', a, { DemandaCodigo: r.de });
    a.demanda = r.de; a.modifiedDay = hojeISO();
    if (r.criada && para && !this.acoesDe(para.id).length) {
      await this.be.remove('GP_Demandas', para.itemId);
      this.demandas = this.demandas.filter(x => x !== para);
    }
  }

  // ---------- trocar o cliente de um registro feito no cliente errado ----------
  // Só sem história: o código carrega o cliente, então o registro é recriado no cliente certo e o antigo vai para a lixeira do site.
  podeTrocarCliente(tipo, obj) {
    if (tipo === 'acao') {
      if (obj.status === 'Concluída' || obj.status === 'Cancelada') return { ok: false, motivo: `A ação já está ${obj.status.toLowerCase()}.` };
      if (obj.reprogramacoes.length) return { ok: false, motivo: 'A ação tem histórico de prazo.' };
      if (obj.linha || obj.origem === 'Migração') return { ok: false, motivo: 'A ação veio da migração da planilha.' };
      if (this.delib.some(x => x.acaoId === obj.id)) return { ok: false, motivo: 'A ação nasceu de uma deliberação do fórum.' };
      if (this.compromissos.some(c => c.demanda === obj.demanda)) return { ok: false, motivo: 'A demanda da ação está ligada a um compromisso.' };
      return { ok: true };
    }
    if (tipo === 'comp') {
      if (obj.status !== 'Pendente') return { ok: false, motivo: 'O compromisso já foi fechado.' };
      if (obj.demanda) return { ok: false, motivo: 'O compromisso já virou pendência.' };
      if (this.serieDe(obj).length > 1) return { ok: false, motivo: 'O compromisso já tem outras vezes na série.' };
      return { ok: true };
    }
    return { ok: false, motivo: 'Este registro não troca de cliente.' };
  }

  // dem: código de uma demanda aberta do cliente novo, ou vazio para uma pendência nova com o título da demanda atual.
  async trocarClienteAcao(a, cli, args) {
    this._semLog = true;
    try { return await this._trocarClienteAcao(a, cli, args); } finally { this._semLog = false; }
  }
  async _trocarClienteAcao(a, cli, { resp, dem }) {
    const pode = this.podeTrocarCliente('acao', a);
    if (!pode.ok) throw new Error(pode.motivo);
    if (!this.cliente(cli) || cli === a.cli) throw new Error('Escolha outro cliente');
    const r = resp || a.resp;
    if (!this.pessoasPara(cli).some(p => p.id === r)) throw new Error(`${this.nome(r) || 'O responsável'} não atende este cliente: escolha outro responsável`);
    const de = this.demanda(a.demanda), soDela = this.pendenciaSoDela(de, a);
    let destino = dem ? this.demanda(dem) : null, criada = null;
    if (dem && (!destino || destino.cli !== cli || destino.encerrada)) throw new Error('Escolha uma demanda aberta do cliente novo');
    if (!destino) {
      criada = await this.novaDemanda({ cli, titulo: de ? de.titulo : a.acao, tipo: de && TIPOS_DEM.includes(de.tipo) ? de.tipo : 'Pendência', resp: r, area: a.area, prazo: a.prazo, origem: 'Captura rápida' });
      destino = criada;
    }
    const f = { ClienteCodigo: cli, DemandaCodigo: destino.id, OQue: a.acao, Problema: a.problema, Causa: a.causa, ResponsavelCodigo: r,
      Apoio: a.apoio, Area: a.area, Como: a.como, Quanto: a.quanto ?? undefined, Inicio: toSP(a.inicio), PrazoOriginal: toSP(a.prazoOriginal), Prazo: toSP(a.prazo),
      Status: a.status, Origem: a.origem || 'Captura rápida', Registro: toSP(a.registro) };
    let nova;
    try {
      const { it, code } = await this.criar('GP_Acoes', this.acoes, u => this.proximo(u, `${cli}-A`, 3), c => ({ Title: c, ...f }));
      nova = { ...a, itemId: it.id, etag: it.etag, id: code, cli, demanda: destino.id, resp: r, modifiedDay: hojeISO(), reprogramacoes: [] };
      await this.be.remove('GP_Acoes', a.itemId);
    } catch (e) {
      if (nova) { try { await this.be.remove('GP_Acoes', nova.itemId); } catch (x) { /* a releitura mostra */ } }
      if (criada) { try { await this.be.remove('GP_Demandas', criada.itemId); } catch (x) { /* idem */ } this.demandas = this.demandas.filter(x => x !== criada); }
      throw e;
    }
    this.acoes = this.acoes.filter(x => x !== a);
    this.acoes.push(nova);
    let apagouDem = false;
    if (soDela) {
      try { await this.be.remove('GP_Demandas', de.itemId); this.demandas = this.demandas.filter(x => x !== de); apagouDem = true; } catch (e) { /* fica sem plano */ }
    }
    return { nova, antigo: a.id, cliAntigo: a.cli, demAntiga: de ? de.id : null, apagouDem, demNova: destino.id };
  }

  async trocarClienteComp(c, cli, { resp }) {
    const pode = this.podeTrocarCliente('comp', c);
    if (!pode.ok) throw new Error(pode.motivo);
    if (!this.cliente(cli) || cli === c.cli) throw new Error('Escolha outro cliente');
    const r = resp || c.resp;
    if (!this.pessoasPara(cli).some(p => p.id === r)) throw new Error(`${this.nome(r) || 'O responsável'} não atende este cliente: escolha outro responsável`);
    // "Com quem": pessoa da Solve vale em qualquer cliente; pessoa do cliente antigo vira o nome digitado.
    const pc = this.pessoa(c.contra);
    const contra = pc && pc.cli && pc.cli !== cli && pc.empresa !== 'Solve' ? pc.nome : c.contra;
    const repete = c.rec && c.rec !== 'Única';
    const f = { ClienteCodigo: cli, OQue: c.oque, Tipo: c.tipo, ResponsavelCodigo: r, ContraparteCodigo: contra, Data: toSP(c.data), DataOriginal: toSP(c.dataOrig),
      Hora: c.hora, Recorrencia: c.rec, Status: 'Pendente', Registro: toSP(c.registro), RegistradoPor: c.por };
    const { it, code } = await this.criar('GP_Compromissos', this.compromissos, u => this.proximo(u, `${cli}-C`, 4), x => ({ Title: x, ...f, SerieCodigo: repete ? x : undefined }));
    const novo = this.comp({ id: it.id, etag: it.etag, fields: { ...f, Title: code, SerieCodigo: repete ? code : null } });
    try {
      await this.be.remove('GP_Compromissos', c.itemId);
    } catch (e) {
      try { await this.be.remove('GP_Compromissos', it.id); } catch (x) { /* a releitura mostra */ }
      throw e;
    }
    this.compromissos = this.compromissos.filter(x => x !== c);
    this.compromissos.push(novo);
    return { novo, antigo: c.id, cliAntigo: c.cli, respAntigo: c.resp };
  }

  // Entrega de uma frente: é a demanda onde as ações da frente ficam penduradas.
  async novaEntrega({ frente, titulo, resp, area, prazo }) {
    const fr = this.frente(frente);
    if (!fr) throw new Error(`frente ${frente} não encontrada`);
    const cli = fr.cli;
    const f = { ClienteCodigo: cli, Assunto: titulo.slice(0, 255), Tipo: 'Entrega de frente', FrenteCodigo: fr.id,
      ResponsavelCodigo: resp, Area: area, PrazoDemanda: toSP(prazo), Encerrada: false, Origem: 'Captura rápida' };
    const { it, code } = await this.criar('GP_Demandas', this.demandas, u => this.proximo(u, `${cli}-EF-`, 2), c => ({ Title: c, ...f }));
    if (fr.encerrada) {
      await this.upd('GP_Frentes', fr, { Encerrada: false, DataEncerramento: null });
      fr.encerrada = false; fr.dataEnc = null;
    }
    const d = { itemId: it.id, etag: it.etag, id: code, cli, titulo: f.Assunto, tipo: 'Entrega de frente', frente: fr.id, prioridade: null, resp, area,
      prazo: prazo || null, encerrada: false, dataEnc: null, origem: f.Origem, statusOriginal: '', nota: '' };
    this.demandas.push(d);
    return d;
  }

  // Frente nova já nasce com a primeira entrega, para poder receber ações.
  async novaFrente({ cli, nome, area, dono, apoio, inicio, fim, entrega }) {
    const f = { ClienteCodigo: cli, Nome: nome.slice(0, 255), Area: area, DonoCodigo: dono, Apoio: (apoio || '').slice(0, 255),
      Inicio: toSP(inicio), FimPrevisto: toSP(fim), Encerrada: false };
    const { it, code } = await this.criar('GP_Frentes', this.frentes, u => this.proximo(u, `${cli}-F`, 2), c => ({ Title: c, ...f }));
    const fr = { itemId: it.id, etag: it.etag, id: code, cli, nome: f.Nome, area, dono, apoio: apoio || '', inicio: inicio || null, fim,
      encerrada: false, dataEnc: null, statusOriginal: '', nota: '' };
    this.frentes.push(fr);
    const d = await this.novaEntrega({ frente: code, titulo: entrega || nome, resp: dono, area, prazo: fim });
    return { frente: fr, entrega: d };
  }

  // ---------- fórum: convocação, pauta, condução e ata ----------
  // O fórum nasce de uma convocação (data, hora, local, convocados e pauta escolhida à mão) e passa por
  // Agendado → Em andamento → Realizado (ou Cancelado). A ata sai dos desdobramentos de cada item da pauta.
  forum(id) { return this.foruns.find(f => f.id === id) || null; }
  forunsDe(cli) {
    return this.foruns.filter(f => f.cli === cli)
      .sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.hora || '').localeCompare(a.hora || '') || b.id.localeCompare(a.id, 'pt', { numeric: true }));
  }
  forumEmAndamento(cli) { return this.foruns.find(f => f.cli === cli && f.situacao === 'Em andamento') || null; }
  pautaDe(forumId) { return this.pauta.filter(p => p.forum === forumId).sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || a.id.localeCompare(b.id, 'pt', { numeric: true })); }
  itemPauta(id) { return this.pauta.find(p => p.id === id) || null; }

  // Quem pode ser convocado: qualquer pessoa da Solve e as pessoas do cliente (só nominais e ativas).
  convocaveis(cli) {
    return this.pessoas.filter(p => p.nominal && p.ativo && p.id !== 'SOLVE' && (p.empresa === 'Solve' || p.cli === cli))
      .sort((a, b) => (a.empresa === 'Solve') - (b.empresa === 'Solve') || a.nome.localeCompare(b.nome));
  }

  // Título do item como ele está hoje no registro (o texto gravado no item é só a foto do momento da convocação).
  tituloItem(p) {
    if (p.tipo === 'Demanda') { const d = this.demanda(p.reg); return d ? d.titulo : (p.assunto || p.reg); }
    if (p.tipo === 'Ação') { const a = this.acao(p.reg); return a ? a.acao : (p.assunto || p.reg); }
    return p.assunto;
  }
  // O item ainda pede tratamento? (demanda aberta, ação aberta ou tópico livre)
  itemAberto(p) {
    if (p.tipo === 'Demanda') { const d = this.demanda(p.reg); return !!d && !d.encerrada; }
    if (p.tipo === 'Ação') { const a = this.acao(p.reg); return !!a && (a.status === 'Não iniciada' || a.status === 'Em andamento'); }
    return true;
  }
  chaveItem(i) { return i.tipo === TOPICO ? 'T:' + normTxt(i.assunto) : `${i.tipo}:${i.reg}`; }

  // Fórum agendado ou em andamento (fora o informado) que já tem o mesmo registro na pauta.
  emOutraPauta(cli, tipo, reg, exceto) {
    const ativos = new Set(this.foruns.filter(f => f.cli === cli && f.id !== exceto && (f.situacao === 'Agendado' || f.situacao === 'Em andamento')).map(f => f.id));
    const p = this.pauta.find(x => ativos.has(x.forum) && x.tipo === tipo && x.reg === reg);
    return p ? this.forum(p.forum) : null;
  }

  // Itens marcados como Não tratado em fóruns realizados que ainda não foram levados a outro fórum (fora os cancelados).
  naoTratados(cli, exceto) {
    const vivos = new Set(this.foruns.filter(f => f.cli === cli && f.situacao !== 'Cancelado' && f.id !== exceto).map(f => f.id));
    const levados = new Set(this.pauta.filter(x => vivos.has(x.forum) && x.anterior).map(x => x.anterior));
    const real = new Set(this.foruns.filter(f => f.cli === cli && f.situacao === 'Realizado').map(f => f.id));
    const out = [], vistos = new Set();
    const itens = this.pauta.filter(p => real.has(p.forum) && p.trat === 'Não tratado' && !levados.has(p.id) && this.itemAberto(p))
      .sort((a, b) => (this.forum(b.forum).data || '').localeCompare(this.forum(a.forum).data || ''));
    for (const p of itens) {
      const k = this.chaveItem(p);
      if (vistos.has(k)) continue;
      vistos.add(k); out.push(p);
    }
    return out.reverse();
  }

  // Tira repetições da pauta: o mesmo registro duas vezes, a ação cuja demanda inteira já está na pauta
  // e o tópico livre com o mesmo texto de outro.
  normalizarPauta(itens) {
    const demSel = new Set(itens.filter(i => i.tipo === 'Demanda').map(i => i.reg));
    const vistos = new Set(), out = [], absorvidas = [];
    for (const i of itens) {
      if (i.tipo === TOPICO && !String(i.assunto || '').trim()) continue;
      const k = this.chaveItem(i);
      if (vistos.has(k)) continue;
      if (i.tipo === 'Ação') { const a = this.acao(i.reg); if (a && demSel.has(a.demanda)) { absorvidas.push(i.reg); continue; } }
      vistos.add(k); out.push(i);
    }
    return { itens: out, absorvidas };
  }

  // Demandas abertas do cliente com título parecido com o texto (para não criar tópico livre que já é registro).
  parecidas(cli, texto) {
    const A = tokens(texto);
    if (!A.size) return [];
    return this.demandas.filter(d => d.cli === cli && !d.encerrada).map(d => {
      const B = tokens(d.titulo);
      const i = [...A].filter(t => B.has(t)).length;
      const s = !B.size ? 0 : normTxt(d.titulo) === normTxt(texto) ? 2 : i >= Math.min(2, A.size, B.size) ? i / Math.min(A.size, B.size) : 0;
      return { d, s };
    }).filter(x => x.s >= 0.6).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.d);
  }

  validarConvocacao({ data, hora, local, convocados, itens }) {
    if (!data) throw new Error('Informe a data do fórum');
    if (!/^\d{2}:\d{2}$/.test(hora || '')) throw new Error('Informe o horário do fórum');
    if (!String(local || '').trim()) throw new Error('Informe o local do fórum');
    if (!convocados || !convocados.length) throw new Error('Escolha pelo menos um participante');
    if (!itens || !itens.length) throw new Error('Escolha pelo menos um item para a pauta');
  }

  // Cria os itens da pauta em ordem. Lê os códigos já usados uma vez só e numera em sequência.
  async criarItens(fo, itens, ordem0, origemPadrao) {
    const usados = new Set(this.pauta.map(x => x.id));
    for (const t of await this.be.titulos('GP_Pauta')) usados.add(t);
    const criados = [];
    let ordem = ordem0;
    try {
      for (const i of itens) {
        const code = this.proximo(usados, `${fo.id}-P`, 2);
        usados.add(code);
        ordem++;
        const assunto = (i.tipo === TOPICO ? String(i.assunto || '').trim() : (i.tipo === 'Demanda' ? (this.demanda(i.reg) || {}).titulo : (this.acao(i.reg) || {}).acao) || i.assunto || '').slice(0, 255);
        const f = { Title: code, ForumCodigo: fo.id, ClienteCodigo: fo.cli, Ordem: ordem, Tipo: i.tipo, RegistroCodigo: i.tipo === TOPICO ? undefined : i.reg,
          Assunto: assunto, ResponsavelCodigo: i.resp || undefined, Origem: i.origem || origemPadrao, ItemAnterior: i.anterior || undefined };
        const it = await this.be.create('GP_Pauta', strip(f));
        const p = this.itemPautaDe({ id: it.id, etag: it.etag, fields: f });
        this.pauta.push(p); criados.push(p);
      }
    } catch (e) {
      for (const p of criados) { try { await this.be.remove('GP_Pauta', p.itemId); } catch (x) { /* a releitura mostra */ } }
      this.pauta = this.pauta.filter(x => !criados.includes(x));
      throw e;
    }
    return criados;
  }

  itemPautaDe(it) {
    const f = it.fields || {};
    let ev = [];
    try { ev = f.Desdobramentos ? JSON.parse(f.Desdobramentos) : []; } catch (e) { ev = []; }
    return { itemId: it.id, etag: it.etag, id: f.Title, forum: f.ForumCodigo, cli: f.ClienteCodigo, ordem: Number(f.Ordem) || 0, tipo: f.Tipo || TOPICO,
      reg: f.RegistroCodigo || null, assunto: f.Assunto || '', resp: f.ResponsavelCodigo || null, origem: f.Origem || 'Convocação', anterior: f.ItemAnterior || null,
      trat: f.Tratamento || null, eventos: Array.isArray(ev) ? ev : [], nota: f.Anotacao || '' };
  }

  async convocarForum({ cli, data, hora, local, convocados, itens }) {
    this.validarConvocacao({ data, hora, local, convocados, itens });
    const { itens: pauta } = this.normalizarPauta(itens);
    const base = `${cli}-FO-${data.replace(/-/g, '')}`;
    const f = { ClienteCodigo: cli, Data: toSP(data), Hora: hora, Local: String(local).trim().slice(0, 255), Situacao: 'Agendado',
      Convocados: convocados.join('; '), ConduzidoPor: this.user.name || '' };
    const { it, code } = await this.criar('GP_Foruns', this.foruns, usados => {
      let c = base, n = 2;
      while (usados.has(c)) c = `${base}-${n++}`;
      return c;
    }, c => ({ Title: c, ...f }));
    const fo = this.forumDe({ id: it.id, etag: it.etag, fields: { Title: code, ...f } });
    this.foruns.push(fo);
    try {
      await this.criarItens(fo, pauta, 0, 'Convocação');
    } catch (e) {
      try { await this.be.remove('GP_Foruns', fo.itemId); } catch (x) { /* a releitura mostra */ }
      this.foruns = this.foruns.filter(x => x !== fo);
      throw e;
    }
    return fo;
  }

  forumDe(it) {
    const f = it.fields || {};
    const lista = v => String(v || '').split(';').map(s => s.trim()).filter(Boolean);
    return { itemId: it.id, etag: it.etag, id: f.Title, cli: f.ClienteCodigo, data: d10(f.Data), hora: f.Hora || '', local: f.Local || '',
      // Fórum anterior à convocação (sem situação gravada): já aconteceu.
      situacao: f.Situacao || 'Realizado', antigo: !f.Situacao, conduzido: f.ConduzidoPor || '', convocados: lista(f.Convocados), presentes: lista(f.Presentes),
      participantes: f.Participantes || '', ata: f.Ata || '' };
  }

  // Só enquanto agendado: muda data, hora, local, convocados e pauta (itens novos entram, retirados vão para a lixeira).
  async editarConvocacao(fo, { data, hora, local, convocados, itens }) {
    if (fo.situacao !== 'Agendado') throw new Error('Só dá para editar a convocação de um fórum agendado');
    this.validarConvocacao({ data, hora, local, convocados, itens });
    const { itens: pauta } = this.normalizarPauta(itens);
    const f = { Data: toSP(data), Hora: hora, Local: String(local).trim().slice(0, 255), Convocados: convocados.join('; ') };
    await this.upd('GP_Foruns', fo, f);
    Object.assign(fo, { data, hora, local: f.Local, convocados: [...convocados] });
    const atuais = this.pautaDe(fo.id);
    const porChave = new Map(atuais.map(p => [this.chaveItem(p), p]));
    const manter = new Set();
    const novos = [];
    pauta.forEach((i, k) => { const p = porChave.get(this.chaveItem(i)); if (p) { manter.add(p); p._ordem = k + 1; } else novos.push({ i, ordem: k + 1 }); });
    for (const p of atuais.filter(x => !manter.has(x))) {
      await this.be.remove('GP_Pauta', p.itemId);
      this.pauta = this.pauta.filter(x => x !== p);
    }
    for (const p of manter) {
      if (p.ordem !== p._ordem) { await this.upd('GP_Pauta', p, { Ordem: p._ordem }); p.ordem = p._ordem; }
      delete p._ordem;
    }
    for (const { i, ordem } of novos) {
      const [p] = await this.criarItens(fo, [i], ordem - 1, 'Convocação');
      if (p.ordem !== ordem) { await this.upd('GP_Pauta', p, { Ordem: ordem }); p.ordem = ordem; }
    }
    return fo;
  }

  // Exclui o fórum em qualquer situação: o fórum, os itens da pauta e as deliberações dele vão para a lixeira do site
  // (restauráveis pelo SharePoint). As ações criadas no fórum continuam no plano. Itens que este fórum tinha trazido
  // de um fórum anterior voltam a aparecer como não tratados.
  async excluirForum(fo) {
    // Lê na hora o que está ligado ao fórum, para levar também o que outra pessoa incluiu depois que a tela carregou.
    const [pauta, delib] = await Promise.all([
      this.be.items('GP_Pauta', ['Title', 'ForumCodigo']),
      this.be.items('GP_Deliberacoes', ['Title', 'ForumCodigo'])
    ]);
    const filhos = [...pauta.filter(it => it.fields.ForumCodigo === fo.id).map(it => ['GP_Pauta', it.id]),
      ...delib.filter(it => it.fields.ForumCodigo === fo.id).map(it => ['GP_Deliberacoes', it.id])];
    // Primeiro o fórum: se algo falhar depois, o que sobrar fica órfão e não aparece em lugar nenhum.
    await this.be.remove('GP_Foruns', fo.itemId);
    this.foruns = this.foruns.filter(x => x !== fo);
    if (this.forumAtivo === fo.id) this.forumAtivo = null;
    let falhas = 0;
    for (const [lista, id] of filhos) {
      try { await this.be.remove(lista, id); } catch (e) { console.error(e); falhas++; }
    }
    const nPauta = this.pauta.filter(x => x.forum === fo.id).length, nDelib = this.delib.filter(x => x.forum === fo.id).length;
    this.pauta = this.pauta.filter(x => x.forum !== fo.id);
    this.delib = this.delib.filter(x => x.forum !== fo.id);
    if (falhas) this.avisos.push(`O fórum foi excluído, mas ${falhas} ${falhas === 1 ? 'registro ligado a ele não foi' : 'registros ligados a ele não foram'} para a lixeira. Eles não aparecem no app.`);
    return { pauta: nPauta, delib: nDelib };
  }

  async cancelarForum(fo) {
    if (fo.situacao !== 'Agendado') throw new Error('Só dá para cancelar um fórum agendado');
    await this.upd('GP_Foruns', fo, { Situacao: 'Cancelado' });
    fo.situacao = 'Cancelado';
  }
  async reagendarForum(fo) {
    await this.upd('GP_Foruns', fo, { Situacao: 'Agendado' });
    fo.situacao = 'Agendado';
  }

  async iniciarForum(fo, presentes) {
    if (fo.situacao !== 'Agendado') throw new Error('Este fórum não está agendado');
    if (!presentes || !presentes.length) throw new Error('Marque quem está presente');
    const outro = this.forumEmAndamento(fo.cli);
    if (outro) throw new Error(`O fórum ${outro.id} deste cliente ainda está em andamento: encerre-o antes`);
    await this.upd('GP_Foruns', fo, { Situacao: 'Em andamento', Presentes: presentes.join('; ') });
    fo.situacao = 'Em andamento'; fo.presentes = [...presentes];
  }

  async atualizarPresentes(fo, presentes) {
    if (!presentes || !presentes.length) throw new Error('Marque quem está presente');
    await this.upd('GP_Foruns', fo, { Presentes: presentes.join('; ') });
    fo.presentes = [...presentes];
  }

  // Encerra: item sem tratamento vira "Não tratado" e vai para a pauta do próximo fórum do cliente.
  async encerrarForum(fo) {
    if (fo.situacao !== 'Em andamento') throw new Error('Este fórum não está em andamento');
    for (const p of this.pautaDe(fo.id).filter(x => !x.trat)) {
      await this.upd('GP_Pauta', p, { Tratamento: 'Não tratado' });
      p.trat = 'Não tratado';
    }
    await this.upd('GP_Foruns', fo, { Situacao: 'Realizado' });
    fo.situacao = 'Realizado';
    if (this.forumAtivo === fo.id) this.forumAtivo = null;
  }

  async salvarAta(fo, texto) {
    if (fo.situacao !== 'Realizado') throw new Error('A ata é salva depois de encerrar o fórum');
    await this.upd('GP_Foruns', fo, { Ata: texto });
    fo.ata = texto;
    return fo;
  }

  // Durante o fórum: inclui um registro existente, um tópico livre ou o registro novo criado na reunião.
  async incluirNaPauta(fo, item, origem = 'Incluído no fórum') {
    if (fo.situacao !== 'Em andamento') throw new Error('Só dá para incluir na pauta com o fórum em andamento');
    const atuais = this.pautaDe(fo.id);
    if (atuais.some(p => this.chaveItem(p) === this.chaveItem(item))) throw new Error('Este item já está na pauta');
    if (item.tipo === 'Ação') {
      const a = this.acao(item.reg);
      const dem = a && atuais.find(p => p.tipo === 'Demanda' && p.reg === a.demanda);
      if (dem) throw new Error(`A demanda desta ação já está na pauta (item ${dem.ordem})`);
    }
    const max = atuais.reduce((m, p) => Math.max(m, p.ordem || 0), 0);
    const [p] = await this.criarItens(fo, [{ ...item, origem }], max, origem);
    return p;
  }

  async marcarTratamento(p, trat) {
    if (!TRATAMENTOS.includes(trat)) throw new Error('Tratamento inválido');
    const ant = p.trat;
    await this.upd('GP_Pauta', p, { Tratamento: trat });
    p.trat = trat;
    return ant;
  }
  async desmarcarTratamento(p, ant) {
    await this.upd('GP_Pauta', p, { Tratamento: ant || null });
    p.trat = ant || null;
  }

  async salvarAnotacao(p, texto) {
    const t = String(texto || '').trim().slice(0, 4000);
    const f = { Anotacao: t || null };
    if (t && p.tipo === TOPICO && !p.trat) f.Tratamento = 'Tratado';
    await this.upd('GP_Pauta', p, f);
    p.nota = t;
    if (f.Tratamento) p.trat = f.Tratamento;
  }

  // ---------- desdobramentos: o que foi feito em cada item durante o fórum em andamento ----------
  // A tela do fórum marca qual fórum está sendo conduzido (forumAtivo) e, quando a pessoa cria algo a partir de
  // um item, qual é esse item (alvoPauta). Fora do fórum nada disso é registrado.
  itemAlvo(kind, obj) {
    if (!this.forumAtivo) return null;
    const itens = this.pautaDe(this.forumAtivo);
    if (this.alvoPauta) { const p = itens.find(x => x.id === this.alvoPauta); if (p) return p; }
    if (kind === 'acao') return itens.find(p => p.tipo === 'Ação' && p.reg === obj.id) || itens.find(p => p.tipo === 'Demanda' && p.reg === obj.demanda) || null;
    if (kind === 'dem') return itens.find(p => p.tipo === 'Demanda' && p.reg === obj.id) || null;
    return null;
  }

  tratamentoAuto(p) {
    const ev = p.eventos;
    if (!ev.length) return null;
    if (p.tipo === 'Ação') {
      const k = [...ev].reverse().find(e => ['concluida', 'repactuada', 'prazo', 'cancelada'].includes(e.k));
      return k ? { concluida: 'Concluído', repactuada: 'Repactuado', prazo: 'Repactuado', cancelada: 'Cancelado' }[k.k] : 'Tratado';
    }
    if (p.tipo === 'Demanda') {
      const fim = [...ev].reverse().find(e => e.k === 'encerrada' || e.k === 'cancelDem');
      if (fim) return fim.k === 'encerrada' ? 'Encerrado' : 'Cancelado';
      return 'Tratado';
    }
    return 'Tratado';
  }

  async gravarEventos(p, eventos) {
    const antes = p.eventos;
    p.eventos = eventos;
    const auto = this.tratamentoAuto(p);
    // Sem nenhum desdobramento, o item volta para "a tratar" (a não ser que a pessoa tenha marcado à mão).
    const trat = auto || (['Mantido', 'Não tratado'].includes(p.trat) || (p.tipo === TOPICO && p.nota) ? p.trat : null);
    try {
      await this.upd('GP_Pauta', p, { Desdobramentos: eventos.length ? JSON.stringify(eventos) : null, Tratamento: trat });
    } catch (e) { p.eventos = antes; throw e; }
    p.trat = trat;
  }

  // Registra o desdobramento no item da pauta. Não derruba a gravação principal: se falhar, avisa.
  async noForum(kind, obj, ev) {
    if (!this.forumAtivo || this._semLog) return;
    try {
      const fo = this.forum(this.forumAtivo);
      if (!fo || (obj.cli && obj.cli !== fo.cli)) return;
      let p = this.itemAlvo(kind, obj);
      if (!p) {
        if (!fo || fo.situacao !== 'Em andamento' || fo.cli !== obj.cli) return;
        p = await this.incluirNaPauta(fo, kind === 'dem' ? { tipo: 'Demanda', reg: obj.id } : { tipo: 'Ação', reg: obj.id });
      }
      let lista = [...p.eventos];
      // Trocar o responsável e depois voltar ao anterior não deixa rastro na ata.
      if (ev.k === 'resp') {
        const i = lista.map(e => e.k === 'resp' && e.cod === ev.cod).lastIndexOf(true);
        if (i >= 0 && lista[i].de === ev.resp) { lista.splice(i, 1); return await this.gravarEventos(p, lista); }
      }
      lista.push({ ...ev, em: new Date().toISOString() });
      await this.gravarEventos(p, lista);
    } catch (e) {
      console.error(e);
      this.avisos.push(`Gravei no registro, mas não consegui anotar na pauta do fórum: ${e.message || e}`);
    }
  }

  // Desfazer: tira da pauta o último desdobramento daquele tipo para aquele registro.
  async tirarDoForum(kinds, cod) {
    if (!this.forumAtivo) return;
    try {
      for (const p of this.pautaDe(this.forumAtivo)) {
        const i = p.eventos.map(e => kinds.includes(e.k) && e.cod === cod).lastIndexOf(true);
        if (i < 0) continue;
        const lista = [...p.eventos]; lista.splice(i, 1);
        await this.gravarEventos(p, lista);
        return;
      }
    } catch (e) {
      console.error(e);
      this.avisos.push(`Desfiz no registro, mas não consegui tirar da pauta do fórum: ${e.message || e}`);
    }
  }

  // Deliberação do fórum em andamento, sempre ligada a um item da pauta (alvoPauta).
  async registrarDeliberacao({ cli, texto, tipo, resp, dem, prazo, gera, area }) {
    const fo = this.forumAtivo ? this.forum(this.forumAtivo) : null;
    if (!fo || fo.situacao !== 'Em andamento' || fo.cli !== cli) throw new Error('A deliberação é registrada com o fórum em andamento');
    let acao = null;
    this._semLog = true;
    try {
      if (gera) acao = await this.novaAcao({ cli, acao: texto, porque: 'Deliberação do fórum', dem, resp, prazo,
        area: area || (dem && this.demanda(dem) && this.demanda(dem).area) || 'Controladoria', origem: 'Deliberação do fórum' });
    } finally { this._semLog = false; }
    const hoje = hojeISO();
    const demanda = dem || (acao && acao.demanda) || null;
    const f = { ClienteCodigo: cli, ForumCodigo: fo.id, Texto: texto, Tipo: tipo, ResponsavelCodigo: resp || undefined,
      DemandaCodigo: demanda || undefined, AcaoCodigo: acao ? acao.id : undefined, Data: toSP(hoje) };
    const { it, code } = await this.criar('GP_Deliberacoes', this.delib, u => this.proximo(u, `${cli}-DL-`, 2), c => ({ Title: c, ...f }));
    const x = { itemId: it.id, etag: it.etag, id: code, cli, forum: fo.id, texto, tipo, resp: resp || null, demanda, acaoId: acao ? acao.id : null, data: hoje };
    this.delib.push(x);
    const alvo = this.alvoPauta ? this.itemPauta(this.alvoPauta) : null;
    if (alvo) await this.noForum('delib', { cli, id: code }, { k: 'delib', dl: code, cod: acao ? acao.id : null, txt: texto, tipo, resp: resp || null, prazo: gera ? prazo : null });
    return x;
  }

  // ---------- ata ----------
  linhaEvento(e) {
    const q = e.resp ? ` (${this.nome(e.resp)})` : '';
    switch (e.k) {
      case 'concluida': return `Concluída: ${e.txt}${q}`;
      case 'repactuada': return `Novo prazo ${fmtBR(e.prazo)}${e.de ? ` (era ${fmtBR(e.de)})` : ''}: ${e.txt}${q}. Motivo: ${e.mot}`;
      case 'prazo': return `Prazo definido para ${fmtBR(e.prazo)}: ${e.txt}${q}`;
      case 'cancelada': return `Cancelada: ${e.txt}. Motivo: ${e.mot}`;
      case 'resp': return `Responsável passa a ser ${this.nome(e.resp)}: ${e.txt}`;
      case 'nova': return `Nova ação: ${e.txt} (${this.nome(e.resp)}, até ${fmtBR(e.prazo)})`;
      case 'encerrada': return 'Demanda encerrada';
      case 'cancelDem': return 'Demanda cancelada';
      case 'delib': return `${e.tipo || 'Deliberado'}: ${e.txt}${e.cod ? ` (ação ${e.cod}: ${this.nome(e.resp)}, até ${fmtBR(e.prazo)})` : q}`;
      default: return e.txt || '';
    }
  }

  ataDoForum(fo) {
    const cli = this.cliente(fo.cli);
    const L = [];
    L.push(`*Fórum de Gestão | ${cli ? cli.nome : fo.cli} | ${fmtBR(fo.data, true)}${fo.hora ? ' às ' + fo.hora : ''}*`);
    if (fo.local) L.push(`Local: ${fo.local}`);
    const pres = fo.presentes.map(c => this.nome(c));
    const aus = fo.convocados.filter(c => !fo.presentes.includes(c)).map(c => this.nome(c));
    if (pres.length) L.push(`Presentes: ${pres.join(', ')}`);
    if (aus.length) L.push(`Ausentes: ${aus.join(', ')}`);
    L.push('', '*Pauta*');
    const itens = this.pautaDe(fo.id);
    itens.forEach((p, k) => {
      const trat = p.trat === 'Não tratado' ? 'Não tratado, volta na próxima pauta' : (p.trat || 'Sem tratamento');
      L.push(`${k + 1}. ${this.tituloItem(p)} | ${trat}`);
      p.eventos.forEach(e => L.push(`   • ${this.linhaEvento(e)}`));
      if (p.nota) L.push(`   • ${p.nota.replace(/\n+/g, ' ')}`);
    });
    // Próximos passos: as ações criadas, repactuadas ou com novo responsável neste fórum que seguem abertas.
    const vistos = new Set(), passos = [];
    for (const p of itens) for (const e of p.eventos) {
      if (!['nova', 'repactuada', 'prazo', 'resp', 'delib'].includes(e.k) || !e.cod || vistos.has(e.cod)) continue;
      const a = this.acao(e.cod);
      if (!a || !(a.status === 'Não iniciada' || a.status === 'Em andamento')) continue;
      vistos.add(e.cod); passos.push(a);
    }
    if (passos.length) {
      L.push('', '*Próximos passos*');
      passos.sort((a, b) => (a.prazo || '9999').localeCompare(b.prazo || '9999'))
        .forEach(a => L.push(`• ${a.acao} | *${this.nome(a.resp)}* | até ${fmtBR(a.prazo)}`));
    }
    return L.join('\n');
  }

  // ---------- compromissos (um passo só, com data; fora dos números de ações) ----------
  async novoCompromisso({ cli, oque, tipo, resp, contra, data, hora, rec }) {
    const hoje = hojeISO(), por = this.user.name || this.user.username || 'Solve';
    const repete = rec && rec !== 'Única';
    const f = { ClienteCodigo: cli, OQue: oque.slice(0, 255), Tipo: tipo || 'Outro', ResponsavelCodigo: resp, ContraparteCodigo: (contra || '').slice(0, 255),
      Data: toSP(data), DataOriginal: toSP(data), Hora: hora, Recorrencia: rec || 'Única', Status: 'Pendente', Registro: toSP(hoje), RegistradoPor: por };
    const { it, code } = await this.criar('GP_Compromissos', this.compromissos, u => this.proximo(u, `${cli}-C`, 4),
      c => ({ Title: c, ...f, SerieCodigo: repete ? c : undefined }));
    const x = this.comp({ id: it.id, etag: it.etag, fields: { ...f, Title: code, SerieCodigo: repete ? code : null } });
    this.compromissos.push(x);
    return x;
  }

  // Próxima ocorrência de um compromisso que se repete, nunca antes de hoje.
  proximaDe(c) {
    const serie = this.serieDe(c);
    const base = serie[0] && serie[0].dataOrig ? Number(serie[0].dataOrig.slice(8, 10)) : null;
    const hoje = hojeISO();
    let d = proximaData(c.dataOrig || c.data, c.rec, base);
    for (let i = 0; d && d < hoje && i < 400; i++) d = proximaData(d, c.rec, base);
    return d;
  }

  async fecharCompromisso(c, status, resultado) {
    const hoje = hojeISO();
    const ant = { status: c.status, realizado: c.realizado, resultado: c.resultado };
    const f = { Status: status, DataRealizacao: status === 'Cancelado' ? null : toSP(hoje) };
    if (resultado !== undefined) f.Resultado = resultado || null;
    await this.upd('GP_Compromissos', c, f);
    c.status = status; c.realizado = status === 'Cancelado' ? null : hoje;
    if (resultado !== undefined) c.resultado = resultado || '';
    let prox = null;
    if (status !== 'Cancelado' && c.rec !== 'Única' && c.serie) {
      const quando = this.proximaDe(c);
      const ja = quando && this.compromissos.find(x => x.serie === c.serie && x.dataOrig === quando);
      if (quando && !ja) {
        try {
          prox = await this.criarOcorrencia(c, quando);
        } catch (e) {
          // Sem a próxima ocorrência a série se perderia: volta o compromisso ao estado anterior.
          try { await this.upd('GP_Compromissos', c, { Status: ant.status, DataRealizacao: toSP(ant.realizado) || null, Resultado: ant.resultado || null }); } catch (x) { /* a releitura mostra o estado real */ }
          c.status = ant.status; c.realizado = ant.realizado; c.resultado = ant.resultado;
          throw e;
        }
      }
    }
    return { c, ant, prox };
  }

  async criarOcorrencia(c, data) {
    const hoje = hojeISO(), por = this.user.name || this.user.username || 'Solve';
    const f = { ClienteCodigo: c.cli, OQue: c.oque, Tipo: c.tipo, ResponsavelCodigo: c.resp, ContraparteCodigo: c.contra, Data: toSP(data), DataOriginal: toSP(data),
      Hora: c.hora, Recorrencia: c.rec, Status: 'Pendente', SerieCodigo: c.serie, Registro: toSP(hoje), RegistradoPor: por };
    const { it, code } = await this.criar('GP_Compromissos', this.compromissos, u => this.proximo(u, `${c.cli}-C`, 4), x => ({ Title: x, ...f }));
    const x = this.comp({ id: it.id, etag: it.etag, fields: { ...f, Title: code } });
    this.compromissos.push(x);
    return x;
  }

  // Desfaz "feito"/"não ocorreu" feito por engano: apaga a ocorrência seguinte criada e volta para pendente.
  async desfazerFechamento(c, ant, prox) {
    if (prox) {
      await this.be.remove('GP_Compromissos', prox.itemId);
      this.compromissos = this.compromissos.filter(x => x !== prox);
    }
    await this.upd('GP_Compromissos', c, { Status: ant.status, DataRealizacao: toSP(ant.realizado) || null, Resultado: ant.resultado || null });
    c.status = ant.status; c.realizado = ant.realizado; c.resultado = ant.resultado;
  }

  async remarcarCompromisso(c, data, hora) {
    await this.upd('GP_Compromissos', c, { Data: toSP(data), Hora: hora || null });
    c.data = data; c.hora = hora || '';
  }

  async salvarResultado(c, texto) {
    await this.upd('GP_Compromissos', c, { Resultado: texto || null });
    c.resultado = texto || '';
  }

  async ligarDemanda(c, dem) {
    await this.upd('GP_Compromissos', c, { DemandaCodigo: dem });
    c.demanda = dem;
  }
}

// ---------- datas de compromissos que se repetem ----------
// Semanal: +7 dias. Mensal: mesmo dia do mês seguinte (o dia da série; 31 vira o último dia em meses mais curtos).
export function proximaData(iso, rec, diaBase) {
  if (!iso || !rec || rec === 'Única') return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (rec === 'Semanal') return new Date(Date.UTC(y, m - 1, d + 7)).toISOString().slice(0, 10);
  const ult = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(diaBase || d, ult))).toISOString().slice(0, 10);
}

// ---------- leitura de uma linha escrita como se fala ----------
// "Solicitar a Layra o envio da apuração de PIS e COFINS no dia 05/11/2026"
// -> { texto: "Solicitar a Layra o envio da apuração de PIS e COFINS", data: "2026-11-05", tipo: "Solicitar", contra: "MET-LAYRA-BRITO" }
const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const DIAS_SEM = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const isoUTC = (y, m, d) => { const x = new Date(Date.UTC(y, m - 1, d)); return x.getUTCFullYear() === y && x.getUTCMonth() === m - 1 && x.getUTCDate() === d ? x.toISOString().slice(0, 10) : null; };
const somaDias = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
export function lerLinha(txt, pessoas = [], hoje = hojeISO()) {
  let t = ' ' + String(txt || '').replace(/\s+/g, ' ').trim() + ' ';
  const out = { texto: '', data: null, hora: null, tipo: 'Outro', rec: null, contra: null, contraNome: '' };
  const tira = m => { t = t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length); };
  let m;
  const [hy, hm, hd] = hoje.split('-').map(Number);
  // repetição
  if ((m = /\s(?:todo|todos os|a cada)\s+(?:o\s+)?dias?\s+(\d{1,2})(?:\s+de\s+cada\s+m[eê]s|\s+do\s+m[eê]s)?(?=[\s,.;])/i.exec(t))) {
    const dia = Number(m[1]);
    if (dia >= 1 && dia <= 31) {
      out.rec = 'Mensal';
      let y = hy, mm = hm;
      const em = (yy, mo) => isoUTC(yy, mo, Math.min(dia, new Date(Date.UTC(yy, mo, 0)).getUTCDate()));
      let d = em(y, mm);
      if (d < hoje) { mm++; if (mm > 12) { mm = 1; y++; } d = em(y, mm); }
      out.data = d; tira(m);
    }
  } else if ((m = /\s(?:toda|todo|todas as|todos os)\s+(segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)s?(?:-feira)?s?(?=[\s,.;])/i.exec(t))) {
    out.rec = 'Semanal';
    const alvo = DIAS_SEM.indexOf(semAcento(m[1]).replace(/s$/, ''));
    const hojeDia = new Date(Date.UTC(hy, hm - 1, hd)).getUTCDay();
    out.data = somaDias(hoje, (alvo - hojeDia + 7) % 7); tira(m);
  } else if ((m = /\s(?:todo m[eê]s|mensalmente)(?=[\s,.;])/i.exec(t))) { out.rec = 'Mensal'; tira(m); }
  else if ((m = /\s(?:toda semana|semanalmente)(?=[\s,.;])/i.exec(t))) { out.rec = 'Semanal'; tira(m); }
  // data
  if ((m = /\s(?:(?:no|para o|pro|até o|ate o|em|o)\s+)?(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=[\s,.;])/i.exec(t))) {
    let y = m[3] ? Number(m[3]) : hy; if (y < 100) y += 2000;
    let d = isoUTC(y, Number(m[2]), Number(m[1]));
    if (d && !m[3] && d < hoje) d = isoUTC(y + 1, Number(m[2]), Number(m[1]));
    if (d) { out.data = d; tira(m); }
  } else if ((m = /\s(?:para\s+)?(hoje|amanh[ãa])(?=[\s,.;])/i.exec(t))) {
    out.data = /hoje/i.test(m[1]) ? hoje : somaDias(hoje, 1); tira(m);
  }
  // hora
  if ((m = /\s(?:[àa]s\s+|a partir das\s+)?(\d{1,2})(?::(\d{2})|h(\d{2})?)(?:\s*(?:h|hs|horas))?(?=[\s,.;])/i.exec(t)) || (m = /\s[àa]s\s+(\d{1,2})()()(?:\s*(?:h|hs|horas))?(?=[\s,.;])/i.exec(t))) {
    const h = Number(m[1]), mi = Number(m[2] || m[3] || 0);
    if (h <= 23 && mi <= 59) { out.hora = String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'); tira(m); }
  }
  out.texto = t.replace(/\s+/g, ' ').replace(/\s+([,.;])/g, '$1').trim().replace(/(?:[\s,;:–-]+(?:no|na|em|dia|para|pro|às|as|até))+$/i, '').replace(/[\s,;:–-]+$/, '').trim();
  const w = semAcento(out.texto.split(' ')[0]);
  if (/^(solicit|pedir|peca|cobrar|requisit)/.test(w)) out.tipo = 'Solicitar';
  else if (/^(reuni|alinhament|call|encontro|visita)/.test(w)) out.tipo = 'Reunião';
  else if (/^(enviar|entreg|mandar|apresent|encaminh|responder|devolver)/.test(w)) out.tipo = 'Entregar';
  // com quem: o primeiro nome citado que é de uma pessoa cadastrada; se nenhum, o nome logo depois do verbo
  const primeiro = s => semAcento(String(s).trim().split(/\s+/)[0]);
  const re = /(?:^|\s)(?:a|à|ao|com|para|pra|de|da|do|o)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ]+(?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ]+)?)/g;
  let c;
  while ((c = re.exec(out.texto))) {
    const nomes = c[1].split(/\s+/);
    const achada = pessoas.find(p => semAcento(p.nome) === semAcento(c[1])) || pessoas.find(p => primeiro(p.nome) === primeiro(nomes[0]));
    if (achada) { out.contra = achada.id; out.contraNome = achada.nome; break; }
  }
  if (!out.contra && (c = /^\S+\s+(?:a|à|ao|com|para)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ]+)/.exec(out.texto) || /\scom\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ]+)/.exec(out.texto))) out.contraNome = c[1];
  return out;
}
