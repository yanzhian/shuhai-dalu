/**
 * 书海大陆 TRPG 系统
 * 主入口文件
 */

import CharacterData from "./data/CharacterData.mjs";
import ShuhaiActor from "./documents/actor.mjs";
import ShuhaiItem from "./documents/item.mjs";
import ShuhaiActorSheet from "./sheets/actor-sheet.mjs";
import ShuhaiItemSheet from "./sheets/item-sheet.mjs";

/* -------------------------------------------- */
/*  初始化钩子                                    */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  console.log('书海大陆 | 初始化系统');
  
  // 定义自定义系统类
  game.shuhai = {
    ShuhaiActor,
    ShuhaiItem,
    rollAttributeCheck,
    rollSkillCheck,
    rollCorruptionCheck
  };
  
  // 配置数据模型
  CONFIG.Actor.documentClass = ShuhaiActor;
  CONFIG.Item.documentClass = ShuhaiItem;
  
  // 注册数据模型
  CONFIG.Actor.dataModels = {
    character: CharacterData
  };
  
  // 注册角色表单
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("shuhai-dalu", ShuhaiActorSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SHUHAI.SheetLabel.Character"
  });
  
  // 注册物品表单
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("shuhai-dalu", ShuhaiItemSheet, {
    makeDefault: true,
    label: "SHUHAI.SheetLabel.Item"
  });
  
  // 预加载 Handlebars 模板
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  就绪钩子                                      */
/* -------------------------------------------- */

Hooks.once('ready', async function() {
  console.log('书海大陆 | 系统已就绪');
  
  // 等待字体加载
  await waitForFonts();
});

/* -------------------------------------------- */
/*  Handlebars 辅助函数                          */
/* -------------------------------------------- */

Hooks.once('init', function() {
  // 注册 Handlebars 辅助函数
  Handlebars.registerHelper('concat', function() {
    let outStr = '';
    for (let arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });
  
  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });
  
  Handlebars.registerHelper('times', function(n, block) {
    let accum = '';
    for (let i = 0; i < n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });
});

/* -------------------------------------------- */
/*  预加载模板                                    */
/* -------------------------------------------- */

async function preloadHandlebarsTemplates() {
  return loadTemplates([
    // 角色表单的局部模板
    "systems/shuhai-dalu/templates/actor/parts/actor-attributes.hbs",
    "systems/shuhai-dalu/templates/actor/parts/actor-skills.hbs",
    "systems/shuhai-dalu/templates/actor/parts/actor-combat.hbs",
    "systems/shuhai-dalu/templates/actor/parts/actor-items.hbs",
    
    // 物品模板
    "systems/shuhai-dalu/templates/item/parts/item-effects.hbs"
  ]);
}

/* -------------------------------------------- */
/*  工具函数                                      */
/* -------------------------------------------- */

/**
 * 等待字体加载
 */
async function waitForFonts() {
  if (document.fonts) {
    await document.fonts.ready;
  }
}

/**
 * 属性检定
 */
async function rollAttributeCheck(actor, attributeKey, modifier = 0, difficulty = 20) {
  const attribute = actor.system.attributes[attributeKey];
  if (!attribute) {
    ui.notifications.error("无效的属性");
    return null;
  }
  
  const result = actor.system.rollCheck(attributeKey, modifier, difficulty);
  
  // 创建聊天消息
  const chatData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${attribute.label}检定`,
    content: await renderTemplate("systems/shuhai-dalu/templates/chat/check-roll.hbs", {
      actor: actor.name,
      attribute: attribute.label,
      modifier,
      difficulty,
      result
    })
  };
  
  ChatMessage.create(chatData);
  return result;
}

/**
 * 技能检定
 */
async function rollSkillCheck(actor, skillKey, modifier = 0, difficulty = 20) {
  const skillValue = actor.system.skills[skillKey];
  const skillLabels = {
    athletics: "运动",
    acrobatics: "体操",
    sleight: "巧手",
    stealth: "隐蔽",
    history: "历史",
    investigation: "调查",
    nature: "自然",
    religion: "宗教",
    animal: "驯兽",
    insight: "洞悉",
    medicine: "医药",
    perception: "察觉",
    survival: "求生",
    deception: "欺瞒",
    intimidation: "威吓",
    performance: "表演",
    persuasion: "游说"
  };
  
  // 技能检定使用相关属性
  const attributeMap = {
    athletics: 'strength',
    acrobatics: 'dexterity',
    sleight: 'dexterity',
    stealth: 'dexterity',
    history: 'intelligence',
    investigation: 'intelligence',
    nature: 'intelligence',
    religion: 'intelligence',
    animal: 'charisma',
    insight: 'perception',
    medicine: 'intelligence',
    perception: 'perception',
    survival: 'perception',
    deception: 'charisma',
    intimidation: 'charisma',
    performance: 'charisma',
    persuasion: 'charisma'
  };
  
  const attributeKey = attributeMap[skillKey];
  const totalModifier = modifier + skillValue;
  
  return rollAttributeCheck(actor, attributeKey, totalModifier, difficulty);
}

/**
 * 侵蚀检定
 */
async function rollCorruptionCheck(actor) {
  const currentSAN = actor.system.san.value;
  const sanMax = actor.system.san.max;
  
  // 投掷d20
  const roll = new Roll("1d20");
  await roll.evaluate();
  
  const total = roll.total + currentSAN;
  const corrupted = total > 20;
  
  let message = "";
  if (corrupted) {
    message = "💀 侵蚀发生!你感受到了深渊的呼唤... 💀";
  } else {
    // 增加1-3点侵蚀值
    const increase = Math.floor(Math.random() * 3) + 1;
    const newSAN = Math.min(currentSAN + increase, sanMax);
    
    await actor.update({ "system.san.value": newSAN });
    
    message = `✅ 侵蚀未发生,但精神受到冲击\n侵蚀值增加 ${increase} 点: ${currentSAN} ➯ ${newSAN}`;
    
    if (newSAN >= sanMax * 1.5) {
      message += `\n💀 极度危险:侵蚀值远超上限,深渊之力几乎要吞噬你的心智!`;
    } else if (newSAN >= sanMax) {
      message += `\n⚠️ 高度警告:侵蚀值已超过安全上限!`;
    } else if (newSAN >= sanMax * 0.8) {
      message += `\n⚠️ 警告:已快要达到侵蚀值安全上限!`;
    }
  }
  
  // 创建聊天消息
  const chatData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: "侵蚀检定",
    content: `
      <div class="shuhai-roll">
        <div class="dice-result">
          <div class="dice-formula">${roll.formula}</div>
          <div class="dice-total">${roll.total}[d20] + ${currentSAN}[侵蚀值] = ${total}</div>
        </div>
        <div class="result-text">${message}</div>
      </div>
    `
  };
  
  ChatMessage.create(chatData);
  return { corrupted, roll, total };
}

/* -------------------------------------------- */
/*  导出                                         */
/* -------------------------------------------- */

export {
  rollAttributeCheck,
  rollSkillCheck,
  rollCorruptionCheck
};