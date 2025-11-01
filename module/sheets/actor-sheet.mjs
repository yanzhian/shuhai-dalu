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
    // 使用新的重新设计的模板
    return `systems/shuhai-dalu/templates/actor/actor-${this.actor.type}-sheet-redesign.hbs`;
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
    html.find('.attr-check-btn').click(this._onAttributeRoll.bind(this));
    html.find('.corruption-check').click(this._onCorruptionCheck.bind(this));
    html.find('.corruption-check-btn').click(this._onCorruptionCheck.bind(this));
    html.find('.long-rest').click(this._onLongRest.bind(this));
    html.find('.long-rest-btn').click(this._onLongRest.bind(this));
    html.find('.roll-speed').click(this._onRollSpeed.bind(this));
    html.find('.roll-speed-btn').click(this._onRollSpeed.bind(this));

    // === 技能相关 ===
    html.find('.skill-increase').click(this._onSkillIncrease.bind(this));
    html.find('.skill-decrease').click(this._onSkillDecrease.bind(this));
    html.find('.skill-roll').click(this._onSkillRoll.bind(this));
    html.find('.skill-check-btn').click(this._onSkillRoll.bind(this));

    // === 装备相关 ===
    html.find('.unequip-btn').click(this._onUnequip.bind(this));
    html.find('.use-dice-btn').click(this._onUseDice.bind(this));

    // === 物品相关 ===
    html.find('.create-item-btn').click(this._onItemCreate.bind(this));
    html.find('.create-new-item-btn').click(this._onCreateNewItem.bind(this));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-edit-btn').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
    html.find('.item-delete-btn').click(this._onItemDelete.bind(this));
    html.find('.item-use').click(this._onItemUse.bind(this));

    // === 物品图片点击显示详情 ===
    html.find('.item-img').click(this._onItemImageClick.bind(this));

    // === 搜索功能 ===
    html.find('#item-search').on('input', this._onSearchItems.bind(this));
    html.find('.quick-filter-btn').click(this._onQuickFilter.bind(this));

    // === 拖放 ===
    const dragHandler = ev => this._onDragStart(ev);
    html.find('.item-row').each((i, li) => {
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", dragHandler, false);
    });
    html.find('.inventory-item').each((i, li) => {
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
   * 处理物品拖放到装备槽
   */
  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);
    const itemData = item.toObject();

    // 检查是否是从其他角色拖过来的
    if (item.parent && item.parent.id !== this.actor.id) {
      // 从其他角色拖过来，创建副本
      delete itemData._id;
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    // 检查拖放目标
    const dropTarget = event.target.closest('.slot-content');
    if (!dropTarget) {
      return super._onDropItem(event, data);
    }

    const slotType = dropTarget.dataset.slotType || dropTarget.dataset.slot;
    const slotIndex = dropTarget.dataset.slotIndex !== undefined ? parseInt(dropTarget.dataset.slotIndex) : null;

    // 装备物品到槽位
    await game.shuhai.equipItem(this.actor, item, slotType, slotIndex);

    return false;
  }

  /* -------------------------------------------- */
  /*  新增事件处理                                  */
  /* -------------------------------------------- */

  /**
   * 创建新物品（带对话框）
   */
  async _onCreateNewItem(event) {
    event.preventDefault();

    const content = await renderTemplate("systems/shuhai-dalu/templates/dialog/create-item-dialog.hbs", {});

    new Dialog({
      title: "创建新物品",
      content: content,
      buttons: {
        create: {
          icon: '<i class="fas fa-check"></i>',
          label: "创建",
          callback: async html => {
            const formData = {
              name: html.find('[name="name"]').val(),
              type: html.find('[name="type"]').val(),
              img: "icons/svg/item-bag.svg"
            };

            const systemData = {
              category: html.find('[name="category"]').val(),
              diceFormula: html.find('[name="diceFormula"]').val(),
              cost: parseInt(html.find('[name="cost"]').val()) || 0,
              quantity: parseInt(html.find('[name="quantity"]').val()) || 1,
              starlightCost: parseInt(html.find('[name="starlightCost"]').val()) || 0,
              resistance: html.find('[name="resistance"]').val(),
              tags: html.find('[name="tags"]').val(),
              description: html.find('[name="description"]').val(),
              properties: html.find('[name="properties"]').val()
            };

            const itemData = {
              ...formData,
              system: systemData
            };

            const cls = getDocumentClass("Item");
            await cls.create(itemData, { parent: this.actor });
            ui.notifications.info(`物品 "${formData.name}" 已创建`);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "create"
    }).render(true);
  }

  /**
   * 点击物品图片显示详情
   */
  async _onItemImageClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) {
      ui.notifications.error("找不到物品");
      return;
    }

    const content = await renderTemplate("systems/shuhai-dalu/templates/dialog/item-detail-dialog.hbs", {
      item: item.toObject()
    });

    new Dialog({
      title: item.name,
      content: content,
      buttons: {
        edit: {
          icon: '<i class="fas fa-edit"></i>',
          label: "编辑",
          callback: () => {
            item.sheet.render(true);
          }
        },
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "关闭"
        }
      },
      default: "close"
    }, {
      width: 520
    }).render(true);
  }

  /**
   * 搜索物品
   */
  _onSearchItems(event) {
    const searchTerm = event.target.value.toLowerCase();
    const inventoryList = event.target.closest('form').querySelector('#inventory-list');
    const items = inventoryList.querySelectorAll('.inventory-item');

    items.forEach(item => {
      const itemName = item.querySelector('.item-name').textContent.toLowerCase();
      const itemType = item.querySelector('.item-type').textContent.toLowerCase();

      if (itemName.includes(searchTerm) || itemType.includes(searchTerm)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  }

  /**
   * 快速过滤
   */
  _onQuickFilter(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const filter = button.dataset.filter;
    const searchInput = event.target.closest('form').querySelector('#item-search');

    // 切换按钮激活状态
    const allButtons = event.target.closest('.search-section').querySelectorAll('.quick-filter-btn');
    allButtons.forEach(btn => btn.classList.remove('active'));

    if (searchInput.value === filter) {
      // 如果已经是当前过滤，则清除
      searchInput.value = '';
    } else {
      // 设置新的过滤
      searchInput.value = filter;
      button.classList.add('active');
    }

    // 触发搜索
    searchInput.dispatchEvent(new Event('input'));
  }
}