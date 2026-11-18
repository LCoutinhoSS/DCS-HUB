/* DCS HUB · inicialização com isolamento explícito entre demo e homologação.
 * O modo de homologação é ativado apenas por build Vite configurado.
 * A versão sem build do GitHub Pages continua inteiramente demonstrativa.
 */
const env=import.meta.env||{};
const stage=env.VITE_DCS_MODE==='homologacao';
const configured=Boolean(env.VITE_SUPABASE_URL &&
  (env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY));

function showBootError(message){
  document.documentElement.dataset.authMode='real';
  const element=document.querySelector('#auth-error');
  if(element){element.hidden=false;element.textContent=message;}
  const button=document.querySelector('#lf button[type=submit]');
  if(button){button.disabled=true;button.title=message;}
  console.error('[DCS HUB]',message);
}
try {
  if(stage){
    document.documentElement.dataset.authMode='real';
    if(!configured)showBootError('A homologação ainda não foi configurada. Entre em contato com o administrador do projeto.');
    else{
      const {backend}=await import('./backend.js');
      if(!backend.enabled)showBootError('Configuração do banco de homologação inválida.');
    }
  }else if(location.hostname.endsWith('.github.io')){
    // GitHub Pages sem build: somente demonstração em memória, sem validação real.
    await import('./demo-auth.js');
  }else{
    // Desenvolvimento local: o app real só inicia quando URL e chave pública existem.
    const {backend}=await import('./backend.js');
    if(!backend.enabled)await import('./demo-auth.js');
  }
}catch(err){
  console.error('[DCS HUB] Erro ao inicializar',err);
  showBootError('Não foi possível iniciar o acesso ao HUB. Atualize a página ou contate o administrador.');
}
