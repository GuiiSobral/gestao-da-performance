// Modelo de dados da Gestão da Performance sobre as 10 listas GP_* e as regras de gravação.

export const AREAS = ['Administrativo', 'Comercial', 'Compras', 'Controladoria', 'Departamento Pessoal', 'Expedição',
  'Faturamento', 'Financeiro', 'Obras', 'Recursos Humanos', 'Técnico'];

export const LISTS = {
  GP_Clientes: ['Title', 'Nome', 'ConsultorCodigo', 'SupervisorCodigo', 'Situacao', 'NaNovaBase', 'PastaSharePoint', 'ArquivoOrigem'],
  GP_Pessoas: ['Title', 'Nome', 'ClienteCodigo', 'Empresa', 'Nominal', 'Email', 'WhatsApp', 'Ativo'],
  GP_Frentes: ['Title', 'ClienteCodigo', 'Nome', 'Area', 'DonoCodigo', 'Apoio', 'Inicio', 'FimPrevisto', 'Encerrada', 'DataEncerramento', 'StatusOrigem', 'NotaMigracao'],
  GP_Demandas: ['Title', 'ClienteCodigo', 'Assunto', 'Tipo', 'FrenteCodigo', 'Prioridade', 'ResponsavelCodigo', 'Area', 'PrazoDemanda', 'Encerrada', 'DataEncerramento', 'Origem', 'StatusOrigem', 'NotaMigracao'],
  GP_Acoes: ['Title', 'ClienteCodigo', 'DemandaCodigo', 'OQue', 'Problema', 'Causa', 'ResponsavelCodigo', 'Apoio', 'Area', 'Como', 'Quanto', 'Inicio', 'PrazoOriginal', 'Prazo', 'Status', 'DataConclusao', 'MotivoCancelamento', 'Origem', 'Registro', 'LinhaOrigem', 'ArquivoOrigem', 'StatusOrigem', 'ResponsavelOrigem'],
  GP_Reprogramacoes: ['Title', 'AcaoCodigo', 'ClienteCodigo', 'PrazoAnterior', 'PrazoNovo', 'Motivo', 'RegistradoEm', 'RegistradoPor'],
  GP_Foruns: ['Title', 'ClienteCodigo', 'Data', 'ConduzidoPor', 'Participantes', 'Ata'],
  GP_Deliberacoes: ['Title', 'ClienteCodigo', 'ForumCodigo', 'Texto', 'Tipo', 'ResponsavelCodigo', 'DemandaCodigo', 'AcaoCodigo', 'Data'],
  GP_Indicadores: ['Title', 'ClienteCodigo', 'Area', 'Nome', 'Formula', 'Unidade', 'Polaridade', 'Frequencia', 'ResponsavelCodigo', 'Situacao'],
  GP_Medicoes: ['Title', 'IndicadorCodigo', 'ClienteCodigo', 'Mes', 'Meta', 'Realizado', 'Comentario']
};

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
const firstName = s => str(s).trim().split(/\s+/)[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export class Store {
  constructor(backend, user) {
    this.be = backend;
    this.user = user || { name: 'Solve', username: '' };
    this.loadedAt = null;
    this.clear();
  }

  clear() {
    this.clientes = []; this.pessoas = []; this.frentes = []; this.demandas = []; this.acoes = [];
    this.reprog = []; this.foruns = []; this.delib = []; this.indicadores = []; this.medicoes = [];
  }

  async load() {
    const names = Object.keys(LISTS);
    const res = await Promise.all(names.map(n => this.be.items(n, LISTS[n])));
    const raw = Object.fromEntries(names.map((n, i) => [n, res[i]]));
    this.build(raw);
    this.loadedAt = new Date();
  }

  build(raw) {
    this.clear();
    const F = it => it.fields || {};
    this.clientes = raw.GP_Clientes.map(it => { const f = F(it); return {
      itemId: it.id, id: f.Title, nome: f.Nome || f.Title, consultor: f.ConsultorCodigo || null, supervisor: f.SupervisorCodigo || null,
      situacao: f.Situacao || 'Ativo', naNovaBase: !!f.NaNovaBase, pasta: f.PastaSharePoint || '', arquivo: f.ArquivoOrigem || '' }; })
      .sort((a, b) => a.nome.localeCompare(b.nome));
    this.pessoas = raw.GP_Pessoas.map(it => { const f = F(it); return {
      itemId: it.id, id: f.Title, nome: f.Nome || f.Title, cli: f.ClienteCodigo || null, empresa: f.Empresa || 'Cliente',
      nominal: !!f.Nominal, email: str(f.Email).toLowerCase(), whats: f.WhatsApp || '', ativo: f.Ativo !== false }; });
    this.frentes = raw.GP_Frentes.map(it => { const f = F(it); return {
      itemId: it.id, id: f.Title, cli: f.ClienteCodigo, nome: f.Nome || f.Title, area: f.Area || '', dono: f.DonoCodigo || null,
      apoio: f.Apoio || '', inicio: d10(f.Inicio), fim: d10(f.FimPrevisto), encerrada: !!f.Encerrada, dataEnc: d10(f.DataEncerramento),
      statusOriginal: f.StatusOrigem || '', nota: f.NotaMigracao || '' }; });
    this.demandas = raw.GP_Demandas.map(it => { const f = F(it); return {
      itemId: it.id, id: f.Title, cli: f.ClienteCodigo, titulo: f.Assunto || f.Title, tipo: f.Tipo || 'Pendência', frente: f.FrenteCodigo || null,
      prioridade: f.Prioridade || null, resp: f.ResponsavelCodigo || null, area: f.Area || '', prazo: d10(f.PrazoDemanda),
      encerrada: !!f.Encerrada, dataEnc: d10(f.DataEncerramento), origem: f.Origem || '', statusOriginal: f.StatusOrigem || '', nota: f.NotaMigracao || '' }; });
    this.reprog = raw.GP_Reprogramacoes.map(it => { const f = F(it); return {
      itemId: it.id, id: f.Title, acao: f.AcaoCodigo, cli: f.ClienteCodigo, de: d10(f.PrazoAnterior), para: d10(f.PrazoNovo),
      motivo: f.Motivo || '', em: d10(f.RegistradoEm), por: f.RegistradoPor || '' }; });
    const rp = {};
    for (const r of this.reprog) (rp[r.acao] = rp[r.acao] || []).push(r);
    for (const k in rp) rp[k].sort((a, b) => (a.em || '').localeCompare(b.em || '') || a.id.localeCompare(b.id, 'pt', { numeric: true }));
    this.acoes = raw.GP_Acoes.map(it => { const f = F(it); return {
      itemId: it.id, id: f.Title, cli: f.ClienteCodigo, demanda: f.DemandaCodigo, acao: f.OQue || '', problema: f.Problema || '', causa: f.Causa || '',
      resp: f.ResponsavelCodigo || null, apoio: f.Apoio || '', area: f.Area || '', como: f.Como || '', quanto: f.Quanto ?? null,
      inicio: d10(f.Inicio), prazoOriginal: d10(f.PrazoOriginal), prazo: d10(f.Prazo), status: f.Status || 'Não iniciada',
      conclusao: d10(f.DataConclusao), motivoCancel: f.MotivoCancelamento || '', origem: f.Origem || '', registro: d10(f.Registro),
      linha: f.LinhaOrigem || null, arquivo: f.ArquivoOrigem || '', statusOriginal: f.StatusOrigem || '', respOriginal: f.ResponsavelOrigem || '',
      modifiedDay: localDay(it.modified), reprogramacoes: rp[f.Title] || [] }; });
    this.foruns = raw.GP_Foruns.map(it => { const f = F(it); return {
      itemId: it.id, id: f.Title, cli: f.ClienteCodigo, data: d10(f.Data), conduzido: f.ConduzidoPor || '', participantes: f.Participantes || '', ata: f.Ata || '' }; });
    this.delib = raw.GP_Deliberacoes.map(it => { const f = F(it); return {
      itemId: it.id, id: f.Title, cli: f.ClienteCodigo, forum: f.ForumCodigo || null, texto: f.Texto || '', tipo: f.Tipo || 'Deliberado',
      resp: f.ResponsavelCodigo || null, demanda: f.DemandaCodigo || null, acaoId: f.AcaoCodigo || null, data: d10(f.Data) }; });
    this.indicadores = raw.GP_Indicadores.map(it => { const f = F(it); return {
      itemId: it.id, id: f.Title, cli: f.ClienteCodigo, area: f.Area || '', nome: f.Nome || f.Title, unidade: f.Unidade || '',
      polaridade: f.Polaridade || 'Maior é melhor', resp: f.ResponsavelCodigo || null, situacao: f.Situacao || 'Definido' }; });
    this.medicoes = raw.GP_Medicoes.map(it => { const f = F(it); return {
      itemId: it.id, id: f.Title, indicador: f.IndicadorCodigo, cli: f.ClienteCodigo, mes: d10(f.Mes),
      meta: f.Meta ?? null, realizado: f.Realizado ?? null, comentario: f.Comentario || '' }; });
  }

  // ---------- consultas ----------
  pessoa(code) { return this.pessoas.find(p => p.id === code) || null; }
  nome(code) { const p = this.pessoa(code); return p ? p.nome : (code || ''); }
  nominal(code) { const p = this.pessoa(code); return !!(p && p.nominal); }
  cliente(code) { return this.clientes.find(c => c.id === code) || null; }
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
  proximo(lista, prefixo, digitos) {
    const re = new RegExp('^' + prefixo.replace(/[-]/g, '\\-') + '(\\d+)$');
    let max = 0;
    for (const x of lista) { const m = re.exec(x.id || ''); if (m) max = Math.max(max, Number(m[1])); }
    return prefixo + String(max + 1).padStart(digitos, '0');
  }

  // ---------- gravações (cada uma vai direto para a lista e atualiza a tela) ----------
  async concluir(a) {
    const hoje = hojeISO();
    await this.be.update('GP_Acoes', a.itemId, { Status: 'Concluída', DataConclusao: toSP(hoje) });
    a.status = 'Concluída'; a.conclusao = hoje; a.modifiedDay = hoje;
  }

  // Desfaz uma conclusão feita por engano (volta ao status anterior e limpa a data).
  async desfazerConclusao(a, statusAnterior) {
    const st = statusAnterior === 'Não iniciada' ? 'Não iniciada' : 'Em andamento';
    await this.be.update('GP_Acoes', a.itemId, { Status: st, DataConclusao: null });
    a.status = st; a.conclusao = null; a.modifiedDay = hojeISO();
  }

  async iniciar(a) {
    await this.be.update('GP_Acoes', a.itemId, { Status: 'Em andamento' });
    a.status = 'Em andamento'; a.modifiedDay = hojeISO();
  }

  async definirPrazo(a, prazo) {
    await this.be.update('GP_Acoes', a.itemId, { Prazo: toSP(prazo), PrazoOriginal: toSP(prazo) });
    a.prazo = prazo; a.prazoOriginal = prazo; a.modifiedDay = hojeISO();
  }

  async reprogramar(a, prazo, motivo) {
    const hoje = hojeISO();
    let n = a.reprogramacoes.length + 1, code = `${a.id}-R${n}`;
    while (this.reprog.some(r => r.id === code)) code = `${a.id}-R${++n}`;
    const f = { Title: code, AcaoCodigo: a.id, ClienteCodigo: a.cli, PrazoAnterior: toSP(a.prazo), PrazoNovo: toSP(prazo),
      Motivo: motivo, RegistradoEm: toSP(hoje), RegistradoPor: this.user.name || this.user.username || 'Solve' };
    const it = await this.be.create('GP_Reprogramacoes', strip(f));
    await this.be.update('GP_Acoes', a.itemId, { Prazo: toSP(prazo) });
    const r = { itemId: it.id, id: code, acao: a.id, cli: a.cli, de: a.prazo, para: prazo, motivo, em: hoje, por: f.RegistradoPor };
    this.reprog.push(r);
    a.reprogramacoes = [...a.reprogramacoes, r];
    a.prazo = prazo; a.modifiedDay = hoje;
  }

  async cancelar(a, motivo) {
    await this.be.update('GP_Acoes', a.itemId, { Status: 'Cancelada', MotivoCancelamento: motivo });
    a.status = 'Cancelada'; a.motivoCancel = motivo; a.modifiedDay = hojeISO();
  }

  async encerrarDemanda(d) {
    const hoje = hojeISO();
    await this.be.update('GP_Demandas', d.itemId, { Encerrada: true, DataEncerramento: toSP(hoje) });
    d.encerrada = true; d.dataEnc = hoje;
  }

  async reabrirDemanda(d) {
    await this.be.update('GP_Demandas', d.itemId, { Encerrada: false, DataEncerramento: null });
    d.encerrada = false; d.dataEnc = null;
  }

  async novaAcao({ cli, acao, porque, dem, resp, prazo, area, como, origem }) {
    const hoje = hojeISO();
    let demanda = dem ? this.demanda(dem) : null;
    if (!demanda) {
      const code = this.proximo(this.demandas.filter(d => d.cli === cli), `${cli}-PD-`, 2);
      const f = { Title: code, ClienteCodigo: cli, Assunto: acao.slice(0, 255), Tipo: 'Pendência', ResponsavelCodigo: resp, Area: area,
        PrazoDemanda: toSP(prazo), Encerrada: false, Origem: origem };
      const it = await this.be.create('GP_Demandas', strip(f));
      demanda = { itemId: it.id, id: code, cli, titulo: f.Assunto, tipo: 'Pendência', frente: null, prioridade: null, resp, area, prazo,
        encerrada: false, dataEnc: null, origem, statusOriginal: '', nota: '' };
      this.demandas.push(demanda);
    } else if (demanda.encerrada) {
      await this.be.update('GP_Demandas', demanda.itemId, { Encerrada: false });
      demanda.encerrada = false;
    }
    const id = this.proximo(this.acoes.filter(a => a.cli === cli), `${cli}-A`, 3);
    const f = { Title: id, ClienteCodigo: cli, DemandaCodigo: demanda.id, OQue: acao.slice(0, 255), Problema: (porque || '').slice(0, 255),
      ResponsavelCodigo: resp, Area: area, Como: como, Inicio: toSP(hoje), PrazoOriginal: toSP(prazo), Prazo: toSP(prazo),
      Status: 'Não iniciada', Origem: origem, Registro: toSP(hoje) };
    const it = await this.be.create('GP_Acoes', strip(f));
    const a = { itemId: it.id, id, cli, demanda: demanda.id, acao, problema: porque || '', causa: '', resp, apoio: '', area, como: como || '',
      quanto: null, inicio: hoje, prazoOriginal: prazo, prazo, status: 'Não iniciada', conclusao: null, motivoCancel: '', origem,
      registro: hoje, linha: null, arquivo: '', statusOriginal: '', respOriginal: '', modifiedDay: hoje, reprogramacoes: [] };
    this.acoes.push(a);
    return a;
  }

  forumDeHoje(cli) {
    const hoje = hojeISO();
    return this.foruns.find(f => f.cli === cli && f.data === hoje) || null;
  }

  async garantirForum(cli) {
    const ex = this.forumDeHoje(cli);
    if (ex) return ex;
    const hoje = hojeISO();
    let code = `${cli}-FO-${hoje.replace(/-/g, '')}`;
    let n = 2;
    while (this.foruns.some(f => f.id === code)) code = `${cli}-FO-${hoje.replace(/-/g, '')}-${n++}`;
    const f = { Title: code, ClienteCodigo: cli, Data: toSP(hoje), ConduzidoPor: this.user.name || '' };
    const it = await this.be.create('GP_Foruns', strip(f));
    const fo = { itemId: it.id, id: code, cli, data: hoje, conduzido: f.ConduzidoPor, participantes: '', ata: '' };
    this.foruns.push(fo);
    return fo;
  }

  async registrarDeliberacao({ cli, texto, tipo, resp, dem, prazo, gera, area }) {
    const fo = await this.garantirForum(cli);
    let acao = null;
    if (gera) acao = await this.novaAcao({ cli, acao: texto, porque: 'Deliberação do fórum', dem, resp, prazo,
      area: area || (dem && this.demanda(dem) && this.demanda(dem).area) || 'Controladoria', origem: 'Deliberação do fórum' });
    const code = this.proximo(this.delib.filter(x => x.cli === cli), `${cli}-DL-`, 2);
    const hoje = hojeISO();
    const demanda = dem || (acao && acao.demanda) || null;
    const f = { Title: code, ClienteCodigo: cli, ForumCodigo: fo.id, Texto: texto, Tipo: tipo, ResponsavelCodigo: resp || undefined,
      DemandaCodigo: demanda || undefined, AcaoCodigo: acao ? acao.id : undefined, Data: toSP(hoje) };
    const it = await this.be.create('GP_Deliberacoes', strip(f));
    const x = { itemId: it.id, id: code, cli, forum: fo.id, texto, tipo, resp: resp || null, demanda, acaoId: acao ? acao.id : null, data: hoje };
    this.delib.push(x);
    return x;
  }

  async salvarAta(cli, texto, participantes) {
    const fo = await this.garantirForum(cli);
    await this.be.update('GP_Foruns', fo.itemId, strip({ Ata: texto, Participantes: participantes }));
    fo.ata = texto;
    if (participantes) fo.participantes = participantes;
    return fo;
  }
}
