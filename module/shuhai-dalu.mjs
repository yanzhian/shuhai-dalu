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
import ShuhaiPlayerSheet from "./sheets/player-sheet.mjs";
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
  
  // ⭐ 注册 Player 角色表单（设为默认）
  Actors.registerSheet("shuhai-dalu", ShuhaiPlayerSheet, {
    types: ["character"],
    makeDefault: true,
    label: "书海大陆 - Player 角色卡"
  });
  
  // 注册标准角色表单
  Actors.registerSheet("shuhai-dalu", ShuhaiActorSheet, {
    types: ["character"],
    makeDefault: false,
    label: "书海大陆 - 标准角色卡"
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
/*  聊天消息钩子                                  */
/* -------------------------------------------- */

/**
 * 获取当前玩家的角色
 * 优先级：配置的角色 > 选中的Token > 让用户选择
 */
async function getCurrentActor() {
  // 1. 尝试获取配置的角色
  if (game.user.character) {
    return game.user.character;
  }

  // 2. 尝试获取当前选中的Token对应的角色
  const controlled = canvas.tokens?.controlled;
  if (controlled && controlled.length > 0) {
    return controlled[0].actor;
  }

  // 3. 获取用户拥有的所有角色
  const ownedActors = game.actors.filter(a => a.testUserPermission(game.user, "OWNER"));

  if (ownedActors.length === 0) {
    ui.notifications.error("你没有可用的角色！");
    return null;
  }

  // 如果只有一个角色，直接使用
  if (ownedActors.length === 1) {
    return ownedActors[0];
  }

  // 4. 让用户选择角色
  return new Promise((resolve) => {
    const options = ownedActors.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

    new Dialog({
      title: "选择角色",
      content: `
        <form>
          <div class="form-group">
            <label>选择你的角色:</label>
            <select id="actor-select" style="width: 100%; padding: 0.5rem; background: #2a2a2a; border: 1px solid #3a3a3a; color: #e0e0e0; border-radius: 3px;">
              ${options}
            </select>
          </div>
          <p style="margin-top: 1rem; font-size: 0.875rem; color: #95a5a6;">
            <strong>提示：</strong>你可以在用户配置中设置默认角色，避免每次选择。
          </p>
        </form>
      `,
      buttons: {
        select: {
          icon: '<i class="fas fa-check"></i>',
          label: "确定",
          callback: (html) => {
            const actorId = html.find('#actor-select').val();
            resolve(game.actors.get(actorId));
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消",
          callback: () => resolve(null)
        }
      },
      default: "select"
    }).render(true);
  });
}

/**
 * 为聊天消息添加事件监听器
 */
Hooks.on('renderChatMessage', (message, html, data) => {
  // 战斗骰挑战按钮事件
  html.find('.challenge-btn').click(async (event) => {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    const total = parseInt(button.dataset.total);
    const actorId = button.dataset.actorId;

    // 获取当前玩家的角色
    const actor = await getCurrentActor();
    if (!actor) {
      return;
    }

    if (action === 'counter') {
      // 对抗：打开对抗界面
      const challengerId = button.dataset.challengerId;
      const challengerName = button.dataset.challengerName;
      const diceId = button.dataset.diceId;
      const diceName = button.dataset.diceName;
      const total = parseInt(button.dataset.total);

      // 动态导入对抗界面应用
      const CounterAreaApplication = (await import('./applications/counter-area.mjs')).default;
      const counterArea = new CounterAreaApplication(actor, {
        challengerId: challengerId,
        challengerName: challengerName,
        diceId: diceId,
        diceName: diceName,
        total: total
      });
      counterArea.render(true);

      ui.notifications.info(`${challengerName} 的骰数是 ${total}，请选择你的骰子进行对抗！`);

    } else if (action === 'accept') {
      // 承受：直接受到伤害
      const newHp = Math.max(0, actor.system.derived.hp.value - total);
      await actor.update({ 'system.derived.hp.value': newHp });

      // 发送消息
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        content: `${actor.name} 选择承受，受到 ${total} 点伤害！当前生命值：${newHp}/${actor.system.derived.hp.max}`
      });
    }
  });
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

  Handlebars.registerHelper('gte', function(a, b) {
    return a >= b;
  });

  Handlebars.registerHelper('lte', function(a, b) {
    return a <= b;
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
  
  // ⭐ 添加 floor helper (向下取整)
  Handlebars.registerHelper('floor', function(value) {
    return Math.floor(value);
  });
  
  // ⭐ 添加 ceil helper (向上取整)
  Handlebars.registerHelper('ceil', function(value) {
    return Math.ceil(value);
  });
  
  // ⭐ 添加 round helper (四舍五入)
  Handlebars.registerHelper('round', function(value) {
    return Math.round(value);
  });
  
  // 获取物品图片
  Handlebars.registerHelper('getItemImg', function(itemId, options) {
    if (!itemId) return 'icons/svg/item-bag.svg';
    
    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    if (actor && actor.items) {
      const item = actor.items.get(itemId);
      if (item) return item.img;
    }
    
    // 否则从全局获取
    const item = game.items.get(itemId);
    return item ? item.img : 'icons/svg/item-bag.svg';
  });
  
  // 检查装备槽是否有物品
  Handlebars.registerHelper('hasItem', function(itemId) {
    return itemId && itemId !== '';
  });

  // 检查是否有EX资源
  Handlebars.registerHelper('hasEx', function(exResources) {
    if (!Array.isArray(exResources)) return false;
    return exResources.some(ex => ex === true);
  });

  // 获取物品费用

  Handlebars.registerHelper('getItemCost', function(itemId, options) {

    if (!itemId) return '';

 

    // 尝试从当前上下文的 actor 获取物品

    const actor = options?.data?.root?.actor;

    if (actor && actor.items) {

      const item = actor.items.get(itemId);

      if (item && item.system.cost) return item.system.cost;

    }

 

    // 否则从全局获取

    const item = game.items.get(itemId);

    return (item && item.system.cost) ? item.system.cost : '';

  });

 

  // 获取物品骰数

  Handlebars.registerHelper('getItemDice', function(itemId, options) {

    if (!itemId) return '';

 

    // 尝试从当前上下文的 actor 获取物品

    const actor = options?.data?.root?.actor;

    if (actor && actor.items) {

      const item = actor.items.get(itemId);

      if (item && item.system.diceFormula) return item.system.diceFormula;

    }

 

    // 否则从全局获取

    const item = game.items.get(itemId);

    return (item && item.system.diceFormula) ? item.system.diceFormula : '';

  });

 

  // 获取物品名称
  Handlebars.registerHelper('getItemName', function(itemId, options) {
    if (!itemId) return '';

    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    if (actor && actor.items) {
      const item = actor.items.get(itemId);
      if (item) return item.name;
    }

    // 否则从全局获取
    const item = game.items.get(itemId);
    return item ? item.name : '';
  });

  // 获取物品描述/效果
  Handlebars.registerHelper('getItemDescription', function(itemId, options) {
    if (!itemId) return '';

    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    if (actor && actor.items) {
      const item = actor.items.get(itemId);
      if (item) return item.system.effect || '';
    }

    // 否则从全局获取
    const item = game.items.get(itemId);
    return (item && item.system.effect) ? item.system.effect : '';
  });

  // 获取物品分类
  Handlebars.registerHelper('getItemCategory', function(itemId, options) {
    if (!itemId) return '';

    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    if (actor && actor.items) {
      const item = actor.items.get(itemId);
      if (item) return item.system.category || '';
    }

    // 否则从全局获取
    const item = game.items.get(itemId);
    return (item && item.system.category) ? item.system.category : '';
  });

  // 获取物品tooltip（悬停提示）
  Handlebars.registerHelper('getItemTooltip', function(itemId, options) {
    if (!itemId) return '';

    // 尝试从当前上下文的 actor 获取物品
    const actor = options?.data?.root?.actor;
    let item = null;

    if (actor && actor.items) {
      item = actor.items.get(itemId);
    }

    if (!item) {
      item = game.items.get(itemId);
    }

    if (!item) return '';

    // 构建tooltip文本
    const typeNames = {
      combatDice: '攻击骰',
      shootDice: '射击骰',
      defenseDice: '守备骰',
      triggerDice: '触发骰',
      passiveDice: '被动骰',
      weapon: '武器',
      armor: '防具',
      item: '物品',
      equipment: '装备'
    };

    const parts = [];
    parts.push(item.name);
    parts.push(`${typeNames[item.type] || item.type} ${item.system.category || ''}`);
    if (item.system.effect) {
      parts.push(item.system.effect);
    }

    return parts.join('\n');
  });
});

/* -------------------------------------------- */
/*  预加载模板                                    */
/* -------------------------------------------- */

async function preloadHandlebarsTemplates() {
  return loadTemplates([
    // 角色表单模板
    "systems/shuhai-dalu/templates/actor/actor-character-sheet.hbs",
    "systems/shuhai-dalu/templates/actor/actor-player-sheet.hbs",

    // 物品模板
    "systems/shuhai-dalu/templates/item/item-sheet.hbs",

    // 战斗区域模板
    "systems/shuhai-dalu/templates/combat/combat-area.hbs",
    "systems/shuhai-dalu/templates/combat/counter-area.hbs",

    // 对话框模板
    "systems/shuhai-dalu/templates/dialog/check-dialog.hbs",
    "systems/shuhai-dalu/templates/dialog/create-item.hbs",
    "systems/shuhai-dalu/templates/dialog/item-details.hbs",

    // 聊天模板
    "systems/shuhai-dalu/templates/chat/check-roll.hbs",
    "systems/shuhai-dalu/templates/chat/dice-use.hbs",
    "systems/shuhai-dalu/templates/chat/trigger-use.hbs",
    "systems/shuhai-dalu/templates/chat/item-use.hbs",
    "systems/shuhai-dalu/templates/chat/item-card.hbs",
    "systems/shuhai-dalu/templates/chat/combat-dice-challenge.hbs",
    "systems/shuhai-dalu/templates/chat/contest-result.hbs"
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
    // 对于数组类型，需要先复制整个数组再修改
    const items = [...actor.system.equipment.items];
    items[slotIndex] = item.id;
    updateData['system.equipment.items'] = items;
  } else if (slotType === 'gear' && slotIndex !== null) {
    const gear = [...actor.system.equipment.gear];
    gear[slotIndex] = item.id;
    updateData['system.equipment.gear'] = gear;
  } else if (slotType === 'combatDice' && slotIndex !== null) {
    // 修复：复制整个combatDice数组，避免后面的槽位消失
    const combatDice = [...actor.system.equipment.combatDice];
    combatDice[slotIndex] = item.id;
    updateData['system.equipment.combatDice'] = combatDice;
  } else if (slotType === 'defenseDice') {
    updateData['system.equipment.defenseDice'] = item.id;
  } else if (slotType === 'triggerDice') {
    updateData['system.equipment.triggerDice'] = item.id;
  } else if (slotType === 'passiveDice' && slotIndex !== null) {
    const passives = [...actor.system.equipment.passives];
    passives[slotIndex] = item.id;
    updateData['system.equipment.passives'] = passives;
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
    const items = [...actor.system.equipment.items];
    items[slotIndex] = "";
    updateData['system.equipment.items'] = items;
  } else if (slotType === 'gear' && slotIndex !== null) {
    itemId = actor.system.equipment.gear[slotIndex];
    const gear = [...actor.system.equipment.gear];
    gear[slotIndex] = "";
    updateData['system.equipment.gear'] = gear;
  } else if (slotType === 'combatDice' && slotIndex !== null) {
    itemId = actor.system.equipment.combatDice[slotIndex];
    const combatDice = [...actor.system.equipment.combatDice];
    combatDice[slotIndex] = "";
    updateData['system.equipment.combatDice'] = combatDice;
  } else if (slotType === 'defenseDice') {
    itemId = actor.system.equipment.defenseDice;
    updateData['system.equipment.defenseDice'] = "";
  } else if (slotType === 'triggerDice') {
    itemId = actor.system.equipment.triggerDice;
    updateData['system.equipment.triggerDice'] = "";
  } else if (slotType === 'passiveDice' && slotIndex !== null) {
    itemId = actor.system.equipment.passives[slotIndex];
    const passives = [...actor.system.equipment.passives];
    passives[slotIndex] = "";
    updateData['system.equipment.passives'] = passives;
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