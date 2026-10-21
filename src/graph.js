// Acesso às Listas do SharePoint pelo Microsoft Graph (o SharePoint é só a base de dados).
import { CONFIG } from './config.js';

const G = 'https://graph.microsoft.com/v1.0';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// eTag do SharePoint ("{GUID},versão"): compara sem aspas, chaves e maiúsculas.
export const mesmoEtag = (a, b) => !!a && !!b && String(a).replace(/["{}\s]/g, '').toLowerCase() === String(b).replace(/["{}\s]/g, '').toLowerCase();
export function conflito(msg) {
  const e = new Error(msg || 'Outra pessoa alterou este registro depois que você abriu a tela');
  e.status = 412;
  return e;
}

export class GraphBackend {
  constructor(getToken) {
    this.getToken = getToken;
    this.siteId = null;
    this.webUrl = null;
    this.lists = {};
  }

  async req(method, url, body, tries = 0, renovado = false, extra = null) {
    const token = await this.getToken(renovado);
    const r = await fetch(url.startsWith('http') ? url : G + url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(extra || {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    // Token vencido no meio do uso: renova uma vez e repete a mesma chamada.
    if (r.status === 401 && !renovado) return this.req(method, url, body, tries, true, extra);
    if ((r.status === 429 || r.status === 503 || r.status === 504) && tries < 4) {
      const wait = Number(r.headers.get('Retry-After')) || 2 ** tries;
      await sleep(wait * 1000);
      return this.req(method, url, body, tries + 1, renovado, extra);
    }
    if (!r.ok) {
      let msg = `HTTP ${r.status}`;
      try { const j = await r.json(); msg = (j.error && j.error.message) || msg; } catch (e) { /* sem corpo */ }
      const err = new Error(msg);
      err.status = r.status;
      throw err;
    }
    return r.status === 204 ? null : r.json();
  }

  async init() {
    const s = await this.req('GET', `/sites/${CONFIG.siteHost}:${CONFIG.sitePath}?$select=id,displayName,webUrl`);
    this.siteId = s.id;
    this.webUrl = s.webUrl;
    const l = await this.req('GET', `/sites/${this.siteId}/lists?$select=id,displayName,name&$top=200`);
    this.lists = Object.fromEntries(l.value.map(x => [x.displayName, x.id]));
  }

  listId(name) {
    const id = this.lists[name];
    if (!id) throw new Error(`A lista ${name} não foi encontrada no SharePoint.`);
    return id;
  }

  listUrl(name) {
    return this.webUrl ? `${this.webUrl}/Lists/${name}/AllItems.aspx` : null;
  }

  async items(name, fields) {
    let url = `/sites/${this.siteId}/lists/${this.listId(name)}/items?$expand=fields($select=${fields.join(',')})&$top=999`;
    const out = [];
    while (url) {
      const j = await this.req('GET', url);
      for (const it of j.value) out.push({ id: it.id, etag: it.eTag, modified: it.lastModifiedDateTime, fields: it.fields || {} });
      url = j['@odata.nextLink'] || null;
    }
    return out;
  }

  // Códigos (Title) que já existem na lista, lidos na hora: evita repetir código criado por outra pessoa.
  async titulos(name) {
    let url = `/sites/${this.siteId}/lists/${this.listId(name)}/items?$select=id&$expand=fields($select=Title)&$top=999`;
    const out = [];
    while (url) {
      const j = await this.req('GET', url);
      for (const it of j.value) if (it.fields && it.fields.Title) out.push(it.fields.Title);
      url = j['@odata.nextLink'] || null;
    }
    return out;
  }

  async create(name, fields) {
    const it = await this.req('POST', `/sites/${this.siteId}/lists/${this.listId(name)}/items`, { fields });
    return { id: it.id, etag: it.eTag, modified: it.lastModifiedDateTime, fields: it.fields || fields };
  }

  // Apaga um item (vai para a lixeira do site). Usado só para desfazer algo que o próprio app acabou de criar.
  async remove(name, id) {
    await this.req('DELETE', `/sites/${this.siteId}/lists/${this.listId(name)}/items/${id}`);
  }

  async etagAtual(name, id) {
    return (await this.req('GET', `/sites/${this.siteId}/lists/${this.listId(name)}/items/${id}?$select=id,eTag`)).eTag;
  }

  // Grava só se o item ainda estiver na versão que a tela leu (etag). Se outra pessoa gravou antes, recusa com 412.
  async update(name, id, fields, etag) {
    const url = `/sites/${this.siteId}/lists/${this.listId(name)}/items/${id}/fields`;
    if (!etag) {
      const res = await this.req('PATCH', url, fields);
      return { etag: (res && res['@odata.etag']) || await this.etagAtual(name, id) };
    }
    if (!mesmoEtag(await this.etagAtual(name, id), etag)) throw conflito();
    let res;
    try {
      res = await this.req('PATCH', url, fields, 0, false, { 'If-Match': etag });
    } catch (e) {
      if (e.status !== 412) throw e;
      // 412 logo após conferir a versão: ou alguém gravou nesse meio-segundo, ou o SharePoint não aceitou o formato do etag.
      if (!mesmoEtag(await this.etagAtual(name, id), etag)) throw conflito();
      res = await this.req('PATCH', url, fields);
    }
    return { etag: (res && res['@odata.etag']) || await this.etagAtual(name, id) };
  }
}

// Base em memória, usada só nos testes automatizados (nenhum dado real é publicado com o app).
export class MemoryBackend {
  constructor(fixture) {
    this.db = JSON.parse(JSON.stringify(fixture));
    this.seq = 100000;
    this.webUrl = null;
    this.log = [];
  }
  async init() {}
  listUrl() { return null; }
  async items(name) {
    return (this.db[name] || []).map(x => ({ id: x.id, etag: this.tag(x), modified: x.modified || '2026-01-01T12:00:00Z', fields: { ...x.fields } }));
  }
  tag(x) { return `"{${x.id}},${x.v || 1}"`; }
  async titulos(name) { return (this.db[name] || []).map(x => x.fields.Title).filter(Boolean); }
  // Simula outra pessoa gravando direto no SharePoint (usado nos testes).
  externo(name, id, fields) {
    const it = (this.db[name] || []).find(x => x.id === id);
    Object.assign(it.fields, fields); it.v = (it.v || 1) + 1; it.modified = new Date().toISOString();
  }
  inserirExterno(name, fields) {
    const it = { id: String(++this.seq), modified: new Date().toISOString(), fields: { ...fields } };
    (this.db[name] = this.db[name] || []).push(it);
    return it;
  }
  falha() { if (this.failNext) { this.failNext = false; const e = new Error(this.failStatus === 401 ? 'HTTP 401' : 'Falha simulada'); e.status = this.failStatus || 500; throw e; } }
  async create(name, fields) {
    this.falha();
    const it = { id: String(++this.seq), modified: new Date().toISOString(), fields: { ...fields } };
    (this.db[name] = this.db[name] || []).push(it);
    this.log.push(['create', name, fields]);
    return { ...it, etag: this.tag(it), fields: { ...it.fields } };
  }
  async remove(name, id) {
    this.falha();
    this.db[name] = (this.db[name] || []).filter(x => x.id !== id);
    this.log.push(['remove', name, id]);
  }
  async update(name, id, fields, etag) {
    this.falha();
    const it = (this.db[name] || []).find(x => x.id === id);
    if (!it) throw new Error('Item não encontrado');
    if (etag && !mesmoEtag(etag, this.tag(it))) throw conflito();
    Object.assign(it.fields, fields);
    it.v = (it.v || 1) + 1;
    it.modified = new Date().toISOString();
    this.log.push(['update', name, id, fields]);
    return { etag: this.tag(it) };
  }
}
