// Testes do acesso ao Graph com um SharePoint simulado (fetch falso).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GraphBackend } from '../src/graph.js';

function sharepoint({ aceitaIfMatch = true, devolveEtag = true } = {}) {
  const item = { v: 3, fields: { Status: 'Em andamento' } };
  const tag = () => `"{ABC-123},${item.v}"`;
  const calls = [];
  globalThis.fetch = async (url, opt) => {
    calls.push([opt.method, url, opt.headers['If-Match'] || null]);
    const res = (status, body) => ({ ok: status < 300, status, headers: { get: () => null }, json: async () => body });
    if (opt.method === 'GET') return res(200, { id: '7', eTag: tag() });
    const im = opt.headers['If-Match'];
    if (im && (!aceitaIfMatch || im !== tag())) return res(412, { error: { message: 'Precondition Failed' } });
    Object.assign(item.fields, JSON.parse(opt.body)); item.v++;
    return res(200, devolveEtag ? { ...item.fields, '@odata.etag': tag() } : { ...item.fields });
  };
  const be = new GraphBackend(async () => 'x');
  be.siteId = 's'; be.lists = { GP_Acoes: 'l' };
  return { be, item, tag, calls, mexer: () => { item.v++; } };
}

test('grava com a versão certa e devolve a nova', async () => {
  const sp = sharepoint();
  const r = await sp.be.update('GP_Acoes', '7', { Status: 'Concluída' }, '"{ABC-123},3"');
  assert.equal(sp.item.fields.Status, 'Concluída');
  assert.equal(r.etag, '"{ABC-123},4"');
});

test('recusa com 412 quando outra pessoa gravou antes', async () => {
  const sp = sharepoint(); sp.mexer();
  await assert.rejects(sp.be.update('GP_Acoes', '7', { Status: 'Concluída' }, '"{ABC-123},3"'), e => e.status === 412);
  assert.equal(sp.item.fields.Status, 'Em andamento');
});

test('se o SharePoint recusar o formato do etag sem ninguém ter mexido, grava assim mesmo', async () => {
  const sp = sharepoint({ aceitaIfMatch: false });
  await sp.be.update('GP_Acoes', '7', { Status: 'Concluída' }, '"{ABC-123},3"');
  assert.equal(sp.item.fields.Status, 'Concluída');
});

test('sem etag na resposta, busca a versão nova', async () => {
  const sp = sharepoint({ devolveEtag: false });
  const r = await sp.be.update('GP_Acoes', '7', { Status: 'Concluída' }, '"{ABC-123},3"');
  assert.equal(r.etag, '"{ABC-123},4"');
});

test('compara etag ignorando chaves, aspas e maiúsculas', async () => {
  const sp = sharepoint();
  await sp.be.update('GP_Acoes', '7', { Status: 'Concluída' }, '"abc-123,3"');
  assert.equal(sp.item.fields.Status, 'Concluída');
});
