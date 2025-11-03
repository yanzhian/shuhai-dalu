import InventoryApp from "../apps/inventory-app.mjs";

/**
 * 书海大陆 Player 角色表单 - 重新设计版本
 */
export default class ShuhaiPlayerSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "actor", "player-sheet"],
      width: 1400,
      height: 900,
      tabs: [],
      dragDrop: [
        { dragSelector: ".item-icon[draggable]", dropSelector: ".slot-content, .inventory-row" }
      ],
      scrollY: [".info-right", ".equipment-panel", ".inventory-table"]
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

    // Tidy锁定状态（控制数值编辑）
    context.isTidyLocked = this.actor.getFlag('shuhai-dalu', 'isTidyLocked') ?? true;

    // 准备角色数据
    this._prepareCharacterData(context);

    // 准备物品数据
    this._prepareItems(context);

    // 计算经验值相关数据
    this._prepareExperienceData(context);

    return context;
  }

  /**
   * 计算经验值相关数据
   */
  _prepareExperienceData(context) {
    // 经验等级表：300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000
    const expTable = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000];

    const currentLevel = context.system.level || 1;
    const currentExp = context.system.info.experience || 0;

    // 计算当前等级所需经验
    const currentLevelExp = currentLevel > 0 ? expTable[currentLevel - 1] : 0;

    // 计算下一等级所需经验
    const nextLevelExp = currentLevel < 12 ? expTable[currentLevel] : expTable[12];

    // 计算升级所需经验
    const expRequired = nextLevelExp - currentLevelExp;
    const expProgress = currentExp - currentLevelExp;

    // 计算进度百分比
    const progressPercent = expRequired > 0 ? Math.min(100, Math.max(0, (expProgress / expRequired) * 100)) : 100;

    context.expRequiredForNextLevel = nextLevelExp;
    context.expProgressPercent = progressPercent.toFixed(2);
  }

  /**
   * 准备角色特定数据
   */
  _prepareCharacterData(context) {
    // 属性列表 - 修改标签为中文
    context.attributes = {
      strength: { key: 'strength', label: '力量', value: context.system.attributes.strength },
      dexterity: { key: 'dexterity', label: '敏捷', value: context.system.attributes.dexterity },
      constitution: { key: 'constitution', label: '体质', value: context.system.attributes.constitution },
      perception: { key: 'perception', label: '感知', value: context.system.attributes.perception },
      intelligence: { key: 'intelligence', label: '智力', value: context.system.attributes.intelligence },
      charisma: { key: 'charisma', label: '魅力', value: context.system.attributes.charisma }
    };

    // 技能分组
    context.skillGroups = {
      strengthDex: {
        athletics: { key: 'athletics', label: '运动', value: context.system.skills.athletics },
        acrobatics: { key: 'acrobatics', label: '敏捷', value: context.system.skills.acrobatics },
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

    // === Tidy Switch 锁切换 ===
    html.find('.tidy-switch-btn').click(this._onToggleTidyLock.bind(this));

    // === 物品栏按钮 ===
    html.find('.inventory-btn').click(this._onOpenInventory.bind(this));

    // === 战斗形态按钮 ===
    html.find('.combat-form-btn').click(this._onOpenCombatForm.bind(this));

    // === 属性检定 ===
    html.find('.attr-check-btn').click(this._onAttributeRoll.bind(this));

    // === 技能相关 ===
    html.find('.skill-action-btn.plus').click(this._onSkillIncrease.bind(this));
    html.find('.skill-action-btn.minus').click(this._onSkillDecrease.bind(this));
    html.find('.skill-check-btn').click(this._onSkillRoll.bind(this));

    // === 状态按钮 ===
    html.find('.corruption-check-btn').click(this._onCorruptionCheck.bind(this));
    html.find('.long-rest-btn').click(this._onLongRest.bind(this));
    html.find('.switch-combat-btn').click(this._onSwitchCombat.bind(this));

    // === 装备相关 ===
    html.find('.slot-unequip-btn').click(this._onUnequip.bind(this));
    html.find('.slot-img').click(this._onUseDice.bind(this));

  }

  /* -------------------------------------------- */
  /*  事件处理                                      */
  /* -------------------------------------------- */

  /**
   * 切换Tidy锁定状态
   */
  async _onToggleTidyLock(event) {
    event.preventDefault();
    const currentLocked = this.actor.getFlag('shuhai-dalu', 'isTidyLocked') ?? true;
    const newLocked = !currentLocked;
    await this.actor.setFlag('shuhai-dalu', 'isTidyLocked', newLocked);
    // 显示提示
    if (newLocked) {
      ui.notifications.info("已锁定数值编辑");
    } else {
      ui.notifications.info("已解锁数值编辑");
    }
    this.render(false);
  }

  /**
   * 打开物品栏弹窗
   */
  async _onOpenInventory(event) {
    event.preventDefault();

    // 创建物品栏Application实例
    const inventory = new InventoryApp(this.actor, {
      title: `${this.actor.name} - 物品栏`
    });
    inventory.render(true);
  }

  /**
   * 打开战斗形态（研发中）
   */
  async _onOpenCombatForm(event) {
    event.preventDefault();
    ui.notifications.warn("战斗形态功能研发中...");
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
    event.stopPropagation();
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
    event.stopPropagation();
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
    event.stopPropagation();
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
    event.stopPropagation();
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
    event.stopPropagation();
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
    event.stopPropagation();
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
    event.stopPropagation();
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
  * 单击物品图标：编辑物品信息

   */

  _onItemIconClick(event) {

    event.preventDefault();

    event.stopPropagation();

    const itemId = event.currentTarget.dataset.itemId;

    const item = this.actor.items.get(itemId);

 

    if (item) {

      item.sheet.render(true);

    }

  }

 

  /**

   * 双击物品图标：编辑效果描述

   */

  async _onItemIconDblClick(event) {

    event.preventDefault();

    event.stopPropagation();

    const itemId = event.currentTarget.dataset.itemId;

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

            <textarea name="effect" rows="8" style="width: 100%; resize: vertical; padding: 0.5rem; background: #2a2a2a; border: 1px solid #3a3a3a; color: #e0e0e0; border-radius: 3px;">${currentEffect}</textarea>

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
   * 搜索物品
   */
  _onSearchItems(event) {
    const searchTerm = event.currentTarget.value.toLowerCase();
    const items = this.element.find('.inventory-row');

    items.each((i, item) => {
      const $item = $(item);
      const itemName = $item.find('.col-name').text().toLowerCase();

      if (itemName.includes(searchTerm)) {
        $item.attr('data-filtered', 'false');
      } else {
        $item.attr('data-filtered', 'true');
      }
    });
  }

  /**
   * 收藏过滤
   */
  _onFavoriteFilter(event) {
    event.preventDefault();
    const btn = $(event.currentTarget);
    const isActive = btn.hasClass('active');

    if (isActive) {
      // 取消过滤
      btn.removeClass('active');
      this.element.find('.inventory-row').attr('data-filtered', 'false');
    } else {
      // 激活过滤
      btn.addClass('active');
      const items = this.element.find('.inventory-row');

      items.each((i, item) => {
        const $item = $(item);
        const itemFavorite = $item.data('favorite');

        if (itemFavorite === true || itemFavorite === 'true') {
          $item.attr('data-filtered', 'false');
        } else {
          $item.attr('data-filtered', 'true');
        }
      });
    }
  }

  /**
   * 高级过滤对话框
   */
  _onAdvancedFilter(event) {
    event.preventDefault();

    const content = `
      <form>
        <div class="form-group">
          <label>物品类型:</label>
          <select name="filterType" style="width: 100%; padding: 0.5rem; background: #2a2a2a; border: 1px solid #3a3a3a; color: #e0e0e0; border-radius: 3px;">
            <option value="">全部</option>
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
        <div class="form-group">
          <label>分类:</label>
          <input type="text" name="filterCategory" placeholder="输入分类名称" style="width: 100%; padding: 0.5rem; background: #2a2a2a; border: 1px solid #3a3a3a; color: #e0e0e0; border-radius: 3px;"/>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" name="favoriteOnly"/> 只显示收藏
          </label>
        </div>
      </form>
    `;

    new Dialog({
      title: "高级检索",
      content: content,
      buttons: {
        filter: {
          icon: '<i class="fas fa-filter"></i>',
          label: "应用",
          callback: (html) => {
            const filterType = html.find('[name="filterType"]').val();
            const filterCategory = html.find('[name="filterCategory"]').val().toLowerCase();
            const favoriteOnly = html.find('[name="favoriteOnly"]').is(':checked');

            const items = this.element.find('.inventory-row');

            items.each((i, item) => {
              const $item = $(item);
              const itemType = $item.data('item-type');
              const itemCategory = $item.find('.col-category').text().toLowerCase();
              const itemFavorite = $item.data('favorite');

              let show = true;

              // 类型过滤
              if (filterType && itemType !== filterType) {
                show = false;
              }

              // 分类过滤
              if (filterCategory && !itemCategory.includes(filterCategory)) {
                show = false;
              }

              // 收藏过滤
              if (favoriteOnly && !(itemFavorite === true || itemFavorite === 'true')) {
                show = false;
              }

              $item.attr('data-filtered', show ? 'false' : 'true');
            });

            ui.notifications.info("已应用过滤条件");
          }
        },
        clear: {
          icon: '<i class="fas fa-times"></i>',
          label: "清除",
          callback: () => {
            this.element.find('.inventory-row').attr('data-filtered', 'false');
            this.element.find('.favorite-filter-btn').removeClass('active');
            ui.notifications.info("已清除所有过滤");
          }
        }
      },
      default: "filter"
    }).render(true);
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

    // 验证物品类型匹配槽位
    if (!this._validateItemForSlot(item, slotType)) {
      return false;
    }

    // 特殊处理战斗骰槽位
    if (slotType === 'combatDice') {
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

  /**
   * 验证物品是否可以装备到指定槽位
   */
  _validateItemForSlot(item, slotType) {
    const validations = {
      weapon: ['weapon'],
      armor: ['armor'],
      combatDice: ['combatDice', 'shootDice'],
      defenseDice: ['defenseDice'],
      triggerDice: ['triggerDice'],
      passiveDice: ['passiveDice']
    };

    const allowedTypes = validations[slotType];
    if (!allowedTypes) return false;

    if (!allowedTypes.includes(item.type)) {
      const slotNames = {
        weapon: '武器',
        armor: '防具',
        combatDice: '战斗骰',
        defenseDice: '守备骰',
        triggerDice: '触发骰',
        passiveDice: '被动骰'
      };
      ui.notifications.warn(`只能装备${allowedTypes.map(t => this._getTypeName(t)).join('或')}到${slotNames[slotType]}槽位`);
      return false;
    }

    return true;
  }
}
