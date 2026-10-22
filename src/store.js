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
  GP_Foruns: ['Title', 'ClienteCodigo', 'Data', 'ConduzidoPor', 'Participantes', 'Ata'],
  GP_Deliberacoes: ['Title', 'ClienteCodigo', 'ForumCodigo', 'Texto', 'Tipo', 'ResponsavelCodigo', 'DemandaCodigo', 'AcaoCodigo', 'Data'],
  GP_Indicadores: ['Title', 'ClienteCodigo', 'Area', 'Nome', 'Formula', 'Unidade', 'Polaridade', 'Frequencia', 'ResponsavelCodigo', 'Situacao'],
  GP_Medicoes: ['Title', 'IndicadorCodigo', 'ClienteCodigo', 'Mes', 'Meta', 'Realizado', 'Comentario'],
  GP_Compromissos: ['Title', 'ClienteCodigo', 'OQue', 'Tipo', 'ResponsavelCodigo', 'ContraparteCodigo', 'Data', 'DataOriginal', 'Hora', 'Recorrencia',
    'Status', 'DataRealizacao', 'Resultado', 'SerieCodigo', 'DemandaCodigo', 'Registro', 'RegistradoPor']
};
// Listas que o app tolera não encontrar (o resto do app segue funcionando sem elas).
const OPCIONAIS = new Set(['GP_Compromissos']);
export const TIPOS_COMP = ['Solicitar', 'Entregar', 'Reunião', 'Outro'];
export const REPETICOES = ['Única', 'Semanal', 'Mensal'];

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
    this.reprog = []; this.foruns = []; this.delib = []; this.indicadores = []; this.medicoes = []; this.compromissos = [];
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
    this.foruns = raw.GP_Foruns.map(it => { const f = F(it); return {
      itemId: it.id, etag: it.etag, id: f.Title, cli: f.ClienteCodigo, data: d10(f.Data), conduzido: f.ConduzidoPor || '', participantes: f.Participantes || '', ata: f.Ata || '' }; });
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
  }

  // Desfaz uma conclusão feita por engano (volta ao status anterior e limpa a data).
  async desfazerConclusao(a, statusAnterior) {
    const st = statusAnterior === 'Não iniciada' ? 'Não iniciada' : 'Em andamento';
    await this.upd('GP_Acoes', a, { Status: st, DataConclusao: null });
    a.status = st; a.conclusao = null; a.modifiedDay = hojeISO();
  }

  async iniciar(a) {
    await this.upd('GP_Acoes', a, { Status: 'Em andamento' });
    a.status = 'Em andamento'; a.modifiedDay = hojeISO();
  }

  async definirPrazo(a, prazo) {
    await this.upd('GP_Acoes', a, { Prazo: toSP(prazo), PrazoOriginal: toSP(prazo) });
    a.prazo = prazo; a.prazoOriginal = prazo; a.modifiedDay = hojeISO();
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
  }

  async cancelar(a, motivo) {
    await this.upd('GP_Acoes', a, { Status: 'Cancelada', MotivoCancelamento: motivo });
    a.status = 'Cancelada'; a.motivoCancel = motivo; a.modifiedDay = hojeISO();
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
    return ant;
  }

  async encerrarDemanda(d) {
    const hoje = hojeISO();
    await this.upd('GP_Demandas', d, { Encerrada: true, DataEncerramento: toSP(hoje) });
    d.encerrada = true; d.dataEnc = hoje;
  }

  async reabrirDemanda(d) {
    await this.upd('GP_Demandas', d, { Encerrada: false, DataEncerramento: null });
    d.encerrada = false; d.dataEnc = null;
  }

  async novaAcao({ cli, acao, porque, dem, resp, prazo, area, como, origem }) {
    const hoje = hojeISO();
    let demanda = dem ? this.demanda(dem) : null;
    if (!demanda) {
      const f = { ClienteCodigo: cli, Assunto: acao.slice(0, 255), Tipo: 'Pendência', ResponsavelCodigo: resp, Area: area,
        PrazoDemanda: toSP(prazo), Encerrada: false, Origem: origem };
      const { it, code } = await this.criar('GP_Demandas', this.demandas, u => this.proximo(u, `${cli}-PD-`, 2), c => ({ Title: c, ...f }));
      demanda = { itemId: it.id, etag: it.etag, id: code, cli, titulo: f.Assunto, tipo: 'Pendência', frente: null, prioridade: null, resp, area, prazo,
        encerrada: false, dataEnc: null, origem, statusOriginal: '', nota: '' };
      this.demandas.push(demanda);
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
    return a;
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

  forumDeHoje(cli) {
    const hoje = hojeISO();
    return this.foruns.find(f => f.cli === cli && f.data === hoje) || null;
  }

  async garantirForum(cli) {
    const ex = this.forumDeHoje(cli);
    if (ex) return ex;
    const hoje = hojeISO();
    // Outra pessoa pode ter aberto o fórum de hoje depois que esta tela foi carregada: usa o dela.
    const lidos = await this.be.items('GP_Foruns', ['Title', 'ClienteCodigo', 'Data', 'ConduzidoPor', 'Participantes', 'Ata']);
    const dele = lidos.find(it => it.fields.ClienteCodigo === cli && d10(it.fields.Data) === hoje);
    if (dele) {
      const fo = { itemId: dele.id, etag: dele.etag, id: dele.fields.Title, cli, data: hoje, conduzido: dele.fields.ConduzidoPor || '',
        participantes: dele.fields.Participantes || '', ata: dele.fields.Ata || '', externo: true };
      this.foruns.push(fo);
      return fo;
    }
    const base = `${cli}-FO-${hoje.replace(/-/g, '')}`;
    const f = { ClienteCodigo: cli, Data: toSP(hoje), ConduzidoPor: this.user.name || '' };
    const { it, code } = await this.criar('GP_Foruns', this.foruns, usados => {
      let c = base, n = 2;
      while (usados.has(c)) c = `${base}-${n++}`;
      return c;
    }, c => ({ Title: c, ...f }));
    const fo = { itemId: it.id, etag: it.etag, id: code, cli, data: hoje, conduzido: f.ConduzidoPor, participantes: '', ata: '' };
    this.foruns.push(fo);
    return fo;
  }

  async registrarDeliberacao({ cli, texto, tipo, resp, dem, prazo, gera, area }) {
    const fo = await this.garantirForum(cli);
    let acao = null;
    if (gera) acao = await this.novaAcao({ cli, acao: texto, porque: 'Deliberação do fórum', dem, resp, prazo,
      area: area || (dem && this.demanda(dem) && this.demanda(dem).area) || 'Controladoria', origem: 'Deliberação do fórum' });
    const hoje = hojeISO();
    const demanda = dem || (acao && acao.demanda) || null;
    const f = { ClienteCodigo: cli, ForumCodigo: fo.id, Texto: texto, Tipo: tipo, ResponsavelCodigo: resp || undefined,
      DemandaCodigo: demanda || undefined, AcaoCodigo: acao ? acao.id : undefined, Data: toSP(hoje) };
    const { it, code } = await this.criar('GP_Deliberacoes', this.delib, u => this.proximo(u, `${cli}-DL-`, 2), c => ({ Title: c, ...f }));
    const x = { itemId: it.id, etag: it.etag, id: code, cli, forum: fo.id, texto, tipo, resp: resp || null, demanda, acaoId: acao ? acao.id : null, data: hoje };
    this.delib.push(x);
    return x;
  }

  async salvarAta(cli, texto, participantes) {
    const fo = await this.garantirForum(cli);
    if (fo.externo && fo.ata && fo.ata !== texto)
      throw Object.assign(new Error('Outra pessoa já registrou a ata do fórum de hoje deste cliente'), { status: 412 });
    await this.upd('GP_Foruns', fo, strip({ Ata: texto, Participantes: participantes }));
    fo.externo = false;
    fo.ata = texto;
    if (participantes) fo.participantes = participantes;
    return fo;
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
