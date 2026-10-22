// Cria no SharePoint o que o Fórum com convocação precisa (22/10/2026):
//   GP_Foruns: colunas Hora, Local, Situacao, Convocados e Presentes
//   GP_Pauta: lista nova, com histórico de versões e índices
// Rodar no console do navegador numa página do site Solve Group Base Centralizada, com uma conta que pode criar listas.
// Pode rodar de novo: o que já existe é mantido.
(async () => {
  const web = 'https://solvegroup940.sharepoint.com/sites/SolveGroupBaseCentralizada/_api/web';
  const J = 'application/json;odata=nometadata';
  const digest = async () => (await (await fetch(web.replace('/_api/web', '/_api/contextinfo'), { method: 'POST', headers: { Accept: J } })).json()).FormDigestValue;
  let D = await digest();
  const req = async (method, url, body, extra = {}) => {
    const r = await fetch(url, { method, headers: { Accept: J, 'Content-Type': J, 'X-RequestDigest': D, ...extra }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${await r.text()}`);
    return r.status === 204 || method === 'MERGE' ? null : r.json();
  };
  const lista = t => `${web}/lists/getbytitle('${t}')`;
  const existe = async t => (await fetch(lista(t), { headers: { Accept: J } })).ok;
  const campos = async t => new Set((await req('GET', `${lista(t)}/fields?$select=InternalName&$top=500`)).value.map(f => f.InternalName));
  const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const xml = ({ nome, tipo, opcoes, linhas }) => {
    const base = `Name="${nome}" StaticName="${nome}" DisplayName="${nome}"`;
    if (tipo === 'Text') return `<Field Type="Text" ${base} MaxLength="255" />`;
    if (tipo === 'Number') return `<Field Type="Number" ${base} Decimals="0" />`;
    if (tipo === 'Note') return `<Field Type="Note" ${base} NumLines="${linhas || 6}" RichText="FALSE" />`;
    if (tipo === 'Choice') return `<Field Type="Choice" ${base} Format="Dropdown" FillInChoice="FALSE"><CHOICES>${opcoes.map(o => `<CHOICE>${esc(o)}</CHOICE>`).join('')}</CHOICES></Field>`;
    throw new Error(tipo);
  };
  const criarCampos = async (t, defs) => {
    const tem = await campos(t);
    for (const d of defs) {
      if (!tem.has(d.nome)) {
        await req('POST', `${lista(t)}/fields/createfieldasxml`, { parameters: { SchemaXml: xml(d), Options: 24 } });
        console.log(`${t}: coluna ${d.nome} criada`);
      }
      const f = `${lista(t)}/fields/getbyinternalnameortitle('${d.nome}')`;
      await req('POST', f, { Title: d.exib, Indexed: !!d.indice }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
    }
  };

  // GP_Foruns: o fórum passa a nascer de uma convocação
  await criarCampos('GP_Foruns', [
    { nome: 'Hora', tipo: 'Text', exib: 'Horário' },
    { nome: 'Local', tipo: 'Text', exib: 'Local' },
    { nome: 'Situacao', tipo: 'Choice', exib: 'Situação', opcoes: ['Agendado', 'Em andamento', 'Realizado', 'Cancelado'], indice: true },
    { nome: 'Convocados', tipo: 'Note', exib: 'Convocados', linhas: 3 },
    { nome: 'Presentes', tipo: 'Note', exib: 'Presentes', linhas: 3 }
  ]);

  // GP_Pauta: um item por assunto da pauta de cada fórum
  if (!(await existe('GP_Pauta'))) {
    await req('POST', `${web}/lists`, { Title: 'GP_Pauta', BaseTemplate: 100, Description: 'Itens da pauta de cada fórum: demanda, ação ou tópico livre, com o tratamento e os desdobramentos.' });
    console.log('GP_Pauta criada');
  }
  await req('POST', lista('GP_Pauta'), { EnableVersioning: true, MajorVersionLimit: 50 }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
  await req('POST', `${lista('GP_Pauta')}/fields/getbyinternalnameortitle('Title')`, { Title: 'Código', Indexed: true }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
  await criarCampos('GP_Pauta', [
    { nome: 'ForumCodigo', tipo: 'Text', exib: 'Fórum', indice: true },
    { nome: 'ClienteCodigo', tipo: 'Text', exib: 'Cliente', indice: true },
    { nome: 'Ordem', tipo: 'Number', exib: 'Ordem' },
    { nome: 'Tipo', tipo: 'Choice', exib: 'Tipo', opcoes: ['Demanda', 'Ação', 'Tópico livre'] },
    { nome: 'RegistroCodigo', tipo: 'Text', exib: 'Registro', indice: true },
    { nome: 'Assunto', tipo: 'Text', exib: 'Assunto' },
    { nome: 'ResponsavelCodigo', tipo: 'Text', exib: 'Responsável' },
    { nome: 'Origem', tipo: 'Choice', exib: 'Origem', opcoes: ['Convocação', 'Não tratado no fórum anterior', 'Incluído no fórum'] },
    { nome: 'ItemAnterior', tipo: 'Text', exib: 'Item não tratado de origem' },
    { nome: 'Tratamento', tipo: 'Choice', exib: 'Tratamento', opcoes: ['Concluído', 'Repactuado', 'Cancelado', 'Encerrado', 'Mantido', 'Tratado', 'Não tratado'] },
    { nome: 'Desdobramentos', tipo: 'Note', exib: 'Desdobramentos', linhas: 6 },
    { nome: 'Anotacao', tipo: 'Note', exib: 'Anotação', linhas: 6 }
  ]);

  // Conferência
  const fo = await campos('GP_Foruns'), pa = await campos('GP_Pauta');
  const faltam = [...['Hora', 'Local', 'Situacao', 'Convocados', 'Presentes'].filter(c => !fo.has(c)).map(c => 'GP_Foruns.' + c),
    ...['ForumCodigo', 'ClienteCodigo', 'Ordem', 'Tipo', 'RegistroCodigo', 'Assunto', 'ResponsavelCodigo', 'Origem', 'ItemAnterior', 'Tratamento', 'Desdobramentos', 'Anotacao'].filter(c => !pa.has(c)).map(c => 'GP_Pauta.' + c)];
  return faltam.length ? 'FALTAM: ' + faltam.join(', ') : 'OK: GP_Foruns e GP_Pauta prontas';
})();
