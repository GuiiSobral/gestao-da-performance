// Login com a conta Microsoft da Solve (Entra ID), fluxo de redirecionamento com PKCE.
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { CONFIG } from './config.js';

const redirectUri = location.origin + import.meta.env.BASE_URL;

export const pca = new PublicClientApplication({
  auth: {
    clientId: CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: false
  },
  cache: { cacheLocation: 'localStorage' }
});

export async function initAuth() {
  await pca.initialize();
  const res = await pca.handleRedirectPromise();
  if (res && res.account) pca.setActiveAccount(res.account);
  const acc = pca.getActiveAccount() || pca.getAllAccounts()[0] || null;
  if (acc) pca.setActiveAccount(acc);
  return acc;
}

export function login() {
  return pca.loginRedirect({ scopes: CONFIG.scopes, prompt: 'select_account' });
}

export function logout() {
  return pca.logoutRedirect({ account: pca.getActiveAccount() });
}

export async function getToken() {
  const account = pca.getActiveAccount();
  try {
    const r = await pca.acquireTokenSilent({ scopes: CONFIG.scopes, account });
    return r.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await pca.acquireTokenRedirect({ scopes: CONFIG.scopes, account });
      return new Promise(() => {}); // a página vai ser redirecionada
    }
    throw e;
  }
}

// Mensagem legível para os erros de login mais comuns.
export function authErrorMessage(e) {
  const t = `${e && (e.errorCode || '')} ${e && (e.errorMessage || e.message || '')}`;
  if (/AADSTS90094|AADSTS90095|admin approval|aprovação do administrador/i.test(t))
    return 'A Microsoft pediu aprovação de um administrador da Solve para este app ler e gravar nas listas. Peça ao TI para aprovar o app "Gestão da Performance" no Entra (Aplicativos empresariais → Permissões → Conceder consentimento).';
  if (/AADSTS65001|consent/i.test(t))
    return 'Falta aprovar a permissão do app. Entre de novo e aceite a permissão de ler e gravar nas listas.';
  if (/AADSTS50020|AADSTS50034/i.test(t))
    return 'Esta conta não pertence à Solve Group. Entre com a sua conta @solvegroup.com.br.';
  if (/user_cancelled|AADSTS65004/i.test(t)) return 'O login foi cancelado.';
  return 'Não foi possível concluir o login. Tente de novo.';
}
