/* RL7 Mirror Oracle v1 — Tarot + Pixel Lenormand, 1/3/6 cards */
(function(){
'use strict';
const RWS=[{"id": 0, "name": "愚者", "nameEn": "The Fool", "image": "assets/rws/00愚者.jpg"}, {"id": 1, "name": "魔术师", "nameEn": "The Magician", "image": "assets/rws/01魔术师.jpg"}, {"id": 2, "name": "女祭司", "nameEn": "The High Priestess", "image": "assets/rws/None"}, {"id": 3, "name": "皇后", "nameEn": "The Empress", "image": "assets/rws/03皇后.jpg"}, {"id": 4, "name": "皇帝", "nameEn": "The Emperor", "image": "assets/rws/04皇帝.jpg"}, {"id": 5, "name": "教皇", "nameEn": "The Hierophant", "image": "assets/rws/05教皇.jpg"}, {"id": 6, "name": "恋人", "nameEn": "The Lovers", "image": "assets/rws/06恋人.jpg"}, {"id": 7, "name": "战车", "nameEn": "The Chariot", "image": "assets/rws/07战车.jpg"}, {"id": 8, "name": "力量", "nameEn": "Strength", "image": "assets/rws/08力量.jpg"}, {"id": 9, "name": "隐士", "nameEn": "The Hermit", "image": "assets/rws/09隐士.jpg"}, {"id": 10, "name": "命运之轮", "nameEn": "Wheel of Fortune", "image": "assets/rws/10命运之轮.jpg"}, {"id": 11, "name": "正义", "nameEn": "Justice", "image": "assets/rws/11正义.jpg"}, {"id": 12, "name": "倒吊人", "nameEn": "The Hanged Man", "image": "assets/rws/12倒吊人.jpg"}, {"id": 13, "name": "死神", "nameEn": "Death", "image": "assets/rws/13死神.jpg"}, {"id": 14, "name": "节制", "nameEn": "Temperance", "image": "assets/rws/14节制.jpg"}, {"id": 15, "name": "恶魔", "nameEn": "The Devil", "image": "assets/rws/15恶魔.jpg"}, {"id": 16, "name": "高塔", "nameEn": "The Tower", "image": "assets/rws/16高塔.jpg"}, {"id": 17, "name": "星星", "nameEn": "The Star", "image": "assets/rws/17星星.jpg"}, {"id": 18, "name": "月亮", "nameEn": "The Moon", "image": "assets/rws/18月亮.jpg"}, {"id": 19, "name": "太阳", "nameEn": "The Sun", "image": "assets/rws/19太阳.jpg"}, {"id": 20, "name": "审判", "nameEn": "Judgement", "image": "assets/rws/20审判.jpg"}, {"id": 21, "name": "世界", "nameEn": "The World", "image": "assets/rws/21世界.jpg"}, {"id": 22, "name": "权杖ACE", "nameEn": "Ace of Wands", "image": "assets/rws/权杖ACE.jpg"}, {"id": 23, "name": "权杖2", "nameEn": "Two of Wands", "image": "assets/rws/权杖2.jpg"}, {"id": 24, "name": "权杖3", "nameEn": "Three of Wands", "image": "assets/rws/权杖3.jpg"}, {"id": 25, "name": "权杖4", "nameEn": "Four of Wands", "image": "assets/rws/权杖4.jpg"}, {"id": 26, "name": "权杖5", "nameEn": "Five of Wands", "image": "assets/rws/权杖5.jpg"}, {"id": 27, "name": "权杖6", "nameEn": "Six of Wands", "image": "assets/rws/权杖6.jpg"}, {"id": 28, "name": "权杖7", "nameEn": "Seven of Wands", "image": "assets/rws/权杖7.jpg"}, {"id": 29, "name": "权杖8", "nameEn": "Eight of Wands", "image": "assets/rws/权杖8.jpg"}, {"id": 30, "name": "权杖9", "nameEn": "Nine of Wands", "image": "assets/rws/权杖9.jpg"}, {"id": 31, "name": "权杖10", "nameEn": "Ten of Wands", "image": "assets/rws/权杖10.jpg"}, {"id": 32, "name": "权杖侍卫", "nameEn": "Page of Wands", "image": "assets/rws/权杖侍卫.jpg"}, {"id": 33, "name": "权杖骑士", "nameEn": "Knight of Wands", "image": "assets/rws/权杖骑士.jpg"}, {"id": 34, "name": "权杖王后", "nameEn": "Queen of Wands", "image": "assets/rws/权杖王后.jpg"}, {"id": 35, "name": "权杖国王", "nameEn": "King of Wands", "image": "assets/rws/权杖国王.jpg"}, {"id": 36, "name": "圣杯ACE", "nameEn": "Ace of Cups", "image": "assets/rws/圣杯ACE.jpg"}, {"id": 37, "name": "圣杯2", "nameEn": "Two of Cups", "image": "assets/rws/圣杯2.jpg"}, {"id": 38, "name": "圣杯3", "nameEn": "Three of Cups", "image": "assets/rws/圣杯3.jpg"}, {"id": 39, "name": "圣杯4", "nameEn": "Four of Cups", "image": "assets/rws/圣杯4.jpg"}, {"id": 40, "name": "圣杯5", "nameEn": "Five of Cups", "image": "assets/rws/圣杯5.jpg"}, {"id": 41, "name": "圣杯6", "nameEn": "Six of Cups", "image": "assets/rws/圣杯6.jpg"}, {"id": 42, "name": "圣杯7", "nameEn": "Seven of Cups", "image": "assets/rws/圣杯7.jpg"}, {"id": 43, "name": "圣杯8", "nameEn": "Eight of Cups", "image": "assets/rws/圣杯8.jpg"}, {"id": 44, "name": "圣杯9", "nameEn": "Nine of Cups", "image": "assets/rws/圣杯9.jpg"}, {"id": 45, "name": "圣杯10", "nameEn": "Ten of Cups", "image": "assets/rws/圣杯10.jpg"}, {"id": 46, "name": "圣杯侍卫", "nameEn": "Page of Cups", "image": "assets/rws/圣杯侍卫.jpg"}, {"id": 47, "name": "圣杯骑士", "nameEn": "Knight of Cups", "image": "assets/rws/圣杯骑士.jpg"}, {"id": 48, "name": "圣杯王后", "nameEn": "Queen of Cups", "image": "assets/rws/圣杯王后.jpg"}, {"id": 49, "name": "圣杯国王", "nameEn": "King of Cups", "image": "assets/rws/圣杯国王.jpg"}, {"id": 50, "name": "宝剑ACE", "nameEn": "Ace of Swords", "image": "assets/rws/宝剑ACE.jpg"}, {"id": 51, "name": "宝剑2", "nameEn": "Two of Swords", "image": "assets/rws/宝剑2.jpg"}, {"id": 52, "name": "宝剑3", "nameEn": "Three of Swords", "image": "assets/rws/宝剑3.jpg"}, {"id": 53, "name": "宝剑4", "nameEn": "Four of Swords", "image": "assets/rws/宝剑4.jpg"}, {"id": 54, "name": "宝剑5", "nameEn": "Five of Swords", "image": "assets/rws/宝剑5.jpg"}, {"id": 55, "name": "宝剑6", "nameEn": "Six of Swords", "image": "assets/rws/宝剑6.jpg"}, {"id": 56, "name": "宝剑7", "nameEn": "Seven of Swords", "image": "assets/rws/宝剑7.jpg"}, {"id": 57, "name": "宝剑8", "nameEn": "Eight of Swords", "image": "assets/rws/宝剑8.jpg"}, {"id": 58, "name": "宝剑9", "nameEn": "Nine of Swords", "image": "assets/rws/宝剑9.jpg"}, {"id": 59, "name": "宝剑10", "nameEn": "Ten of Swords", "image": "assets/rws/宝剑10.jpg"}, {"id": 60, "name": "宝剑侍卫", "nameEn": "Page of Swords", "image": "assets/rws/宝剑侍卫.jpg"}, {"id": 61, "name": "宝剑骑士", "nameEn": "Knight of Swords", "image": "assets/rws/宝剑骑士.jpg"}, {"id": 62, "name": "宝剑王后", "nameEn": "Queen of Swords", "image": "assets/rws/宝剑王后.jpg"}, {"id": 63, "name": "宝剑国王", "nameEn": "King of Swords", "image": "assets/rws/宝剑国王.jpg"}, {"id": 64, "name": "星币ACE", "nameEn": "Ace of Pentacles", "image": "assets/rws/星币ACE.jpg"}, {"id": 65, "name": "星币2", "nameEn": "Two of Pentacles", "image": "assets/rws/星币2.jpg"}, {"id": 66, "name": "星币3", "nameEn": "Three of Pentacles", "image": "assets/rws/星币3.jpg"}, {"id": 67, "name": "星币4", "nameEn": "Four of Pentacles", "image": "assets/rws/星币4.jpg"}, {"id": 68, "name": "星币5", "nameEn": "Five of Pentacles", "image": "assets/rws/星币5.jpg"}, {"id": 69, "name": "星币6", "nameEn": "Six of Pentacles", "image": "assets/rws/星币6.jpg"}, {"id": 70, "name": "星币7", "nameEn": "Seven of Pentacles", "image": "assets/rws/星币7.jpg"}, {"id": 71, "name": "星币8", "nameEn": "Eight of Pentacles", "image": "assets/rws/星币8.jpg"}, {"id": 72, "name": "星币9", "nameEn": "Nine of Pentacles", "image": "assets/rws/星币9.jpg"}, {"id": 73, "name": "星币10", "nameEn": "Ten of Pentacles", "image": "assets/rws/星币10.jpg"}, {"id": 74, "name": "星币侍卫", "nameEn": "Page of Pentacles", "image": "assets/rws/星币侍卫.jpg"}, {"id": 75, "name": "星币骑士", "nameEn": "Knight of Pentacles", "image": "assets/rws/星币骑士.jpg"}, {"id": 76, "name": "星币王后", "nameEn": "Queen of Pentacles", "image": "assets/rws/星币王后.jpg"}, {"id": 77, "name": "星币国王", "nameEn": "King of Pentacles", "image": "assets/rws/星币国王.jpg"}];
const RWS_BACK='assets/rws/背面A.jpg';
const LEN_NAMES=["Rider", "Clover", "Ship", "House", "Tree", "Clouds", "Snake", "Coffin", "Bouquet", "Scythe", "Whip", "Birds", "Child", "Fox", "Bear", "Stars", "Stork", "Dog", "Tower", "Garden", "Mountain", "Crossroads", "Mice", "Heart", "Ring", "Book", "Letter", "Man", "Woman", "Lily", "Sun", "Moon", "Key", "Fish", "Anchor", "Cross"];
const LEN_KEYS=["news, movement", "luck, opportunity", "travel, distance", "home, security", "health, growth", "confusion, uncertainty", "complexity, strategy", "ending, closure", "gift, invitation", "sudden cut, decision", "conflict, repetition", "conversation, nerves", "new beginning, innocence", "caution, work", "power, protection", "hope, guidance", "change, transition", "loyalty, friendship", "institution, distance", "community, public", "obstacle, delay", "choice, alternatives", "loss, stress", "love, affection", "commitment, cycle", "secrets, knowledge", "message, document", "masculine person", "feminine person", "peace, maturity", "success, vitality", "intuition, recognition", "solution, certainty", "money, flow", "stability, work", "burden, fate"];
const LEN=LEN_NAMES.map((n,i)=>({id:i+1,name:n,nameEn:n,keyword:LEN_KEYS[i],imageData:'https://raw.githubusercontent.com/look-fate/tarot-lab/main/Pixel-Lenormand/'+(i+1)+'.png',_deckType:'custom'}));
const TAROT=RWS.map((c,i)=>Object.assign({},c,{cardIndex:i,imageData:c.image,_deckType:'custom',isMajor:i<22,suitName:null}));

function ensureDecks(){
  try{
    if(typeof deckListData==='undefined') return;
    deckListData=deckListData.filter(d=>d.id!=='iching'&&d.id!=='tarot'&&d.id!=='lenormand');
    deckListData.unshift(
      {id:'tarot',name:'韦特塔罗',nameEn:'Rider–Waite Tarot',desc:'78-card tarot deck',tag:'Tarot',tagColor:'theme-tag',borderColor:'theme-accent-border',icon:'fa-solid fa-star',cards:TAROT,backImageData:RWS_BACK},
      {id:'lenormand',name:'Pixel Lenormand',nameEn:'Pixel Lenormand',desc:'36-card Lenormand deck',tag:'Lenormand',tagColor:'theme-tag',borderColor:'theme-accent-border',icon:'fa-solid fa-diamond',cards:LEN}
    );
    if(typeof renderDeckList==='function') renderDeckList();
  }catch(e){console.warn('oracle decks',e)}
}

window.getDeckCards=function(deckId){
  if(deckId==='tarot') return TAROT.map(x=>Object.assign({},x));
  if(deckId==='lenormand') return LEN.map(x=>Object.assign({},x));
  return [];
};

function addCountControl(){
  const q=document.getElementById('divine-question-input'); if(!q) return;
  if(document.getElementById('oracle-card-count')) return;
  const group=document.createElement('div'); group.className='config-group';
  group.innerHTML='<label>抽几张牌</label><select id="oracle-card-count" class="config-select"><option value="1">1 张</option><option value="3" selected>3 张</option><option value="6">6 张</option></select>';
  const deckGroup=document.getElementById('divine-deck-select')?.closest('.config-group');
  if(deckGroup) deckGroup.after(group);
}
function configure(){
  ensureDecks(); addCountControl();
  const sel=document.getElementById('divine-deck-select');
  if(sel){
    sel.innerHTML='<option value="tarot">Rider–Waite Tarot</option><option value="lenormand">Pixel Lenormand</option>';
    sel.value='tarot';
  }
  const mode=document.getElementById('divine-draw-mode'); if(mode){mode.value='deck'; mode.closest('.config-group').style.display='none';}
  const spread=document.getElementById('spread-draw-config'); if(spread) spread.style.display='none';
}

const oldOpen=window.openDivineConfig;
window.openDivineConfig=function(){ if(oldOpen) oldOpen.apply(this,arguments); setTimeout(configure,0); };
const oldStart=window.startDivine;
window.startDivine=function(){
  try{
    const deck=document.getElementById('divine-deck-select')?.value||'tarot';
    const count=parseInt(document.getElementById('oracle-card-count')?.value||'3',10);
    divineState.deckId=deck; divineState.drawMode='deck'; divineState.customCount=count; divineState.spreadId=null; divineState.spreadCardCount=count;
    divineState.reversedEnabled=(deck==='tarot') ? divineState.reversedEnabled : false;
    const rev=document.getElementById('reversed-toggle'); if(deck==='lenormand'&&rev) rev.classList.remove('active');
  }catch(e){console.warn('oracle state',e)}
  return oldStart?oldStart.apply(this,arguments):undefined;
};

/* Make the existing config wording match question-first use. */
function relabel(){
  document.querySelectorAll('.divine-title').forEach(x=>x.textContent='Ask the Cards');
  const btn=document.querySelector('#divine-config-overlay .config-btn.primary'); if(btn) btn.textContent='Draw Cards';
}
setTimeout(()=>{ensureDecks();addCountControl();relabel();},300);
setInterval(ensureDecks,3000);
})();
