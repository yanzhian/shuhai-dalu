/**
 * 书海大陆角色表单 - 完整版
 */
export default class ShuhaiActorSheet extends ActorSheet {
  
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "actor"],
      width: 900,
      height: 850,
      tabs: [{ 
        navSelector: ".sheet-tabs", 
        contentSelector: ".sheet-body", 
        initial: "attributes" 
      }],
      dragDrop: [
        { dragSelector: ".item-icon-wrapper", dropSelector: null },  // 允许整个表单接受拖放
        { dragSelector: ".item-row", dropSelector: ".equipment-slots" },
        { dragSelector: ".item-row", dropSelector: ".dice-slots" },
        { dragSelector: ".item-row", dropSelector: ".special-slots" },
        { dragSelector: ".item-row", dropSelector: ".passive-slots" }
      ],
      scrollY: [".biography", ".inventory-list", ".skills", ".equipment"]
    });
  }

  /** @override */
  get template() {
    return `systems/shuhai-dalu/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);
    
    context.system = actorData.system;
    context.flags = actorData.flags;
    
    // 添加 Roll 数据
    context.rollData = this.actor.getRollData();
    
    // 准备角色数据
    this._prepareCharacterData(context);
    
    // 准备物品数据
    this._prepareItems(context);
    
    // 添加富文本编辑器
    context.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.biography, 
      { async: true }
    );
    
    return context;
  }

  /**
   * 准备角色特定数据
   */
  _prepareCharacterData(context) {
    // 属性列表
    context.attributes = {
      strength: { key: 'strength', label: '力量', value: context.system.attributes.strength },
      constitution: { key: 'constitution', label: '体质', value: context.system.attributes.constitution },
      dexterity: { key: 'dexterity', label: '敏捷', value: context.system.attributes.dexterity },
      perception: { key: 'perception', label: '感知', value: context.system.attributes.perception },
      intelligence: { key: 'intelligence', label: '智力', value: context.system.attributes.intelligence },
      charisma: { key: 'charisma', label: '魅力', value: context.system.attributes.charisma }
    };
    
    // 技能分组
    context.skillGroups = {
      strengthDex: {
        athletics: { key: 'athletics', label: '运动', value: context.system.skills.athletics },
        acrobatics: { key: 'acrobatics', label: '体操', value: context.system.skills.acrobatics },
        sleight: { key: 'sleight', label: '巧手', value: context.system.skills.sleight },
        stealth: { key: 'stealth', label: '隐蔽', value: context.system.skills.stealth }
      },
      intelligence: {
        qidian: { key: 'qidian', label: '奇点', value: context.system.skills.qidian },
        history: { key: 'history', label: '历史', value: context.system.skills.history },
        investigation: { key: 'investigation', label: '调查', value: context.system.skills.investigation },
        nature: { key: 'nature', label: '自然', value: context.system.skills.nature },
        religion: { key: 'religion', label: '宗教', value: context.system.skills.religion }
      },
      perception: {
        animal: { key: 'animal', label: '驯兽', value: context.system.skills.animal },
        insight: { key: 'insight', label: '洞悉', value: context.system.skills.insight },
        medicine: { key: 'medicine', label: '医药', value: context.system.skills.medicine },
        perception: { key: 'perception', label: '察觉', value: context.system.skills.perception },
        survival: { key: 'survival', label: '求生', value: context.system.skills.survival }
      },
      charisma: {
        deception: { key: 'deception', label: '欺瞒', value: context.system.skills.deception },
        intimidation: { key: 'intimidation', label: '威吓', value: context.system.skills.intimidation },
        performance: { key: 'performance', label: '表演', value: context.system.skills.performance },
        persuasion: { key: 'persuasion', label: '游说', value: context.system.skills.persuasion }
      }
    };
  }

  /**
   * 准备物品数据
   */
  _prepareItems(context) {
    // 按类型分类所有物品
    context.items = context.actor.items.contents;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // 只在拥有权限时添加监听器
    if (!this.isEditable) return;
    
    // === 属性相关 ===
    html.find('.attr-roll').click(this._onAttributeRoll.bind(this));
    html.find('.corruption-check').click(this._onCorruptionCheck.bind(this));
    html.find('.long-rest').click(this._onLongRest.bind(this));
    html.find('.roll-speed').click(this._onRollSpeed.bind(this));
    
    // === 技能相关 ===
    html.find('.skill-increase').click(this._onSkillIncrease.bind(this));
    html.find('.skill-decrease').click(this._onSkillDecrease.bind(this));
    html.find('.skill-roll').click(this._onSkillRoll.bind(this));
    
    // === 装备相关 ===
    html.find('.unequip-btn').click(this._onUnequip.bind(this));
    html.find('.use-dice-btn').click(this._onUseDice.bind(this));
    
    // === 物品相关 ===
    html.find('.create-item-btn').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
    html.find('.item-use').click(this._onItemUse.bind(this));
    
    // === 拖放 ===
    const dragHandler = ev => this._onDragStart(ev);
    html.find('.item-row').each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", dragHandler, false);
    });
  }

  /* -------------------------------------------- */
  /*  事件处理 - 属性                               */
  /* -------------------------------------------- */

  /**
   * 属性检定
   */
  async _onAttributeRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const attributeKey = element.dataset.attribute;
    
    const content = await renderTemplate("systems/shuhai-dalu/templates/dialog/check-dialog.hbs", {
      attribute: attributeKey
    });
    
    new Dialog({
      title: "属性检定",
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "检定",
          callback: html => {
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const difficulty = parseInt(html.find('[name="difficulty"]').val()) || 20;
            game.shuhai.rollAttributeCheck(this.actor, attributeKey, modifier, difficulty);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "roll"
    }).render(true);
  }

  /**
   * 侵蚀检定
   */
  _onCorruptionCheck(event) {
    event.preventDefault();
    game.shuhai.rollCorruptionCheck(this.actor);
  }

  /**
   * 长休
   */
  async _onLongRest(event) {
    event.preventDefault();
    await this.actor.longRest();
  }

  /**
   * 投掷速度
   */
  async _onRollSpeed(event) {
    event.preventDefault();
    
    const dex = this.actor.system.attributes.dexterity;
    const roll = new Roll("1d6");
    await roll.evaluate();
    
    // 显示 3D 骰子动画
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
    }
    
    const speed = roll.total + Math.floor(dex / 3);
    
    await this.actor.update({ 'system.derived.speed': speed });
    
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "速度值投掷",
      content: `
        <div class="shuhai-speed-roll">
          <p>${this.actor.name} 的速度值:</p>
          <p>${roll.total}[1d6] + ${Math.floor(dex / 3)}[敏捷/3] = <strong>${speed}</strong></p>
        </div>
      `,
      sound: CONFIG.sounds.dice,
      rolls: [roll]
    });
  }

  /* -------------------------------------------- */
  /*  事件处理 - 技能                               */
  /* -------------------------------------------- */

  /**
   * 增加技能点
   */
  async _onSkillIncrease(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillKey = element.dataset.skill;
    const category = element.dataset.category;
    
    const currentValue = this.actor.system.skills[skillKey];
    if (currentValue >= 25) {
      ui.notifications.warn("技能已达到上限(25)");
      return;
    }
    
    const available = this.actor.system.getAvailableSkillPoints(category);
    if (available <= 0) {
      ui.notifications.warn("技能点不足");
      return;
    }
    
    await this.actor.update({ [`system.skills.${skillKey}`]: currentValue + 1 });
  }

  /**
   * 减少技能点
   */
  async _onSkillDecrease(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillKey = element.dataset.skill;
    
    const currentValue = this.actor.system.skills[skillKey];
    if (currentValue <= 0) {
      return;
    }
    
    await this.actor.update({ [`system.skills.${skillKey}`]: currentValue - 1 });
  }

  /**
   * 技能检定
   */
  async _onSkillRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillKey = element.dataset.skill;
    
    const content = await renderTemplate("systems/shuhai-dalu/templates/dialog/check-dialog.hbs", {
      skill: skillKey
    });
    
    new Dialog({
      title: "技能检定",
      content: content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: "检定",
          callback: html => {
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const difficulty = parseInt(html.find('[name="difficulty"]').val()) || 20;
            game.shuhai.rollSkillCheck(this.actor, skillKey, modifier, difficulty);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "roll"
    }).render(true);
  }

  /* -------------------------------------------- */
  /*  事件处理 - 装备                               */
  /* -------------------------------------------- */

  /**
   * 卸下装备
   */
  async _onUnequip(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const slotType = element.dataset.slotType;
    const slotIndex = element.dataset.slotIndex !== undefined ? parseInt(element.dataset.slotIndex) : null;
    
    await game.shuhai.unequipItem(this.actor, slotType, slotIndex);
  }

  /**
   * 使用骰子
   */
  async _onUseDice(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const itemId = element.dataset.itemId;
    
    const item = this.actor.items.get(itemId);
    if (!item) {
      ui.notifications.error("找不到物品");
      return;
    }
    
    await item.use();
  }

  /* -------------------------------------------- */
  /*  事件处理 - 物品                               */
  /* -------------------------------------------- */

  /**
   * 创建物品
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const type = button.dataset.type;
    
    const itemData = {
      name: `新${this._getTypeName(type)}`,
      type: type,
      system: {}
    };
    
    const cls = getDocumentClass("Item");
    await cls.create(itemData, { parent: this.actor });
  }

  /**
   * 获取类型中文名
   */
  _getTypeName(type) {
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
    return typeNames[type] || '物品';
  }

  /**
   * 编辑物品
   */
  _onItemEdit(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * 删除物品
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    const confirmed = await Dialog.confirm({
      title: `删除 ${item.name}?`,
      content: `<p>确定要删除 <strong>${item.name}</strong> 吗?</p>`
    });
    
    if (confirmed) {
      await item.delete();
    }
  }

  /**
   * 使用物品
   */
  async _onItemUse(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const itemId = button.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) {
      await item.use();
    }
  }

  /* -------------------------------------------- */
  /*  拖放处理                                      */
  /* -------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    const actor = this.actor;
    
    // 处理物品拖放
    if (data.type === "Item") {
      return this._onDropItem(event, data);
    }
    
    return super._onDrop(event);
  }

  /**
   * 处理物品拖放
   */
  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);
    const itemData = item.toObject();

    // 检查拖放目标是否是装备槽
    const dropTarget = event.target.closest('.slot-content');

    // 情况1：物品没有 parent（从物品侧边栏拖来）
    if (!item.parent) {
      // 如果拖到装备槽，创建物品并装备
      if (dropTarget) {
        const newItem = await this.actor.createEmbeddedDocuments("Item", [itemData]);
        const slotType = dropTarget.dataset.slot;
        const slotIndex = dropTarget.dataset.slotIndex !== undefined ? parseInt(dropTarget.dataset.slotIndex) : null;
        await game.shuhai.equipItem(this.actor, newItem[0], slotType, slotIndex);
        return false;
      }
      // 如果拖到物品栏区域，只创建物品
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    // 情况2：物品来自其他角色，创建副本
    if (item.parent.id !== this.actor.id) {
      delete itemData._id;
      // 如果拖到装备槽，创建副本并装备
      if (dropTarget) {
        const newItem = await this.actor.createEmbeddedDocuments("Item", [itemData]);
        const slotType = dropTarget.dataset.slot;
        const slotIndex = dropTarget.dataset.slotIndex !== undefined ? parseInt(dropTarget.dataset.slotIndex) : null;
        await game.shuhai.equipItem(this.actor, newItem[0], slotType, slotIndex);
        return false;
      }
      // 如果拖到物品栏区域，只创建副本
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    // 情况3：物品已经属于当前角色
    if (dropTarget) {
      // 拖到装备槽，装备物品
      const slotType = dropTarget.dataset.slot;
      const slotIndex = dropTarget.dataset.slotIndex !== undefined ? parseInt(dropTarget.dataset.slotIndex) : null;
      await game.shuhai.equipItem(this.actor, item, slotType, slotIndex);
      return false;
    }

    // 物品已经在角色上，拖到物品栏区域，不做任何操作
    return false;
  }
}