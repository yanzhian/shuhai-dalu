/**
 * 书海大陆 TRPG 系统
 * 主入口文件 - 完整版
 */

import CharacterData from "./data/CharacterData.mjs";
import ShuhaiActor from "./documents/actor.mjs";
import ShuhaiItem, {
  CombatDiceData,
  DefenseDiceData,
  TriggerDiceData,
  PassiveDiceData,
  WeaponData,
  ArmorData,
  ItemData,
  EquipmentData
} from "./documents/item.mjs";
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
    rollCorruptionCheck,
    equipItem,
    unequipItem
  };
  
  // 配置文档类
  CONFIG.Actor.documentClass = ShuhaiActor;
  CONFIG.Item.documentClass = ShuhaiItem;
  
  // 注册 Actor 数据模型
  CONFIG.Actor.dataModels = CONFIG.Actor.dataModels || {};
  CONFIG.Actor.dataModels.character = CharacterData;
  
  // 注册 Item 数据模型
  CONFIG.Item.dataModels = CONFIG.Item.dataModels || {};
  CONFIG.Item.dataModels.combatDice = CombatDiceData;
  CONFIG.Item.dataModels.shootDice = CombatDiceData;
  CONFIG.Item.dataModels.defenseDice = DefenseDiceData;
  CONFIG.Item.dataModels.triggerDice = TriggerDiceData;
  CONFIG.Item.dataModels.passiveDice = PassiveDiceData;
  CONFIG.Item.dataModels.weapon = WeaponData;
  CONFIG.Item.dataModels.armor = ArmorData;
  CONFIG.Item.dataModels.item = ItemData;
  CONFIG.Item.dataModels.equipment = EquipmentData;
  
  console.log('书海大陆 | 数据模型已注册');
  console.log('Actor 数据模型:', CONFIG.Actor.dataModels);
  console.log('Item 数据模型:', CONFIG.Item.dataModels);
  
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
    types: ["combatDice", "shootDice", "defenseDice", "triggerDice", "passiveDice", "weapon", "armor", "item", "equipment"],
    makeDefault: true,
    label: "SHUHAI.SheetLabel.Item"
  });
  
  console.log('书海大陆 | 表单已注册');
  
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
  
  // 显示欢迎消息
  ui.notifications.info("书海大陆系统已加载！");
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
    return str ? str.toLowerCase() : '';
  });
  
  Handlebars.registerHelper('times', function(n, block) {
    let accum = '';
    for (let i = 0; i < n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });
  
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });
  
  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });
  
  Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
  });
  
  Handlebars.registerHelper('add', function(a, b) {
    return a + b;
  });
  
  Handlebars.registerHelper('subtract', function(a, b) {
    return a - b;
  });
  
  // ⭐ 添加缺失的 multiply helper
  Handlebars.registerHelper('multiply', function(a, b) {
    return a * b;
  });
  
  // ⭐ 添加 divide helper
  Handlebars.registerHelper('divide', function(a, b) {
    if (b === 0) return 0;
    return a / b;
  });
  
  Handlebars.registerHelper('join', function(arr, sep) {
    if (Array.isArray(arr)) {
      return arr.filter(x => x).join(sep || ', ');
    }
    return arr || '';
  });
  
  // 获取物品名称 (改进版，支持从 actor 获取)
  Handlebars.registerHelper('getItemName', function(itemId, options) {
    if (!itemId) return '空';
    
    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    if (actor && actor.items) {
      const item = actor.items.get(itemId);
      if (item) return item.name;
    }
    
    // 否则从全局获取
    const item = game.items.get(itemId);
    return item ? item.name : '未知物品';
  });
  
  // 检查装备槽是否有物品
  Handlebars.registerHelper('hasItem', function(itemId) {
    return itemId && itemId !== '';
  });

  // 分割字符串
  Handlebars.registerHelper('split', function(str, separator) {
    if (!str) return [];
    return str.split(separator || ',');
  });

  // 去除首尾空格
  Handlebars.registerHelper('trim', function(str) {
    return str ? str.trim() : '';
  });
});

/* -------------------------------------------- */
/*  预加载模板                                    */
/* -------------------------------------------- */

async function preloadHandlebarsTemplates() {
  return loadTemplates([
    // 角色表单的局部模板
    "systems/shuhai-dalu/templates/actor/parts/actor-info.hbs",
    "systems/shuhai-dalu/templates/actor/parts/actor-attributes.hbs",
    "systems/shuhai-dalu/templates/actor/parts/actor-skills.hbs",
    "systems/shuhai-dalu/templates/actor/parts/actor-equipment.hbs",
    "systems/shuhai-dalu/templates/actor/parts/actor-inventory.hbs",
    
    // 物品模板
    "systems/shuhai-dalu/templates/item/item-combatDice-sheet.hbs",
    "systems/shuhai-dalu/templates/item/item-defenseDice-sheet.hbs",
    "systems/shuhai-dalu/templates/item/item-triggerDice-sheet.hbs",
    "systems/shuhai-dalu/templates/item/item-passiveDice-sheet.hbs",
    "systems/shuhai-dalu/templates/item/item-weapon-sheet.hbs",
    "systems/shuhai-dalu/templates/item/item-armor-sheet.hbs",
    "systems/shuhai-dalu/templates/item/item-item-sheet.hbs",
    "systems/shuhai-dalu/templates/item/item-equipment-sheet.hbs",
    
    // 聊天模板
    "systems/shuhai-dalu/templates/chat/check-roll.hbs",
    "systems/shuhai-dalu/templates/chat/dice-use.hbs",
    "systems/shuhai-dalu/templates/chat/trigger-use.hbs",
    "systems/shuhai-dalu/templates/chat/item-use.hbs",
    "systems/shuhai-dalu/templates/chat/item-card.hbs"
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
  
  const result = actor.rollAttributeCheck(attributeKey, modifier, difficulty);
  return result;
}

/**
 * 技能检定
 */
async function rollSkillCheck(actor, skillKey, modifier = 0, difficulty = 20) {
  const skillValue = actor.system.skills[skillKey];
  
  // 技能检定使用相关属性
  const attributeMap = {
    athletics: 'strength',
    acrobatics: 'dexterity',
    sleight: 'dexterity',
    stealth: 'dexterity',
    qidian: 'intelligence',
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
  return actor.rollCorruptionCheck();
}

/**
 * 装备物品
 */
async function equipItem(actor, item, slotType, slotIndex = null) {
  const updateData = {};
  
  // 检查星光是否足够
  const starlightCost = item.system.starlightCost || 0;
  const availableStarlight = actor.system.derived.starlight;
  
  if (starlightCost > availableStarlight) {
    ui.notifications.warn(`星光不足！需要 ${starlightCost}，当前可用 ${availableStarlight}`);
    return false;
  }
  
  // 根据槽位类型装备
  if (slotType === 'weapon') {
    updateData['system.equipment.weapon'] = item.id;
  } else if (slotType === 'armor') {
    updateData['system.equipment.armor'] = item.id;
  } else if (slotType === 'item' && slotIndex !== null) {
    updateData[`system.equipment.items.${slotIndex}`] = item.id;
  } else if (slotType === 'gear' && slotIndex !== null) {
    updateData[`system.equipment.gear.${slotIndex}`] = item.id;
  } else if (slotType === 'combatDice' && slotIndex !== null) {
    updateData[`system.equipment.combatDice.${slotIndex}`] = item.id;
  } else if (slotType === 'defenseDice') {
    updateData['system.equipment.defenseDice'] = item.id;
  } else if (slotType === 'triggerDice') {
    updateData['system.equipment.triggerDice'] = item.id;
  } else if (slotType === 'passive' && slotIndex !== null) {
    updateData[`system.equipment.passives.${slotIndex}`] = item.id;
  }
  
  // 增加已使用的星光
  if (starlightCost > 0) {
    updateData['system.derived.starlightUsed'] = actor.system.derived.starlightUsed + starlightCost;
  }
  
  await actor.update(updateData);
  ui.notifications.info(`已装备 ${item.name}`);
  return true;
}

/**
 * 卸下物品
 */
async function unequipItem(actor, slotType, slotIndex = null) {
  const updateData = {};
  let itemId = null;
  
  // 获取要卸下的物品ID
  if (slotType === 'weapon') {
    itemId = actor.system.equipment.weapon;
    updateData['system.equipment.weapon'] = "";
  } else if (slotType === 'armor') {
    itemId = actor.system.equipment.armor;
    updateData['system.equipment.armor'] = "";
  } else if (slotType === 'item' && slotIndex !== null) {
    itemId = actor.system.equipment.items[slotIndex];
    updateData[`system.equipment.items.${slotIndex}`] = "";
  } else if (slotType === 'gear' && slotIndex !== null) {
    itemId = actor.system.equipment.gear[slotIndex];
    updateData[`system.equipment.gear.${slotIndex}`] = "";
  } else if (slotType === 'combatDice' && slotIndex !== null) {
    itemId = actor.system.equipment.combatDice[slotIndex];
    updateData[`system.equipment.combatDice.${slotIndex}`] = "";
  } else if (slotType === 'defenseDice') {
    itemId = actor.system.equipment.defenseDice;
    updateData['system.equipment.defenseDice'] = "";
  } else if (slotType === 'triggerDice') {
    itemId = actor.system.equipment.triggerDice;
    updateData['system.equipment.triggerDice'] = "";
  } else if (slotType === 'passive' && slotIndex !== null) {
    itemId = actor.system.equipment.passives[slotIndex];
    updateData[`system.equipment.passives.${slotIndex}`] = "";
  }
  
  if (!itemId) {
    ui.notifications.warn("该槽位没有装备物品");
    return false;
  }
  
  // 获取物品并返还星光
  const item = actor.items.get(itemId);
  if (item) {
    const starlightCost = item.system.starlightCost || 0;
    if (starlightCost > 0) {
      updateData['system.derived.starlightUsed'] = 
        Math.max(0, actor.system.derived.starlightUsed - starlightCost);
    }
  }
  
  await actor.update(updateData);
  ui.notifications.info(`已卸下 ${item ? item.name : '物品'}`);
  return true;
}

/* -------------------------------------------- */
/*  导出                                         */
/* -------------------------------------------- */

export {
  rollAttributeCheck,
  rollSkillCheck,
  rollCorruptionCheck,
  equipItem,
  unequipItem
};