const express=require('express'); const cors=require('cors'); const path=require('path');
const app=express(); app.use(cors()); app.use(express.json({limit:'1mb'})); app.use(express.static(path.join(__dirname,'../public')));
const API='https://v3.football.api-sports.io';
function key(req){return req.body?.key||process.env.API_FOOTBALL_KEY||''}
async function apiFootball(endpoint,k){ const r=await fetch(API+endpoint,{headers:{'x-apisports-key':k}}); const j=await r.json(); if(!r.ok||j.errors?.token) throw new Error('Chave API-Football inválida ou limite excedido.'); return j; }
app.post('/api/test/football',async(req,res)=>{try{const k=key(req); if(!k)return res.status(400).json({ok:false,message:'Informe a chave API-Football.'}); const j=await apiFootball('/status',k); res.json({ok:!!j.response,message:j.response?'API-Football conectada.':'Não foi possível validar a API-Football.'});}catch(e){res.status(500).json({ok:false,message:e.message||'Erro ao testar API-Football.'})}});
app.post('/api/test/sport',async(req,res)=>{const k=req.body?.key||process.env.SPORTMONKS_TOKEN; if(!k)return res.status(400).json({ok:false,message:'Informe o token Sportmonks.'}); try{const url='https://api.sportmonks.com/v3/football/fixtures?per_page=1'; const r=await fetch(url,{headers:{Authorization:`Bearer ${k}`}}); const j=await r.json(); const ok=!j.message?.toLowerCase?.().includes('unauthenticated'); res.json({ok,message:ok?'Sportmonks conectada.':'Verifique o token Sportmonks.'});}catch(e){res.status(500).json({ok:false,message:'Erro ao testar Sportmonks.'})}});
app.post('/api/leagues',async(req,res)=>{try{const k=key(req); if(!k)return res.status(400).json({ok:false,message:'Chave API-Football não encontrada.'}); const season=new Date().getFullYear(); const j=await apiFootball(`/leagues?current=true`,k); const leagues=(j.response||[]).filter(x=>x.league?.type==='League'||x.league?.type==='Cup').slice(0,250).map(x=>({id:x.league.id,name:x.league.name,country:x.country?.name||'',season:x.seasons?.find(s=>s.current)?.year||season})); res.json({ok:true,leagues});}catch(e){res.status(500).json({ok:false,message:e.message})}});
function mapGame(x){const st=x.fixture.status||{}; const isLive=['1H','2H','ET','BT','P','LIVE','INT'].includes(st.short); const period=st.short==='1H'?'1º tempo':st.short==='2H'?'2º tempo':st.short==='HT'?'Intervalo':st.short==='ET'?'Prorrogação':st.long||st.short; return {id:x.fixture.id, fixtureId:x.fixture.id, leagueId:x.league.id, season:x.league.season, league:x.league.name, country:x.league.country, homeId:x.teams.home.id, awayId:x.teams.away.id, home:x.teams.home.name, away:x.teams.away.name, venue:x.fixture.venue?.name||'', isLive, elapsed:typeof st.elapsed==='number'?st.elapsed:null, period, statusText:st.long||st.short, score:`${x.goals.home??'-'} x ${x.goals.away??'-'}`, homeGoals:x.goals.home, awayGoals:x.goals.away, date:x.fixture.date};}
app.post('/api/games',async(req,res)=>{try{const k=key(req); if(!k)return res.status(400).json({ok:false,message:'Chave API-Football não encontrada.'}); const {type,league,season,date}=req.body||{}; let endpoint=''; if(type==='live'){ endpoint='/fixtures?live=all'; if(league&&league!=='all') endpoint+=`&league=${league}&season=${season}`; } else { endpoint=`/fixtures?date=${date}&timezone=America/Sao_Paulo`; if(league&&league!=='all') endpoint+=`&league=${league}&season=${season}`; } const j=await apiFootball(endpoint,k); const games=(j.response||[]).map(mapGame); res.json({ok:true,games});}catch(e){res.status(500).json({ok:false,message:e.message})}});

function safeNum(v){const n=Number(String(v??'').replace('%','')); return Number.isFinite(n)?n:0;}
function statVal(arr,name){const item=(arr||[]).find(s=>(s.type||'').toLowerCase()===name.toLowerCase()); return safeNum(item?.value);}
async function teamLastMatches(teamId, leagueId, season, k){
  // Primeiro tenta no campeonato escolhido. Em Copas/seleções, a API às vezes retorna vazio;
  // então cai para os últimos jogos gerais da equipe/seleção.
  let ep=`/fixtures?team=${teamId}&last=3`;
  if(leagueId && leagueId!=='all') ep+=`&league=${leagueId}`;
  if(season) ep+=`&season=${season}`;
  try{
    const j=await apiFootball(ep,k);
    if((j.response||[]).length) return j.response||[];
  }catch(e){}
  try{
    const j2=await apiFootball(`/fixtures?team=${teamId}&last=3`,k);
    return j2.response||[];
  }catch(e){ return []; }
}
async function fixtureStats(fixtureId,k){
  try{const j=await apiFootball(`/fixtures/statistics?fixture=${fixtureId}`,k); return j.response||[];}catch(e){return []}
}
function summarize(teamId, matches, statsByFixture){
  const out={played:matches.length, goalsFor:0, goalsAgainst:0, firstHalfFor:0, firstHalfAgainst:0, secondHalfFor:0, secondHalfAgainst:0, cornersFor:0, cornersAgainst:0, cardsFor:0, cardsAgainst:0, shotsOnFor:0, shotsOnAgainst:0, wins:0, draws:0, losses:0};
  for(const m of matches){
    const isHome=m.teams.home.id===teamId;
    const gf=isHome?(m.goals.home??0):(m.goals.away??0), ga=isHome?(m.goals.away??0):(m.goals.home??0);
    out.goalsFor+=gf; out.goalsAgainst+=ga; if(gf>ga)out.wins++; else if(gf===ga)out.draws++; else out.losses++;
    const ht=m.score?.halftime||{}; const htf=isHome?(ht.home??0):(ht.away??0), hta=isHome?(ht.away??0):(ht.home??0);
    out.firstHalfFor+=htf; out.firstHalfAgainst+=hta; out.secondHalfFor+=Math.max(0,gf-htf); out.secondHalfAgainst+=Math.max(0,ga-hta);
    const pair=statsByFixture[m.fixture.id]||[]; const mine=pair.find(x=>x.team?.id===teamId)?.statistics||[]; const opp=pair.find(x=>x.team?.id!==teamId)?.statistics||[];
    out.cornersFor+=statVal(mine,'Corner Kicks'); out.cornersAgainst+=statVal(opp,'Corner Kicks');
    out.cardsFor+=statVal(mine,'Yellow Cards')+statVal(mine,'Red Cards'); out.cardsAgainst+=statVal(opp,'Yellow Cards')+statVal(opp,'Red Cards');
    out.shotsOnFor+=statVal(mine,'Shots on Goal'); out.shotsOnAgainst+=statVal(opp,'Shots on Goal');
  }
  const p=Math.max(1,out.played); out.avg={
    goalsFor:+(out.goalsFor/p).toFixed(2), goalsAgainst:+(out.goalsAgainst/p).toFixed(2), firstHalfFor:+(out.firstHalfFor/p).toFixed(2), secondHalfFor:+(out.secondHalfFor/p).toFixed(2),
    cornersFor:+(out.cornersFor/p).toFixed(2), cornersAgainst:+(out.cornersAgainst/p).toFixed(2), cardsFor:+(out.cardsFor/p).toFixed(2), cardsAgainst:+(out.cardsAgainst/p).toFixed(2), shotsOnFor:+(out.shotsOnFor/p).toFixed(2)
  };
  const attack=out.avg.goalsFor>=1.7||out.avg.shotsOnFor>=5?'Forte':out.avg.goalsFor>=1?'Médio':'Baixo';
  const defense=out.avg.goalsAgainst<=0.8?'Forte':out.avg.goalsAgainst<=1.4?'Média':'Vulnerável';
  const style=(out.avg.goalsFor+out.avg.cornersFor)>=7?'Ofensivo':(out.avg.goalsAgainst+out.avg.cornersAgainst)>=7?'Defensivo pressionado':'Equilibrado';
  out.profile={attack,defense,style}; return out;
}
function recommendations(home,away,homeName,awayName){
  const rec=[], avoid=[]; const totalGoals=home.avg.goalsFor+away.avg.goalsFor; const totalAgainst=home.avg.goalsAgainst+away.avg.goalsAgainst;
  if(home.profile.defense==='Forte' && home.losses<=1) rec.push(`Dupla chance: Casa ou Empate (1X) - ${homeName} com proteção.`);
  if(away.profile.defense==='Forte' && away.losses<=1) rec.push(`Dupla chance: Fora ou Empate (X2) - ${awayName} com proteção.`);
  if(home.draws+away.draws<=1) rec.push('Dupla chance: Casa ou Fora (12) - tendência menor de empate pelos últimos jogos.');
  if(totalGoals>=2.3 || totalAgainst>=2.6) rec.push('Over 1.5 gols - tendência de pelo menos dois gols no confronto.'); else rec.push('Over 0.5 gols - opção mais conservadora em gols.');
  if(home.avg.cornersFor+away.avg.cornersAgainst>=8) rec.push(`${homeName} escanteios a favor - tendência favorável pelo volume/ofensividade.`);
  if(away.avg.cornersFor+home.avg.cornersAgainst>=8) rec.push(`${awayName} escanteios a favor - tendência favorável pelo volume/ofensividade.`);
  if(home.avg.cardsFor+away.avg.cardsFor>=4) rec.push('Cartões acima da linha baixa - confronto com média disciplinar elevada.');
  avoid.push('Resultado exato - mercado de alto risco.'); avoid.push('Vitória seca sem proteção - usar somente se o diagnóstico indicar muita superioridade.');
  return {recommended:rec.slice(0,6), avoid};
}
app.post('/api/diagnosis',async(req,res)=>{try{
  const k=key(req); if(!k)return res.status(400).json({ok:false,message:'Chave API-Football não encontrada.'});
  const {game}=req.body||{}; if(!game?.homeId||!game?.awayId)return res.status(400).json({ok:false,message:'Selecione um jogo válido.'});
  const leagueId=game.leagueId, season=game.season||new Date().getFullYear();
  const [homeMatches,awayMatches]=await Promise.all([teamLastMatches(game.homeId,leagueId,season,k),teamLastMatches(game.awayId,leagueId,season,k)]);
  const ids=[...new Set([...homeMatches,...awayMatches].map(m=>m.fixture.id))];
  const statsEntries=await Promise.all(ids.map(async id=>[id,await fixtureStats(id,k)]));
  const statsByFixture=Object.fromEntries(statsEntries);
  const home=summarize(game.homeId,homeMatches,statsByFixture); const away=summarize(game.awayId,awayMatches,statsByFixture);
  const rec=recommendations(home,away,game.home,game.away);
  res.json({ok:true,game,home,away,recommendations:rec,notes:(homeMatches.length||awayMatches.length)?'Diagnóstico calculado pelos últimos 3 jogos disponíveis, com estatísticas quando a API fornece escanteios/cartões/finalizações.':'A API não retornou últimos jogos completos para esta competição/seleção. Diagnóstico parcial: use com cautela e confira dados na Bet365.'});
}catch(e){res.status(500).json({ok:false,message:e.message||'Erro ao gerar diagnóstico.'})}});


function getLiveStat(stats,name){
  const item=(stats||[]).find(s=>(s.type||'').toLowerCase()===name.toLowerCase());
  return safeNum(item?.value);
}
function liveTeamSummary(teamStats){
  const stats=teamStats?.statistics||[];
  return {
    shots:getLiveStat(stats,'Total Shots'),
    shotsOn:getLiveStat(stats,'Shots on Goal'),
    possession:getLiveStat(stats,'Ball Possession'),
    corners:getLiveStat(stats,'Corner Kicks'),
    cards:getLiveStat(stats,'Yellow Cards')+getLiveStat(stats,'Red Cards'),
    dangerousAttacks:getLiveStat(stats,'Dangerous Attacks')
  };
}
function pressureScore(t){
  return (t.shotsOn*4)+(t.shots*1.4)+(t.corners*2)+(t.dangerousAttacks*.45)+(t.possession*.08);
}
function pressureLabel(score){return score>=34?'Alta':score>=18?'Média':'Baixa'}
function makeLiveReport(game,home,away,homeScore,awayScore){
  const diff=homeScore-awayScore;
  const minute=Number.isFinite(game.elapsed)?game.elapsed:0;
  const scoreText=`${game.home} ${game.homeGoals??'-'} x ${game.awayGoals??'-'} ${game.away}`;
  let edge='Equilíbrio';
  if(diff>=10) edge=`domínio do ${game.home}`;
  if(diff<=-10) edge=`domínio do ${game.away}`;
  let scenario='Jogo equilibrado';
  let report='';
  let markets=[];
  if(diff>=10){
    scenario=`Pressão maior do ${game.home}`;
    report=`No momento, o jogo mostra ${edge}. O ${game.home} apresenta maior volume ofensivo, cria mais chegadas e sustenta melhor presença no campo adversário. A tendência principal é de possibilidade de mais um gol para o mandante ou continuidade da pressão, desde que o ritmo não caia nos próximos minutos.`;
    markets=[{name:`${game.home} próximo gol`,reason:'mandante com maior pressão ofensiva'}, {name:'Over 0.5 gols ao vivo',reason:'cenário com volume para mais um gol'}, {name:`${game.home} escanteios`,reason:'pressão pode gerar escanteios'}];
  } else if(diff<=-10){
    scenario=`Pressão maior do ${game.away}`;
    report=`No momento, o jogo mostra ${edge}. O ${game.away} tem maior volume e oferece mais perigo. A leitura favorece mercados de proteção para o visitante ou possibilidade de mais um gol, mas a entrada deve ser refeita se houver gol ou expulsão.`;
    markets=[{name:`${game.away} próximo gol`,reason:'visitante com maior pressão ofensiva'}, {name:'Over 0.5 gols ao vivo',reason:'cenário com volume para mais um gol'}, {name:`${game.away} escanteios`,reason:'pressão pode gerar escanteios'}];
  } else {
    const low=(home.shotsOn+away.shotsOn)<=2 && (home.corners+away.corners)<=4;
    if(low && minute>=60){
      scenario='Tendência de manutenção do resultado';
      report=`O jogo está equilibrado e com baixa produção ofensiva neste momento. Como há poucas finalizações claras e pouco volume de escanteios, a tendência passa a ser de manutenção do placar atual, com maior risco para entradas em mais gols. O empate ou resultado atual ganha força enquanto o ritmo permanecer baixo.`;
      markets=[{name:'Evitar entrada em gol agora',reason:'baixo volume ofensivo'}, {name:'Empate/resultado atual com cautela',reason:'ritmo reduzido'}, {name:'Aguardar novo pico de pressão',reason:'cenário sem vantagem clara'}];
    } else {
      scenario='Equilíbrio com possibilidade de mudança';
      report=`O confronto está equilibrado, mas ainda existe movimentação suficiente para alterar o placar. Nenhum lado domina de forma clara; por isso, a leitura mais prudente é buscar mercados protegidos ou aguardar uma pressão mais forte antes da entrada.`;
      markets=[{name:'Dupla chance protegida',reason:'jogo equilibrado'}, {name:'Over 0.5 gols com cautela',reason:'somente se o ritmo aumentar'}, {name:'Aguardar confirmação',reason:'sem domínio claro'}];
    }
  }
  const alert=(game.homeGoals!==null&&game.awayGoals!==null)?`Placar atual: ${scoreText}. Se sair gol, refaça a análise antes de formar bilhete.`:'Se houver alteração de placar, refaça a análise.';
  return {edge,scenario,report,markets,alert};
}
app.post('/api/live-analysis',async(req,res)=>{try{
  const k=key(req); if(!k)return res.status(400).json({ok:false,message:'Chave API-Football não encontrada.'});
  const {game}=req.body||{}; if(!game?.fixtureId && !game?.id)return res.status(400).json({ok:false,message:'Selecione um jogo válido.'});
  let mapped=game, fresh=null;
  try{
    const jf=await apiFootball(`/fixtures?id=${game.fixtureId||game.id}`,k);
    fresh=(jf.response||[])[0];
    if(fresh) mapped=mapGame(fresh);
  }catch(e){
    // Se a Copa/fixture não responder, segue com os dados já carregados na busca.
    mapped={...game, fixtureId:game.fixtureId||game.id, id:game.id||game.fixtureId};
  }
  let stats=[];
  try{ stats=await fixtureStats(mapped.fixtureId||mapped.id,k); }catch(e){ stats=[]; }
  const homeStats=stats.find(x=>x.team?.id===mapped.homeId)||{};
  const awayStats=stats.find(x=>x.team?.id===mapped.awayId)||{};
  const home=liveTeamSummary(homeStats), away=liveTeamSummary(awayStats);
  // fallback para não deixar Copa do Mundo sem leitura quando estatísticas não forem liberadas
  if(!home.shots && !away.shots && !home.corners && !away.corners){
    home.possession=50; away.possession=50;
  }
  const hs=pressureScore(home), as=pressureScore(away);
  const pressure={home:pressureLabel(hs),away:pressureLabel(as),edge: hs>as+10?mapped.home:as>hs+10?mapped.away:'Equilibrado'};
  const text=makeLiveReport(mapped,home,away,hs,as);
  const wcTxt=((mapped.league||'')+' '+(mapped.country||'')).toLowerCase();
  const isWC=wcTxt.includes('world cup')||wcTxt.includes('copa do mundo')||wcTxt.includes('fifa');
  if(isWC && (!stats || !stats.length)){
    text.alert='Jogo da Copa do Mundo: a API não retornou estatísticas completas deste fixture. A leitura foi feita com placar/status disponíveis; confira volume do jogo na Bet365 antes de entrar.';
  }
  res.json({ok:true,game:mapped,home,away,pressure,scenario:text.scenario,report:text.report,markets:text.markets,alert:text.alert});
}catch(e){res.status(500).json({ok:false,message:e.message||'Erro ao analisar ao vivo.'})}});


// Web 2.6 - Histórico profissional: atualização de resultado do bilhete
function isFinalStatus(short){ return ['FT','AET','PEN'].includes(short); }
function isInProgressStatus(short){ return ['1H','2H','ET','BT','P','LIVE','INT','HT'].includes(short); }
function initialGoalsFromGame(g){
  const hg=Number.isFinite(Number(g?.homeGoals))?Number(g.homeGoals):null;
  const ag=Number.isFinite(Number(g?.awayGoals))?Number(g.awayGoals):null;
  if(hg!==null && ag!==null) return {home:hg,away:ag,total:hg+ag};
  const m=String(g?.score||'').match(/(\d+)\s*x\s*(\d+)/i);
  if(m) return {home:Number(m[1]),away:Number(m[2]),total:Number(m[1])+Number(m[2])};
  return {home:0,away:0,total:0};
}
function evalMarket(market, gameAtBet, finalGame){
  const mk=String(market||'').toLowerCase();
  const home=finalGame.homeGoals??0, away=finalGame.awayGoals??0, total=home+away;
  const init=initialGoalsFromGame(gameAtBet);
  const homeName=String(finalGame.home||gameAtBet?.home||'').toLowerCase();
  const awayName=String(finalGame.away||gameAtBet?.away||'').toLowerCase();
  if(mk.includes('mais 0.5 gols restantes') || mk.includes('over 0.5 gols restantes')) return {status: total>init.total?'Ganhou':'Perdeu', detail:`Precisava sair mais 1 gol após ${init.total} gol(s); final teve ${total}.`};
  if(mk.includes('over 0.5 gols no jogo') || mk.includes('mais de 0.5 gols')) return {status: total>=1?'Ganhou':'Perdeu', detail:`Final teve ${total} gol(s).`};
  if(mk.includes('over 1.5') || mk.includes('mais de 1.5')) return {status: total>=2?'Ganhou':'Perdeu', detail:`Final teve ${total} gol(s).`};
  if(mk.includes('over 2.6') || mk.includes('mais de 2.6')) return {status: total>=3?'Ganhou':'Perdeu', detail:`Final teve ${total} gol(s).`};
  if(mk.includes('casa ou empate') || mk.includes('(1x)')) return {status: home>=away?'Ganhou':'Perdeu', detail:`Casa ${home} x ${away} fora.`};
  if(mk.includes('fora ou empate') || mk.includes('(x2)')) return {status: away>=home?'Ganhou':'Perdeu', detail:`Casa ${home} x ${away} fora.`};
  if(mk.includes('casa ou fora') || mk.includes('(12)')) return {status: home!==away?'Ganhou':'Perdeu', detail:`Casa ${home} x ${away} fora.`};
  if(mk.includes('para não perder')){
    if(homeName && mk.includes(homeName)) return {status: home>=away?'Ganhou':'Perdeu', detail:`${finalGame.home} terminou ${home} x ${away}.`};
    if(awayName && mk.includes(awayName)) return {status: away>=home?'Ganhou':'Perdeu', detail:`${finalGame.away} terminou ${away} x ${home}.`};
  }
  if(mk.includes('escanteio') || mk.includes('cartões') || mk.includes('cartao') || mk.includes('handicap') || mk.includes('próximo gol') || mk.includes('proximo gol')){
    return {status:'Conferir manual', detail:'Mercado depende de linha/odd exata da Bet365 ou evento específico; confira no bilhete apostado.'};
  }
  return {status:'Conferir manual', detail:'Mercado não reconhecido automaticamente; conferir manualmente.'};
}
app.post('/api/ticket-result',async(req,res)=>{try{
  const k=key(req); if(!k)return res.status(400).json({ok:false,message:'Chave API-Football não encontrada.'});
  const {ticket}=req.body||{}; if(!ticket)return res.status(400).json({ok:false,message:'Bilhete não informado.'});
  const games=ticket.games&&ticket.games.length?ticket.games:[ticket.game].filter(Boolean);
  const unique=[...new Map(games.map(g=>[g.fixtureId||g.id,g])).values()];
  const finalMap={}; let anyRunning=false, allFinal=true;
  for(const g of unique){
    if(!g?.fixtureId && !g?.id) continue;
    const jf=await apiFootball(`/fixtures?id=${g.fixtureId||g.id}`,k);
    const fresh=(jf.response||[])[0];
    if(!fresh){ allFinal=false; continue; }
    const mapped=mapGame(fresh); finalMap[String(g.fixtureId||g.id)]={original:g, final:mapped, statusShort:fresh.fixture.status?.short||'', statusLong:fresh.fixture.status?.long||''};
    if(isInProgressStatus(fresh.fixture.status?.short)) anyRunning=true;
    if(!isFinalStatus(fresh.fixture.status?.short)) allFinal=false;
  }
  if(anyRunning || !allFinal){
    return res.json({ok:true,status:'Em andamento',summary:'Um ou mais jogos ainda não terminaram.',details:Object.values(finalMap).map(x=>({game:`${x.final.home} x ${x.final.away}`,score:x.final.score,status:x.statusLong||x.statusShort}))});
  }
  const itemResults=(ticket.items||[]).map(item=>{
    const g=item.game || games.find(gg=>String(item.market||'').includes(`${gg.home} x ${gg.away}`)) || games[0];
    const fm=finalMap[String(g?.fixtureId||g?.id)]?.final;
    if(!fm) return {market:item.market,status:'Conferir manual',detail:'Jogo não localizado na API.'};
    const ev=evalMarket(item.market,g,fm);
    return {market:item.market,game:`${fm.home} ${fm.score} ${fm.away}`,status:ev.status,detail:ev.detail};
  });
  const hasLost=itemResults.some(x=>x.status==='Perdeu');
  const hasManual=itemResults.some(x=>x.status==='Conferir manual');
  const status=hasLost?'Perdeu':hasManual?'Conferir manual':'Ganhou';
  const summary=status==='Ganhou'?'Todas as entradas reconhecidas automaticamente bateram.':status==='Perdeu'?'Pelo menos uma entrada reconhecida automaticamente perdeu.':'Há mercados que precisam ser conferidos manualmente na Bet365.';
  res.json({ok:true,status,summary,details:itemResults});
}catch(e){res.status(500).json({ok:false,message:e.message||'Erro ao atualizar resultado do bilhete.'})}});



// Web 2.6 - Odds Bet365 reais quando o fornecedor/API devolver o mercado
function normalizeMarketText(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function inferBet365Query(market){
  const m=normalizeMarketText(market);
  if(m.includes('over')||m.includes('mais 0 5')||m.includes('mais 1 5')||m.includes('gols')) return ['Goals Over/Under','Over','Total Goals'];
  if(m.includes('dupla chance')||m.includes('1x')||m.includes('x2')||m.includes('12')||m.includes('nao perder')) return ['Double Chance','Home/Draw','Draw/Away','Home/Away'];
  if(m.includes('escanteio')||m.includes('corner')) return ['Corners','Corner'];
  if(m.includes('cart')) return ['Cards','Card'];
  if(m.includes('proximo gol')) return ['Next Goal','To Score Next'];
  if(m.includes('handicap')) return ['Handicap'];
  return [market];
}
function isBet365Name(name){ const n=normalizeMarketText(name); return n==='bet365'||n.includes('bet365'); }
function pickOddFromApiFootball(response, desiredMarket){
  const needles=inferBet365Query(desiredMarket).map(normalizeMarketText);
  const all=[];
  for(const item of response||[]){
    for(const bm of item.bookmakers||[]){
      if(!isBet365Name(bm.name)) continue;
      for(const bet of bm.bets||[]){
        for(const val of bet.values||[]){
          all.push({bookmaker:bm.name, marketName:bet.name, selection:val.value, odd:Number(val.odd), rawOdd:val.odd});
        }
      }
    }
  }
  if(!all.length) return null;
  const scored=all.map(o=>{
    const text=normalizeMarketText(`${o.marketName} ${o.selection}`);
    let score=0;
    for(const n of needles){ if(n && text.includes(n)) score+=4; }
    const dm=normalizeMarketText(desiredMarket);
    if(dm.includes('1x') && (text.includes('home draw')||text.includes('1x'))) score+=8;
    if(dm.includes('x2') && (text.includes('draw away')||text.includes('x2'))) score+=8;
    if(dm.includes('12') && (text.includes('home away')||text.includes('12'))) score+=8;
    if(dm.includes('over')||dm.includes('mais')){ if(text.includes('over')||text.includes('mais')) score+=5; }
    return {...o,score};
  }).filter(o=>Number.isFinite(o.odd));
  scored.sort((a,b)=>b.score-a.score);
  return scored[0]||null;
}
app.post('/api/odds/bet365',async(req,res)=>{try{
  const footballKey=req.body?.footballKey||process.env.API_FOOTBALL_KEY||'';
  const fixtureId=req.body?.fixtureId||req.body?.game?.fixtureId||req.body?.game?.id;
  const market=req.body?.market||'';
  if(!footballKey) return res.status(400).json({ok:false,message:'Chave API-Football não encontrada.'});
  if(!fixtureId) return res.status(400).json({ok:false,message:'Jogo sem fixtureId para consultar odds.'});
  let response=[]; let source='API-Football'; let errors=[];
  for(const ep of [`/odds?fixture=${fixtureId}&bookmaker=8`, `/odds?fixture=${fixtureId}`]){
    try{ const j=await apiFootball(ep,footballKey); if((j.response||[]).length){response=j.response; break;} }catch(e){errors.push(e.message);}
  }
  const odd=pickOddFromApiFootball(response,market);
  if(odd){
    return res.json({ok:true,available:true,source,bookmaker:odd.bookmaker,marketName:odd.marketName,selection:odd.selection,odd:odd.odd,message:'Odd Bet365 localizada pelo fornecedor.'});
  }
  return res.json({ok:true,available:false,source,message:'A Bet365 não retornou esse mercado/odd para este jogo no fornecedor atual. Confira manualmente na Bet365 ou atualize os dados.'});
}catch(e){res.status(500).json({ok:false,message:e.message||'Erro ao consultar odds Bet365.'})}});



// Web 3.1 - endpoints de usuários no banco local JSON
app.post('/api/users/list',(req,res)=>{ try{ const db=readDb(); db.users=db.users&&db.users.length?db.users:[{id:'admin',name:'Administrador',email:'admin',role:'admin',status:'active'}]; res.json({ok:true,users:db.users.map(u=>({...u,password:undefined}))}); }catch(e){res.status(500).json({ok:false,message:e.message})} });
app.post('/api/users/create',(req,res)=>{ try{ const db=readDb(); db.users=db.users||[]; const u=req.body.user||{}; if(!u.email||!u.password) return res.status(400).json({ok:false,message:'Usuário incompleto.'}); if(db.users.some(x=>x.email===u.email)) return res.status(400).json({ok:false,message:'Usuário já existe.'}); db.users.push({...u,id:u.id||('u'+Date.now()),createdAt:new Date().toISOString()}); writeDb(db); res.json({ok:true}); }catch(e){res.status(500).json({ok:false,message:e.message})} });

// Web 3.0 - Base simples para banco local JSON (preparação para banco online)
const fs=require('fs');
const DB_PATH=path.join(__dirname,'../data/db.json');
function ensureDb(){
  const dir=path.dirname(DB_PATH);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
  if(!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH,JSON.stringify({users:[],tickets:[],bankroll:{},createdAt:new Date().toISOString()},null,2));
}
function readDb(){ ensureDb(); return JSON.parse(fs.readFileSync(DB_PATH,'utf8')); }
function writeDb(db){ ensureDb(); fs.writeFileSync(DB_PATH,JSON.stringify(db,null,2)); }
app.post('/api/db/backup',(req,res)=>{ try{ const db=readDb(); res.json({ok:true,db}); }catch(e){res.status(500).json({ok:false,message:e.message})} });
app.post('/api/db/save-ticket',(req,res)=>{ try{ const db=readDb(); db.tickets.unshift({...req.body.ticket,savedAt:new Date().toISOString()}); writeDb(db); res.json({ok:true}); }catch(e){res.status(500).json({ok:false,message:e.message})} });
app.post('/api/db/save-bankroll',(req,res)=>{ try{ const db=readDb(); db.bankroll={...req.body.bankroll,updatedAt:new Date().toISOString()}; writeDb(db); res.json({ok:true}); }catch(e){res.status(500).json({ok:false,message:e.message})} });


// Web 3.2 - Supabase/PostgreSQL online (modo híbrido)
let supabase=null;
try{
  const { createClient } = require('@supabase/supabase-js');
  if(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY){
    supabase=createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
}catch(e){
  console.warn('Supabase não carregado:', e.message);
}
function cloudEnabled(){ return !!supabase; }

app.get('/api/cloud/status',(req,res)=>{
  res.json({ok:true,enabled:cloudEnabled(),provider:cloudEnabled()?'Supabase':'local'});
});

app.post('/api/cloud/sync',async(req,res)=>{
  try{
    if(!cloudEnabled()) return res.status(400).json({ok:false,message:'Supabase não configurado.'});
    const {user,bankroll,history,users}=req.body||{};
    if(Array.isArray(users)){
      for(const u of users){
        await supabase.from('nb_users').upsert({
          id:String(u.id||u.email),
          name:u.name||'Usuário',
          email:u.email||u.id,
          password_hash:u.password||'',
          role:u.role||'user',
          status:u.status||'active'
        });
      }
    }
    if(bankroll){
      await supabase.from('nb_bankrolls').upsert({
        user_id:String(user||'admin'),
        data:bankroll,
        updated_at:new Date().toISOString()
      });
    }
    if(Array.isArray(history)){
      for(const t of history){
        await supabase.from('nb_tickets').upsert({
          id:String(t.id||('t'+Date.now()+Math.random())),
          user_id:String(user||'admin'),
          title:t.title||'Bilhete',
          mode:t.mode||'pre',
          profile:t.profile||'',
          status:t.status||'Em andamento',
          data:t,
          created_at:t.createdAt ? new Date().toISOString() : new Date().toISOString(),
          updated_at:new Date().toISOString()
        });
      }
    }
    res.json({ok:true});
  }catch(e){res.status(500).json({ok:false,message:e.message})}
});

app.post('/api/cloud/tickets',async(req,res)=>{
  try{
    if(!cloudEnabled()) return res.status(400).json({ok:false,message:'Supabase não configurado.'});
    const {user,tickets}=req.body||{};
    for(const t of (tickets||[])){
      await supabase.from('nb_tickets').upsert({
        id:String(t.id||('t'+Date.now()+Math.random())),
        user_id:String(user||'admin'),
        title:t.title||'Bilhete',
        mode:t.mode||'pre',
        profile:t.profile||'',
        status:t.status||'Em andamento',
        data:t,
        updated_at:new Date().toISOString()
      });
    }
    res.json({ok:true});
  }catch(e){res.status(500).json({ok:false,message:e.message})}
});


// Web 3.3 - status de produção
app.get('/api/production/status',(req,res)=>{
  res.json({
    ok:true,
    production:process.env.NODE_ENV==='production' || !!process.env.RENDER || !!process.env.RAILWAY_ENVIRONMENT,
    domain:process.env.APP_DOMAIN || 'nazarenobets.com',
    node:process.version,
    cloud:!!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  });
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'../public/index.html')));
app.listen(process.env.PORT||3026,()=>console.log('Nazareno Bets IA 3.4 rodando em http://localhost:3026'));
