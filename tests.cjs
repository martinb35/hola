// No third-party test dependencies. Exercise the exact script embedded in index.html.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(__dirname + '/index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function boot(stored, blocked=false) {
  const nodes = new Map();
  function node(){return {value:'',textContent:'',hidden:false,disabled:false,style:{},children:[],attributes:{},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(k,v){this.attributes[k]=v;},focus(){this.focused=true;},setCustomValidity(v){this.validation=v;},reportValidity(){}};}
  const context=vm.createContext({document:{getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},querySelector(){if(!nodes.has('bar'))nodes.set('bar',node());return nodes.get('bar');},createElement:node},window:{},localStorage:{getItem(){if(blocked)throw Error('blocked');return stored||null;},setItem(k,v){if(blocked)throw Error('blocked');stored=v;}}});
  vm.runInContext(source,context);
  return {run:code=>vm.runInContext(code,context),nodes,saved:()=>stored};
}
let checks=0;
function test(label, fn){fn();checks++;console.log('PASS '+label);}
const app=boot();
test('exactly 24 vocabulary pairs',()=>assert.equal(app.run('VOCAB.length'),24));
test('all canonical answers pass in both directions',()=>assert.equal(app.run("VOCAB.every((card,id)=>grade(id,card[1],'es')&&grade(id,card[0],'en'))"),true));
test('case, accents, repeated whitespace and punctuation',()=>assert.equal(app.run("grade(13, '  ¿¡ CUAL   ES TU NUMERO DE TELEFONO !?.,  ', 'es')"),true));
test('envias without accent and decomposed accents',()=>{assert.equal(app.run("grade(22,'me envias un texto','es')"),true);assert.equal(app.run("grade(0,'¿Que\\u0301 tal?','es')"),true);});
test('both gender forms',()=>{for(const form of ['Encantado','encantada.','Encantado / Encantada.'])assert.equal(app.run(`grade(3,${JSON.stringify(form)},'es')`),true);});
test('ellipses optional in both languages',()=>assert.equal(app.run("[12,14,17,19].every(id=>['es','en'].every(dir=>{const a=VOCAB[id][dir==='es'?1:0].replace('…','');return grade(id,a,dir)&&grade(id,a+'...',dir)&&grade(id,a+'…',dir)}))"),true));
test('ordinary spelling mistakes and different duplicate answers rejected',()=>{for(const [id,text] of [[0,'que tall'],[22,'me envies un texto'],[4,'hasta pronto'],[7,'nos vemos'],[21,'me envias un texto'],[3,'encantadoo']])assert.equal(app.run(`grade(${id},${JSON.stringify(text)},'es')`),false);});
test('English straight and curly apostrophes equivalent',()=>assert.equal(app.run(`grade(0,"What's up?",'en')`),true));
test('shuffling preserves every card and does not mutate input',()=>assert.equal(app.run('(()=>{const ids=VOCAB.map((_,i)=>i);return Array.from({length:100},()=>shuffle(ids)).every(x=>x.length===24&&new Set(x).size===24)&&ids.every((id,i)=>id===i)})()'),true));
test('quiz hides feedback before submission',()=>assert.equal(app.nodes.get('feedback').hidden,true));
test('blank and punctuation-only responses do not count',()=>{app.run("$('answer').value=' ¡?! ';submit()");assert.equal(app.run('counts().answered'),0);});
test('wrong submission shows exact entered text and accented answer',()=>{app.run("state=makeRound('es',[22]);$('answer').value='me envies un texto';submit()");assert.equal(app.run('counts().incorrect'),1);assert.equal(app.nodes.get('feedback').hidden,false);assert.equal(app.nodes.get('feedback').children[1].textContent,'You entered: “me envies un texto”');assert.equal(app.nodes.get('feedback').children[3].textContent,'Me envías un texto.');});
test('try again keeps original score',()=>{app.run("$('retry').onclick();$('answer').value='Me envías un texto';submit()");assert.equal(app.run('counts().incorrect'),1);assert.equal(app.run('counts().correct'),0);assert.equal(app.run('state.feedback.correct'),true);});
test('Enter advances and completes; score recorded only once',()=>{app.run("$('answer-form').onsubmit({preventDefault(){}})");assert.equal(app.run('state.complete'),true);assert.equal(app.run('history.length'),1);app.run('submit()');assert.equal(app.run('history.length'),1);});
test('retry missed creates a separate round of the missed IDs',()=>{app.run("$('missed').onclick()");assert.equal(app.run('state.order.join()'),'22');assert.equal(app.run('counts().answered'),0);assert.equal(app.run('state.kind'),'missed');});
test('I do not know counts incorrect and reveals answer',()=>{app.run("$('unknown').onclick()");assert.equal(app.run('counts().incorrect'),1);assert.equal(app.run('state.feedback.skipped'),true);});
test('reload restores pending feedback and scores',()=>{const restored=boot(app.saved());assert.equal(restored.run('state.feedback.skipped'),true);assert.equal(restored.run('history.length'),1);assert.equal(restored.run('counts().incorrect'),1);});
test('draft is saved and resumed before grading',()=>{app.run("$('retry').onclick();$('answer').value='partial answer';$('answer').oninput()");const restored=boot(app.saved());assert.equal(restored.nodes.get('answer').value,'partial answer');assert.equal(restored.nodes.get('feedback').hidden,true);});
test('review and return preserve the active card',()=>{const before=app.run('JSON.stringify(state)');app.run('showReview()');assert.equal(app.nodes.get('review').hidden,false);app.run("$('back').onclick()");assert.equal(app.run('JSON.stringify(state)'),before);});
test('direction change starts a new reversed round',()=>{app.run("$('direction').value='en';$('direction').onchange()");assert.equal(app.run('state.direction'),'en');assert.equal(app.run('state.order.length'),24);assert.equal(app.run('counts().answered'),0);assert.equal(app.nodes.get('hint').hidden,true);assert.equal(app.nodes.get('prompt').textContent,app.run('VOCAB[state.order[0]][1]'));});
test('correct reversed answer exposes the Spanish spelling',()=>{app.run("state=makeRound('en',[0]);$('answer').value=\"What's up?\";submit()");assert.equal(app.run('counts().correct'),1);assert.ok(app.nodes.get('feedback').children.some(n=>n.textContent==='¿Qué tal?'));});
test('complete round scores, remaining, and recent score cap',()=>{app.run("state=makeRound();for(let i=0;i<24;i++){ $('answer').value=VOCAB[state.order[state.index]][1];submit();submit(); }");assert.equal(app.run('counts().correct'),24);assert.equal(app.nodes.get('remaining').textContent,0);assert.equal(app.nodes.get('percent').textContent,'100%');assert.equal(app.nodes.get('missed').disabled,true);app.run("for(let i=0;i<12;i++){start([0]);$('answer').value='qué tal';submit();submit();}");assert.equal(app.run('history.length'),10);});
test('corrupt and unavailable storage remain usable',()=>{assert.equal(boot('{bad').run('state.order.length'),24);assert.equal(boot(JSON.stringify({state:{order:[999]}})).run('state.order.length'),24);const blocked=boot(null,true);assert.equal(blocked.nodes.get('storage-note').hidden,false);assert.equal(blocked.run('state.order.length'),24);});
test('streak tracks consecutive first attempts and celebrates each multiple of five',()=>{
 const a=boot();a.run('state=makeRound()');
 for(let i=1;i<=24;i++){
  a.run("$('answer').value=VOCAB[state.order[state.index]][1];submit()");
  assert.equal(a.run('streak()'),i);
  assert.equal(a.nodes.get('streak-count').textContent,i);
  assert.equal(a.nodes.get('celebration').children.length,i%5===0?1:0);
  if(i%5===0)assert.equal(a.nodes.get('celebration').children[0].children[3].textContent,`${i} in a row! ¡BRAVO!`);
  a.run('submit()');
 }
 assert.equal(a.run('streak()'),24);
 a.run('start()');assert.equal(a.run('streak()'),0);
});
test('wrong and skipped answers reset momentum; retries never add to it',()=>{
 const a=boot();
 a.run("for(let i=0;i<5;i++){$('answer').value=VOCAB[state.order[state.index]][1];submit();if(i<4)submit();}");
 assert.equal(a.run('streak()'),5);
 a.run("$('retry').onclick();$('answer').value=VOCAB[state.order[state.index]][1];submit()");
 assert.equal(a.run('streak()'),5);assert.equal(a.nodes.get('celebration').children.length,0);
 a.run("submit();$('answer').value='wrong';submit()");assert.equal(a.run('streak()'),0);
 a.run("$('retry').onclick();$('answer').value=VOCAB[state.order[state.index]][1];submit()");assert.equal(a.run('streak()'),0);
 a.run("submit();$('answer').value=VOCAB[state.order[state.index]][1];submit();submit();$('unknown').onclick()");assert.equal(a.run('streak()'),0);
});
test('saved streak resumes without replaying fireworks',()=>{
 const a=boot();a.run("for(let i=0;i<5;i++){$('answer').value=VOCAB[state.order[state.index]][1];submit();if(i<4)submit();}");
 const restored=boot(a.saved());assert.equal(restored.run('streak()'),5);assert.equal(restored.nodes.get('celebration').children.length,0);
 assert.equal(restored.nodes.get('mercury').attributes.height,59.6);
 restored.run("$('direction').value='en';$('direction').onchange()");assert.equal(restored.run('streak()'),0);
});
test('Personal Information includes all 17 pairs and supports both quiz directions',()=>{
 const a=boot();a.run("selectSet('personal')");
 assert.equal(a.run('state.order.length'),17);assert.equal(a.nodes.get('vocabulary').children.length,17);
 assert.equal(a.nodes.get('set-heading').textContent,'Personal Information · 17 phrases');
 const spanish=['¿Dónde naciste?','Nací en Madrid','¿De dónde eres?','Soy de México','los Estados Unidos','España','Soy estadounidense','Soy mexicana','¿Dónde vives?','Vivo en San Diego','¿Cuál es tu dirección?','Mi dirección es 123 Calle Sol','¿Cuántos años tienes?','Tengo 13 años','¿Cuándo es tu cumpleaños?','Mi cumpleaños es el 4 de mayo','el primero de junio'];
 const english=['Where were you born?','I was born in Madrid','Where are you from?','I am from Mexico','the United States','Spain','I am American','I am Mexican','Where do you live?','I live in San Diego','What is your address?','My address is 123 Sun Street','How old are you?','I am 13 years old','When is your birthday?','My birthday is the 4th of May','the first of June'];
 for(let id=0;id<17;id++)for(const [dir,answer] of [['es',spanish[id]],['en',english[id]]]){
  assert.equal(a.run(`grade(${id},${JSON.stringify(answer)},'${dir}','personal')`),true,answer);
  assert.equal(a.run(`grade(${id},${JSON.stringify(answer.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase())},'${dir}','personal')`),true,answer+' accentless');
 }
 for(const word of ['mexicano','mexicana'])assert.equal(a.run(`grade(7,'Soy ${word}','es','personal')`),true);
 assert.equal(a.run("grade(4,'Soy de los Estados Unidos','es','personal')"),true);
 assert.equal(a.run("grade(5,'I am from Spain','en','personal')"),true);
});
test('templates require filled blanks and correctly spelled fixed words',()=>{
 const a=boot();
 for(const [id,answer,dir] of [[1,'Nacii en Madrid','es'],[3,'Soy del Madrid','es'],[13,'Tengo ___ años','es'],[13,'Tengo años','es'],[13,'Tengo 13 anos extra','es'],[15,'Mi cumpleaños es el de mayo','es'],[15,'Mi cumpleaños es el 4 de','es'],[15,'Mi cumpleanos el 4 de mayo','es'],[15,'My birthday is the of May','en'],[7,'Soy mexican','es'],[0,'Donde nacistes','es']])assert.equal(a.run(`grade(${id},${JSON.stringify(answer)},'${dir}','personal')`),false,answer);
});
test('all ellipsis phrases accept bare phrases, literal ellipses, or supplied endings',()=>{
 const a=boot();
 assert.equal(a.run("Object.entries(SETS).every(([setId,set])=>set.cards.every((card,id)=>['es','en'].every(dir=>{const text=card[dir==='es'?1:0];if(setId==='opinions' || card[3]?.quiz || !/(?:\\.{3}|…)$/.test(text))return true;const bare=text.replace(/(?:\\.{3}|…)$/,'');return [bare,text,bare+' Madrid'].every(answer=>grade(id,answer,dir,setId));})))"),true);
 a.run("state=makeRound('es',[9],'full','personal');$('answer').value='Vivo en';submit()");
 assert.equal(a.run('state.feedback.correct'),true);
 assert.equal(a.nodes.get('feedback').children[3].textContent,'Vivo en...');
});
test('switching sets and reloading preserves independent rounds, drafts, and feedback',()=>{
 const a=boot();a.run("$('unknown').onclick()");const old=a.run('JSON.stringify(state)');
 a.run("$('study-set').value='personal';$('study-set').onchange();$('answer').value='Nací en Madrid';$('answer').oninput()");
 const personal=a.run('JSON.stringify(state)');a.run("selectSet('everyday')");assert.equal(a.run('JSON.stringify(state)'),old);
 const b=boot(a.saved());b.run("selectSet('personal')");assert.equal(b.run('JSON.stringify(state)'),personal);assert.equal(b.nodes.get('answer').value,'Nací en Madrid');
 b.run("$('direction').value='en';$('direction').onchange()");assert.equal(b.run('state.setId'),'personal');assert.equal(b.run('state.order.length'),17);
 b.run("selectSet('everyday')");assert.equal(b.run('JSON.stringify(state)'),old);
});
test('legacy saves migrate without losing order, first attempts, draft, feedback or history',()=>{
 const a=boot();a.run("state=makeRound('es',[0,1]);state.order=[0,1];$('answer').value='que tal';submit();submit();$('answer').value='draft';$('answer').oninput()");
 const legacy=JSON.parse(a.saved());delete legacy.state.setId;delete legacy.rounds;
 legacy.history=[{date:'2026-09-18T00:00:00.000Z',correct:20,total:24,direction:'es',kind:'full'}];
 const b=boot(JSON.stringify(legacy));assert.equal(b.run('state.setId'),'everyday');assert.equal(b.run('state.index'),1);assert.equal(b.run('state.draft'),'draft');assert.equal(b.run('streak()'),1);assert.equal(b.run('history[0].correct'),20);assert.equal(b.run('history[0].setId'),'everyday');
 b.run("selectSet('personal');selectSet('everyday')");assert.equal(b.nodes.get('answer').value,'draft');
 const completed={...legacy.state,index:2,complete:true,draft:'',results:{0:true,1:false},feedback:null};
 const c=boot(JSON.stringify({state:completed,history:legacy.history}));assert.equal(c.run('state.complete'),true);assert.equal(c.nodes.get('summary').hidden,false);c.run("$('missed').onclick()");assert.equal(c.run('state.order.join()'),'1');
});
test('personal feedback, missed rounds, summaries and scores use the selected set',()=>{
 const a=boot();a.run("state=makeRound('es',[0], 'full','personal');$('answer').value='donde naciste';submit()");
 assert.equal(a.nodes.get('feedback').children[3].textContent,'¿Dónde naciste?');a.run('submit()');
 assert.equal(a.run('history[0].setId'),'personal');assert.equal(a.nodes.get('final-percent').textContent,'100%');
 a.run("start([13]);$('unknown').onclick();submit();$('missed').onclick()");assert.equal(a.run('state.setId'),'personal');assert.equal(a.run('state.order.join()'),'13');
 a.run("$('answer').value='Tengo 13 anos';submit()");assert.equal(a.run('counts().correct'),1);assert.equal(a.nodes.get('feedback').children[3].textContent,'Tengo ___ años.');
 a.run("$('new-round').onclick()");assert.equal(a.run('state.order.length'),17);
 a.run("state=makeRound('en',[15],'full','personal');$('answer').value='My birthday is the 4th of May';submit()");
 assert.ok(a.nodes.get('feedback').children.some(n=>n.textContent==='Mi cumpleaños es el ___ de ___.'));
});
test('reload repairs an outdated rejection of vivo en and its first-attempt score',()=>{
 const a=boot();a.run("state=makeRound('es',[9],'full','personal');$('answer').value=' vivo en';submit()");
 const saved=JSON.parse(a.saved());saved.state.feedback.correct=false;saved.state.results[9]=false;
 const b=boot(JSON.stringify(saved));assert.equal(b.run('state.feedback.correct'),true);assert.equal(b.run('counts().correct'),1);assert.equal(b.run('counts().incorrect'),0);assert.equal(b.run('streak()'),1);
 assert.equal(b.nodes.get('feedback').children[3].textContent,'Vivo en...');
 assert.equal(b.nodes.get('celebration').children.length,0);
 const c=boot(b.saved());assert.equal(c.run('counts().correct'),1);
});
test('saved feedback repair never awards credit to skipped cards or practice retries',()=>{
 const a=boot();a.run("state=makeRound('es',[9],'full','personal');$('answer').value='vivo en';submit()");
 const saved=JSON.parse(a.saved());saved.state.feedback.correct=false;saved.state.results[9]=false;saved.state.feedback.practice=true;
 const retry=boot(JSON.stringify(saved));assert.equal(retry.run('state.feedback.correct'),true);assert.equal(retry.run('counts().incorrect'),1);
 saved.state.feedback.practice=false;saved.state.feedback.skipped=true;
 const skipped=boot(JSON.stringify(saved));assert.equal(skipped.run('state.feedback.correct'),false);assert.equal(skipped.run('counts().incorrect'),1);
 saved.state.feedback.skipped=false;saved.state.feedback.answer='vivo enn';
 const typo=boot(JSON.stringify(saved));assert.equal(typo.run('state.feedback.correct'),false);
});

test('Feelings contains 17 pairs accepted in both directions',()=>{
 const a=boot();a.run("selectSet('feelings')");assert.equal(a.run('state.order.length'),17);assert.equal(a.nodes.get('vocabulary').children.length,17);
 assert.equal(a.run("FEELINGS.every((card,id)=>grade(id,card[0],'en','feelings')&&grade(id,card[1],'es','feelings'))"),true);
 assert.equal(a.run("grade(0,'Como estas','es','feelings')&&grade(1,'Como esta usted','es','feelings')&&grade(14,'yo tambien','es','feelings')"),true);
 assert.equal(a.run("grade(0,'Como esta usted','es','feelings')"),false);assert.equal(a.run("grade(1,'Como estas','es','feelings')"),false);
});
test('Feelings accepts both gender forms and English alternatives without accepting typos',()=>{
 const a=boot();assert.equal(a.run("FEELINGS.slice(6,14).every((card,i)=>card[1].replace(/^…/,'').split('/').every(word=>grade(i+6,word,'es','feelings')&&grade(i+6,'Estoy '+word,'es','feelings')))"),true);
 assert.equal(a.run("Object.entries(FEELINGS_ENGLISH).every(([id,answers])=>answers.every(answer=>grade(Number(id),answer,'en','feelings')))"),true);
 assert.equal(a.run("grade(7,'cansadoo','es','feelings')"),false);
});
test('Feelings progress survives reload and switching lessons',()=>{
 const a=boot();a.run("$('answer').value='old draft';$('answer').oninput();selectSet('personal');$('answer').value='personal draft';$('answer').oninput();selectSet('feelings');state=makeRound('es',[7],'full','feelings');$('answer').value='cansada';submit()");
 assert.equal(a.nodes.get('feedback').children[3].textContent,'…cansado/cansada');
 const b=boot(a.saved());assert.equal(b.run('state.setId'),'feelings');assert.equal(b.run('counts().correct'),1);
 b.run("selectSet('everyday')");assert.equal(b.nodes.get('answer').value,'old draft');b.run("selectSet('personal')");assert.equal(b.nodes.get('answer').value,'personal draft');
 b.run("selectSet('feelings');submit()");assert.equal(b.run('history[0].setId'),'feelings');assert.equal(b.nodes.get('final-percent').textContent,'100%');
});

test('Opinions contains the 18 entries plus six practice variants and examples',()=>{
 const a=boot();a.run("selectSet('opinionsAdvanced')");assert.equal(a.run('OPINIONS.length'),24);assert.equal(a.run('state.order.length'),24);assert.equal(a.nodes.get('vocabulary').children.length,24);
 assert.equal(a.run("OPINIONS.every((_,id)=>['es','en'].every(dir=>grade(id,practiceCard('opinionsAdvanced',id)[dir==='es'?1:0],dir,'opinionsAdvanced')))"),true);
 assert.equal(a.run("OPINIONS.every((_,id)=>!/[…_]|\\(n\\)/.test(practiceCard('opinionsAdvanced',id).join(' ')))"),true);
});
test('Opinions grades agreement in complete sentences and preserves articles',()=>{
 const a=boot();
 for(const [id,answer] of [[4,'Te gusta las clases de español'],[5,'Me gusta las clases de español'],[12,'Me encanta las clases de español'],[18,'Te gustan el baloncesto'],[19,'Me gustan el baloncesto'],[21,'Me encantan la clase de español'],[1,'baloncesto'],[2,'tarea']])assert.equal(a.run('grade('+id+','+JSON.stringify(answer)+',"es","opinionsAdvanced")'),false,answer);
 assert.equal(a.run("grade(4,'Te gustan las clases de espanol','es','opinionsAdvanced')"),true);
 assert.equal(a.run("grade(18,'Te gusta el baloncesto','es','opinionsAdvanced')"),true);
});
test('Opinions accepts equivalent English translations and supplies accent guidance',()=>{
 const a=boot();
 for(const [id,answer] of [[3,'You like Spanish class, right?'],[11,'I like neither basketball nor homework'],[15,'I do not like homework either'],[17,'I really like Spanish classes'],[23,'I do not like basketball or homework']])assert.equal(a.run('grade('+id+','+JSON.stringify(answer)+',"en","opinionsAdvanced")'),true,answer);
 a.run("state=makeRound('es',[17],'full','opinionsAdvanced');$('answer').value='Me gustan muchisimo las clases de espanol';submit()");assert.equal(a.run('counts().correct'),1);
 assert.ok(a.nodes.get('feedback').children.some(n=>n.textContent.includes('Spelling reminder: muchísimo, español')));
});
test('Opinions rounds restore without changing existing lessons and support missed-card practice',()=>{
 const a=boot();a.run("selectSet('feelings');$('answer').value='my draft';$('answer').oninput();selectSet('opinionsAdvanced');state=makeRound('es',[1],'full','opinionsAdvanced');$('unknown').onclick();submit();$('missed').onclick()");assert.equal(a.run('state.order.join()'),'1');assert.equal(a.run('state.setId'),'opinionsAdvanced');
 const b=boot(a.saved());assert.equal(b.run('state.kind'),'missed');b.run("$('answer').value='el baloncesto';submit();submit()");assert.equal(b.run('history[0].setId'),'opinionsAdvanced');assert.equal(b.nodes.get('final-percent').textContent,'100%');
 b.run("selectSet('feelings')");assert.equal(b.nodes.get('answer').value,'my draft');b.run("selectSet('opinionsAdvanced');$('direction').value='en';$('direction').onchange()");assert.equal(b.run('state.order.length'),24);assert.equal(b.run('state.direction'),'en');
});

test('natural English alternatives preserve the meaning of the opinions prompt',()=>{
 const a=boot();assert.equal(a.run("grade(10,'I like both of them','en','opinionsAdvanced')"),true);
 assert.equal(a.run("grade(3,'You like Spanish class, do you not?','en','opinionsAdvanced')"),true);
 assert.equal(a.run("grade(11,'I do not like basketball and I do not like homework','en','opinionsAdvanced')"),true);
 assert.equal(a.run("grade(10,'I like one of them','en','opinionsAdvanced')"),false);
});
test('saved progress rejects future scores and feedback without an attempt',()=>{
 const a=boot();assert.equal(a.run("(()=>{const s=makeRound();s.results[s.order[2]]=true;return validRound(s)})()"),false);
 assert.equal(a.run("(()=>{const s=makeRound();s.feedback={answer:'test',correct:true};return validRound(s)})()"),false);
 assert.equal(a.run("(()=>{const s=makeRound();s.setId='constructor';return validRound(s)})()"),false);
 a.run("$('unknown').onclick();$('retry').onclick()");assert.equal(a.run('validRound(state)'),true);
 const b=boot(a.saved());assert.equal(b.run('counts().incorrect'),1);
});

test('Basic defaults to the 18 worksheet phrases and accepts me gustan without an ending',()=>{
 const a=boot();a.run("selectSet('opinions');state=makeRound('es',[5],'full','opinions');render()");assert.equal(a.nodes.get('prompt').textContent,'I like…');assert.equal(a.nodes.get('advanced').checked,false);
 a.run("$('answer').value='me gustan';submit()");assert.equal(a.run('counts().correct'),1);assert.equal(a.nodes.get('feedback').children[3].textContent,'Me gustan…');
 assert.equal(a.run("grade(5,'me gusta','es','opinions')"),false);
 for(const answer of ['me encanta','me encantan'])assert.equal(a.run('grade(12,'+JSON.stringify(answer)+',"es","opinions")'),true);
 for(const answer of ['Me gusta tambien','Me gustan tambien'])assert.equal(a.run('grade(14,'+JSON.stringify(answer)+',"es","opinions")'),true);
 a.run('start()');assert.equal(a.run('state.order.length'),18);assert.equal(a.nodes.get('vocabulary').children.length,18);
});
test('Advanced toggle preserves separate rounds, typed drafts, and reload preference',()=>{
 const a=boot();a.run("selectSet('opinions');$('answer').value='basic draft';$('answer').oninput();$('advanced').checked=true;$('advanced').onchange()");assert.equal(a.run('state.order.length'),24);assert.equal(a.run('state.setId'),'opinionsAdvanced');
 a.run("$('answer').value='advanced draft';$('answer').oninput()");const b=boot(a.saved());assert.equal(b.nodes.get('advanced').checked,true);
 b.run("$('advanced').checked=false;$('advanced').onchange()");assert.equal(b.nodes.get('answer').value,'basic draft');b.run("$('advanced').checked=true;$('advanced').onchange()");assert.equal(b.nodes.get('answer').value,'advanced draft');
});
test('existing complete-sentence progress migrates to Advanced while Basic becomes default',()=>{
 const a=boot();a.run("selectSet('opinionsAdvanced');$('unknown').onclick()");const saved=JSON.parse(a.saved());delete saved.basicAdvanced;saved.state.setId='opinions';saved.rounds.opinions={...saved.state};delete saved.rounds.opinionsAdvanced;
 const b=boot(JSON.stringify(saved));assert.equal(b.run('state.setId'),'opinions');assert.equal(b.run('state.order.length'),18);b.run("selectSet('opinionsAdvanced')");assert.equal(b.run('counts().incorrect'),1);assert.equal(b.run('state.feedback.skipped'),true);
});
console.log(`\n${checks} checks passed.`);
