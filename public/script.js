const VERSAO_APP='Web 3.5';
const $=s=>document.querySelector(s); const $$=s=>document.querySelectorAll(s);
const state={football:false,sport:false,tickets:0,games:[],selected:[],lastLiveFetch:null,lastDiagnosis:null,lastLiveAnalysis:null,lastTickets:[]};
const DEFAULT_LEAGUES=[
  {id:'all',name:'Todas as competições',country:'',season:''},
  {id:'71',name:'Brasileirão Série A',country:'Brasil',season:new Date().getFullYear()},
  {id:'72',name:'Brasileirão Série B',country:'Brasil',season:new Date().getFullYear()},
  {id:'13',name:'Libertadores',country:'América do Sul',season:new Date().getFullYear()},
  {id:'11',name:'Sul-Americana',country:'América do Sul',season:new Date().getFullYear()},
  {id:'39',name:'Premier League',country:'Inglaterra',season:new Date().getFullYear()},
  {id:'140',name:'La Liga',country:'Espanha',season:new Date().getFullYear()},
  {id:'2',name:'Champions League',country:'Europa',season:new Date().getFullYear()},
  {id:'1',name:'Copa do Mundo FIFA',country:'Mundo',season:2026}
];
function go(page){$$('.page').forEach(p=>p.classList.remove('active'));$('#'+page).classList.add('active');$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===page));$('#page-title').textContent={dashboard:'Dashboard',jogos:'Buscar Jogos',diagnostico:'Diagnóstico IA',bilhetes:'Gerar Bilhetes',historico:'Histórico',usuarios:'Usuários',config:'Configurações'}[page]||'Dashboard'}
$$('.nav').forEach(b=>b.onclick=()=>go(b.dataset.page)); $$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
function load(){ $('#footballKey').value=localStorage.getItem('nb_api_football')||''; $('#sportKey').value=localStorage.getItem('nb_sportmonks')||''; state.football=!!$('#footballKey').value; state.sport=!!$('#sportKey').value; updateStatus(); setTodayBR(); fillDefaultLeagues(); if(location.protocol==='file:'){ const m=$('#gamesMsg'); if(m) m.textContent='Atenção: você abriu o arquivo direto. Para buscar jogos reais, execute abrir_plataforma_windows.bat e acesse http://localhost:3021'; }}
function updateStatus(){ $('#badge-football').textContent= state.football?'API-Football salva':'API-Football pendente'; $('#badge-football').className='badge '+(state.football?'':'warn'); $('#badge-sport').textContent= state.sport?'Sportmonks salva':'Sportmonks pendente'; $('#badge-sport').className='badge '+(state.sport?'':'warn'); const ok=state.football&&state.sport; $('#api-status-main').textContent= ok?'Preparadas':'Pendentes'; $('#side-status').textContent= ok?'APIs salvas':'Configure as APIs'; $('#bet-dot').className='dot '+(ok?'':'warn');}
function saveKey(id,key,status){localStorage.setItem(key,$(id).value.trim()); state.football=!!localStorage.getItem('nb_api_football'); state.sport=!!localStorage.getItem('nb_sportmonks'); $(status).className='result'; $(status).textContent='Chave salva neste navegador.'; updateStatus();}
$('#saveFootball').onclick=()=>saveKey('#footballKey','nb_api_football','#footballResult'); $('#saveSport').onclick=()=>saveKey('#sportKey','nb_sportmonks','#sportResult');
$('#toggleFootball').onclick=()=>{$('#footballKey').type=$('#footballKey').type==='password'?'text':'password'}; $('#toggleSport').onclick=()=>{$('#sportKey').type=$('#sportKey').type==='password'?'text':'password'};
async function postJSON(url,body){ const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!res.ok){let t=''; try{t=(await res.json()).message}catch{} throw new Error(t||'Servidor não disponível');} return res.json(); }
async function test(kind){const el=kind==='football'?$('#footballResult'):$('#sportResult'); el.className='result warn'; el.textContent='Testando conexão...'; try{ const data=await postJSON('/api/test/'+kind,{key:kind==='football'?$('#footballKey').value:$('#sportKey').value}); el.className=data.ok?'result':'result bad'; el.textContent=data.message|| (data.ok?'Conectada':'Falhou'); }catch(e){ el.className='result warn'; el.textContent='Chave salva. Para teste real, execute a versão com servidor: npm install e npm start.'; }}
$('#testFootball').onclick=()=>test('football'); $('#testSport').onclick=()=>test('sport');
function setTodayBR(){ const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); const y=parts.find(p=>p.type==='year').value,m=parts.find(p=>p.type==='month').value,d=parts.find(p=>p.type==='day').value; if($('#gameDate')) $('#gameDate').value=`${y}-${m}-${d}`; }
function fillDefaultLeagues(){ const el=$('#league'); if(!el) return; el.innerHTML=DEFAULT_LEAGUES.map((l,i)=>`<option value="${l.id}" data-season="${l.season}">${l.name}${l.country?' • '+l.country:''}</option>`).join(''); }
async function loadLeagues(){ const el=$('#league'); const msg=$('#gamesMsg'); msg.textContent='Carregando campeonatos da API-Football...'; try{ const data=await postJSON('/api/leagues',{key:localStorage.getItem('nb_api_football')}); el.innerHTML='<option value="all">Todas as competições</option>'+data.leagues.map(l=>`<option value="${l.id}" data-season="${l.season}">${l.name} • ${l.country}</option>`).join(''); msg.textContent=`${data.leagues.length} campeonatos carregados. Ao escolher um campeonato, a busca ao vivo respeita esse filtro.`; }catch(e){ fillDefaultLeagues(); msg.textContent='Não carregou campeonatos da API. Mantive uma lista inicial. Para busca real, abra pelo servidor local: abrir_plataforma_windows.bat.'; }}
$('#loadLeagues')?.addEventListener('click',loadLeagues);
async function searchGames(){ const msg=$('#gamesMsg'); const type=$('#matchType').value; const opt=$('#league').selectedOptions[0]; const league=opt.value; const season=opt.dataset.season||new Date().getFullYear(); const date=$('#gameDate').value; msg.textContent= type==='live'?'Buscando jogos ao vivo...':'Buscando jogos pré-jogo...'; $('#gamesList').className='table empty'; $('#gamesList').textContent='Carregando...'; try{ const data=await postJSON('/api/games',{key:localStorage.getItem('nb_api_football'),type,league,season,date}); state.games=data.games.map(g=>({...g,clientFetchedAt:Date.now()})); state.lastLiveFetch=Date.now(); renderGames(); msg.textContent=`${state.games.length} jogo(s) encontrado(s). ${type==='live'?'Relógio em movimento na tela; a API corrige o minuto ao atualizar.':'Selecione os jogos para diagnóstico.'}`; }catch(e){ $('#gamesList').className='table empty'; $('#gamesList').textContent='Falha na busca real. Abra pelo servidor local usando abrir_plataforma_windows.bat ou confira a chave API-Football.'; msg.textContent=(location.protocol==='file:'?'Você abriu o index.html direto. Extraia a pasta e execute abrir_plataforma_windows.bat. ': '') + e.message; }}
$('#searchGames').onclick=searchGames;
$('#refreshLive').onclick=()=>{ $('#matchType').value='live'; searchGames(); };
function liveMinute(g){ if(!g.isLive || !Number.isFinite(g.elapsed)) return g.statusText; const delta=Math.floor((Date.now()-(g.clientFetchedAt||Date.now()))/60000); const min=Math.min(130,g.elapsed+Math.max(0,delta)); return `🔴 ${min}' - ${g.period||'Ao vivo'}`; }
function renderGames(){ $('#live-count').textContent=state.games.filter(g=>g.isLive).length; if(!state.games.length){ $('#gamesList').className='table empty'; $('#gamesList').textContent='Nenhum jogo encontrado para este filtro.'; return;} $('#gamesList').className='table'; $('#gamesList').innerHTML=state.games.map((g,i)=>`<div class="game-row rich"><input type="checkbox" data-idx="${i}" ${state.selected.includes(g.id)?'checked':''}><div><b>${g.league}</b><small>${g.country||''}</small></div><span><strong>${g.home} x ${g.away}</strong><small>${g.venue||''}</small></span><span class="live-time" data-i="${i}">${liveMinute(g)}</span><strong>${g.score}</strong></div>`).join(''); $$('input[data-idx]').forEach(c=>c.onchange=e=>{const g=state.games[+e.target.dataset.idx]; if(e.target.checked&&!state.selected.includes(g.id))state.selected.push(g.id); if(!e.target.checked)state.selected=state.selected.filter(id=>id!==g.id); $('#selected-count').textContent=state.selected.length;});}
setInterval(()=>{ if(state.games.some(g=>g.isLive)){ $$('.live-time').forEach(el=>{const g=state.games[+el.dataset.i]; el.textContent=liveMinute(g);}); }},15000);

async function runDiagnosis(){
  const msg=$('#diagMsg'), out=$('#diagOutput');
  const selectedGame=state.games.find(g=>state.selected.includes(g.id)) || state.games[0];
  if(!selectedGame){ msg.className='result bad'; msg.textContent='Selecione pelo menos um jogo em Buscar Jogos.'; out.innerHTML=''; if($('#liveOutput')) $('#liveOutput').innerHTML=''; return; }
  msg.className='result warn'; msg.textContent=`Analisando ${selectedGame.home} x ${selectedGame.away}...`; out.innerHTML='';
  try{
    const data=await postJSON('/api/diagnosis',{key:localStorage.getItem('nb_api_football'),game:selectedGame});
    renderDiagnosis(data);
    msg.className='result'; msg.textContent='Diagnóstico gerado com sucesso.';
  }catch(e){ msg.className='result bad'; msg.textContent=e.message||'Erro ao gerar diagnóstico.'; }
}
function pctForm(t){ return `${t.wins}V ${t.draws}E ${t.losses}D`; }
function teamCard(title,t){
  return `<div class="card diag-card"><h3>${title}</h3><div class="pillline"><span>Ataque: <b>${t.profile.attack}</b></span><span>Defesa: <b>${t.profile.defense}</b></span><span>Perfil: <b>${t.profile.style}</b></span></div><div class="metrics"><div><small>Forma</small><b>${pctForm(t)}</b></div><div><small>Gols marcados</small><b>${t.avg.goalsFor}</b></div><div><small>Gols sofridos</small><b>${t.avg.goalsAgainst}</b></div><div><small>Gols 1ºT</small><b>${t.avg.firstHalfFor}</b></div><div><small>Gols 2ºT</small><b>${t.avg.secondHalfFor}</b></div><div><small>Escanteios pró</small><b>${t.avg.cornersFor}</b></div><div><small>Escanteios contra</small><b>${t.avg.cornersAgainst}</b></div><div><small>Cartões</small><b>${t.avg.cardsFor}</b></div></div></div>`;
}
function renderDiagnosis(data){
  state.lastDiagnosis=data; state.lastLiveAnalysis=null;
  const {game,home,away,recommendations,notes}=data;
  $('#diagOutput').innerHTML=`
    <div class="card wide"><h2>${game.home} x ${game.away}</h2><p class="muted">🏆 ${game.league} • ${game.country||''} • ${game.isLive?'🔴 Ao vivo '+liveMinute(game):'Pré-jogo'} • Placar: <b>${game.score}</b></p><p>${notes}</p></div>
    ${teamCard('🏠 '+game.home,home)}
    ${teamCard('✈️ '+game.away,away)}
    <div class="card wide"><h3>🧠 Diagnóstico do confronto</h3><div class="rec-grid"><div><h4>Mercados mais seguros para estudar</h4>${recommendations.recommended.map(x=>`<p class="rec ok">${x}</p>`).join('')}</div><div><h4>Mercados para evitar</h4>${recommendations.avoid.map(x=>`<p class="rec bad">${x}</p>`).join('')}</div></div><p class="muted">A IA prioriza segurança: dupla chance clara (Casa ou Empate 1X, Fora ou Empate X2, Casa ou Fora 12), over baixo, escanteios/cartões quando a média sustenta.</p></div>`;
}
$('#runDiagnosis')?.addEventListener('click',runDiagnosis);

async function runLiveAnalysis(){
  const msg=$('#diagMsg'), out=$('#liveOutput');
  const selectedGame=state.games.find(g=>state.selected.includes(g.id)) || state.games.find(g=>g.isLive) || state.games[0];
  if(!selectedGame){ msg.className='result bad'; msg.textContent='Selecione um jogo ao vivo em Buscar Jogos.'; if(out) out.innerHTML=''; return; }
  if(!selectedGame.isLive){
    msg.className='result warn';
    msg.textContent='Este jogo não está marcado como ao vivo. Para jogo antes de começar, use Analisar pré-jogo/confronto.';
  } else {
    msg.className='result warn'; msg.textContent=`Analisando ao vivo: ${selectedGame.home} x ${selectedGame.away}...`;
  }
  if(out) out.innerHTML='<div class="card live-panel"><h2>🔴 Live Trader IA</h2><p class="muted">Buscando estatísticas em tempo real...</p></div>';
  try{
    const data=await postJSON('/api/live-analysis',{key:localStorage.getItem('nb_api_football'),game:selectedGame});
    renderLiveAnalysis(data);
    msg.className='result'; msg.textContent='Análise ao vivo gerada com relatório final da IA.';
  }catch(e){ msg.className='result bad'; msg.textContent=e.message||'Erro ao gerar análise ao vivo.'; }
}
function pressureClass(label){ return label==='Alta'?'pressure-high':label==='Média'?'pressure-mid':'pressure-low'; }
function renderLiveAnalysis(data){
  state.lastLiveAnalysis=data;
  const g=data.game, h=data.home, a=data.away, p=data.pressure;
  const markets=data.markets||[];
  $('#liveOutput').innerHTML=`
    <div class="card wide live-panel">
      <h2>🔴 Live Trader IA — Jogo em Movimento</h2>
      <p class="muted">${g.league} • ${g.country||''}</p>
      <div class="score-big">
        <div class="team"><small>Casa</small><b>${g.home}</b></div>
        <div><b>${g.score}</b><div class="clock">${liveMinute(g)}</div></div>
        <div class="team"><small>Fora</small><b>${g.away}</b></div>
      </div>
      <div class="metrics">
        <div><small>Pressão casa</small><b class="${pressureClass(p.home)}">${p.home}</b></div>
        <div><small>Pressão fora</small><b class="${pressureClass(p.away)}">${p.away}</b></div>
        <div><small>Domínio</small><b>${p.edge}</b></div>
        <div><small>Cenário</small><b>${data.scenario}</b></div>
      </div>
    </div>
    <div class="card diag-card"><h3>🏠 ${g.home} ao vivo</h3>${liveStats(h)}</div>
    <div class="card diag-card"><h3>✈️ ${g.away} ao vivo</h3>${liveStats(a)}</div>
    <div class="card wide"><h3>🎯 Mercados que a IA estudaria agora</h3><div class="market-list">${markets.map(m=>`<div class="market-card"><b>${m.name}</b><small>${m.reason}</small></div>`).join('')}</div><p class="muted">Se houver gol, expulsão ou mudança brusca nas estatísticas, refaça a análise antes de montar bilhete.</p></div>
    <div class="card wide"><h3>📝 Relatório final da IA</h3><p class="live-report">${data.report}</p>${data.alert?`<div class="alert-box">⚠️ ${data.alert}</div>`:''}</div>`;
}
function liveStats(t){
  return `<div class="metrics"><div><small>Finalizações</small><b>${t.shots}</b></div><div><small>No alvo</small><b>${t.shotsOn}</b></div><div><small>Posse</small><b>${t.possession}%</b></div><div><small>Escanteios</small><b>${t.corners}</b></div><div><small>Cartões</small><b>${t.cards}</b></div><div><small>Ataques perigosos</small><b>${t.dangerousAttacks}</b></div></div>`;
}
$('#runLiveAnalysis')?.addEventListener('click',runLiveAnalysis);


/* Web 2.2 - Bilhete objetivo com leitura IA separada */
function selectedGameForTicket(){ return state.games.find(g=>state.selected.includes(g.id)) || state.games[0] || null; }
function safeMarketText(x){ return String(x||'').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function isWorldCupGame(g){
  const txt=((g?.league||'')+' '+(g?.country||'')).toLowerCase();
  return txt.includes('world cup') || txt.includes('copa do mundo') || txt.includes('fifa');
}
function selectedGamesAllSafe(){
  const ids=new Set(state.selected||[]);
  return (state.games||[]).filter(g=>ids.has(g.id) || ids.has(g.fixtureId));
}

function marketPoolPre(profile, diagnosis){
  const game=diagnosis?.game || selectedGameForTicket() || {home:'Casa',away:'Fora'};
  const rec=(diagnosis?.recommendations?.recommended||[]).map(x=>({market:x,reason:'Mercado indicado pelo diagnóstico pré-jogo.'}));
  const conservative=[
    {market:`Dupla chance: Casa ou Empate (1X) - ${game.home}`,reason:'Protege vitória da casa e empate.'},
    {market:'Over 0.5 gols no jogo',reason:'Linha de gols mais conservadora.'},
    {market:`${game.home} ou ${game.away} para marcar ao menos 1 gol`,reason:'Mercado de gol por equipe quando o histórico sustenta.'},
    {market:'Under de linha alta de gols',reason:'Proteção contra placar muito fora da curva.'},
    {market:'Escanteios acima de linha baixa',reason:'Usar quando a média de cantos sustenta.'}
  ];
  const medium=[
    {market:'Over 1.5 gols no jogo',reason:'Exige pelo menos dois gols, ainda moderado.'},
    {market:`Dupla chance: Fora ou Empate (X2) - ${game.away}`,reason:'Protege visitante e empate quando o visitante tem força.'},
    {market:`${game.home} + escanteios a favor`,reason:'Combina mando com volume ofensivo.'},
    {market:'Cartões acima de linha baixa',reason:'Quando médias disciplinares indicam jogo físico.'},
    {market:'Empate anula aposta no time mais forte',reason:'Proteção se o jogo ficar equilibrado.'}
  ];
  const aggressive=[
    {market:'Vitória protegida + Over 1.5 gols',reason:'Combinação mais forte, exige domínio e gols.'},
    {market:'Ambas marcam',reason:'Só usar quando os dois ataques têm produção.'},
    {market:`${game.home} vence um dos tempos`,reason:'Exige superioridade em pelo menos uma etapa.'},
    {market:'Over 2.5 gols',reason:'Agressivo, depende de tendência clara de gols.'},
    {market:'Casa ou Fora (12)',reason:'Ganha se qualquer time vencer; perde no empate.'}
  ];
  let pool=[...rec, ...conservative];
  if(profile==='medio') pool=[...rec, ...conservative, ...medium];
  if(profile==='agressivo') pool=[...rec, ...medium, ...aggressive];
  return pool;
}
function scoreText(g){ return `${g.home} ${g.score||((g.homeGoals??'-')+' x '+(g.awayGoals??'-'))} ${g.away}`; }
function winnerContext(g){
  const hg=Number.isFinite(Number(g.homeGoals))?Number(g.homeGoals):null;
  const ag=Number.isFinite(Number(g.awayGoals))?Number(g.awayGoals):null;
  if(hg===null || ag===null) return {leader:null,trailer:null,tie:false,label:'Placar não consolidado'};
  if(hg>ag) return {leader:g.home,trailer:g.away,tie:false,label:`${g.home} está vencendo`};
  if(ag>hg) return {leader:g.away,trailer:g.home,tie:false,label:`${g.away} está vencendo`};
  return {leader:null,trailer:null,tie:true,label:'Jogo empatado'};
}
function dominantSide(live){
  const edge=live?.pressure?.edge;
  const g=live?.game||{};
  if(edge && edge!== 'Equilibrado') return edge;
  const h=live?.home||{}, a=live?.away||{};
  const hs=(h.shotsOn||0)*3+(h.corners||0)*2+(h.dangerousAttacks||0)/5;
  const as=(a.shotsOn||0)*3+(a.corners||0)*2+(a.dangerousAttacks||0)/5;
  if(hs>as+3) return g.home;
  if(as>hs+3) return g.away;
  return 'Equilibrado';
}
function marketPoolLive(profile, live){
  const g=live?.game || selectedGameForTicket() || {home:'Casa',away:'Fora',score:'- x -'};
  const ctx=winnerContext(g);
  const dom=dominantSide(live);
  const isHomeDom=dom===g.home, isAwayDom=dom===g.away;
  const pressureSide = dom==='Equilibrado' ? 'equipe com maior pressão' : dom;
  const totalGoals=(Number(g.homeGoals)||0)+(Number(g.awayGoals)||0);
  const gameClock=liveMinute(g);
  const conservative=[];

  // Mercados sempre objetivos: nada de "aguardar" como entrada.
  if(ctx.tie){
    conservative.push({market:'Mais 0.5 gols restantes',confidence:'🟢 Alta',reason:'Com o jogo empatado, qualquer equipe que aumentar pressão pode abrir o placar.'});
    conservative.push({market:'Dupla chance: Casa ou Empate (1X)',confidence:'🟡 Média',reason:`Protege ${g.home} ou empate, útil se o mandante estiver competitivo.`});
    conservative.push({market:'Dupla chance: Fora ou Empate (X2)',confidence:'🟡 Média',reason:`Protege ${g.away} ou empate, útil se o visitante estiver criando perigo.`});
  }else{
    conservative.push({market:'Mais 0.5 gols restantes',confidence:'🟡 Média/Alta',reason:`${ctx.trailer} precisa buscar o resultado e pode deixar espaços para ${ctx.leader}.`});
    if(ctx.leader===g.home) conservative.push({market:`Dupla chance: Casa ou Empate (1X) - ${g.home}`,confidence:'🟢 Alta',reason:`${g.home} já está à frente no placar; mercado protege vitória ou empate.`});
    if(ctx.leader===g.away) conservative.push({market:`Dupla chance: Fora ou Empate (X2) - ${g.away}`,confidence:'🟢 Alta',reason:`${g.away} já está à frente no placar; mercado protege vitória ou empate.`});
    conservative.push({market:`${ctx.leader} para não perder`,confidence:'🟢 Alta',reason:`Baseado na vantagem atual: ${ctx.label}.`});
  }
  if(isHomeDom) conservative.push({market:`${g.home} escanteios a favor`,confidence:'🟡 Média',reason:`${g.home} aparece com maior pressão/volume ofensivo no momento.`});
  if(isAwayDom) conservative.push({market:`${g.away} escanteios a favor`,confidence:'🟡 Média',reason:`${g.away} aparece com maior pressão/volume ofensivo no momento.`});
  if(dom==='Equilibrado') conservative.push({market:'Casa ou Fora (12)',confidence:'🟡 Média',reason:'Ganha com vitória de qualquer lado; perde apenas se o jogo terminar empatado.'});

  const medium=[
    {market:`Próximo gol: ${pressureSide}`,confidence:'🟡 Média',reason:'Só faz sentido se a pressão continuar após a atualização do monitor.'},
    {market:'Over 1.5 gols restantes',confidence: totalGoals>=2?'🟡 Média':'🔴 Baixa/Média',reason:'Mercado exige ritmo ofensivo e tempo suficiente para mais dois gols.'},
    {market:'Cartões acima de linha baixa',confidence:'🟡 Média',reason:'Usar se o jogo estiver truncado, com faltas e cartões recentes.'},
    {market:`Handicap protegido para ${pressureSide}`,confidence:'🟡 Média',reason:'Proteção quando há domínio, mas ainda existe risco de reação.'}
  ];
  const aggressive=[
    {market:`${pressureSide} próximo gol + escanteios`,confidence:'🔴 Agressiva',reason:'Combina dois eventos e aumenta risco.'},
    {market:'Mais 1.5 gols restantes',confidence:'🔴 Agressiva',reason:'Precisa de dois gols após este momento do jogo.'},
    {market:'Resultado final baseado na pressão',confidence:'🔴 Agressiva',reason:'Alto risco no ao vivo; usar apenas com domínio muito claro.'}
  ];

  let pool=[...conservative];
  if(profile==='medio') pool=[...conservative, ...medium];
  if(profile==='agressivo') pool=[...conservative, ...medium, ...aggressive];
  // remove duplicados e qualquer item que soe como instrução, não mercado
  return pool.filter((x,i,arr)=>x.market && !/^Aguardar/i.test(x.market) && arr.findIndex(y=>y.market===x.market)===i)
             .map(x=>({...x,clock:gameClock,score:scoreText(g)}));
}
function buildLiveTicketReport(live){
  if(!live || !live.game) return 'Relatório ao vivo não disponível.';
  const g=live.game, ctx=winnerContext(g), dom=dominantSide(live);
  const base = live.report || '';
  let resumo='';
  if(ctx.tie){
    resumo=`O jogo está empatado. A leitura principal é observar qual equipe sustenta pressão real para buscar o gol.`;
  }else{
    resumo=`${ctx.label}. ${ctx.trailer} tende a precisar atacar mais, enquanto ${ctx.leader} pode controlar ou explorar contra-ataques.`;
  }
  const dominio = dom==='Equilibrado' ? 'No momento, o domínio aparece equilibrado.' : `${dom} apresenta maior volume no momento.`;
  return `${scoreText(g)} • ${liveMinute(g)}\n${resumo} ${dominio}\nTendência: ${base}`;
}

function buildTickets(mode,profile,qty){
  const game=selectedGameForTicket();
  if(!game) throw new Error('Selecione pelo menos um jogo em Buscar Jogos.');
  if(mode==='pre' && !state.lastDiagnosis) throw new Error('Para bilhete pré-jogo, gere primeiro o diagnóstico pré-jogo/confronto.');
  if(mode==='live' && !state.lastLiveAnalysis) throw new Error('Para bilhete ao vivo, gere primeiro a análise ao vivo no Live Trader IA.');
  if(mode==='live' && state.lastLiveAnalysis?.game?.id!==game.id){ /* allow, but warn in msg later */ }
  const pool=mode==='pre'?marketPoolPre(profile,state.lastDiagnosis):marketPoolLive(profile,state.lastLiveAnalysis);
  const perTicket=profile==='conservador'?2:profile==='medio'?3:4;
  const tickets=[];
  for(let i=0;i<qty;i++){
    const items=[];
    for(let j=0;j<perTicket;j++){
      const item=pool[(i+j*2)%pool.length] || pool[0];
      if(item && !items.some(x=>x.market===item.market)) items.push(item);
    }
    tickets.push({
      id:'NB-'+Date.now()+'-'+(i+1),
      createdAt:new Date().toLocaleString('pt-BR'),
      mode, profile, game,
      title:`Bilhete ${i+1} — ${mode==='pre'?'Pré-jogo':'Ao vivo'} ${profile.charAt(0).toUpperCase()+profile.slice(1)}`,
      items,
      report: mode==='live' ? buildLiveTicketReport(state.lastLiveAnalysis) : 'Bilhete montado com base no diagnóstico pré-jogo, últimos jogos, médias, perfil ofensivo/defensivo e mercados protegidos.'
    });
  }
  return tickets;
}
function confidenceClass(c){
  const s=String(c||'');
  if(s.includes('Alta')) return 'conf-high';
  if(s.includes('Baixa')||s.includes('Agressiva')) return 'conf-low';
  return 'conf-mid';
}
function renderTickets(tickets){
  const out=$('#ticketOutput');
  if(!out) return;
  out.innerHTML=tickets.map(t=>{
    const placar = t.mode==='live' ? `<div class="score-line">🔴 ${safeMarketText(t.game.home)} ${safeMarketText(t.game.score||'')} ${safeMarketText(t.game.away)} <span>${safeMarketText(liveMinute(t.game))}</span></div>` : '';
    return `<div class="card ticket-card objective-ticket">
      <div class="ticket-head"><h3>${safeMarketText(t.title)}</h3><span class="ticket-mode ${t.mode==='live'?'live':''}">${t.mode==='live'?'AO VIVO':'PRÉ-JOGO'}</span></div>
      ${placar || `<p class="muted">${safeMarketText(t.game.home)} x ${safeMarketText(t.game.away)} • ${safeMarketText(t.game.league||'')}</p>`}
      <div class="ticket-section-title">Entradas sugeridas</div>
      <ol class="objective-list">${t.items.map(i=>`<li><div><b>Mercado: ${safeMarketText(i.market)}</b><small>${safeMarketText(i.reason)}</small></div><span class="confidence ${confidenceClass(i.confidence)}">${safeMarketText(i.confidence||'🟡 Média')}</span></li>`).join('')}</ol>
      <div class="ticket-report separated"><b>🤖 Leitura IA separada:</b><br>${safeMarketText(t.report).replace(/\n/g,'<br>')}</div>
      <div class="alert-box">⚠️ A escolha final é sua. Antes de entrar, confira se o mercado ainda existe na Bet365 e se não houve gol, cartão vermelho ou mudança brusca.</div>
    </div>`;
  }).join('');
}
function generateTickets(){
  const msg=$('#ticketMsg');
  try{
    const mode=$('#ticketMode').value, profile=$('#ticketProfile').value;
    const qty=Math.max(1,Math.min(5,parseInt($('#ticketQty').value||'3',10)));
    const tickets=buildTickets(mode,profile,qty);
    state.lastTickets=tickets; state.tickets=tickets.length; $('#tickets-count').textContent=tickets.length;
    renderTickets(tickets);
    msg.className='result'; msg.textContent=`${tickets.length} bilhete(s) ${mode==='live'?'ao vivo':'pré-jogo'} gerado(s), com combinações diferentes.`;
  }catch(e){ msg.className='result bad'; msg.textContent=e.message; }
}
function saveTickets(){
  const msg=$('#ticketMsg');
  if(!state.lastTickets.length){ msg.className='result bad'; msg.textContent='Gere os bilhetes antes de salvar.'; return; }
  const history=JSON.parse(localStorage.getItem('nb_ticket_history')||'[]');
  for(const t of state.lastTickets) history.unshift({...t,status:'Em andamento'});
  localStorage.setItem('nb_ticket_history',JSON.stringify(history.slice(0,80)));
  msg.className='result'; msg.textContent='Bilhetes salvos no histórico local.';
  renderHistory();
}
function renderHistory(){
  const el=$('#historyList'); if(!el) return;
  const history=JSON.parse(localStorage.getItem('nb_ticket_history')||'[]');
  if(!history.length){ el.innerHTML='<div class="card empty">Nenhum bilhete salvo ainda.</div>'; return; }
  el.innerHTML=history.map((t,idx)=>`<div class="card history-card"><div class="ticket-head"><h3>${safeMarketText(t.title)}</h3><span class="ticket-status">${safeMarketText(t.status||'Em andamento')}</span></div><p class="muted">${safeMarketText(t.createdAt)} • ${safeMarketText(t.game.home)} x ${safeMarketText(t.game.away)}</p><ol>${(t.items||[]).map(i=>`<li>${safeMarketText(i.market)}</li>`).join('')}</ol><div class="actions"><button class="secondary" onclick="setHistoryStatus(${idx},'Ganhou')">Ganhou</button><button class="secondary" onclick="setHistoryStatus(${idx},'Perdeu')">Perdeu</button><button class="secondary" onclick="setHistoryStatus(${idx},'Em andamento')">Em andamento</button></div></div>`).join('');
}
window.setHistoryStatus=function(idx,status){ const h=JSON.parse(localStorage.getItem('nb_ticket_history')||'[]'); if(h[idx]){h[idx].status=status; localStorage.setItem('nb_ticket_history',JSON.stringify(h)); renderHistory();}};
$('#generateTickets')?.addEventListener('click',generateTickets);
$('#saveTickets')?.addEventListener('click',saveTickets);
$('#refreshHistory')?.addEventListener('click',renderHistory);
$('#clearHistory')?.addEventListener('click',()=>{ if(confirm('Limpar histórico local?')){localStorage.removeItem('nb_ticket_history'); renderHistory();}});
setTimeout(renderHistory,400);


load();

/* Web 2.2 - Live conectado automaticamente ao bilhete ao vivo */
function currentSelectedLiveGame(){
  const g=selectedGameForTicket();
  return g && g.isLive ? g : null;
}
function liveSignatureFromAnalysis(a){
  if(!a || !a.game) return '';
  const h=a.home||{}, aw=a.away||{}, g=a.game||{};
  return [g.id,g.homeGoals,g.awayGoals,g.elapsed,g.period,h.shots,h.shotsOn,h.corners,h.cards,h.dangerousAttacks,aw.shots,aw.shotsOn,aw.corners,aw.cards,aw.dangerousAttacks].join('|');
}
function showMonitor(msg,cls='warn'){
  const box=$('#liveMonitorBox');
  if(box){ box.className='result '+cls; box.textContent=msg; }
}
function updateSelectedGameFromLive(freshGame){
  if(!freshGame || !state.games?.length) return;
  const idx=state.games.findIndex(x=>x.id===freshGame.id || x.fixtureId===freshGame.fixtureId);
  if(idx>=0){ state.games[idx]={...state.games[idx],...freshGame,clientFetchedAt:Date.now()}; renderGames(); }
}
async function monitorLiveTick(force=false){
  const g=currentSelectedLiveGame();
  if(!g){ showMonitor('Selecione um jogo ao vivo em Buscar Jogos para ativar o monitor.', 'bad'); return null; }
  try{
    if(force) showMonitor('Atualizando jogo ao vivo pela API...', 'warn');
    const data=await postJSON('/api/live-analysis',{key:localStorage.getItem('nb_api_football'),game:g});
    const sig=liveSignatureFromAnalysis(data);
    const changed=state.liveMonitorSignature && sig!==state.liveMonitorSignature;
    state.liveMonitorSignature=sig;
    state.lastLiveAnalysis=data;
    updateSelectedGameFromLive(data.game);
    renderLiveAnalysis(data);
    if(changed && state.lastLiveTicketSignature && sig!==state.lastLiveTicketSignature){
      state.liveTicketValid=false;
      showMonitor('⚠️ O jogo mudou depois do bilhete ao vivo: placar, minuto ou estatísticas foram atualizados. Gere novamente o bilhete ao vivo.', 'bad');
      $$('.ticket-card').forEach(c=>c.classList.add('ticket-invalid'));
      const msg=$('#ticketMsg'); if(msg){msg.className='result bad'; msg.textContent='O cenário ao vivo mudou. O bilhete anterior não deve ser usado sem gerar novamente.';}
    }else{
      showMonitor(`🔴 Monitor ligado: ${data.game.home} ${data.game.score} ${data.game.away} • ${liveMinute(data.game)}. Atualiza automaticamente a cada 10 segundos.`, '');
    }
    return data;
  }catch(e){
    showMonitor('Falha ao atualizar o ao vivo: '+(e.message||'verifique a API-Football.'), 'bad');
    return null;
  }
}
function startLiveMonitor(){
  const g=currentSelectedLiveGame();
  if(!g){ showMonitor('Selecione um jogo AO VIVO em Buscar Jogos antes de ativar o monitor.', 'bad'); return; }
  clearInterval(state.liveMonitorTimer);
  state.liveMonitorSignature='';
  monitorLiveTick(true);
  state.liveMonitorTimer=setInterval(()=>monitorLiveTick(false),10000);
}

async function generateTicketsConnected(){
  const msg=$('#ticketMsg');
  try{
    const mode=$('#ticketMode').value;
    if(mode==='live'){
      const g=currentSelectedLiveGame();
      if(!g) throw new Error('Para bilhete ao vivo, selecione um jogo que esteja AO VIVO. Pré-jogo e ao vivo não se misturam.');
      const fresh=await monitorLiveTick(true);
      if(!fresh) throw new Error('Não foi possível atualizar o jogo ao vivo. Gere somente depois que o monitor atualizar.');
      state.lastLiveTicketSignature=liveSignatureFromAnalysis(fresh);
      state.liveTicketValid=true;
    }
    const profile=$('#ticketProfile').value;
    const qty=Math.max(1,Math.min(5,parseInt($('#ticketQty').value||'3',10)));
    const tickets=buildTickets(mode,profile,qty);
    if(mode==='live'){
      tickets.forEach(t=>{ t.liveSignature=state.lastLiveTicketSignature; t.monitorado=true; });
    }
    state.lastTickets=tickets; state.tickets=tickets.length; $('#tickets-count').textContent=tickets.length;
    renderTickets(tickets);
    if(mode==='live'){
      msg.className='result';
      msg.textContent=`${tickets.length} bilhete(s) ao vivo gerado(s) com base no cenário atualizado neste momento. Se o jogo mudar, o sistema avisará para gerar novamente.`;
      startLiveMonitor();
    }else{
      msg.className='result';
      msg.textContent=`${tickets.length} bilhete(s) pré-jogo gerado(s), com combinações diferentes.`;
    }
  }catch(e){ msg.className='result bad'; msg.textContent=e.message; }
}

(function reconnectLiveButtons(){
  const old=$('#generateTickets');
  if(old){ const b=old.cloneNode(true); old.parentNode.replaceChild(b,old); b.addEventListener('click',generateTicketsConnected); }
  const mon=$('#startLiveMonitor');
  if(mon){ mon.addEventListener('click',startLiveMonitor); }
  const type=$('#ticketMode');
  if(type){ type.addEventListener('change',()=>{ if(type.value==='live') showMonitor('Modo ao vivo selecionado: ative o monitor para usar tempo, placar e estatísticas atualizadas no bilhete.', 'warn'); }); }
})();


/* Web 2.5 - múltiplos jogos no diagnóstico e quantidade de jogos por bilhete */
(function web23(){
  state.lastDiagnoses=[];
  state.lastLiveAnalyses=[];

  function selectedGames(){
    return selectedGamesAllSafe();
  }
  function selectedGamesForMode(mode){
    const arr=selectedGames();
    if(mode==='live') {
      const live=arr.filter(g=>g.isLive);
      // Correção Copa do Mundo: se a API devolver status estranho, mas o jogo foi buscado em modo ao vivo,
      // permite tentar a análise e o servidor decide com o status real do fixture.
      if(!live.length && arr.some(isWorldCupGame)) return arr;
      return live;
    }
    if(mode==='pre') {
      const pre=arr.filter(g=>!g.isLive);
      // Correção Copa do Mundo: permite diagnóstico pré-jogo de seleções mesmo quando status vem diferente.
      if(!pre.length && arr.some(isWorldCupGame)) return arr;
      return pre;
    }
    return arr;
  }
  function dataByGameId(list,g){
    return (list||[]).find(d=>String(d?.game?.id)===String(g?.id));
  }
  function wrapCardIndex(i,title){ return `<div class="card wide section-head"><h2>${i}. ${safeMarketText(title)}</h2></div>`; }
  function renderDiagnosisMulti(list){
    state.lastDiagnoses=list;
    state.lastDiagnosis=list[0]||null;
    state.lastLiveAnalysis=null;
    if(!list.length){ $('#diagOutput').innerHTML='<div class="card empty">Nenhum diagnóstico gerado.</div>'; return; }
    $('#diagOutput').innerHTML=list.map((data,idx)=>{
      const {game,home,away,recommendations,notes}=data;
      return `${wrapCardIndex(idx+1, game.home+' x '+game.away)}
        <div class="card wide"><p class="muted">🏆 ${safeMarketText(game.league)} • ${safeMarketText(game.country||'')} • ${game.isLive?'🔴 Ao vivo '+safeMarketText(liveMinute(game)):'Pré-jogo'} • Placar: <b>${safeMarketText(game.score)}</b></p><p>${safeMarketText(notes)}</p></div>
        ${teamCard('🏠 '+game.home,home)}
        ${teamCard('✈️ '+game.away,away)}
        <div class="card wide"><h3>🧠 Diagnóstico do confronto</h3><div class="rec-grid"><div><h4>Mercados mais seguros para estudar</h4>${(recommendations.recommended||[]).map(x=>`<p class="rec ok">${safeMarketText(x)}</p>`).join('')}</div><div><h4>Mercados para evitar</h4>${(recommendations.avoid||[]).map(x=>`<p class="rec bad">${safeMarketText(x)}</p>`).join('')}</div></div></div>`;
    }).join('');
  }
  async function runDiagnosisMulti(){
    const msg=$('#diagMsg'), out=$('#diagOutput');
    const games=selectedGamesForMode('pre');
    if(!games.length){ msg.className='result bad'; msg.textContent='Selecione um ou mais jogos PRÉ-JOGO em Buscar Jogos. Ao vivo deve usar Analisar ao vivo.'; out.innerHTML=''; return; }
    msg.className='result warn'; msg.textContent=`Analisando ${games.length} confronto(s) pré-jogo...`;
    out.innerHTML='<div class="card empty">Gerando diagnóstico para todos os jogos marcados...</div>';
    const results=[];
    for(const [i,g] of games.entries()){
      msg.textContent=`Analisando ${i+1}/${games.length}: ${g.home} x ${g.away}...`;
      try{ results.push(await postJSON('/api/diagnosis',{key:localStorage.getItem('nb_api_football'),game:g})); }
      catch(e){ results.push({game:g,home:{profile:{attack:'--',defense:'--',style:'--'},wins:0,draws:0,losses:0,avg:{goalsFor:'--',goalsAgainst:'--',firstHalfFor:'--',secondHalfFor:'--',cornersFor:'--',cornersAgainst:'--',cardsFor:'--'}},away:{profile:{attack:'--',defense:'--',style:'--'},wins:0,draws:0,losses:0,avg:{goalsFor:'--',goalsAgainst:'--',firstHalfFor:'--',secondHalfFor:'--',cornersFor:'--',cornersAgainst:'--',cardsFor:'--'}},recommendations:{recommended:['Análise parcial indisponível para este jogo'],avoid:['Conferir dados antes de montar bilhete']},notes:e.message||'Falha ao analisar este confronto.'}); }
    }
    renderDiagnosisMulti(results);
    msg.className='result'; msg.textContent=`Diagnóstico gerado para ${results.length} confronto(s).`;
  }
  function renderLiveAnalysisMulti(list){
    state.lastLiveAnalyses=list;
    state.lastLiveAnalysis=list[0]||null;
    if(!list.length){ $('#liveOutput').innerHTML='<div class="card empty">Nenhuma análise ao vivo gerada.</div>'; return; }
    $('#liveOutput').innerHTML=list.map((data,idx)=>{
      const g=data.game,h=data.home,a=data.away,p=data.pressure,markets=data.markets||[];
      return `${wrapCardIndex(idx+1, '🔴 '+g.home+' x '+g.away)}
        <div class="card wide live-panel"><p class="muted">${safeMarketText(g.league)} • ${safeMarketText(g.country||'')}</p><div class="score-big"><div class="team"><small>Casa</small><b>${safeMarketText(g.home)}</b></div><div><b>${safeMarketText(g.score)}</b><div class="clock">${safeMarketText(liveMinute(g))}</div></div><div class="team"><small>Fora</small><b>${safeMarketText(g.away)}</b></div></div><div class="metrics"><div><small>Pressão casa</small><b class="${pressureClass(p.home)}">${safeMarketText(p.home)}</b></div><div><small>Pressão fora</small><b class="${pressureClass(p.away)}">${safeMarketText(p.away)}</b></div><div><small>Domínio</small><b>${safeMarketText(p.edge)}</b></div><div><small>Cenário</small><b>${safeMarketText(data.scenario)}</b></div></div></div>
        <div class="card diag-card"><h3>🏠 ${safeMarketText(g.home)} ao vivo</h3>${liveStats(h)}</div>
        <div class="card diag-card"><h3>✈️ ${safeMarketText(g.away)} ao vivo</h3>${liveStats(a)}</div>
        <div class="card wide"><h3>🎯 Mercados que a IA estudaria agora</h3><div class="market-list">${markets.map(m=>`<div class="market-card"><b>${safeMarketText(m.name)}</b><small>${safeMarketText(m.reason)}</small></div>`).join('')}</div></div>
        <div class="card wide"><h3>📝 Relatório final da IA</h3><p class="live-report">${safeMarketText(data.report)}</p>${data.alert?`<div class="alert-box">⚠️ ${safeMarketText(data.alert)}</div>`:''}</div>`;
    }).join('');
  }
  async function runLiveAnalysisMulti(){
    const msg=$('#diagMsg');
    const games=selectedGamesForMode('live');
    if(!games.length){ msg.className='result bad'; msg.textContent='Selecione um ou mais jogos AO VIVO em Buscar Jogos. Se for Copa do Mundo e o status vier diferente da API, a versão 2.6.2 tenta analisar mesmo assim.'; $('#liveOutput').innerHTML=''; return; }
    msg.className='result warn'; msg.textContent=`Analisando ${games.length} jogo(s) ao vivo...`;
    $('#liveOutput').innerHTML='<div class="card live-panel"><h2>🔴 Live Trader IA</h2><p class="muted">Buscando estatísticas em tempo real para todos os jogos marcados...</p></div>';
    const results=[];
    for(const [i,g] of games.entries()){
      msg.textContent=`Analisando ao vivo ${i+1}/${games.length}: ${g.home} x ${g.away}...`;
      try{ const d=await postJSON('/api/live-analysis',{key:localStorage.getItem('nb_api_football'),game:g}); results.push(d); updateSelectedGameFromLive(d.game); }
      catch(e){ console.warn('Live analysis failed',e); }
    }
    renderLiveAnalysisMulti(results);
    msg.className=results.length?'result':'result bad';
    msg.textContent=results.length?`Análise ao vivo gerada para ${results.length} jogo(s).`:'Não foi possível gerar análise ao vivo dos jogos selecionados.';
  }
  function getGamesPerTicket(){
    const el=$('#ticketGamesPerSlip');
    return Math.max(1,Math.min(10,parseInt(el?.value||'3',10)));
  }
  function getPoolForGame(mode,profile,g){
    if(mode==='live'){
      const analysis=dataByGameId(state.lastLiveAnalyses,g) || (state.lastLiveAnalysis?.game?.id===g.id?state.lastLiveAnalysis:null) || {game:g,home:{},away:{},pressure:{edge:'Equilibrado'},report:'Análise ao vivo parcial. Confira o monitor antes de entrar.'};
      return marketPoolLive(profile,analysis);
    }
    const diag=dataByGameId(state.lastDiagnoses,g) || (state.lastDiagnosis?.game?.id===g.id?state.lastDiagnosis:null) || {game:g,recommendations:{recommended:[]}};
    return marketPoolPre(profile,diag);
  }
  window.buildTickets=function(mode,profile,qty){
    const games=selectedGamesForMode(mode);
    if(!games.length) throw new Error(mode==='live'?'Selecione jogos AO VIVO para gerar bilhete ao vivo.':'Selecione jogos PRÉ-JOGO para gerar bilhete pré-jogo.');
    const gamesPerTicket=getGamesPerTicket();
    if(games.length<gamesPerTicket) throw new Error(`Você pediu ${gamesPerTicket} jogos por bilhete, mas selecionou apenas ${games.length} jogo(s) deste modo.`);
    const perGameMarkets=profile==='conservador'?1:profile==='medio'?2:2;
    const tickets=[];
    for(let i=0;i<qty;i++){
      const chosen=[];
      for(let j=0;j<gamesPerTicket;j++) chosen.push(games[(i+j)%games.length]);
      const items=[];
      for(const [j,g] of chosen.entries()){
        const pool=getPoolForGame(mode,profile,g);
        for(let k=0;k<perGameMarkets;k++){
          const pick=pool[(i+j+k)%pool.length] || pool[0];
          if(pick) items.push({...pick,game:g,market:`${g.home} x ${g.away} — ${pick.market}`,reason:pick.reason||'Mercado escolhido pela leitura do confronto.'});
        }
      }
      const report=mode==='live'
        ? `Bilhete ao vivo formado com ${chosen.length} jogo(s). Cada entrada depende do cenário atual do respectivo jogo. Se algum placar, cartão vermelho ou pressão mudar, gere novamente.`
        : `Bilhete pré-jogo formado com ${chosen.length} jogo(s), usando diagnóstico individual de cada confronto e combinações diferentes de mercados.`;
      tickets.push({id:'NB-'+Date.now()+'-'+(i+1),createdAt:new Date().toLocaleString('pt-BR'),mode,profile,game:chosen[0],games:chosen,title:`Bilhete ${i+1} — ${mode==='pre'?'Pré-jogo':'Ao vivo'} ${profile.charAt(0).toUpperCase()+profile.slice(1)} • ${chosen.length} jogos`,items,report});
    }
    return tickets;
  };
  window.renderTickets=function(tickets){
    const out=$('#ticketOutput'); if(!out) return;
    out.innerHTML=tickets.map(t=>{
      const gamesLine=(t.games||[t.game]).map(g=>`${safeMarketText(g.home)} x ${safeMarketText(g.away)}${t.mode==='live'?' • '+safeMarketText(g.score||'')+' • '+safeMarketText(liveMinute(g)):''}`).join('<br>');
      return `<div class="card ticket-card objective-ticket"><div class="ticket-head"><h3>${safeMarketText(t.title)}</h3><span class="ticket-mode ${t.mode==='live'?'live':''}">${t.mode==='live'?'AO VIVO':'PRÉ-JOGO'}</span></div><p class="muted">${gamesLine}</p><div class="ticket-section-title">Entradas sugeridas</div><ol class="objective-list">${t.items.map(i=>`<li><div><b>Mercado: ${safeMarketText(i.market)}</b><small>${safeMarketText(i.reason)}</small></div><span class="confidence ${confidenceClass(i.confidence)}">${safeMarketText(i.confidence||'🟡 Média')}</span></li>`).join('')}</ol><div class="ticket-report separated"><b>🤖 Leitura IA separada:</b><br>${safeMarketText(t.report).replace(/\n/g,'<br>')}</div><div class="alert-box">⚠️ A escolha final é sua. Confira se os mercados existem na Bet365 antes de entrar.</div></div>`;
    }).join('');
  };
  async function generateTicketsMulti(){
    const msg=$('#ticketMsg');
    try{
      const mode=$('#ticketMode').value, profile=$('#ticketProfile').value;
      const qty=Math.max(1,Math.min(5,parseInt($('#ticketQty').value||'3',10)));
      if(mode==='live'){
        const games=selectedGamesForMode('live');
        if(!games.length) throw new Error('Para bilhete ao vivo, selecione jogos ao vivo.');
        if(!state.lastLiveAnalyses?.length) await runLiveAnalysisMulti();
      } else {
        if(!state.lastDiagnoses?.length) await runDiagnosisMulti();
      }
      const tickets=window.buildTickets(mode,profile,qty);
      state.lastTickets=tickets; state.tickets=tickets.length; $('#tickets-count').textContent=tickets.length;
      window.renderTickets(tickets);
      msg.className='result'; msg.textContent=`${tickets.length} bilhete(s) ${mode==='live'?'ao vivo':'pré-jogo'} gerado(s), com ${getGamesPerTicket()} jogo(s) por bilhete.`;
    }catch(e){ msg.className='result bad'; msg.textContent=e.message; }
  }
  function reconnectWeb23(){
    const rd=$('#runDiagnosis'); if(rd){const b=rd.cloneNode(true); rd.parentNode.replaceChild(b,rd); b.addEventListener('click',runDiagnosisMulti);}
    const rl=$('#runLiveAnalysis'); if(rl){const b=rl.cloneNode(true); rl.parentNode.replaceChild(b,rl); b.addEventListener('click',runLiveAnalysisMulti);}
    const gen=$('#generateTickets'); if(gen){const b=gen.cloneNode(true); gen.parentNode.replaceChild(b,gen); b.addEventListener('click',generateTicketsMulti);}
    const mon=$('#startLiveMonitor'); if(mon){const b=mon.cloneNode(true); mon.parentNode.replaceChild(b,mon); b.addEventListener('click',startLiveMonitor);}
  }
  reconnectWeb23();
  // Web 2.6.1: expõe funções para outros módulos e restaura escolha explícita Pré-jogo/Ao vivo
  window.runDiagnosisMulti=runDiagnosisMulti;
  window.runLiveAnalysisMulti=runLiveAnalysisMulti;
  window.diagnoseSelectedMode=async function(){
    const mode=(document.querySelector('input[name="diagMode"]:checked')?.value)||'pre';
    const msg=document.getElementById('diagMsg');
    if(mode==='live'){
      if(msg){ msg.className='result warn'; msg.textContent='Modo ao vivo selecionado: analisando somente jogos ao vivo marcados.'; }
      await runLiveAnalysisMulti();
    }else{
      if(msg){ msg.className='result warn'; msg.textContent='Modo pré-jogo selecionado: analisando somente jogos pré-jogo marcados.'; }
      await runDiagnosisMulti();
    }
  };
  function bindDiagnosisModeUI(){
    document.querySelectorAll('.mode-option').forEach(opt=>{
      opt.addEventListener('click',()=>{
        const mode=opt.dataset.diagMode;
        const input=opt.querySelector('input');
        if(input) input.checked=true;
        document.querySelectorAll('.mode-option').forEach(x=>x.classList.remove('active'));
        opt.classList.add('active');
        const diag=document.getElementById('diagOutput');
        const live=document.getElementById('liveOutput');
        const msg=document.getElementById('diagMsg');
        if(mode==='live'){
          if(diag) diag.innerHTML='';
          if(msg){msg.className='result warn'; msg.textContent='Modo ao vivo escolhido. Selecione jogos ao vivo em Buscar Jogos e clique em Analisar modo selecionado.';}
        }else{
          if(live) live.innerHTML='';
          if(msg){msg.className='result warn'; msg.textContent='Modo pré-jogo escolhido. Selecione jogos pré-jogo em Buscar Jogos e clique em Analisar modo selecionado.';}
        }
      });
    });
    const btn=document.getElementById('runSelectedDiagnosis');
    if(btn) btn.addEventListener('click',window.diagnoseSelectedMode);
  }
  bindDiagnosisModeUI();
})();

/* Web 2.5 - Novo Bilhete / Nova Busca */
(function web24NewSearchFlow(){
  function showNewSearchButton(){
    const btn=document.getElementById('newBetSearch');
    if(btn) btn.classList.remove('hidden');
  }
  function hideNewSearchButton(){
    const btn=document.getElementById('newBetSearch');
    if(btn) btn.classList.add('hidden');
  }
  function clearCurrentCycle(){
    try{ clearInterval(state.liveMonitorTimer); }catch(e){}
    state.selected=[];
    state.lastDiagnosis=null;
    state.lastDiagnoses=[];
    state.lastLiveAnalysis=null;
    state.lastLiveAnalyses=[];
    state.lastTickets=[];
    state.liveMonitorSignature='';
    state.lastLiveTicketSignature='';
    state.liveTicketValid=false;
    const selected=document.getElementById('selected-count'); if(selected) selected.textContent='0';
    const diag=document.getElementById('diagOutput'); if(diag) diag.innerHTML='';
    const live=document.getElementById('liveOutput'); if(live) live.innerHTML='';
    const out=document.getElementById('ticketOutput'); if(out) out.innerHTML='';
    const diagMsg=document.getElementById('diagMsg'); if(diagMsg){ diagMsg.className='result warn'; diagMsg.textContent='Diagnóstico limpo. Faça uma nova seleção de jogos.'; }
    const liveBox=document.getElementById('liveMonitorBox'); if(liveBox){ liveBox.className='result warn'; liveBox.textContent='Monitor ao vivo desligado. Selecione novos jogos ao vivo para ativar novamente.'; }
    const ticketMsg=document.getElementById('ticketMsg'); if(ticketMsg){ ticketMsg.className='result warn'; ticketMsg.textContent='Ciclo anterior encerrado. Busque e selecione novos jogos para formar outro bilhete.'; }
    if(typeof renderGames==='function') renderGames();
    hideNewSearchButton();
    if(typeof go==='function') go('jogos');
    const gamesMsg=document.getElementById('gamesMsg');
    if(gamesMsg){ gamesMsg.innerHTML='🔄 Pronto para nova busca. As APIs, chaves e histórico foram mantidos.'; }
  }
  const newBtn=document.getElementById('newBetSearch');
  if(newBtn){ newBtn.addEventListener('click', clearCurrentCycle); }
  const saveBtn=document.getElementById('saveTickets');
  if(saveBtn){
    saveBtn.addEventListener('click', function(){
      setTimeout(function(){
        if(state.lastTickets && state.lastTickets.length){
          showNewSearchButton();
          const msg=document.getElementById('ticketMsg');
          if(msg){ msg.className='result flow-success'; msg.textContent='Bilhete salvo com sucesso. Agora você pode clicar em “Novo Bilhete / Nova Busca” para limpar a seleção e começar outro ciclo.'; }
        }
      },80);
    });
  }
})();

/* Web 2.5 - Histórico profissional + Atualizar Resultado */
function statusClass(status){
  const s=String(status||'').toLowerCase();
  if(s.includes('ganhou')) return 'won';
  if(s.includes('perdeu')) return 'lost';
  if(s.includes('manual')) return 'manual';
  return 'running';
}
function ticketModeLabel(t){ return t.mode==='live'?'🔴 Ao Vivo':'⚪ Pré-jogo'; }
function ticketGamesLine(t){
  const games=(t.games&&t.games.length?t.games:[t.game]).filter(Boolean);
  return games.map(g=>`${safeMarketText(g.home)} x ${safeMarketText(g.away)}${g.score?' • '+safeMarketText(g.score):''}`).join('<br>');
}
function setHistoryMessage(txt,cls='warn'){
  const box=document.getElementById('historyMsg');
  if(box){ box.className='result '+cls; box.textContent=txt; }
}
renderHistory=function(){
  const el=document.getElementById('historyList'); if(!el) return;
  const history=JSON.parse(localStorage.getItem('nb_ticket_history')||'[]');
  if(!history.length){ el.innerHTML='<div class="card empty">Nenhum bilhete salvo ainda.</div>'; return; }
  el.innerHTML=history.map((t,idx)=>{
    const details=(t.resultDetails||[]).map(d=>`<li><b>${safeMarketText(d.status)}</b> — ${safeMarketText(d.market||'')}<small>${safeMarketText(d.game||'')} ${safeMarketText(d.detail||'')}</small></li>`).join('');
    return `<div class="card history-card pro-history">
      <div class="ticket-head"><h3>${safeMarketText(t.title||('Bilhete #'+(idx+1)))}</h3><span class="ticket-status ${statusClass(t.status)}">${safeMarketText(t.status||'Em andamento')}</span></div>
      <div class="history-meta"><span>${ticketModeLabel(t)}</span><span>Perfil: ${safeMarketText(t.profile||'--')}</span><span>${safeMarketText(t.createdAt||'')}</span></div>
      <p class="muted">${ticketGamesLine(t)}</p>
      <div class="ticket-section-title">Entradas do bilhete</div>
      <ol class="history-markets">${(t.items||[]).map(i=>`<li>${safeMarketText(i.market)}<small>${safeMarketText(i.reason||'')}</small></li>`).join('')}</ol>
      ${t.resultSummary?`<div class="ticket-report separated"><b>Resumo do resultado:</b><br>${safeMarketText(t.resultSummary)}</div>`:''}
      ${details?`<div class="result-details"><b>Conferência das entradas</b><ol>${details}</ol></div>`:''}
      <div class="actions">
        <button class="primary" onclick="updateTicketResult(${idx})">🔄 Atualizar resultado</button>
        <button class="secondary" onclick="setHistoryStatus(${idx},'Ganhou')">Marcar ganhou</button>
        <button class="secondary" onclick="setHistoryStatus(${idx},'Perdeu')">Marcar perdeu</button>
        <button class="secondary" onclick="setHistoryStatus(${idx},'Em andamento')">Em andamento</button>
      </div>
    </div>`;
  }).join('');
};
window.setHistoryStatus=function(idx,status){ const h=JSON.parse(localStorage.getItem('nb_ticket_history')||'[]'); if(h[idx]){h[idx].status=status; h[idx].updatedAt=new Date().toLocaleString('pt-BR'); localStorage.setItem('nb_ticket_history',JSON.stringify(h)); renderHistory(); setHistoryMessage(`Bilhete marcado como ${status}.`,''); }};
window.updateTicketResult=async function(idx){
  const h=JSON.parse(localStorage.getItem('nb_ticket_history')||'[]');
  const ticket=h[idx];
  if(!ticket){ setHistoryMessage('Bilhete não encontrado.','bad'); return; }
  setHistoryMessage('Consultando resultado na API-Football...','warn');
  try{
    const data=await postJSON('/api/ticket-result',{key:localStorage.getItem('nb_api_football'),ticket});
    ticket.status=data.status||ticket.status||'Em andamento';
    ticket.resultSummary=data.summary||'';
    ticket.resultDetails=data.details||[];
    ticket.updatedAt=new Date().toLocaleString('pt-BR');
    h[idx]=ticket;
    localStorage.setItem('nb_ticket_history',JSON.stringify(h));
    renderHistory();
    setHistoryMessage(`Resultado atualizado: ${ticket.status}. ${ticket.resultSummary||''}`, ticket.status==='Perdeu'?'bad':ticket.status==='Ganhou'?'':'warn');
  }catch(e){
    setHistoryMessage('Não foi possível atualizar automaticamente: '+(e.message||'verifique a API-Football.'),'bad');
  }
};
(function web25Init(){
  const histCard=document.querySelector('#historico .card');
  if(histCard && !document.getElementById('historyMsg')){
    const d=document.createElement('div'); d.id='historyMsg'; d.className='result warn'; d.textContent='Histórico 2.5: salve o bilhete e use “Atualizar resultado” quando os jogos terminarem.'; histCard.appendChild(d);
  }
  setTimeout(renderHistory,300);
})();


/* Web 2.6 - Odds Bet365 real + odd total + retorno possível */
(function web26Bet365Odds(){
  function money(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function numOdd(v){ const n=Number(v); return Number.isFinite(n) && n>1 ? n : null; }
  function cleanMarketForOdd(item){ return String(item.market||'').replace(/^.*? — /,''); }
  async function fetchBet365Odd(item){
    const g=item.game||{};
    try{
      const data=await postJSON('/api/odds/bet365',{
        footballKey:localStorage.getItem('nb_api_football'),
        sportKey:localStorage.getItem('nb_sportmonks'),
        fixtureId:g.fixtureId||g.id,
        market:cleanMarketForOdd(item),
        game:g
      });
      if(data && data.available){
        return {...item, odd:data.odd, oddSource:data.source, bookmaker:data.bookmaker||'Bet365', oddMarketName:data.marketName, oddSelection:data.selection, oddStatus:'ok'};
      }
      return {...item, odd:null, oddStatus:'unavailable', oddMessage:data?.message||'Odd Bet365 não disponível.'};
    }catch(e){
      return {...item, odd:null, oddStatus:'error', oddMessage:e.message||'Erro ao consultar Bet365.'};
    }
  }
  window.enrichTicketsWithOdds = async function enrichTicketsWithOdds(tickets){
    const qty=Math.max(1,tickets.length||1);
    const bank=Number(document.getElementById('ticketBank')?.value||0);
    const stake=bank>0 ? +(bank/qty).toFixed(2) : 0;
    for(const t of tickets){
      const enriched=[];
      for(const item of (t.items||[])) enriched.push(await fetchBet365Odd(item));
      t.items=enriched;
      const odds=enriched.map(i=>numOdd(i.odd)).filter(Boolean);
      t.oddTotal=odds.length===enriched.length ? +odds.reduce((a,b)=>a*b,1).toFixed(2) : null;
      t.stake=stake;
      t.possibleReturn=(t.oddTotal&&stake)? +(t.oddTotal*stake).toFixed(2) : null;
      t.oddsNote=t.oddTotal ? 'Odds Bet365 localizadas pelo fornecedor para todas as entradas.' : 'Nem todas as odds Bet365 foram retornadas pelo fornecedor. Confira na Bet365 antes de entrar.';
    }
    return tickets;
  }
  const oldRender=window.renderTickets;
  window.renderTickets=function(tickets){
    const out=document.getElementById('ticketOutput'); if(!out){ if(oldRender) oldRender(tickets); return; }
    out.innerHTML=tickets.map(t=>{
      const gamesLine=(t.games||[t.game]).map(g=>`${safeMarketText(g.home)} x ${safeMarketText(g.away)}${t.mode==='live'?' • '+safeMarketText(g.score||'')+' • '+safeMarketText(liveMinute(g)):''}`).join('<br>');
      const totalBox=`<div class="odds-summary"><div><small>Odd total Bet365</small><b>${t.oddTotal?String(t.oddTotal.toFixed(2)).replace('.',','):'Conferir'}</b></div><div><small>Valor por bilhete</small><b>${t.stake?money(t.stake):'Não informado'}</b></div><div><small>Retorno possível</small><b>${t.possibleReturn?money(t.possibleReturn):'Conferir'}</b></div></div>`;
      return `<div class="card ticket-card objective-ticket"><div class="ticket-head"><h3>${safeMarketText(t.title)}</h3><span class="ticket-mode ${t.mode==='live'?'live':''}">${t.mode==='live'?'AO VIVO':'PRÉ-JOGO'}</span></div><p class="muted">${gamesLine}</p>${totalBox}<div class="ticket-section-title">Entradas sugeridas com odds Bet365</div><ol class="objective-list">${(t.items||[]).map(i=>`<li><div><b>Mercado: ${safeMarketText(i.market)}</b><small>${safeMarketText(i.reason)}</small>${i.odd?`<small class="odd-line">Bet365: ${safeMarketText(i.oddMarketName||'Mercado')} • ${safeMarketText(i.oddSelection||'Seleção')} • Odd ${String(Number(i.odd).toFixed(2)).replace('.',',')}</small>`:`<small class="odd-line warn">Bet365: ${safeMarketText(i.oddMessage||'odd não disponível no fornecedor')}</small>`}</div><span class="confidence ${confidenceClass(i.confidence)}">${safeMarketText(i.confidence||'🟡 Média')}</span></li>`).join('')}</ol><div class="ticket-report separated"><b>🤖 Leitura IA separada:</b><br>${safeMarketText(t.report).replace(/\n/g,'<br>')}</div><div class="alert-box">⚠️ ${safeMarketText(t.oddsNote||'A escolha final é sua. Confira se os mercados existem na Bet365 antes de entrar.')}</div></div>`;
    }).join('');
  };
  async function generateTicketsWithOdds(){
    const msg=document.getElementById('ticketMsg');
    try{
      const mode=document.getElementById('ticketMode').value, profile=document.getElementById('ticketProfile').value;
      const qty=Math.max(1,Math.min(5,parseInt(document.getElementById('ticketQty').value||'3',10)));
      if(mode==='live'){
        const ids=new Set(state.selected||[]); const live=(state.games||[]).filter(g=>ids.has(g.id)&&g.isLive);
        if(!live.length) throw new Error('Para bilhete ao vivo, selecione jogos ao vivo.');
        if(!state.lastLiveAnalyses?.length && typeof window.runLiveAnalysisMulti==='function') await window.runLiveAnalysisMulti();
      }else{
        if(!state.lastDiagnoses?.length && typeof window.runDiagnosisMulti==='function') await window.runDiagnosisMulti();
      }
      let tickets=window.buildTickets(mode,profile,qty);
      msg.className='result warn'; msg.textContent='Bilhetes gerados. Buscando odds Bet365 reais no fornecedor...';
      tickets=await enrichTicketsWithOdds(tickets);
      state.lastTickets=tickets; state.tickets=tickets.length; document.getElementById('tickets-count').textContent=tickets.length;
      window.renderTickets(tickets);
      msg.className='result'; msg.textContent=`${tickets.length} bilhete(s) ${mode==='live'?'ao vivo':'pré-jogo'} gerado(s) com tentativa de odds Bet365 reais. Confira na Bet365 antes de entrar.`;
    }catch(e){ msg.className='result bad'; msg.textContent=e.message; }
  }
  function reconnect(){
    const gen=document.getElementById('generateTickets');
    if(gen){ const b=gen.cloneNode(true); gen.parentNode.replaceChild(b,gen); b.addEventListener('click',generateTicketsWithOdds); }
  }
  reconnect();
})();

/* Web 2.6.3 - Motor Live Real: diagnóstico e bilhete acompanhando tempo real a cada 10s */
(function web263LiveReal(){
  state.liveRealTimer = state.liveRealTimer || null;
  state.liveRealLastSignature = state.liveRealLastSignature || '';
  state.liveRealTicketSignature = state.liveRealTicketSignature || '';
  state.liveRealRunning = false;

  function currentLiveSelectionList(){
    const ids=new Set(state.selected||[]);
    return (state.games||[]).filter(g=>(ids.has(g.id)||ids.has(g.fixtureId)) && (g.isLive || isWorldCupGame(g)));
  }

  function liveRealSignature(data){
    if(!data || !data.game) return '';
    const g=data.game, h=data.home||{}, a=data.away||{};
    return [
      g.id,g.fixtureId,g.homeGoals,g.awayGoals,g.elapsed,g.period,g.statusText,
      h.shots,h.shotsOn,h.possession,h.corners,h.cards,h.dangerousAttacks,
      a.shots,a.shotsOn,a.possession,a.corners,a.cards,a.dangerousAttacks
    ].join('|');
  }

  function liveRealChangedReason(oldSig,newSig){
    if(!oldSig || !newSig) return '';
    const o=oldSig.split('|'), n=newSig.split('|');
    const reasons=[];
    if(o[2]!==n[2] || o[3]!==n[3]) reasons.push('placar');
    if(o[4]!==n[4] || o[5]!==n[5]) reasons.push('tempo');
    const statOld=o.slice(7).join('|'), statNew=n.slice(7).join('|');
    if(statOld!==statNew) reasons.push('estatísticas');
    return reasons.join(', ');
  }

  function showLiveRealStatus(text,cls='warn'){
    let box=document.getElementById('liveRealStatus');
    const diagCard=document.querySelector('#diagnostico .card');
    if(!box && diagCard){
      box=document.createElement('div');
      box.id='liveRealStatus';
      box.className='result warn';
      diagCard.appendChild(box);
    }
    if(box){ box.className='result '+cls; box.textContent=text; }
  }

  async function refreshOneLiveGame(g){
    const data=await postJSON('/api/live-analysis',{key:localStorage.getItem('nb_api_football'),game:g});
    updateSelectedGameFromLive(data.game);
    return data;
  }

  async function refreshSelectedLiveAnalyses(showMessage=false){
    const games=currentLiveSelectionList();
    if(!games.length){
      showLiveRealStatus('Selecione um ou mais jogos ao vivo para ativar o monitor em tempo real.', 'bad');
      return [];
    }
    if(showMessage) showLiveRealStatus('Atualizando jogos ao vivo pela API...', 'warn');
    const results=[];
    for(const g of games){
      try{
        const d=await refreshOneLiveGame(g);
        results.push(d);
      }catch(e){
        console.warn('Falha no refresh live 2.6.3',e);
      }
    }
    if(results.length){
      state.lastLiveAnalyses=results;
      state.lastLiveAnalysis=results[0];
      if(typeof renderLiveAnalysisMulti==='function'){
        renderLiveAnalysisMulti(results);
      }else if(results[0] && typeof renderLiveAnalysis==='function'){
        renderLiveAnalysis(results[0]);
      }

      const sig=results.map(liveRealSignature).join('||');
      const changed=state.liveRealLastSignature && sig!==state.liveRealLastSignature;
      const reason=liveRealChangedReason(state.liveRealLastSignature.split('||')[0]||'', sig.split('||')[0]||'');
      state.liveRealLastSignature=sig;

      if(changed && state.liveRealTicketSignature && sig!==state.liveRealTicketSignature){
        const msg=`⚠️ O jogo mudou (${reason||'novo cenário'}). Bilhete ao vivo anterior deve ser gerado novamente antes de entrar.`;
        showLiveRealStatus(msg,'bad');
        const ticketMsg=document.getElementById('ticketMsg');
        if(ticketMsg){ ticketMsg.className='result bad'; ticketMsg.textContent=msg; }
        document.querySelectorAll('.ticket-card').forEach(c=>c.classList.add('ticket-invalid'));
      }else{
        const g0=results[0].game;
        showLiveRealStatus(`🔴 Monitor 10s ligado: ${g0.home} ${g0.score} ${g0.away} • ${liveMinute(g0)}. Diagnóstico e bilhete ao vivo usam este cenário atualizado.`, '');
      }
    }else{
      showLiveRealStatus('Não foi possível atualizar os jogos ao vivo agora. Confira a API-Football.', 'bad');
    }
    return results;
  }

  window.startLiveRealMonitor10s=function(){
    clearInterval(state.liveRealTimer);
    state.liveRealRunning=true;
    refreshSelectedLiveAnalyses(true);
    state.liveRealTimer=setInterval(()=>refreshSelectedLiveAnalyses(false),10000);
  };

  const oldStart=window.startLiveMonitor;
  window.startLiveMonitor=function(){
    window.startLiveRealMonitor10s();
    if(typeof oldStart==='function'){
      // Não chama o antigo para evitar timer duplicado de 30s/10s.
    }
  };

  // Substitui botão de monitor se existir
  setTimeout(()=>{
    const mon=document.getElementById('startLiveMonitor');
    if(mon){
      const b=mon.cloneNode(true);
      b.textContent='🔴 Monitor ao vivo 10s';
      mon.parentNode.replaceChild(b,mon);
      b.addEventListener('click',window.startLiveRealMonitor10s);
    }
  },300);

  // Ao analisar ao vivo, inicia monitor automaticamente
  const oldRunSelected=window.diagnoseSelectedMode;
  if(oldRunSelected){
    window.diagnoseSelectedMode=async function(){
      const mode=(document.querySelector('input[name="diagMode"]:checked')?.value)||'pre';
      await oldRunSelected();
      if(mode==='live') window.startLiveRealMonitor10s();
    };
    setTimeout(()=>{
      const btn=document.getElementById('runSelectedDiagnosis');
      if(btn){
        const b=btn.cloneNode(true);
        btn.parentNode.replaceChild(b,btn);
        b.addEventListener('click',window.diagnoseSelectedMode);
      }
    },300);
  }

  // Geração de bilhete ao vivo passa a gravar assinatura do cenário atual
  const oldGenerateHandler=function(){};
  setTimeout(()=>{
    const gen=document.getElementById('generateTickets');
    if(gen){
      const b=gen.cloneNode(true);
      gen.parentNode.replaceChild(b,gen);
      b.addEventListener('click',async function(){
        const mode=document.getElementById('ticketMode')?.value;
        if(mode==='live'){
          const fresh=await refreshSelectedLiveAnalyses(true);
          if(!fresh.length){
            const msg=document.getElementById('ticketMsg');
            if(msg){msg.className='result bad'; msg.textContent='Não foi possível atualizar o cenário ao vivo. Gere o bilhete somente após o monitor carregar.';}
            return;
          }
          state.liveRealTicketSignature=fresh.map(liveRealSignature).join('||');
        }
        // Usa o fluxo 2.6 já existente, clicando por meio da lógica disponível: gera manualmente com odds.
        try{
          const profile=document.getElementById('ticketProfile').value;
          const qty=Math.max(1,Math.min(5,parseInt(document.getElementById('ticketQty').value||'3',10)));
          if(mode==='live'){
            if(!state.lastLiveAnalyses?.length) await refreshSelectedLiveAnalyses(true);
          }else{
            if(!state.lastDiagnoses?.length && typeof window.runDiagnosisMulti==='function') await window.runDiagnosisMulti();
          }
          let tickets=window.buildTickets(mode,profile,qty);
          const msg=document.getElementById('ticketMsg');
          if(msg){msg.className='result warn'; msg.textContent='Bilhetes gerados com cenário atualizado. Buscando odds Bet365...';}
          if(typeof enrichTicketsWithOdds==='function'){
            tickets=await enrichTicketsWithOdds(tickets);
          }
          state.lastTickets=tickets;
          state.tickets=tickets.length;
          const count=document.getElementById('tickets-count'); if(count) count.textContent=tickets.length;
          window.renderTickets(tickets);
          if(msg){msg.className='result'; msg.textContent=`${tickets.length} bilhete(s) ${mode==='live'?'ao vivo':'pré-jogo'} gerado(s). ${mode==='live'?'Monitor 10s acompanhará mudanças e avisará se precisar gerar novamente.':''}`;}
          if(mode==='live') window.startLiveRealMonitor10s();
        }catch(e){
          const msg=document.getElementById('ticketMsg');
          if(msg){msg.className='result bad'; msg.textContent=e.message;}
        }
      });
    }
  },500);

  // Ao trocar para modo live no gerador, sugere monitor
  setTimeout(()=>{
    const t=document.getElementById('ticketMode');
    if(t){
      t.addEventListener('change',()=>{
        if(t.value==='live') showLiveRealStatus('Modo bilhete ao vivo: o sistema atualizará o jogo a cada 10 segundos antes e depois de gerar.', 'warn');
      });
    }
  },300);
})();

/* Web 2.6.4 - Ajuste de tempo ao vivo: não retrocede, mostra atraso e sincroniza telas */
(function web264LiveClockFix(){
  state.liveClockCache = state.liveClockCache || {};
  state.liveApiUpdatedAt = state.liveApiUpdatedAt || null;

  function nowClock(){
    return new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  function fixtureKey(g){ return String(g?.fixtureId || g?.id || `${g?.home}-${g?.away}`); }

  function isPausedOrFinished(g){
    const st=String(g?.statusText||g?.period||'').toLowerCase();
    return st.includes('interval') || st.includes('half') || st.includes('finished') || st.includes('final') || st.includes('full') || st.includes('ft');
  }

  const originalLiveMinute = typeof liveMinute === 'function' ? liveMinute : null;

  liveMinute = function(g){
    if(!g || !g.isLive) return g?.statusText || '';
    const base = Number.isFinite(Number(g.elapsed)) ? Number(g.elapsed) : null;
    if(base===null) return g.statusText || 'Ao vivo';

    const key=fixtureKey(g);
    const fetchedAt = g.clientFetchedAt || g.apiFetchedAt || Date.now();
    const delta = isPausedOrFinished(g) ? 0 : Math.floor((Date.now()-fetchedAt)/60000);
    let estimated = Math.min(130, base + Math.max(0, delta));

    const cache = state.liveClockCache[key];
    if(cache && Number.isFinite(cache.estimated) && !isPausedOrFinished(g)){
      // Não deixa o tempo visual voltar quando a API responde atrasada.
      estimated = Math.max(estimated, cache.estimated);
    }

    state.liveClockCache[key] = {estimated, base, fetchedAt, updatedAt:Date.now()};
    const period = g.period || 'Ao vivo';
    const suffix = estimated>base ? ` est. (API ${base}')` : '';
    return `🔴 ${estimated}'${suffix} - ${period}`;
  };

  const oldUpdateSelectedGameFromLive = typeof updateSelectedGameFromLive === 'function' ? updateSelectedGameFromLive : null;
  updateSelectedGameFromLive = function(freshGame){
    if(freshGame){
      freshGame.clientFetchedAt = Date.now();
      freshGame.apiFetchedAt = Date.now();
      state.liveApiUpdatedAt = Date.now();
      // Se a API devolver um minuto menor, preserva cache visual para não atrasar na tela.
      const key=fixtureKey(freshGame);
      const base=Number(freshGame.elapsed);
      const cache=state.liveClockCache[key];
      if(cache && Number.isFinite(base) && cache.estimated>base && freshGame.isLive){
        freshGame._apiElapsed=base;
      }
    }
    if(oldUpdateSelectedGameFromLive) oldUpdateSelectedGameFromLive(freshGame);
  };

  function liveDelayWarning(){
    const at = state.liveApiUpdatedAt ? new Date(state.liveApiUpdatedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : 'ainda não atualizada';
    return `Última atualização da API: ${at}. Pode haver atraso em relação à Bet365; antes de entrar, confira o placar e o mercado na Bet365.`;
  }

  function setGlobalLiveWarning(){
    let box=document.getElementById('globalLiveWarning');
    const gamesCard=document.querySelector('#jogos .card');
    if(!box && gamesCard){
      box=document.createElement('div');
      box.id='globalLiveWarning';
      box.className='result warn';
      gamesCard.appendChild(box);
    }
    if(box) box.textContent = liveDelayWarning();
  }

  // Atualiza relógio visual a cada 5s sem depender de novo fetch, mas marcando quando é estimado.
  setInterval(()=>{
    if(state.games?.some(g=>g.isLive)){
      document.querySelectorAll('.live-time').forEach(el=>{
        const g=state.games[+el.dataset.i];
        if(g) el.textContent=liveMinute(g);
      });
      setGlobalLiveWarning();
      // também atualiza placar/tempo visual de cards já renderizados quando possível
      document.querySelectorAll('[data-live-fixture]').forEach(el=>{
        const id=el.dataset.liveFixture;
        const g=(state.games||[]).find(x=>String(x.fixtureId||x.id)===String(id));
        if(g) el.textContent = `${g.score} • ${liveMinute(g)}`;
      });
    }
  },5000);

  // Força refresh antes de abrir diagnóstico ao vivo.
  const oldRunLiveReal = window.startLiveRealMonitor10s;
  window.forceRefreshLiveNow = async function(){
    if(typeof refreshSelectedLiveAnalyses === 'function'){
      return await refreshSelectedLiveAnalyses(true);
    }
    if(typeof monitorLiveTick === 'function'){
      return await monitorLiveTick(true);
    }
    return [];
  };

  // Botão "Atualizar ao vivo" passa a atualizar busca e depois aviso.
  const refreshBtn=document.getElementById('refreshLive');
  if(refreshBtn){
    const b=refreshBtn.cloneNode(true);
    refreshBtn.parentNode.replaceChild(b,refreshBtn);
    b.addEventListener('click',async()=>{
      document.getElementById('matchType').value='live';
      await searchGames();
      state.liveApiUpdatedAt=Date.now();
      setGlobalLiveWarning();
    });
  }

  // Patch de renderGames para mostrar aviso e guardar horário da API
  const oldRenderGames = typeof renderGames === 'function' ? renderGames : null;
  renderGames = function(){
    if(oldRenderGames) oldRenderGames();
    if(state.games?.some(g=>g.isLive)){
      state.games.forEach(g=>{
        if(g.isLive && !g.apiFetchedAt) g.apiFetchedAt=g.clientFetchedAt||Date.now();
      });
      state.liveApiUpdatedAt=Date.now();
      setGlobalLiveWarning();
    }
  };

  // Patch renderLiveAnalysisMulti para deixar info de atualização/atraso visível.
  const oldRenderLiveAnalysisMulti = typeof renderLiveAnalysisMulti === 'function' ? renderLiveAnalysisMulti : null;
  if(oldRenderLiveAnalysisMulti){
    renderLiveAnalysisMulti = function(list){
      oldRenderLiveAnalysisMulti(list);
      (list||[]).forEach(d=>{
        const g=d.game||{};
        const scoreBoxes=[...document.querySelectorAll('.score-big')];
        const last=scoreBoxes[scoreBoxes.length-1];
        if(last && g.fixtureId){
          last.setAttribute('data-live-fixture', String(g.fixtureId||g.id));
        }
      });
      const out=document.getElementById('liveOutput');
      if(out){
        const warn=document.createElement('div');
        warn.className='result warn';
        warn.textContent='🕒 '+liveDelayWarning()+' O tempo exibido pode ser estimado para não retroceder quando a API demora.';
        out.prepend(warn);
      }
    };
  }

  // Ao clicar em analisar ao vivo, atualiza primeiro.
  setTimeout(()=>{
    const liveBtn=document.getElementById('runLiveAnalysis');
    if(liveBtn){
      const b=liveBtn.cloneNode(true);
      liveBtn.parentNode.replaceChild(b,liveBtn);
      b.addEventListener('click',async()=>{
        if(window.startLiveRealMonitor10s) window.startLiveRealMonitor10s();
        else if(typeof runLiveAnalysisMulti==='function') await runLiveAnalysisMulti();
      });
    }
  },400);

  // Ao gerar bilhete ao vivo, deixa aviso forte sobre defasagem.
  const oldRenderTickets264 = window.renderTickets;
  window.renderTickets=function(tickets){
    oldRenderTickets264(tickets);
    const out=document.getElementById('ticketOutput');
    if(out && (tickets||[]).some(t=>t.mode==='live')){
      const warn=document.createElement('div');
      warn.className='result warn';
      warn.textContent='⚠️ Bilhete ao vivo usa dados da API. Se a Bet365 estiver 3 a 4 minutos à frente, siga a Bet365 e atualize antes de entrar.';
      out.prepend(warn);
    }
  };

  // Mostra aviso inicial
  setTimeout(setGlobalLiveWarning,800);
})();

/* Web 2.7 - Nota de confiança, pontos positivos e riscos */
(function web27Confidence(){
  function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
  function isLiveModeItem(item,ticket){ return ticket?.mode==='live' || item?.game?.isLive; }
  function confidenceLabel(score){
    if(score>=75) return '🟢 Alta';
    if(score>=55) return '🟡 Média';
    return '🔴 Baixa';
  }
  function confidenceClassByScore(score){
    if(score>=75) return 'conf-high';
    if(score>=55) return 'conf-mid';
    return 'conf-low';
  }
  function hasOdd(item){ return Number(item?.odd)>1; }
  function marketText(item){ return String(item?.market||'').toLowerCase(); }
  function computeItemConfidence(item,ticket){
    let score = ticket?.profile==='conservador' ? 72 : ticket?.profile==='medio' ? 62 : 52;
    const positives=[], risks=[];
    const m=marketText(item);
    const g=item.game||ticket?.game||{};

    if(m.includes('dupla chance') || m.includes('1x') || m.includes('x2') || m.includes('para não perder')){
      score += 9; positives.push('mercado com proteção');
    }
    if(m.includes('over 0.5') || m.includes('mais 0.5')){
      score += 8; positives.push('linha de gols baixa');
    }
    if(m.includes('over 1.5') || m.includes('mais de 1.5')){
      score += 2; positives.push('mercado comum quando há ritmo ofensivo');
    }
    if(m.includes('escanteio')){
      score -= 3; positives.push('pode acompanhar pressão ofensiva'); risks.push('depende da linha exata de escanteios da Bet365');
    }
    if(m.includes('próximo gol') || m.includes('proximo gol')){
      score -= 12; positives.push('usa pressão do momento'); risks.push('mercado muda muito rápido ao vivo');
    }
    if(m.includes('cart')){
      score -= 8; positives.push('útil em jogo físico'); risks.push('depende de arbitragem e linha exata');
    }
    if(m.includes('resultado final') || m.includes('vitória seca') || m.includes('vitoria seca')){
      score -= 18; risks.push('mercado mais exposto');
    }

    if(hasOdd(item)){
      positives.push('odd Bet365 localizada no fornecedor');
      const odd=Number(item.odd);
      if(odd<1.15){ score-=8; risks.push('odd muito baixa pode ter pouco valor'); }
      if(odd>2.2){ score-=10; risks.push('odd alta indica maior risco'); }
    }else{
      score -= 6; risks.push('odd Bet365 não confirmada pelo fornecedor');
    }

    if(isLiveModeItem(item,ticket)){
      risks.push('dados da API podem atrasar em relação à Bet365');
      if(g?.isLive){ positives.push('análise usa placar/minuto do momento'); }
      const elapsed=Number(g?.elapsed);
      if(Number.isFinite(elapsed) && elapsed>=75){ score-=5; risks.push('fim de jogo aumenta volatilidade e mercados fecham rápido');}
      if(String(g?.score||'').match(/\d+\s*x\s*\d+/)){ positives.push('placar atual considerado'); }
    }else{
      positives.push('baseado no diagnóstico pré-jogo');
    }

    if(!positives.length) positives.push('entrada alinhada ao perfil selecionado');
    if(!risks.length) risks.push('conferir mercado e odd na Bet365 antes de entrar');
    score=clamp(Math.round(score),20,92);
    return {score,label:confidenceLabel(score),cls:confidenceClassByScore(score),positives:[...new Set(positives)].slice(0,4),risks:[...new Set(risks)].slice(0,4)};
  }

  function enrichTicketConfidence(ticket){
    const itemScores=[];
    (ticket.items||[]).forEach(item=>{
      const c=computeItemConfidence(item,ticket);
      item.confidenceScore=c.score;
      item.confidence=c.label;
      item.confidenceClass=c.cls;
      item.positivePoints=c.positives;
      item.riskPoints=c.risks;
      itemScores.push(c.score);
    });
    const avg=itemScores.length ? Math.round(itemScores.reduce((a,b)=>a+b,0)/itemScores.length) : 0;
    ticket.confidenceScore=avg;
    ticket.confidenceLabel=confidenceLabel(avg);
    ticket.confidenceClass=confidenceClassByScore(avg);
    ticket.positivePoints=[...new Set((ticket.items||[]).flatMap(i=>i.positivePoints||[]))].slice(0,6);
    ticket.riskPoints=[...new Set((ticket.items||[]).flatMap(i=>i.riskPoints||[]))].slice(0,6);
    return ticket;
  }

  const oldRenderTickets27=window.renderTickets;
  window.renderTickets=function(tickets){
    tickets=(tickets||[]).map(enrichTicketConfidence);
    const out=document.getElementById('ticketOutput');
    if(!out || !oldRenderTickets27){ return oldRenderTickets27 ? oldRenderTickets27(tickets) : null; }
    oldRenderTickets27(tickets);
    // Insere bloco de confiança em cada card de bilhete após renderização original.
    const cards=[...document.querySelectorAll('#ticketOutput .ticket-card')];
    cards.forEach((card,idx)=>{
      const t=tickets[idx];
      if(!t || card.querySelector('.confidence-panel')) return;
      const panel=document.createElement('div');
      panel.className='confidence-panel';
      panel.innerHTML=`
        <div class="confidence-head">
          <span>📈 Confiança do bilhete</span>
          <b class="${t.confidenceClass}">${t.confidenceScore}% • ${t.confidenceLabel}</b>
        </div>
        <div class="conf-grid">
          <div><h4>✅ Pontos positivos</h4><ul>${(t.positivePoints||[]).map(x=>`<li>${safeMarketText(x)}</li>`).join('')}</ul></div>
          <div><h4>⚠️ Riscos</h4><ul>${(t.riskPoints||[]).map(x=>`<li>${safeMarketText(x)}</li>`).join('')}</ul></div>
        </div>`;
      const report=card.querySelector('.ticket-report');
      if(report) card.insertBefore(panel,report);
      else card.appendChild(panel);

      // Insere score por entrada
      card.querySelectorAll('.objective-list li').forEach((li,j)=>{
        const item=t.items?.[j];
        if(item && !li.querySelector('.entry-confidence-extra')){
          const extra=document.createElement('div');
          extra.className='entry-confidence-extra';
          extra.innerHTML=`<small>Confiança da entrada: <b class="${item.confidenceClass}">${item.confidenceScore}% • ${item.confidence}</b></small>`;
          li.appendChild(extra);
        }
      });
    });
  };

  // Também melhora histórico salvo com confiança
  const oldSaveTickets27=window.saveTickets;
  window.saveTickets=function(){
    if(state.lastTickets?.length){
      state.lastTickets=state.lastTickets.map(enrichTicketConfidence);
    }
    if(typeof oldSaveTickets27==='function') return oldSaveTickets27();
    const msg=document.getElementById('ticketMsg');
    if(!state.lastTickets.length){ if(msg){msg.className='result bad';msg.textContent='Gere os bilhetes antes de salvar.';} return; }
    const history=JSON.parse(localStorage.getItem('nb_ticket_history')||'[]');
    for(const t of state.lastTickets) history.unshift({...t,status:'Em andamento'});
    localStorage.setItem('nb_ticket_history',JSON.stringify(history.slice(0,80)));
    if(msg){msg.className='result';msg.textContent='Bilhetes salvos no histórico local com nota de confiança.';}
    if(typeof renderHistory==='function') renderHistory();
  };

  const oldRenderHistory27=window.renderHistory;
  if(oldRenderHistory27){
    window.renderHistory=function(){
      oldRenderHistory27();
      const history=JSON.parse(localStorage.getItem('nb_ticket_history')||'[]');
      const cards=[...document.querySelectorAll('#historyList .history-card')];
      cards.forEach((card,idx)=>{
        const t=history[idx];
        if(t && t.confidenceScore && !card.querySelector('.history-confidence')){
          const div=document.createElement('div');
          div.className='history-confidence';
          div.innerHTML=`📈 Confiança registrada: <b>${t.confidenceScore}% • ${t.confidenceLabel||confidenceLabel(t.confidenceScore)}</b>`;
          const meta=card.querySelector('.history-meta');
          if(meta) meta.after(div);
        }
      });
    };
    setTimeout(window.renderHistory,300);
  }

  // Painel explicativo na tela Gerar Bilhetes
  setTimeout(()=>{
    const card=document.querySelector('#bilhetes .card');
    if(card && !document.getElementById('confidenceHelp')){
      const help=document.createElement('div');
      help.id='confidenceHelp';
      help.className='result warn';
      help.textContent='Web 2.7: a nota de confiança é uma leitura de apoio. A decisão final continua sua e a Bet365 deve ser conferida antes da entrada.';
      card.appendChild(help);
    }
  },500);
})();

/* Web 2.8 - IA aprendendo com histórico */
(function web28LearningHistory(){
  function normMarket(market){
    const m=String(market||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(m.includes('over 0.5')||m.includes('mais 0.5')) return 'Over 0.5 gols';
    if(m.includes('over 1.5')||m.includes('mais de 1.5')) return 'Over 1.5 gols';
    if(m.includes('dupla chance')||m.includes('1x')||m.includes('x2')||m.includes('para nao perder')) return 'Dupla chance';
    if(m.includes('casa ou fora')||m.includes('(12)')) return 'Casa ou Fora (12)';
    if(m.includes('escanteio')||m.includes('corner')) return 'Escanteios';
    if(m.includes('cart')) return 'Cartões';
    if(m.includes('proximo gol')||m.includes('próximo gol')) return 'Próximo gol';
    if(m.includes('handicap')) return 'Handicap';
    if(m.includes('ambas')) return 'Ambas marcam';
    return 'Outros mercados';
  }
  function loadHistory(){
    try{return JSON.parse(localStorage.getItem('nb_ticket_history')||'[]')}catch(e){return []}
  }
  function marketLearningStats(){
    const history=loadHistory();
    const stats={};
    for(const t of history){
      const status=String(t.status||'').toLowerCase();
      if(!status.includes('ganhou') && !status.includes('perdeu')) continue;
      const won=status.includes('ganhou');
      for(const item of (t.items||[])){
        const key=normMarket(item.market);
        if(!stats[key]) stats[key]={market:key,total:0,wins:0,losses:0};
        stats[key].total++;
        if(won) stats[key].wins++; else stats[key].losses++;
      }
    }
    return Object.values(stats).map(s=>({...s,rate:s.total?Math.round((s.wins/s.total)*100):0}))
      .sort((a,b)=>b.total-a.total || b.rate-a.rate);
  }
  function overallStats(){
    const history=loadHistory();
    const finished=history.filter(t=>/ganhou|perdeu/i.test(t.status||''));
    const wins=finished.filter(t=>/ganhou/i.test(t.status||'')).length;
    const losses=finished.filter(t=>/perdeu/i.test(t.status||'')).length;
    return {total:history.length,finished:finished.length,wins,losses,rate:finished.length?Math.round((wins/finished.length)*100):0};
  }
  function marketAdjustment(market){
    const key=normMarket(market);
    const s=marketLearningStats().find(x=>x.market===key);
    if(!s || s.total<3) return {delta:0,note:'Sem histórico suficiente deste mercado.'};
    if(s.rate>=75) return {delta:6,note:`Seu histórico é forte em ${key}: ${s.rate}% de acerto.`};
    if(s.rate>=60) return {delta:3,note:`Seu histórico é positivo em ${key}: ${s.rate}% de acerto.`};
    if(s.rate<45) return {delta:-8,note:`Seu histórico é fraco em ${key}: ${s.rate}% de acerto.`};
    return {delta:-2,note:`Seu histórico é regular em ${key}: ${s.rate}% de acerto.`};
  }

  // Ajusta confiança com base no histórico do usuário
  const oldRenderTickets28=window.renderTickets;
  window.renderTickets=function(tickets){
    (tickets||[]).forEach(t=>{
      (t.items||[]).forEach(item=>{
        const adj=marketAdjustment(item.market);
        item.learningAdjustment=adj;
        if(typeof item.confidenceScore==='number'){
          item.confidenceScore=Math.max(15,Math.min(95,item.confidenceScore+adj.delta));
          item.confidence=item.confidenceScore>=75?'🟢 Alta':item.confidenceScore>=55?'🟡 Média':'🔴 Baixa';
          item.confidenceClass=item.confidenceScore>=75?'conf-high':item.confidenceScore>=55?'conf-mid':'conf-low';
        }
        if(adj.delta>0){
          item.positivePoints=[...(item.positivePoints||[]), adj.note].slice(0,5);
        }else if(adj.delta<0){
          item.riskPoints=[...(item.riskPoints||[]), adj.note].slice(0,5);
        }
      });
      const scores=(t.items||[]).map(i=>i.confidenceScore).filter(n=>typeof n==='number');
      if(scores.length){
        t.confidenceScore=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
        t.confidenceLabel=t.confidenceScore>=75?'🟢 Alta':t.confidenceScore>=55?'🟡 Média':'🔴 Baixa';
        t.confidenceClass=t.confidenceScore>=75?'conf-high':t.confidenceScore>=55?'conf-mid':'conf-low';
      }
    });
    if(oldRenderTickets28) oldRenderTickets28(tickets);
    const cards=[...document.querySelectorAll('#ticketOutput .ticket-card')];
    cards.forEach((card,idx)=>{
      const t=tickets[idx];
      if(!t || card.querySelector('.learning-panel')) return;
      const notes=[...new Set((t.items||[]).map(i=>i.learningAdjustment?.note).filter(Boolean))];
      const panel=document.createElement('div');
      panel.className='learning-panel';
      panel.innerHTML=`<b>🧠 Aprendizado pelo seu histórico</b><ul>${notes.length?notes.map(n=>`<li>${safeMarketText(n)}</li>`).join(''):'<li>Ainda não há histórico suficiente para ajustar este bilhete.</li>'}</ul>`;
      const conf=card.querySelector('.confidence-panel');
      if(conf) conf.after(panel); else card.appendChild(panel);
    });
  };

  function renderLearningDashboard(){
    const dash=document.getElementById('dashboard');
    if(!dash) return;
    let panel=document.getElementById('learningDashboard');
    if(!panel){
      panel=document.createElement('div');
      panel.id='learningDashboard';
      panel.className='card learning-dashboard';
      dash.appendChild(panel);
    }
    const o=overallStats();
    const stats=marketLearningStats();
    const top=stats.filter(s=>s.total>=2).sort((a,b)=>b.rate-a.rate).slice(0,5);
    const low=stats.filter(s=>s.total>=2).sort((a,b)=>a.rate-b.rate).slice(0,5);
    panel.innerHTML=`
      <h2>🧠 IA aprendendo com seu histórico</h2>
      <div class="learning-stats">
        <div><small>Bilhetes salvos</small><b>${o.total}</b></div>
        <div><small>Finalizados</small><b>${o.finished}</b></div>
        <div><small>Ganhos</small><b class="conf-high">${o.wins}</b></div>
        <div><small>Perdidos</small><b class="conf-low">${o.losses}</b></div>
        <div><small>Aproveitamento</small><b>${o.rate}%</b></div>
      </div>
      <div class="conf-grid">
        <div><h4>✅ Mercados mais fortes</h4>${top.length?top.map(s=>`<p class="rec ok">${safeMarketText(s.market)} — ${s.rate}% (${s.wins}/${s.total})</p>`).join(''):'<p class="muted">Ainda não há dados suficientes.</p>'}</div>
        <div><h4>⚠️ Mercados para atenção</h4>${low.length?low.map(s=>`<p class="rec bad">${safeMarketText(s.market)} — ${s.rate}% (${s.wins}/${s.total})</p>`).join(''):'<p class="muted">Ainda não há dados suficientes.</p>'}</div>
      </div>
      <p class="muted">A partir de 3 registros por mercado, a IA ajusta a confiança dos próximos bilhetes.</p>`;
  }

  const oldRenderHistory28=window.renderHistory;
  window.renderHistory=function(){
    if(oldRenderHistory28) oldRenderHistory28();
    renderLearningDashboard();
    renderLearningPanelHistory();
  };

  function renderLearningPanelHistory(){
    const hist=document.getElementById('historico');
    if(!hist) return;
    let panel=document.getElementById('learningHistoryPanel');
    if(!panel){
      panel=document.createElement('div');
      panel.id='learningHistoryPanel';
      panel.className='card learning-dashboard';
      hist.insertBefore(panel,hist.firstChild?.nextSibling||hist.firstChild);
    }
    const o=overallStats();
    const stats=marketLearningStats();
    panel.innerHTML=`
      <h2>📊 Desempenho dos Bilhetes</h2>
      <div class="learning-stats">
        <div><small>Finalizados</small><b>${o.finished}</b></div>
        <div><small>Ganhos</small><b class="conf-high">${o.wins}</b></div>
        <div><small>Perdidos</small><b class="conf-low">${o.losses}</b></div>
        <div><small>Aproveitamento</small><b>${o.rate}%</b></div>
      </div>
      <h3>Mercados analisados</h3>
      <div class="market-learning-list">
        ${stats.length?stats.map(s=>`<div class="market-learning-item"><b>${safeMarketText(s.market)}</b><span>${s.rate}%</span><small>${s.wins} ganhou / ${s.losses} perdeu • ${s.total} entradas</small></div>`).join(''):'<p class="muted">Marque bilhetes como ganhou/perdeu para a IA aprender.</p>'}
      </div>`;
  }

  // Atualiza dashboard sempre que status muda
  const oldSetHistoryStatus28=window.setHistoryStatus;
  window.setHistoryStatus=function(idx,status){
    if(oldSetHistoryStatus28) oldSetHistoryStatus28(idx,status);
    setTimeout(()=>{renderLearningDashboard(); renderLearningPanelHistory();},100);
  };

  const oldUpdateTicketResult28=window.updateTicketResult;
  if(oldUpdateTicketResult28){
    window.updateTicketResult=async function(idx){
      await oldUpdateTicketResult28(idx);
      setTimeout(()=>{renderLearningDashboard(); renderLearningPanelHistory();},100);
    };
  }

  setTimeout(()=>{renderLearningDashboard(); renderLearningPanelHistory();},800);
})();

/* Web 2.9 - Controle de Banca Profissional */
(function web29Bankroll(){
  function brl(v){
    return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
  function loadBank(){
    try{
      const b=JSON.parse(localStorage.getItem('nb_bankroll')||'{}');
      return {initial:n(b.initial),current:n(b.current),riskPct:n(b.riskPct)||2};
    }catch(e){ return {initial:0,current:0,riskPct:2}; }
  }
  function saveBankData(b){
    localStorage.setItem('nb_bankroll',JSON.stringify({initial:n(b.initial),current:n(b.current),riskPct:n(b.riskPct)||2}));
  }
  function loadHist(){
    try{return JSON.parse(localStorage.getItem('nb_ticket_history')||'[]')}catch(e){return []}
  }
  function calcBankFromHistory(bank){
    const hist=loadHist();
    let invested=0, returned=0, profit=0, wins=0, losses=0;
    for(const t of hist){
      const stake=n(t.stake);
      const ret=n(t.realReturn || t.possibleReturn);
      if(/ganhou/i.test(t.status||'')){
        wins++; invested+=stake; returned+=ret; profit += (ret-stake);
      }else if(/perdeu/i.test(t.status||'')){
        losses++; invested+=stake; profit -= stake;
      }
    }
    const current = bank.initial ? +(bank.initial + profit).toFixed(2) : bank.current;
    return {invested,returned,profit,wins,losses,current,totalFinished:wins+losses};
  }
  function renderBank(){
    const bank=loadBank();
    const calc=calcBankFromHistory(bank);
    const current = calc.current || bank.current || bank.initial || 0;
    const initial = bank.initial || 0;
    const profit = initial ? +(current-initial).toFixed(2) : calc.profit;
    const pct = initial ? ((profit/initial)*100).toFixed(1) : '0.0';
    const recStake = current ? +(current*(bank.riskPct/100)).toFixed(2) : 0;

    const bi=document.getElementById('bankInitial');
    const bc=document.getElementById('bankCurrent');
    const br=document.getElementById('bankRiskPct');
    if(bi && !bi.value) bi.value=bank.initial||'';
    if(bc && !bc.value) bc.value=bank.current||bank.initial||'';
    if(br && !br.value) br.value=bank.riskPct||2;

    const card=document.getElementById('bank-current-card');
    if(card) card.textContent=brl(current);

    const summary=document.getElementById('bankSummary');
    if(summary){
      summary.innerHTML = `
        <div><small>Banca inicial</small><b>${brl(initial)}</b></div>
        <div><small>Saldo estimado</small><b>${brl(current)}</b></div>
        <div><small>Lucro/Prejuízo</small><b class="${profit>=0?'conf-high':'conf-low'}">${profit>=0?'+':''}${brl(profit)}</b></div>
        <div><small>Crescimento</small><b class="${profit>=0?'conf-high':'conf-low'}">${profit>=0?'+':''}${pct}%</b></div>
        <div><small>Entrada sugerida</small><b>${brl(recStake)}</b></div>`;
    }
    const msg=document.getElementById('bankMsg');
    if(msg){
      msg.className='result ' + (profit>=0?'':'bad');
      msg.textContent = initial ? `Gestão ativa: ${bank.riskPct}% da banca sugere entrada de ${brl(recStake)} por bilhete.` : 'Informe sua banca inicial para ativar o controle.';
    }
    return {bank,calc,current,recStake};
  }
  function saveBank(){
    const initial=n(document.getElementById('bankInitial')?.value);
    const current=n(document.getElementById('bankCurrent')?.value)||initial;
    const riskPct=n(document.getElementById('bankRiskPct')?.value)||2;
    saveBankData({initial,current,riskPct});
    renderBank();
  }
  function suggestStake(){
    const r=renderBank();
    const input=document.getElementById('ticketBank');
    if(input && r.recStake){
      input.value = r.recStake;
      const msg=document.getElementById('ticketMsg');
      if(msg){ msg.className='result'; msg.textContent=`Valor sugerido pela gestão de banca aplicado: ${brl(r.recStake)}.`; }
    }
  }
  setTimeout(()=>{
    document.getElementById('saveBank')?.addEventListener('click',saveBank);
    document.getElementById('suggestStake')?.addEventListener('click',suggestStake);
    renderBank();
  },500);

  // Antes de salvar, registra stake/retorno em cada bilhete.
  const oldSaveTickets29=window.saveTickets;
  window.saveTickets=function(){
    if(state.lastTickets?.length){
      const totalStake=n(document.getElementById('ticketBank')?.value);
      const stakePerTicket = totalStake>0 ? +(totalStake/state.lastTickets.length).toFixed(2) : 0;
      state.lastTickets=state.lastTickets.map(t=>{
        const odd=n(t.oddTotal);
        const stake=t.stake || stakePerTicket;
        return {
          ...t,
          stake,
          possibleReturn: t.possibleReturn || (odd&&stake ? +(odd*stake).toFixed(2) : 0),
          bankrollSaved:true
        };
      });
    }
    if(typeof oldSaveTickets29==='function') oldSaveTickets29();
    setTimeout(renderBank,200);
  };

  // Atualiza banca quando status muda.
  const oldSetStatus29=window.setHistoryStatus;
  window.setHistoryStatus=function(idx,status){
    if(typeof oldSetStatus29==='function') oldSetStatus29(idx,status);
    setTimeout(renderBank,200);
  };
  const oldUpdateResult29=window.updateTicketResult;
  if(oldUpdateResult29){
    window.updateTicketResult=async function(idx){
      await oldUpdateResult29(idx);
      setTimeout(renderBank,300);
    };
  }

  // Melhora histórico com valores financeiros
  const oldRenderHistory29=window.renderHistory;
  window.renderHistory=function(){
    if(oldRenderHistory29) oldRenderHistory29();
    const hist=loadHist();
    const cards=[...document.querySelectorAll('#historyList .history-card')];
    cards.forEach((card,idx)=>{
      const t=hist[idx];
      if(!t || card.querySelector('.bank-ticket-info')) return;
      const stake=n(t.stake);
      const ret=n(t.realReturn || t.possibleReturn);
      let result='';
      if(/ganhou/i.test(t.status||'')){
        result=`<b class="conf-high">Lucro: +${brl(ret-stake)}</b>`;
      }else if(/perdeu/i.test(t.status||'')){
        result=`<b class="conf-low">Perda: -${brl(stake)}</b>`;
      }else{
        result=`<b>Retorno possível: ${ret?brl(ret):'conferir'}</b>`;
      }
      const div=document.createElement('div');
      div.className='bank-ticket-info';
      div.innerHTML=`💰 Entrada: <b>${stake?brl(stake):'não informada'}</b> • Odd total: <b>${t.oddTotal?String(Number(t.oddTotal).toFixed(2)).replace('.',','):'conferir'}</b> • ${result}`;
      const meta=card.querySelector('.history-meta');
      if(meta) meta.after(div);
    });
    renderBank();
  };

  // Painel no dashboard com leitura da banca
  function renderBankDashboard(){
    const dash=document.getElementById('dashboard');
    if(!dash) return;
    let panel=document.getElementById('bankDashboard');
    if(!panel){
      panel=document.createElement('div');
      panel.id='bankDashboard';
      panel.className='card bank-dashboard';
      dash.appendChild(panel);
    }
    const {bank,current}=renderBank();
    const calc=calcBankFromHistory(bank);
    const profit = bank.initial ? current-bank.initial : calc.profit;
    const finished=calc.totalFinished;
    let advice='Configure sua banca inicial para receber orientação.';
    if(bank.initial){
      if(profit>0) advice='Sua banca está positiva. Mantenha controle de stake e evite aumentar entradas após sequência boa.';
      else if(profit<0) advice='Sua banca está negativa. Reduza stake e priorize mercados com melhor histórico.';
      else advice='Banca está estável. Continue registrando resultados para melhorar a leitura.';
    }
    panel.innerHTML=`
      <h2>💰 Controle de Banca</h2>
      <div class="learning-stats">
        <div><small>Banca inicial</small><b>${brl(bank.initial)}</b></div>
        <div><small>Saldo estimado</small><b>${brl(current)}</b></div>
        <div><small>Resultado</small><b class="${profit>=0?'conf-high':'conf-low'}">${profit>=0?'+':''}${brl(profit)}</b></div>
        <div><small>Bilhetes finalizados</small><b>${finished}</b></div>
        <div><small>Stake sugerida</small><b>${brl(current*(bank.riskPct/100))}</b></div>
      </div>
      <p class="muted">🧠 ${advice}</p>`;
  }
  const oldRenderLearningDash29=window.renderLearningDashboard;
  window.renderLearningDashboard=function(){
    if(typeof oldRenderLearningDash29==='function') oldRenderLearningDash29();
    renderBankDashboard();
  };
  setInterval(renderBankDashboard,5000);
  setTimeout(renderBankDashboard,1000);
})();

/* Web 2.9.1 - Banca Real + Odd Manual Bet365 */
(function web291ManualOddStake(){
  function brl(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function n(v){ const x=Number(String(v||'').replace(',','.')); return Number.isFinite(x)?x:0; }
  function loadBank(){ try{return JSON.parse(localStorage.getItem('nb_bankroll')||'{}')}catch(e){return{}} }
  function saveBank(b){ localStorage.setItem('nb_bankroll',JSON.stringify(b)); }
  function ticketKey(t,idx){ return t.id || ('ticket-'+idx); }
  function getManuals(){ try{return JSON.parse(localStorage.getItem('nb_manual_bets')||'{}')}catch(e){return{}} }
  function setManuals(m){ localStorage.setItem('nb_manual_bets',JSON.stringify(m)); }
  function calcReturn(stake, odd){ return +(n(stake)*n(odd)).toFixed(2); }
  function calcProfit(stake, odd){ return +(calcReturn(stake,odd)-n(stake)).toFixed(2); }

  // Ajusta painel da banca para salvar saldo inicial/atual e gestão clara.
  function updateBankLabels(){
    const risk = document.getElementById('bankRiskPct');
    if(risk && risk.tagName==='INPUT'){
      const parent = risk.parentElement;
      const sel = document.createElement('select');
      sel.id='bankRiskPct';
      sel.innerHTML='<option value="1">🟢 Proteção — 1%</option><option value="2" selected>🟡 Normal — 2%</option><option value="5">🔴 Crescimento — 5%</option>';
      parent.replaceChild(sel,risk);
    }
    const help=document.getElementById('bankMsg');
    if(help && !help.dataset.manualReady){
      help.dataset.manualReady='1';
      help.textContent='Configure a banca. Depois, em cada bilhete, informe a odd real da Bet365 e o valor realmente apostado.';
    }
  }

  // Recalcula banca usando odd e aposta reais do histórico.
  function recalcBankByRealHistory(){
    const bank=loadBank();
    const initial=n(bank.initial);
    const hist=JSON.parse(localStorage.getItem('nb_ticket_history')||'[]');
    let profit=0, invested=0, returned=0;
    hist.forEach(t=>{
      const stake=n(t.realStake || t.stake);
      const odd=n(t.realOdd || t.oddTotal);
      if(/ganhou/i.test(t.status||'')){
        invested+=stake; returned+=calcReturn(stake,odd); profit+=calcProfit(stake,odd);
      }else if(/perdeu/i.test(t.status||'')){
        invested+=stake; profit-=stake;
      }
    });
    if(initial){
      bank.current=+(initial+profit).toFixed(2);
      saveBank(bank);
    }
    return {profit,invested,returned,current:n(bank.current)||initial,initial};
  }

  // Insere campos manuais em cada bilhete renderizado.
  const oldRenderTickets291 = window.renderTickets;
  window.renderTickets = function(tickets){
    if(oldRenderTickets291) oldRenderTickets291(tickets);
    const manuals=getManuals();
    document.querySelectorAll('#ticketOutput .ticket-card').forEach((card,idx)=>{
      const t=tickets?.[idx];
      if(!t || card.querySelector('.manual-bet-panel')) return;
      const key=ticketKey(t,idx);
      const saved=manuals[key]||{};
      const suggestedOdd = n(t.oddTotal) || '';
      const suggestedStake = n(t.stake) || n(document.getElementById('ticketBank')?.value)/(tickets.length||1) || '';
      const panel=document.createElement('div');
      panel.className='manual-bet-panel';
      panel.innerHTML=`
        <h4>✏️ Ajuste real da Bet365</h4>
        <div class="manual-bet-grid">
          <label>Odd sugerida/API <input type="text" value="${suggestedOdd?String(Number(suggestedOdd).toFixed(2)).replace('.',','):'Conferir'}" disabled></label>
          <label>Odd real Bet365 <input class="manualOdd" data-key="${key}" data-idx="${idx}" type="number" min="1" step="0.01" value="${saved.odd||suggestedOdd||''}" placeholder="Ex.: 1.72"></label>
          <label>Valor real apostado <input class="manualStake" data-key="${key}" data-idx="${idx}" type="number" min="0" step="0.01" value="${saved.stake||suggestedStake||''}" placeholder="Ex.: 10"></label>
        </div>
        <div class="manual-calc" id="manualCalc-${idx}"></div>
      `;
      const conf=card.querySelector('.confidence-panel') || card.querySelector('.odds-summary') || card.querySelector('.ticket-section-title');
      if(conf) conf.after(panel); else card.appendChild(panel);
    });
    bindManualInputs(tickets);
  };

  function updateManualCalc(idx,tickets){
    const oddInput=document.querySelector(`.manualOdd[data-idx="${idx}"]`);
    const stakeInput=document.querySelector(`.manualStake[data-idx="${idx}"]`);
    const calc=document.getElementById(`manualCalc-${idx}`);
    if(!oddInput||!stakeInput||!calc) return;
    const odd=n(oddInput.value), stake=n(stakeInput.value);
    const retorno=calcReturn(stake,odd), lucro=calcProfit(stake,odd);
    calc.innerHTML = stake&&odd ? `Retorno possível: <b>${brl(retorno)}</b> • Lucro possível: <b class="conf-high">+${brl(lucro)}</b> • Perda se der red: <b class="conf-low">-${brl(stake)}</b>` : 'Informe odd real e valor real apostado.';
    const bank=loadBank();
    const current=n(bank.current)||n(bank.initial);
    const pct=current?((stake/current)*100):0;
    if(current && pct > (n(bank.riskPct)||2)){
      calc.innerHTML += ` <span class="risk-alert">⚠️ Entrada acima da gestão (${pct.toFixed(1)}% da banca).</span>`;
    }
  }

  function bindManualInputs(tickets){
    const manuals=getManuals();
    document.querySelectorAll('.manualOdd,.manualStake').forEach(inp=>{
      const idx=Number(inp.dataset.idx), key=inp.dataset.key;
      updateManualCalc(idx,tickets);
      inp.addEventListener('input',()=>{
        const odd=n(document.querySelector(`.manualOdd[data-idx="${idx}"]`)?.value);
        const stake=n(document.querySelector(`.manualStake[data-idx="${idx}"]`)?.value);
        manuals[key]={odd,stake};
        setManuals(manuals);
        if(tickets?.[idx]){
          tickets[idx].realOdd=odd;
          tickets[idx].realStake=stake;
          tickets[idx].possibleReturn=calcReturn(stake,odd);
          tickets[idx].realProfit=calcProfit(stake,odd);
          state.lastTickets=tickets;
        }
        updateManualCalc(idx,tickets);
      });
    });
  }

  // Salvar bilhete agora prioriza odd e aposta manuais.
  const oldSaveTickets291 = window.saveTickets;
  window.saveTickets=function(){
    if(state.lastTickets?.length){
      const manuals=getManuals();
      state.lastTickets=state.lastTickets.map((t,idx)=>{
        const m=manuals[ticketKey(t,idx)]||{};
        const odd=n(m.odd)||n(t.realOdd)||n(t.oddTotal);
        const stake=n(m.stake)||n(t.realStake)||n(t.stake);
        return {...t, realOdd:odd, realStake:stake, stake, possibleReturn:calcReturn(stake,odd), realProfit:calcProfit(stake,odd), manualBetSaved:true};
      });
    }
    if(oldSaveTickets291) oldSaveTickets291();
  };

  // Recalcula banca quando marcar ganhou/perdeu.
  const oldSetStatus291=window.setHistoryStatus;
  window.setHistoryStatus=function(idx,status){
    if(oldSetStatus291) oldSetStatus291(idx,status);
    setTimeout(()=>{recalcBankByRealHistory(); if(typeof renderBank==='function') renderBank(); if(typeof renderHistory==='function') renderHistory();},200);
  };

  const oldUpdateResult291=window.updateTicketResult;
  if(oldUpdateResult291){
    window.updateTicketResult=async function(idx){
      await oldUpdateResult291(idx);
      setTimeout(()=>{recalcBankByRealHistory(); if(typeof renderBank==='function') renderBank(); if(typeof renderHistory==='function') renderHistory();},300);
    };
  }

  // Complementa histórico com odd/aposta real.
  const oldRenderHistory291=window.renderHistory;
  window.renderHistory=function(){
    if(oldRenderHistory291) oldRenderHistory291();
    const hist=JSON.parse(localStorage.getItem('nb_ticket_history')||'[]');
    document.querySelectorAll('#historyList .history-card').forEach((card,idx)=>{
      const t=hist[idx];
      if(!t || card.querySelector('.manual-history-info')) return;
      const stake=n(t.realStake||t.stake), odd=n(t.realOdd||t.oddTotal);
      const ret=calcReturn(stake,odd), prof=calcProfit(stake,odd);
      const div=document.createElement('div');
      div.className='manual-history-info';
      div.innerHTML=`✏️ Real Bet365: odd <b>${odd?String(odd.toFixed(2)).replace('.',','):'não informada'}</b> • apostado <b>${stake?brl(stake):'não informado'}</b> • retorno <b>${ret?brl(ret):'conferir'}</b> • lucro possível <b class="conf-high">${prof?brl(prof):'conferir'}</b>`;
      const meta=card.querySelector('.history-meta');
      if(meta) meta.after(div);
    });
  };

  // Salvar banca real
  const oldSaveBankClick=()=>{};
  setTimeout(()=>{
    updateBankLabels();
    const save=document.getElementById('saveBank');
    if(save){
      const b=save.cloneNode(true);
      save.parentNode.replaceChild(b,save);
      b.addEventListener('click',()=>{
        const initial=n(document.getElementById('bankInitial')?.value);
        const current=n(document.getElementById('bankCurrent')?.value)||initial;
        const riskPct=n(document.getElementById('bankRiskPct')?.value)||2;
        saveBank({initial,current,riskPct});
        recalcBankByRealHistory();
        const msg=document.getElementById('bankMsg');
        if(msg){msg.className='result';msg.textContent=`Banca salva. Gestão: ${riskPct}% por entrada. O saldo será ajustado por resultados reais.`;}
        if(typeof renderHistory==='function') renderHistory();
      });
    }
    const suggest=document.getElementById('suggestStake');
    if(suggest){
      const b=suggest.cloneNode(true);
      suggest.parentNode.replaceChild(b,suggest);
      b.addEventListener('click',()=>{
        const bank=loadBank();
        const current=n(bank.current)||n(bank.initial);
        const stake=+(current*((n(bank.riskPct)||2)/100)).toFixed(2);
        const input=document.getElementById('ticketBank');
        if(input) input.value=stake;
        const msg=document.getElementById('ticketMsg');
        if(msg){msg.className='result';msg.textContent=`Valor sugerido aplicado: ${brl(stake)} (${bank.riskPct||2}% da banca).`;}
      });
    }
  },600);

  // Atualização inicial
  setTimeout(()=>{updateBankLabels(); recalcBankByRealHistory(); if(typeof renderHistory==='function') renderHistory();},1000);
})();

/* Web 2.9.2 - Configuração clara da banca + bilhete resumido */
(function web292BankConfigAndCompactTicket(){
  function brl(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function n(v){ const x=Number(String(v||'').replace(',','.')); return Number.isFinite(x)?x:0; }
  function loadBank(){ try{return JSON.parse(localStorage.getItem('nb_bankroll')||'{}')}catch(e){return{}} }
  function saveBank(b){ localStorage.setItem('nb_bankroll',JSON.stringify(b)); }
  function modeLabel(pct){
    pct=String(pct||'2');
    if(pct==='1') return '🟢 Proteção — 1%';
    if(pct==='5') return '🔴 Crescimento — 5%';
    return '🟡 Normal — 2%';
  }
  function ticketKey(t,idx){ return t.id || ('ticket-'+idx); }
  function getManuals(){ try{return JSON.parse(localStorage.getItem('nb_manual_bets')||'{}')}catch(e){return{}} }
  function setManuals(m){ localStorage.setItem('nb_manual_bets',JSON.stringify(m)); }
  function calcReturn(stake, odd){ return +(n(stake)*n(odd)).toFixed(2); }
  function calcProfit(stake, odd){ return +(calcReturn(stake,odd)-n(stake)).toFixed(2); }
  function shortText(txt, max=170){
    txt=String(txt||'').replace(/\s+/g,' ').trim();
    return txt.length>max ? txt.slice(0,max-3)+'...' : txt;
  }
  function mainGameLine(t){
    const games=(t.games&&t.games.length?t.games:[t.game]).filter(Boolean);
    if(!games.length) return 'Jogo não informado';
    if(games.length===1) return `${games[0].home} x ${games[0].away}${t.mode==='live'?' • '+(games[0].score||'')+' • '+liveMinute(games[0]):''}`;
    return `${games.length} jogos selecionados`;
  }

  function loadBankConfigUI(){
    const b=loadBank();
    const bi=document.getElementById('cfgBankInitial');
    const bc=document.getElementById('cfgBankCurrent');
    const bm=document.getElementById('cfgBankMode');
    if(bi) bi.value=b.initial||'';
    if(bc) bc.value=b.current||b.initial||'';
    if(bm) bm.value=String(b.riskPct||2);
    updateBankConfigMsg();
  }
  function updateBankConfigMsg(){
    const b=loadBank();
    const msg=document.getElementById('bankConfigMsg');
    if(!msg) return;
    const current=n(b.current)||n(b.initial);
    const pct=n(b.riskPct)||2;
    const stake=+(current*(pct/100)).toFixed(2);
    if(current){
      msg.className='result';
      msg.textContent=`Gestão salva: ${modeLabel(pct)}. Entrada sugerida: ${brl(stake)}.`;
    }else{
      msg.className='result warn';
      msg.textContent='Informe banca inicial, saldo atual e modelo de gestão.';
    }
  }
  function saveBankConfig(){
    const initial=n(document.getElementById('cfgBankInitial')?.value);
    const current=n(document.getElementById('cfgBankCurrent')?.value)||initial;
    const riskPct=n(document.getElementById('cfgBankMode')?.value)||2;
    saveBank({initial,current,riskPct});
    // sincroniza painel antigo se existir
    const oldInitial=document.getElementById('bankInitial'); if(oldInitial) oldInitial.value=initial||'';
    const oldCurrent=document.getElementById('bankCurrent'); if(oldCurrent) oldCurrent.value=current||'';
    const oldRisk=document.getElementById('bankRiskPct'); if(oldRisk) oldRisk.value=String(riskPct);
    updateBankConfigMsg();
    if(typeof renderHistory==='function') renderHistory();
  }

  setTimeout(()=>{
    loadBankConfigUI();
    document.getElementById('saveBankConfig')?.addEventListener('click',saveBankConfig);
  },500);

  // Renderiza bilhetes de forma compacta, sem relatório grande e sem lista de pontos gigantes.
  const previousRenderTickets = window.renderTickets;
  window.renderTickets=function(tickets){
    const out=document.getElementById('ticketOutput');
    if(!out){ if(previousRenderTickets) previousRenderTickets(tickets); return; }
    const manuals=getManuals();
    const bank=loadBank();
    const current=n(bank.current)||n(bank.initial);
    const pct=n(bank.riskPct)||2;
    const suggestedStake= current ? +(current*(pct/100)).toFixed(2) : 0;

    out.innerHTML=(tickets||[]).map((t,idx)=>{
      const key=ticketKey(t,idx);
      const saved=manuals[key]||{};
      const oddSuggested=n(t.oddTotal);
      const odd=saved.odd || t.realOdd || oddSuggested || '';
      const stake=saved.stake || t.realStake || t.stake || suggestedStake || '';
      const retorno=calcReturn(stake,odd);
      const lucro=calcProfit(stake,odd);
      const confidence=t.confidenceScore ? `${t.confidenceScore}% • ${t.confidenceLabel||''}` : (t.confidenceLabel||'Conferir');
      const items=(t.items||[]).map((i,j)=>`
        <div class="compact-entry">
          <b>${j+1}. ${safeMarketText(i.market||'Mercado não informado')}</b>
          <span>${safeMarketText(i.confidenceScore ? (i.confidenceScore+'%') : (i.confidence||'Conf. média'))}</span>
        </div>`).join('');
      return `<div class="card ticket-card compact-ticket">
        <div class="ticket-head">
          <h3>${safeMarketText(t.title||('Bilhete '+(idx+1)))}</h3>
          <span class="ticket-mode ${t.mode==='live'?'live':''}">${t.mode==='live'?'AO VIVO':'PRÉ-JOGO'}</span>
        </div>

        <div class="compact-game">${safeMarketText(mainGameLine(t))}</div>

        <div class="compact-confidence">
          <small>Confiança IA</small>
          <b>${safeMarketText(confidence)}</b>
        </div>

        <div class="compact-entries">
          ${items}
        </div>

        <div class="manual-bet-panel compact-manual">
          <div class="manual-bet-grid">
            <label>Odd sugerida <input value="${oddSuggested?String(oddSuggested.toFixed(2)).replace('.',','):'Conferir'}" disabled></label>
            <label>Odd real Bet365 <input class="manualOdd" data-key="${key}" data-idx="${idx}" type="number" min="1" step="0.01" value="${odd}" placeholder="Ex.: 1.72"></label>
            <label>Valor apostado <input class="manualStake" data-key="${key}" data-idx="${idx}" type="number" min="0" step="0.01" value="${stake}" placeholder="Ex.: 10"></label>
          </div>
          <div class="manual-calc" id="manualCalc-${idx}">
            ${stake&&odd?`Retorno: <b>${brl(retorno)}</b> • Lucro: <b class="conf-high">+${brl(lucro)}</b> • Red: <b class="conf-low">-${brl(stake)}</b>`:'Informe odd real e valor apostado.'}
          </div>
        </div>

        <div class="compact-report">
          <b>Leitura IA:</b> ${safeMarketText(shortText(t.report||'Confira o mercado na Bet365 antes de entrar.'))}
        </div>
      </div>`;
    }).join('');

    bindCompactManual(tickets);
  };

  function bindCompactManual(tickets){
    const manuals=getManuals();
    document.querySelectorAll('.manualOdd,.manualStake').forEach(inp=>{
      inp.addEventListener('input',()=>{
        const idx=Number(inp.dataset.idx), key=inp.dataset.key;
        const odd=n(document.querySelector(`.manualOdd[data-idx="${idx}"]`)?.value);
        const stake=n(document.querySelector(`.manualStake[data-idx="${idx}"]`)?.value);
        manuals[key]={odd,stake};
        setManuals(manuals);
        if(tickets?.[idx]){
          tickets[idx].realOdd=odd;
          tickets[idx].realStake=stake;
          tickets[idx].stake=stake;
          tickets[idx].possibleReturn=calcReturn(stake,odd);
          tickets[idx].realProfit=calcProfit(stake,odd);
          state.lastTickets=tickets;
        }
        const calc=document.getElementById(`manualCalc-${idx}`);
        if(calc){
          const retorno=calcReturn(stake,odd), lucro=calcProfit(stake,odd);
          calc.innerHTML = stake&&odd ? `Retorno: <b>${brl(retorno)}</b> • Lucro: <b class="conf-high">+${brl(lucro)}</b> • Red: <b class="conf-low">-${brl(stake)}</b>` : 'Informe odd real e valor apostado.';
        }
      });
    });
  }

  // Salvar usa os valores compactos manuais.
  const oldSave=window.saveTickets;
  window.saveTickets=function(){
    if(state.lastTickets?.length){
      const manuals=getManuals();
      state.lastTickets=state.lastTickets.map((t,idx)=>{
        const m=manuals[ticketKey(t,idx)]||{};
        const odd=n(m.odd)||n(t.realOdd)||n(t.oddTotal);
        const stake=n(m.stake)||n(t.realStake)||n(t.stake);
        return {...t,realOdd:odd,realStake:stake,stake,possibleReturn:calcReturn(stake,odd),realProfit:calcProfit(stake,odd),compactSaved:true};
      });
    }
    if(oldSave) oldSave();
  };

  // Reduz o texto grande no histórico também.
  const oldHist=window.renderHistory;
  window.renderHistory=function(){
    if(oldHist) oldHist();
    document.querySelectorAll('#historyList .history-card .ticket-report').forEach(el=>{
      el.innerHTML='<b>Leitura IA:</b><br>'+safeMarketText(shortText(el.textContent||'',160));
    });
  };
})();

/* Web 3.0 - Plataforma Online: login + preparação para banco/produção */
(function web30OnlinePlatform(){
  function showLogin(show){
    const o=document.getElementById('loginOverlay');
    if(o) o.style.display=show?'flex':'none';
  }
  function isLogged(){ return localStorage.getItem('nb_logged_in')==='yes'; }
  function login(){
    const u=(document.getElementById('loginUser')?.value||'').trim();
    const p=(document.getElementById('loginPass')?.value||'').trim();
    const savedUser=localStorage.getItem('nb_admin_user')||'admin';
    const savedPass=localStorage.getItem('nb_admin_pass')||'admin123';
    const msg=document.getElementById('loginMsg');
    if(u===savedUser && p===savedPass){
      localStorage.setItem('nb_logged_in','yes');
      localStorage.setItem('nb_login_at',new Date().toISOString());
      showLogin(false);
    }else{
      if(msg){ msg.className='result bad'; msg.textContent='Usuário ou senha incorretos.'; }
    }
  }
  function logout(){
    localStorage.removeItem('nb_logged_in');
    showLogin(true);
  }

  setTimeout(()=>{
    document.getElementById('loginBtn')?.addEventListener('click',login);
    document.getElementById('loginPass')?.addEventListener('keydown',e=>{if(e.key==='Enter') login();});
    if(!isLogged()) showLogin(true); else showLogin(false);

    const sidebar=document.querySelector('.sidebar');
    if(sidebar && !document.getElementById('logoutBtn')){
      const b=document.createElement('button');
      b.id='logoutBtn';
      b.className='nav';
      b.textContent='🚪 Sair';
      b.addEventListener('click',logout);
      sidebar.appendChild(b);
    }
  },400);

  // Export/import local data to prepare migration to database
  window.exportNazarenoData=function(){
    const data={
      apiFootball:localStorage.getItem('nb_api_football')||'',
      sportmonks:localStorage.getItem('nb_sportmonks')||'',
      bankroll:JSON.parse(localStorage.getItem('nb_bankroll')||'{}'),
      history:JSON.parse(localStorage.getItem('nb_ticket_history')||'[]'),
      manualBets:JSON.parse(localStorage.getItem('nb_manual_bets')||'{}'),
      exportedAt:new Date().toISOString(),
      version:'3.0'
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='nazareno_bets_backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  function addBackupPanel(){
    const cfg=document.getElementById('config');
    if(!cfg || document.getElementById('backupPanel')) return;
    const panel=document.createElement('div');
    panel.id='backupPanel';
    panel.className='card config-card';
    panel.innerHTML=`
      <h2>💾 Backup / Migração</h2>
      <p>Antes de publicar online, você pode exportar seus dados locais para migrar depois para banco de dados.</p>
      <div class="actions"><button class="secondary" onclick="exportNazarenoData()">Exportar backup JSON</button></div>
      <div class="result warn">Na versão online final, esses dados serão salvos no banco, não apenas no navegador.</div>
    `;
    cfg.appendChild(panel);
  }
  setTimeout(addBackupPanel,800);
})();

/* Web 3.1 - Usuários reais + dados separados por usuário */
(function web31Users(){
  function safe(v){return String(v||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function defaultUsers(){
    return [{id:'admin',name:'Administrador',email:'admin',password:'admin123',role:'admin',status:'active',createdAt:new Date().toISOString()}];
  }
  function loadUsers(){
    try{
      const u=JSON.parse(localStorage.getItem('nb_users')||'[]');
      if(u.length) return u;
    }catch(e){}
    const d=defaultUsers();
    localStorage.setItem('nb_users',JSON.stringify(d));
    return d;
  }
  function saveUsers(users){ localStorage.setItem('nb_users',JSON.stringify(users)); }
  function currentUser(){
    const id=localStorage.getItem('nb_current_user')||'admin';
    return loadUsers().find(u=>u.id===id)||loadUsers()[0];
  }
  function userKey(base){
    const u=currentUser();
    return `${base}_${u.id}`;
  }

  // Migra/usa dados por usuário, sem apagar os dados antigos.
  function getUserScoped(key, fallback=''){
    return localStorage.getItem(userKey(key)) ?? localStorage.getItem(key) ?? fallback;
  }
  function setUserScoped(key,value){
    localStorage.setItem(userKey(key),value);
  }

  // Login 3.1 usando lista de usuários.
  function showLogin(show){
    const o=document.getElementById('loginOverlay');
    if(o) o.style.display=show?'flex':'none';
  }
  window.nbLogout=function(){
    localStorage.removeItem('nb_logged_in');
    localStorage.removeItem('nb_current_user');
    showLogin(true);
  }
  function login31(){
    const u=(document.getElementById('loginUser')?.value||'').trim();
    const p=(document.getElementById('loginPass')?.value||'').trim();
    const msg=document.getElementById('loginMsg');
    const user=loadUsers().find(x=>(x.email===u || x.id===u) && x.password===p);
    if(!user){
      if(msg){msg.className='result bad';msg.textContent='Usuário ou senha incorretos.';}
      return;
    }
    if(user.status==='blocked'){
      if(msg){msg.className='result bad';msg.textContent='Usuário bloqueado pelo administrador.';}
      return;
    }
    localStorage.setItem('nb_logged_in','yes');
    localStorage.setItem('nb_current_user',user.id);
    localStorage.setItem('nb_login_at',new Date().toISOString());
    showLogin(false);
    applyUserScope();
    renderUsers();
  }

  function applyUserScope(){
    const u=currentUser();
    const side=document.getElementById('side-status');
    if(side) side.textContent=`Logado: ${u.name} (${u.role==='admin'?'Admin':'Usuário'})`;
    const mode=document.getElementById('online-mode-card');
    if(mode) mode.textContent='Produção 3.5';
    // Recarrega campos com dados do usuário
    const f=document.getElementById('footballKey');
    const s=document.getElementById('sportKey');
    if(f) f.value=getUserScoped('nb_api_football','');
    if(s) s.value=getUserScoped('nb_sportmonks','');
    state.football=!!(f?.value);
    state.sport=!!(s?.value);
    if(typeof updateStatus==='function') updateStatus();
    if(typeof renderHistory==='function') renderHistory();
  }

  // Sobrescreve salvamento de chaves para usuário atual.
  const oldSaveKey=window.saveKey;
  window.saveKey=function(id,key,status){
    setUserScoped(key,document.querySelector(id).value.trim());
    localStorage.setItem(key,document.querySelector(id).value.trim()); // mantém compatibilidade
    state.football=!!getUserScoped('nb_api_football','');
    state.sport=!!getUserScoped('nb_sportmonks','');
    const st=document.querySelector(status);
    if(st){st.className='result';st.textContent='Chave salva para este usuário.';}
    if(typeof updateStatus==='function') updateStatus();
  }

  // Intercepta histórico e banca por usuário.
  function scopedHistoryKey(){return userKey('nb_ticket_history')}
  function scopedBankKey(){return userKey('nb_bankroll')}
  function scopedManualKey(){return userKey('nb_manual_bets')}

  // Copia histórico antigo para usuário atual apenas uma vez.
  function migrateScopeOnce(){
    const u=currentUser();
    const flag='nb_scope_migrated_'+u.id;
    if(localStorage.getItem(flag)) return;
    if(!localStorage.getItem(scopedHistoryKey()) && localStorage.getItem('nb_ticket_history')) localStorage.setItem(scopedHistoryKey(),localStorage.getItem('nb_ticket_history'));
    if(!localStorage.getItem(scopedBankKey()) && localStorage.getItem('nb_bankroll')) localStorage.setItem(scopedBankKey(),localStorage.getItem('nb_bankroll'));
    if(!localStorage.getItem(scopedManualKey()) && localStorage.getItem('nb_manual_bets')) localStorage.setItem(scopedManualKey(),localStorage.getItem('nb_manual_bets'));
    localStorage.setItem(flag,'yes');
  }

  // Wrap localStorage for app keys to user-scope in key functions by syncing before/after.
  function syncScopedToGlobal(){
    migrateScopeOnce();
    if(localStorage.getItem(scopedHistoryKey())) localStorage.setItem('nb_ticket_history',localStorage.getItem(scopedHistoryKey()));
    if(localStorage.getItem(scopedBankKey())) localStorage.setItem('nb_bankroll',localStorage.getItem(scopedBankKey()));
    if(localStorage.getItem(scopedManualKey())) localStorage.setItem('nb_manual_bets',localStorage.getItem(scopedManualKey()));
  }
  function syncGlobalToScoped(){
    localStorage.setItem(scopedHistoryKey(),localStorage.getItem('nb_ticket_history')||'[]');
    localStorage.setItem(scopedBankKey(),localStorage.getItem('nb_bankroll')||'{}');
    localStorage.setItem(scopedManualKey(),localStorage.getItem('nb_manual_bets')||'{}');
  }

  const oldRenderHistory31=window.renderHistory;
  window.renderHistory=function(){
    syncScopedToGlobal();
    if(oldRenderHistory31) oldRenderHistory31();
  }

  const oldSaveTickets31=window.saveTickets;
  window.saveTickets=function(){
    syncScopedToGlobal();
    if(oldSaveTickets31) oldSaveTickets31();
    syncGlobalToScoped();
  }

  const oldSetStatus31=window.setHistoryStatus;
  window.setHistoryStatus=function(idx,status){
    syncScopedToGlobal();
    if(oldSetStatus31) oldSetStatus31(idx,status);
    syncGlobalToScoped();
  }

  const oldUpdateTicket31=window.updateTicketResult;
  if(oldUpdateTicket31){
    window.updateTicketResult=async function(idx){
      syncScopedToGlobal();
      await oldUpdateTicket31(idx);
      syncGlobalToScoped();
    }
  }

  function createUser(){
    const users=loadUsers();
    const name=(document.getElementById('newUserName')?.value||'').trim();
    const email=(document.getElementById('newUserEmail')?.value||'').trim();
    const pass=(document.getElementById('newUserPass')?.value||'').trim();
    const role=document.getElementById('newUserRole')?.value||'user';
    const status=document.getElementById('newUserStatus')?.value||'active';
    const msg=document.getElementById('usersMsg');
    if(!name||!email||!pass){
      if(msg){msg.className='result bad';msg.textContent='Preencha nome, login/e-mail e senha.';}
      return;
    }
    if(users.some(u=>u.email===email || u.id===email)){
      if(msg){msg.className='result bad';msg.textContent='Já existe usuário com este login/e-mail.';}
      return;
    }
    users.push({id:'u'+Date.now(),name,email,password:pass,role,status,createdAt:new Date().toISOString()});
    saveUsers(users);
    if(msg){msg.className='result';msg.textContent='Usuário criado com sucesso.';}
    ['newUserName','newUserEmail','newUserPass'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
    renderUsers();
  }

  window.toggleUserStatus=function(id){
    const users=loadUsers();
    const u=users.find(x=>x.id===id);
    if(!u || u.id==='admin') return;
    u.status=u.status==='active'?'blocked':'active';
    saveUsers(users);
    renderUsers();
  }
  window.deleteUser=function(id){
    if(id==='admin') return;
    if(!confirm('Excluir este usuário?')) return;
    saveUsers(loadUsers().filter(u=>u.id!==id));
    renderUsers();
  }

  function renderUsers(){
    const list=document.getElementById('usersList');
    if(!list) return;
    const cur=currentUser();
    if(cur.role!=='admin'){
      list.innerHTML='<div class="card empty">Apenas administrador pode gerenciar usuários.</div>';
      const form=document.querySelector('#usuarios .card');
      if(form) form.style.display='none';
      return;
    }
    const users=loadUsers();
    list.innerHTML=users.map(u=>`<div class="card user-card">
      <div>
        <h3>${safe(u.name)}</h3>
        <p class="muted">${safe(u.email)} • ${u.role==='admin'?'👑 Administrador':'👤 Usuário'} • ${u.status==='active'?'🟢 Ativo':'🔴 Bloqueado'}</p>
      </div>
      <div class="actions">
        ${u.id!=='admin'?`<button class="secondary" onclick="toggleUserStatus('${u.id}')">${u.status==='active'?'Bloquear':'Ativar'}</button><button class="danger" onclick="deleteUser('${u.id}')">Excluir</button>`:'<span class="badge">Usuário padrão</span>'}
      </div>
    </div>`).join('');
  }

  setTimeout(()=>{
    loadUsers();
    // reconectar login 3.1
    const btn=document.getElementById('loginBtn');
    if(btn){
      const b=btn.cloneNode(true);
      btn.parentNode.replaceChild(b,btn);
      b.addEventListener('click',login31);
    }
    const pass=document.getElementById('loginPass');
    if(pass) pass.addEventListener('keydown',e=>{if(e.key==='Enter') login31();});
    const logout=document.getElementById('logoutBtn');
    if(logout){
      const b=logout.cloneNode(true);
      logout.parentNode.replaceChild(b,logout);
      b.addEventListener('click',window.nbLogout);
    }
    document.getElementById('createUserBtn')?.addEventListener('click',createUser);
    document.getElementById('refreshUsersBtn')?.addEventListener('click',renderUsers);
    if(localStorage.getItem('nb_logged_in')==='yes') {
      syncScopedToGlobal();
      applyUserScope();
      renderUsers();
    }
  },700);
})();

/* Web 3.2 - Banco online Supabase preparado */
(function web32CloudReady(){
  async function cloudStatus(){
    try{
      const r=await fetch('/api/cloud/status');
      const j=await r.json();
      const card=document.getElementById('online-mode-card');
      if(card) card.textContent=j.enabled?'Supabase ON':'Modo local';
      return j;
    }catch(e){
      const card=document.getElementById('online-mode-card');
      if(card) card.textContent='Modo local';
      return {enabled:false};
    }
  }

  function addCloudPanel(){
    const cfg=document.getElementById('config');
    if(!cfg || document.getElementById('cloudPanel')) return;
    const panel=document.createElement('div');
    panel.id='cloudPanel';
    panel.className='card config-card';
    panel.innerHTML=`
      <h2>💾 Banco Online Supabase</h2>
      <p>Esta versão está preparada para salvar dados no Supabase. Se as variáveis não estiverem configuradas, continua funcionando em modo local.</p>
      <div id="cloudStatusMsg" class="result warn">Verificando conexão com banco online...</div>
      <div class="actions"><button class="secondary" id="testCloudBtn">Testar banco online</button><button class="secondary" id="syncLocalCloudBtn">Sincronizar dados locais</button></div>
    `;
    cfg.appendChild(panel);
    document.getElementById('testCloudBtn')?.addEventListener('click',testCloud);
    document.getElementById('syncLocalCloudBtn')?.addEventListener('click',syncLocalCloud);
    testCloud();
  }

  async function testCloud(){
    const msg=document.getElementById('cloudStatusMsg');
    if(msg){msg.className='result warn';msg.textContent='Testando Supabase...';}
    const st=await cloudStatus();
    if(msg){
      msg.className='result '+(st.enabled?'':'warn');
      msg.textContent=st.enabled?'Supabase configurado e pronto.':'Supabase ainda não configurado. A plataforma está em modo local.';
    }
  }

  async function syncLocalCloud(){
    const msg=document.getElementById('cloudStatusMsg');
    try{
      if(msg){msg.className='result warn';msg.textContent='Enviando dados locais para o banco online...';}
      const payload={
        user:localStorage.getItem('nb_current_user')||'admin',
        bankroll:JSON.parse(localStorage.getItem('nb_bankroll')||'{}'),
        history:JSON.parse(localStorage.getItem('nb_ticket_history')||'[]'),
        users:JSON.parse(localStorage.getItem('nb_users')||'[]')
      };
      const r=await fetch('/api/cloud/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const j=await r.json();
      if(!r.ok || !j.ok) throw new Error(j.message||'Falha ao sincronizar.');
      if(msg){msg.className='result';msg.textContent='Dados enviados para o banco online com sucesso.';}
    }catch(e){
      if(msg){msg.className='result bad';msg.textContent='Não foi possível sincronizar: '+e.message;}
    }
  }

  // Ao salvar bilhetes, tenta enviar para nuvem também.
  const oldSaveTickets32=window.saveTickets;
  window.saveTickets=function(){
    if(oldSaveTickets32) oldSaveTickets32();
    setTimeout(async()=>{
      try{
        const st=await cloudStatus();
        if(!st.enabled || !state.lastTickets?.length) return;
        await fetch('/api/cloud/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:localStorage.getItem('nb_current_user')||'admin',tickets:state.lastTickets})});
      }catch(e){ console.warn('Cloud ticket save failed',e); }
    },300);
  };

  setTimeout(()=>{addCloudPanel();cloudStatus();},900);
})();

/* Web 3.3 - Produção Online */
(function web33Production(){
  async function productionStatus(){
    try{
      const r=await fetch('/api/production/status');
      const j=await r.json();
      const card=document.getElementById('online-mode-card');
      if(card) card.textContent=j.production?'Produção':'Local';
      return j;
    }catch(e){ return {production:false}; }
  }
  function addProductionPanel(){
    const cfg=document.getElementById('config');
    if(!cfg || document.getElementById('productionPanel')) return;
    const panel=document.createElement('div');
    panel.id='productionPanel';
    panel.className='card config-card';
    panel.innerHTML=`
      <h2>🚀 Produção Online</h2>
      <p>Esta versão está pronta para hospedagem. Quando publicada, você acessa sem tela preta e sem localhost.</p>
      <div id="productionStatusMsg" class="result warn">Verificando modo de execução...</div>
      <div class="deploy-list">
        <div>✅ Node/Express</div>
        <div>✅ Supabase preparado</div>
        <div>✅ Render/Railway pronto</div>
        <div>✅ Variáveis de ambiente</div>
        <div>✅ HTTPS pelo provedor</div>
        <div>✅ Domínio nazarenobets.com</div>
      </div>
    `;
    cfg.appendChild(panel);
    productionStatus().then(st=>{
      const msg=document.getElementById('productionStatusMsg');
      if(msg){
        msg.className='result ' + (st.production?'':'warn');
        msg.textContent=st.production
          ? 'Rodando em produção. A tela preta não é necessária.'
          : 'Rodando localmente. A tela preta ainda é necessária até publicar.';
      }
    });
  }
  setTimeout(addProductionPanel,1000);
})();

/* Web 3.4 - Deploy Final */
(function web34DeployFinal(){
  function addDeployChecklist(){
    const cfg=document.getElementById('config');
    if(!cfg || document.getElementById('deployFinalPanel')) return;
    const panel=document.createElement('div');
    panel.id='deployFinalPanel';
    panel.className='card config-card';
    panel.innerHTML=`
      <h2>🌐 Deploy Final — nazarenobets.com</h2>
      <p>Checklist para deixar a plataforma online definitivamente.</p>
      <div class="deploy-checklist">
        <label><input type="checkbox"> Supabase criado</label>
        <label><input type="checkbox"> SQL executado</label>
        <label><input type="checkbox"> API-Football configurada no servidor</label>
        <label><input type="checkbox"> Sportmonks configurada no servidor</label>
        <label><input type="checkbox"> SUPABASE_URL configurada</label>
        <label><input type="checkbox"> SUPABASE_SERVICE_ROLE_KEY configurada</label>
        <label><input type="checkbox"> Plataforma publicada no Render/Railway</label>
        <label><input type="checkbox"> Domínio nazarenobets.com apontado</label>
      </div>
      <div class="result warn">Quando todos os itens estiverem marcados, a tela preta deixa de ser necessária.</div>
    `;
    cfg.appendChild(panel);
  }
  setTimeout(addDeployChecklist,1000);
})();

/* Web 3.5 - Ajustes de Produção: APIs no servidor + checklist automático */
(function web35ProductionFixes(){
  async function getServerConfig(){
    try{
      const r=await fetch('/api/server/config-status');
      return await r.json();
    }catch(e){ return {ok:false,apis:{football:false,sport:false},cloud:false,production:false}; }
  }
  function setStatusBox(sel, ok, text){
    const el=document.querySelector(sel);
    if(el){
      el.className='result '+(ok?'':'warn');
      el.textContent=text;
    }
  }
  async function refreshProductionStatus(){
    const st=await getServerConfig();
    state.football=!!st.apis?.football;
    state.sport=!!st.apis?.sport;
    if(typeof updateStatus==='function') updateStatus();
    const apiMain=document.getElementById('api-status-main');
    if(apiMain) apiMain.textContent=(state.football&&state.sport)?'Prontas':'Pendentes';
    setStatusBox('#footballStatus', state.football, state.football?'API-Football configurada no servidor.':'API-Football pendente no servidor.');
    setStatusBox('#sportStatus', state.sport, state.sport?'Sportmonks configurada no servidor.':'Sportmonks pendente no servidor.');
    const mode=document.getElementById('online-mode-card');
    if(mode) mode.textContent='Produção 3.5';
    markDeployChecklist(st);
    return st;
  }
  function markDeployChecklist(st){
    const labels=[...document.querySelectorAll('.deploy-checklist label')];
    const map=[
      !!st.cloud, true, !!st.apis?.football, !!st.apis?.sport,
      !!st.env?.supabaseUrl, !!st.env?.supabaseKey, !!st.production, false
    ];
    labels.forEach((lab,i)=>{
      const input=lab.querySelector('input');
      if(input){
        input.checked=!!map[i];
        input.disabled=true;
      }
      if(map[i]) lab.classList.add('checked-auto');
    });
  }
  async function testApiFromServer(which){
    const msgSel=which==='football'?'#footballStatus':'#sportStatus';
    setStatusBox(msgSel,false,'Testando conexão pelo servidor...');
    try{
      const r=await fetch('/api/server/test/'+which);
      const j=await r.json();
      setStatusBox(msgSel,!!j.ok,j.message|| (j.ok?'Conexão OK.':'Falha no teste.'));
      await refreshProductionStatus();
    }catch(e){
      setStatusBox(msgSel,false,'Erro ao testar pelo servidor: '+e.message);
    }
  }
  setTimeout(()=>{
    const btns=[...document.querySelectorAll('button')];
    btns.forEach(btn=>{
      const txt=(btn.textContent||'').toLowerCase();
      const card=btn.closest('.card');
      if(txt.includes('testar conexão') && card){
        const title=(card.textContent||'').toLowerCase();
        const clone=btn.cloneNode(true);
        btn.parentNode.replaceChild(clone,btn);
        if(title.includes('api-football')){
          clone.addEventListener('click',()=>testApiFromServer('football'));
        }else if(title.includes('sportmonks')){
          clone.addEventListener('click',()=>testApiFromServer('sport'));
        }
      }
    });
    refreshProductionStatus();
    setInterval(refreshProductionStatus,30000);
  },700);
  setTimeout(()=>{
    const msg=document.getElementById('loginMsg');
    if(msg) msg.textContent='Use o administrador configurado para esta instalação.';
  },500);
})();
