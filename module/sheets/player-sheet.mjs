/**
 * 书海大陆 Player 角色表单 - 深色主题UI
 */
export default class ShuhaiPlayerSheet extends ActorSheet {
  
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "actor", "player-sheet"],
      width: 1200,
      height: 900,
      tabs: [],
      dragDrop: [
        { dragSelector: ".inventory-table tbody tr", dropSelector: ".equipment-slot" }
      ],
      scrollY: [".left-content", ".inventory-list"]
    });
  }

  /** @override */
  get template() {
    return `systems/shuhai-dalu/templates/actor/actor-player-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = super.getData();
    const actorData = this.actor.toObject(false);

    context.system = actorData.system;
    context.flags = actorData.flags;
    context.rollData = this.actor.getRollData();

    // 锁定状态（默认为游玩模式，即锁定）
    context.isLocked = this.actor.getFlag('shuhai-dalu', 'isLocked') ?? true;

    // 准备角色数据
    this._prepareCharacterData(context);

    // 准备物品数据
    this._prepareItems(context);

    return context;
  }

  /**
   * 准备角色特定数据
   */
  _prepareCharacterData(context) {
    // 属性列表
    context.attributes = {
      strength: { key: 'strength', label: 'Str', value: context.system.attributes.strength },
      dexterity: { key: 'dexterity', label: 'Dex', value: context.system.attributes.dexterity },
      constitution: { key: 'constitution', label: 'Con', value: context.system.attributes.constitution },
      intelligence: { key: 'intelligence', label: 'Int', value: context.system.attributes.intelligence },
      perception: { key: 'perception', label: 'Wis', value: context.system.attributes.perception },
      charisma: { key: 'charisma', label: 'Cha', value: context.system.attributes.charisma }
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
    // 为每个物品添加中文类型名称
    context.items = context.actor.items.contents.map(item => {
      return {
        ...item,
        typeLabel: typeNames[item.type] || item.type
      };
    });
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    // === 游玩/编辑模式切换 ===
    html.find('.lock-btn').click(this._onToggleLock.bind(this));

    // === 属性检定 ===
    html.find('.check-btn[data-attribute]').click(this._onAttributeRoll.bind(this));
    
    // === 技能相关 ===
    html.find('.skill-plus').click(this._onSkillIncrease.bind(this));
    html.find('.skill-minus').click(this._onSkillDecrease.bind(this));
    html.find('.check-btn[data-skill]').click(this._onSkillRoll.bind(this));
    
    // === 状态按钮 ===
    html.find('.corruption-check-btn').click(this._onCorruptionCheck.bind(this));
    html.find('.long-rest-btn').click(this._onLongRest.bind(this));
    html.find('.switch-combat-btn').click(this._onSwitchCombat.bind(this));
    
    // === 装备相关 ===
    html.find('.unequip-btn').click(this._onUnequip.bind(this));
    html.find('.use-btn').click(this._onUseDice.bind(this));
    
    // === 物品相关 ===
    html.find('.create-item-bottom-btn').click(this._onItemCreateDialog.bind(this));
    html.find('.use-item-btn').click(this._onItemUse.bind(this));
    html.find('.edit-item-btn').click(this._onItemEdit.bind(this));
    html.find('.delete-item-btn').click(this._onItemDelete.bind(this));
    html.find('.favorite-item-btn').click(this._onItemFavorite.bind(this));

    // === 物品图标点击显示详情 ===
    html.find('.item-icon').click(this._onItemIconClick.bind(this));

    // === 物品图标单元格点击编辑效果描述 ===
    html.find('.item-icon-cell').dblclick(this._onEditEffectDescription.bind(this));
    
    // === 搜索和过滤 ===
    html.find('.item-search').on('input', this._onSearchItems.bind(this));
    html.find('.filter-btn').click(this._onFilterItems.bind(this));
    
    // === 拖放 ===
    const dragHandler = ev => this._onDragStart(ev);
    html.find('.inventory-table tbody tr').each((i, tr) => {
      tr.setAttribute("draggable", true);
      tr.addEventListener("dragstart", dragHandler, false);
    });
  }

  /* -------------------------------------------- */
  /*  事件处理                                      */
  /* -------------------------------------------- */

  /**
   * 切换游玩/编辑模式
   */
  async _onToggleLock(event) {
    event.preventDefault();
    const currentLocked = this.actor.getFlag('shuhai-dalu', 'isLocked') ?? true;
    const newLocked = !currentLocked;
    await this.actor.setFlag('shuhai-dalu', 'isLocked', newLocked);
    // 显示提示
    if (newLocked) {
      ui.notifications.info("已切换到游玩模式（锁定）");
    } else {
      ui.notifications.info("已切换到编辑模式（解锁）");
    }
    this.render(false);
  }

  /**
   * 属性检定
   */
  async _onAttributeRoll(event) {
    event.preventDefault();
    const attributeKey = event.currentTarget.dataset.attribute;
    
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
   * 技能检定
   */
  async _onSkillRoll(event) {
    event.preventDefault();
    const skillKey = event.currentTarget.dataset.skill;
    
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

  /**
   * 增加技能点
   */
  async _onSkillIncrease(event) {
    event.preventDefault();
    const skillKey = event.currentTarget.dataset.skill;
    const category = event.currentTarget.dataset.category;
    
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
    const skillKey = event.currentTarget.dataset.skill;
    
    const currentValue = this.actor.system.skills[skillKey];
    if (currentValue <= 0) return;
    
    await this.actor.update({ [`system.skills.${skillKey}`]: currentValue - 1 });
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
  切换到战斗区域
   */

  async _onSwitchCombat(event) {

    event.preventDefault();

    // TODO: 实现战斗模式切换功能

    ui.notifications.warn("战斗区域功能开发中...");
  }

  /**
   * 卸下装备
   */
  async _onUnequip(event) {
    event.preventDefault();
    const slotType = event.currentTarget.dataset.slotType;
    const slotIndex = event.currentTarget.dataset.slotIndex !== undefined ? 
      parseInt(event.currentTarget.dataset.slotIndex) : null;
    
    await game.shuhai.unequipItem(this.actor, slotType, slotIndex);
  }

  /**
   * 使用骰子
   */
  async _onUseDice(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) {
      await item.use();
    }
  }

  /**
  显示创建物品对话框
   */
  async _onItemCreateDialog(event) {
    event.preventDefault();

    const content = `
      <form>
        <div class="form-group">
          <label>选择物品类型:</label>
          <select name="itemType" style="width: 100%; padding: 0.5rem; background: #2a2a2a; border: 1px solid #3a3a3a; color: #e0e0e0; border-radius: 3px;">
            <option value="combatDice">攻击骰</option>
            <option value="shootDice">射击骰</option>
            <option value="defenseDice">守备骰</option>
            <option value="triggerDice">触发骰</option>
            <option value="passiveDice">被动骰</option>
            <option value="weapon">武器</option>
            <option value="armor">防具</option>
            <option value="item">物品</option>
            <option value="equipment">装备</option>
          </select>
        </div>
      </form>
    `;

    new Dialog({
      title: "创建物品",
      content: content,
      buttons: {
        create: {
          icon: '<i class="fas fa-check"></i>',
          label: "创建",
          callback: async (html) => {
            const type = html.find('[name="itemType"]').val();
            const itemData = {
              name: `新${this._getTypeName(type)}`,
              type: type,
              system: {}
            };

            const cls = getDocumentClass("Item");
            const item = await cls.create(itemData, { parent: this.actor });

            if (item) {
              item.sheet.render(true);
            }
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
   * 使用物品
   */
  async _onItemUse(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) {
      await item.use();
    }
  }

  /**
   * 编辑物品
   */
  _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
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
    const itemId = event.currentTarget.dataset.itemId;
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
   * 收藏/取消收藏物品
   */
  async _onItemFavorite(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // 切换收藏状态
    const currentFavorite = item.system.favorite || false;
    await item.update({ "system.favorite": !currentFavorite });

    // 提示
    if (!currentFavorite) {
      ui.notifications.info(`已收藏 ${item.name}`);
    } else {
      ui.notifications.info(`已取消收藏 ${item.name}`);
    }
  }

  /**
   * 双击物品图标单元格编辑效果描述
   */
  async _onEditEffectDescription(event) {
    event.preventDefault();
    const row = $(event.currentTarget).closest('tr');
    const itemId = row.data('item-id');
    const item = this.actor.items.get(itemId);

    if (!item) return;

    // 创建编辑对话框
    const currentEffect = item.system.effect || "";

    new Dialog({
      title: `编辑效果描述 - ${item.name}`,
      content: `
        <form>
          <div class="form-group">
            <label>效果描述:</label>
            <textarea name="effect" rows="6" style="width: 100%; resize: vertical;">${currentEffect}</textarea>
          </div>
        </form>
      `,
      buttons: {
        save: {
          icon: '<i class="fas fa-save"></i>',
          label: "保存",
          callback: async (html) => {
            const newEffect = html.find('textarea[name="effect"]').val();
            await item.update({ "system.effect": newEffect });
            ui.notifications.info(`已更新 ${item.name} 的效果描述`);
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "save"
    }).render(true);
  }

  /**
   * 点击物品图标显示详情
   */
  _onItemIconClick(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    // 显示物品详情对话框
    const content = `
      <div class="item-details-dialog">
        <h3>${item.name}</h3>
        ${item.system.tags ? `<p><strong>标签:</strong> ${item.system.tags}</p>` : ''}
        ${item.system.effect ? `<div><strong>描述:</strong><div>${item.system.effect}</div></div>` : ''}
      </div>
    `;
    
    new Dialog({
      title: item.name,
      content: content,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "关闭"
        }
      }
    }).render(true);
  }

  /**
   * 搜索物品
   */
  _onSearchItems(event) {
    const searchTerm = event.currentTarget.value.toLowerCase();
    const items = this.element.find('.inventory-table tbody tr');
    
    items.each((i, item) => {
      const $item = $(item);
      const itemName = $item.find('.item-name-cell').text().toLowerCase();
      
      if (itemName.includes(searchTerm)) {
        $item.attr('data-filtered', 'false');
      } else {
        $item.attr('data-filtered', 'true');
      }
    });
  }

  /**
   * 过滤物品
   */
  _onFilterItems(event) {
    event.preventDefault();
    const filterType = event.currentTarget.dataset.filter;
    const items = this.element.find('.inventory-table tbody tr');
    const filterBtns = this.element.find('.filter-btn');

    // 更新按钮状态
    filterBtns.removeClass('active');
    $(event.currentTarget).addClass('active');

    // 过滤物品
    items.each((i, item) => {
      const $item = $(item);
      const itemType = $item.data('item-type');
      const itemFavorite = $item.data('favorite');

      if (filterType === 'all') {
        $item.attr('data-filtered', 'false');
      } else if (filterType === 'favorite') {
        // 筛选收藏的物品
        if (itemFavorite === true || itemFavorite === 'true') {
          $item.attr('data-filtered', 'false');
        } else {
          $item.attr('data-filtered', 'true');
        }
      } else if (itemType === filterType) {
        $item.attr('data-filtered', 'false');
      } else {
        $item.attr('data-filtered', 'true');
      }
    });
  }

  /* -------------------------------------------- */
  /*  拖放处理                                      */
  /* -------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);
    
    if (data.type === "Item") {
      return this._onDropItem(event, data);
    }
    
    return super._onDrop(event);
  }

  /**
   * 处理物品拖放到装备槽
   * ⭐ 修复：正确处理战斗骰数组槽位
   */
  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);
    const itemData = item.toObject();
    
    // 检查是否是从其他角色拖过来的
    if (item.parent && item.parent.id !== this.actor.id) {
      delete itemData._id;
      return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }
    
    // 检查拖放目标
    const dropTarget = event.target.closest('.slot-content');
    if (!dropTarget) {
      return super._onDropItem(event, data);
    }
    
    const slotType = dropTarget.dataset.slot;
    const slotIndex = dropTarget.dataset.slotIndex !== undefined ? 
      parseInt(dropTarget.dataset.slotIndex) : null;
    
    // ⭐ 特殊处理战斗骰槽位
    if (slotType === 'combatDice') {
      // 验证物品类型
      if (item.type !== 'combatDice' && item.type !== 'shootDice') {
        ui.notifications.warn("只能装备攻击骰或射击骰到战斗骰槽位");
        return false;
      }
      
      // 检查是否已经装备在其他战斗骰槽位
      const currentCombatDice = this.actor.system.equipment.combatDice;
      const existingIndex = currentCombatDice.findIndex(diceId => diceId === item.id);
      
      if (existingIndex !== -1 && existingIndex !== slotIndex) {
        ui.notifications.warn("该战斗骰已经装备在其他槽位");
        return false;
      }
    }
    
    // 装备物品到槽位
    await game.shuhai.equipItem(this.actor, item, slotType, slotIndex);
    
    return false;
  }
}
