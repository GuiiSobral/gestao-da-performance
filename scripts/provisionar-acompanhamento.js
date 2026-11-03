// Cria no SharePoint a lista GP_Acompanhamentos (03/11/2026): andamentos registrados durante a execução
// de ações e compromissos, vários por registro, com data e hora, autor e histórico de versões.
// Rodar no console do navegador numa página do site Solve Group Base Centralizada, com uma conta que pode criar listas.
// Pode rodar de novo: o que já existe é mantido.
(async () => {
  const web = 'https://solvegroup940.sharepoint.com/sites/SolveGroupBaseCentralizada/_api/web';
  const J = 'application/json;odata=nometadata';
  const digest = async () => (await (await fetch(web.replace('/_api/web', '/_api/contextinfo'), { method: 'POST', headers: { Accept: J } })).json()).FormDigestValue;
  const D = await digest();
  const req = async (method, url, body, extra = {}) => {
    const r = await fetch(url, { method, headers: { Accept: J, 'Content-Type': J, 'X-RequestDigest': D, ...extra }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${await r.text()}`);
    return r.status === 204 || method === 'MERGE' || extra['X-HTTP-Method'] === 'MERGE' ? null : r.json();
  };
  const lista = t => `${web}/lists/getbytitle('${t}')`;
  const existe = async t => (await fetch(lista(t), { headers: { Accept: J } })).ok;
  const campos = async t => new Set((await req('GET', `${lista(t)}/fields?$select=InternalName&$top=500`)).value.map(f => f.InternalName));
  const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const xml = ({ nome, tipo, opcoes, linhas }) => {
    const base = `Name="${nome}" StaticName="${nome}" DisplayName="${nome}"`;
    if (tipo === 'Text') return `<Field Type="Text" ${base} MaxLength="255" />`;
    if (tipo === 'Note') return `<Field Type="Note" ${base} NumLines="${linhas || 6}" RichText="FALSE" UnlimitedLengthInDocumentLibrary="TRUE" />`;
    if (tipo === 'DateTime') return `<Field Type="DateTime" ${base} Format="DateTime" />`;
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

  const L = 'GP_Acompanhamentos';
  if (!(await existe(L))) {
    await req('POST', `${web}/lists`, { Title: L, BaseTemplate: 100, Description: 'Andamentos registrados durante a execução de ações e compromissos. Não mudam status, prazo nem farol.' });
    console.log(`${L} criada`);
  }
  await req('POST', lista(L), { EnableVersioning: true, MajorVersionLimit: 50 }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
  await req('POST', `${lista(L)}/fields/getbyinternalnameortitle('Title')`, { Title: 'Código', Indexed: true }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
  await criarCampos(L, [
    { nome: 'ClienteCodigo', tipo: 'Text', exib: 'Cliente', indice: true },
    { nome: 'RegistroTipo', tipo: 'Choice', exib: 'Tipo de registro', opcoes: ['Ação', 'Compromisso'] },
    { nome: 'RegistroCodigo', tipo: 'Text', exib: 'Registro', indice: true },
    { nome: 'Texto', tipo: 'Note', exib: 'Andamento', linhas: 6 },
    { nome: 'RegistradoEm', tipo: 'DateTime', exib: 'Registrado em', indice: true },
    { nome: 'RegistradoPor', tipo: 'Text', exib: 'Registrado por' }
  ]);

  // Conferência
  const tem = await campos(L);
  const faltam = ['ClienteCodigo', 'RegistroTipo', 'RegistroCodigo', 'Texto', 'RegistradoEm', 'RegistradoPor'].filter(c => !tem.has(c));
  const info = await req('GET', `${lista(L)}?$select=EnableVersioning,ItemCount`);
  return faltam.length ? 'FALTAM: ' + faltam.join(', ') : `OK: ${L} pronta (histórico de versões ${info.EnableVersioning ? 'ligado' : 'DESLIGADO'}, ${info.ItemCount} itens)`;
})();
