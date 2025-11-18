/**
 * 书海大陆 Player 角色表单 - 重新设计版本
 */
export default class ShuhaiPlayerSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "actor", "player-sheet"],
      width: 1110,
      height: 1180,
      tabs: [],
      dragDrop: [
        { dragSelector: ".inventory-row", dropSelector: ".slot-content, .inventory-row, .inventory-list" }
      ],
      scrollY: [".collapsible-sections-container", ".inventory-list"]
    });
  }

  /** @override */
  get template() {
    return `systems/shuhai-dalu/templates/actor/actor-player-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async _render(force, options) {
    // 保存滚动位置
    const scrollPositions = {};
    if (this.element && this.element.length > 0) {
      const scrollElements = [
        { selector: '.collapsible-sections-container', key: 'sections' },
        { selector: '.inventory-list', key: 'inventory' }
      ];

      scrollElements.forEach(({ selector, key }) => {
        const element = this.element.find(selector)[0];
        if (element) {
          scrollPositions[key] = element.scrollTop;
        }
      });
    }

    // 执行渲染
    await super._render(force, options);

    // 恢复滚动位置
    if (Object.keys(scrollPositions).length > 0) {
      setTimeout(() => {
        const scrollElements = [
          { selector: '.collapsible-sections-container', key: 'sections' },
          { selector: '.inventory-list', key: 'inventory' }
        ];

        scrollElements.forEach(({ selector, key }) => {
          const element = this.element.find(selector)[0];
          if (element && scrollPositions[key] !== undefined) {
            element.scrollTop = scrollPositions[key];
          }
        });
      }, 0);
    }
  }

  /** @override */
  async getData() {
    const context = super.getData();

    // 直接使用this.actor.system而不是toObject，确保获取最新的derived数据
    context.system = this.actor.system;
    context.flags = this.actor.flags;
    context.rollData = this.actor.getRollData();

    // 锁定状态（默认为游玩模式，即锁定）
    context.isLocked = this.actor.getFlag('shuhai-dalu', 'isLocked') ?? true;

    // 准备角色数据
    this._prepareCharacterData(context);

    // 准备物品数据
    this._prepareItems(context);

    // 计算最大经验值
    context.maxExp = this._getMaxExpForLevel(context.system.level);

    return context;
  }

  /**
   * 获取指定等级的最大经验值
   */
  _getMaxExpForLevel(level) {
    const expTable = [300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000];
    const index = Math.min(Math.max(level - 1, 0), expTable.length - 1);
    return expTable[index];
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

    // 为每个物品添加中文类型名称、确保有正确的ID、并标记是否已装备
    context.items = context.actor.items.contents.map(item => {
      const itemObj = item.toObject(false);
      const isEquipped = this._isItemEquipped(item);
      return {
        ...itemObj,
        // 确保_id正确设置
        _id: item.id,
        // 添加类型标签
        typeLabel: typeNames[item.type] || item.type,
        // 标记是否已装备
        isEquipped: isEquipped
      };
    });
  }

  /**
   * 检查物品是否已装备
   */
  _isItemEquipped(item) {
    const equipment = this.actor.system.equipment;
    const itemId = item.id;

    // 检查各种装备槽
    if (equipment.weapon === itemId) return true;
    if (equipment.armor === itemId) return true;
    if (equipment.defenseDice === itemId) return true;
    if (equipment.triggerDice === itemId) return true;
    if (equipment.combatDice && equipment.combatDice.includes(itemId)) return true;
    if (equipment.passives && equipment.passives.includes(itemId)) return true;
    if (equipment.gear && equipment.gear.includes(itemId)) return true;

    return false;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 游玩/编辑模式切换 - 总是可用
    html.find('.lock-btn').click(this._onToggleLock.bind(this));

    // === 折叠功能 - 总是可用 ===
    html.find('.collapsible-header').click(this._onToggleCollapse.bind(this));

    // 恢复折叠状态
    const collapsedSections = this.actor.getFlag('shuhai-dalu', 'collapsedSections') || {};
    Object.keys(collapsedSections).forEach(section => {
      if (collapsedSections[section]) {
        const header = html.find(`.collapsible-header[data-section="${section}"]`);
        const content = header.next('.collapsible-content');
        const sectionContainer = header.parent();
        header.addClass('collapsed');
        content.addClass('collapsed');
        sectionContainer.addClass('collapsed');
      }
    });

    // 以下功能需要编辑权限
    if (!this.isEditable) {
      return;
    }

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
    html.find('.unequip-btn').click(this._onUnequip.bind(this));
    html.find('.use-btn').click(this._onUseDice.bind(this));

    // === 物品相关 ===
    html.find('.create-item-btn').click(this._onItemCreateDialog.bind(this));
    html.find('.item-use-btn').click(this._onItemUse.bind(this));
    html.find('.item-edit-btn').click(this._onItemEdit.bind(this));
    html.find('.item-delete-btn').click(this._onItemDelete.bind(this));
    html.find('.item-favorite-btn').click(this._onItemFavorite.bind(this));

    // === 物品图标交互 ===
    // 单击图标包装器：编辑物品
    html.find('.item-icon-wrapper').click(this._onItemIconClick.bind(this));
    // 双击图标包装器：编辑效果描述
    html.find('.item-icon-wrapper').dblclick(this._onItemIconDblClick.bind(this));

    // === 搜索和过滤 ===
    html.find('.item-search').on('input', this._onSearchItems.bind(this));
    html.find('.favorite-filter-btn').click(this._onFavoriteFilter.bind(this));
    html.find('.advanced-filter-btn').click(this._onAdvancedFilter.bind(this));
    html.find('.sort-btn').click(this._onSortItems.bind(this));

    // 初始化排序按钮状态
    const sortBtn = html.find('.sort-btn');
    if (!this.sortState) {
      this.sortState = 'manual';
    }
    if (this.sortState === 'manual') {
      sortBtn.html('<i class="fas fa-sort"></i>');
      sortBtn.attr('title', '排序：手动排序（可拖动）');
    } else {
      sortBtn.html('<i class="fas fa-sort-alpha-down"></i>');
      sortBtn.attr('title', '排序：类型排序');
    }

    // 【修复】立即应用当前的排序状态，确保DOM按正确的顺序显示
    // 这样打开角色卡时就会立即按手动排序的sort值排列物品
    this._sortInventoryItems();
  }

  /**
   * 排序物品 - 切换类型排序和手动排序
   */
  _onSortItems(event) {
    event.preventDefault();

    // 获取当前排序状态（默认为手动排序）
    const currentSort = this.sortState || 'manual';

    // 切换排序模式：手动排序 <-> 类型排序
    if (currentSort === 'manual') {
      this.sortState = 'type';
    } else {
      this.sortState = 'manual';
    }

    // 更新按钮显示
    const btn = $(event.currentTarget);
    if (this.sortState === 'manual') {
      btn.html('<i class="fas fa-sort"></i>');
      btn.attr('title', '排序：手动排序（可拖动）');
      ui.notifications.info('已切换到手动排序（可拖动物品重新排列）');
    } else {
      btn.html('<i class="fas fa-sort-alpha-down"></i>');
      btn.attr('title', '排序：类型排序');
      ui.notifications.info('已切换到类型排序');
    }

    // 执行排序
    this._sortInventoryItems();
  }

  /**
   * 执行物品排序
   */
  _sortInventoryItems() {
    const inventoryList = this.element.find('.inventory-list');
    const items = inventoryList.find('.inventory-row').toArray();

    items.sort((a, b) => {
      const aId = $(a).data('item-id');
      const bId = $(b).data('item-id');
      const aItem = this.actor.items.get(aId);
      const bItem = this.actor.items.get(bId);

      if (!aItem || !bItem) return 0;

      if (this.sortState === 'type') {
        // 类型排序：按类型分组
        const typeOrder = {
          'combatDice': 1,
          'shootDice': 2,
          'defenseDice': 3,
          'triggerDice': 4,
          'passiveDice': 5,
          'weapon': 6,
          'armor': 7,
          'equipment': 8,
          'item': 9
        };

        const aTypeOrder = typeOrder[aItem.type] || 99;
        const bTypeOrder = typeOrder[bItem.type] || 99;

        if (aTypeOrder !== bTypeOrder) {
          return aTypeOrder - bTypeOrder;
        }
        // 同类型按名称排序
        return aItem.name.localeCompare(bItem.name, 'zh-CN');
      } else {
        // 手动排序：按sort值排序
        return (aItem.sort || 0) - (bItem.sort || 0);
      }
    });

    // 重新排列DOM元素
    items.forEach(item => {
      inventoryList.append(item);
    });

    // 更新拖动状态
    const rows = inventoryList.find('.inventory-row');
    if (this.sortState === 'type') {
      // 类型排序模式：禁用拖动
      rows.attr('draggable', 'false');
      rows.css('opacity', '1');
    } else {
      // 手动排序模式：启用拖动
      rows.attr('draggable', 'true');
      rows.css('opacity', '1');
    }
  }

  /** @override */
  _canDragStart(selector) {
    // 检查是否为物品栏拖动
    if (selector === '.inventory-row') {
      // 只有在手动排序模式下才允许拖动物品栏
      return this.isEditable && this.sortState !== 'type';
    }
    return this.isEditable;
  }

  /** @override */
  _canDragDrop(selector) {
    return true; // 允许所有拖放操作，包括从外部拖入
  }

  /** @override */
  _onDragStart(event) {
    const li = event.currentTarget;
    if ( event.target.classList.contains("content-link") ) return;

    // 获取物品ID
    let itemId = li.dataset.itemId;
    if (!itemId) {
      const wrapper = li.closest('[data-item-id]');
      itemId = wrapper?.dataset.itemId;
    }

    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    // 设置拖动数据
    const dragData = item.toDragData();
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
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
   * 切换折叠状态
   */
  _onToggleCollapse(event) {
    event.preventDefault();
    event.stopPropagation();

    const header = $(event.currentTarget);
    const section = header.data('section');

    // 查找对应的内容区域和父容器
    const content = header.next('.collapsible-content');
    const sectionContainer = header.parent();

    // 切换折叠状态
    header.toggleClass('collapsed');
    content.toggleClass('collapsed');
    sectionContainer.toggleClass('collapsed');

    // 保存折叠状态到 flag
    const collapsedSections = this.actor.getFlag('shuhai-dalu', 'collapsedSections') || {};
    collapsedSections[section] = header.hasClass('collapsed');
    this.actor.setFlag('shuhai-dalu', 'collapsedSections', collapsedSections);
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

    // 动态导入战斗区域应用
    const CombatAreaApplication = (await import('../applications/combat-area.mjs')).default;

    // 创建或显示战斗区域窗口
    if (!this.combatAreaApp) {
      this.combatAreaApp = new CombatAreaApplication(this.actor);
    }

    this.combatAreaApp.render(true);
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

    // 使用模板渲染对话框内容
    const content = await renderTemplate("systems/shuhai-dalu/templates/dialog/create-item.hbs", {});

    new Dialog({
      title: "创建物品",
      content: content,
      buttons: {
        create: {
          icon: '<i class="fas fa-check"></i>',
          label: "创建",
          callback: async (html) => {
            // 不使用 FormDataExtended，直接使用 jQuery 选择器获取值
            const type = html.find('[name="type"]').val();
            const name = html.find('[name="name"]').val() || `新${this._getTypeName(type)}`;

            // 构建物品数据
            const itemData = {
              name: name,
              type: type,
              system: {
                category: html.find('[name="category"]:not(:disabled)').val() || '',
                diceFormula: html.find('[name="diceFormula"]').val() || this._getDefaultDiceFormula(type),
                cost: html.find('[name="cost"]').val() || '-',
                tags: html.find('[name="tags"]').val() || '',
                effect: html.find('[name="effect"]').val() || '',
                quantity: parseInt(html.find('[name="quantity"]').val()) || 1,
                starlightCost: parseInt(html.find('[name="starlightCost"]').val()) || 0
              }
            };

            // 如果是防具，添加防具属性
            if (type === 'armor') {
              itemData.system.armorProperties = {
                slashUp: html.find('[name="slashUp"]').is(':checked'),
                pierceUp: html.find('[name="pierceUp"]').is(':checked'),
                bluntUp: html.find('[name="bluntUp"]').is(':checked'),
                slashDown: html.find('[name="slashDown"]').is(':checked'),
                pierceDown: html.find('[name="pierceDown"]').is(':checked'),
                bluntDown: html.find('[name="bluntDown"]').is(':checked')
              };
            }

            const cls = getDocumentClass("Item");
            const item = await cls.create(itemData, { parent: this.actor });

            if (item) {
              ui.notifications.info(`已创建物品: ${item.name}`);
            }
          }
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "取消"
        }
      },
      default: "create",
      render: (html) => {
        // 在对话框渲染后，确保脚本已执行
        // 脚本已经在模板中，会自动执行
      }
    }, {
      width: 600,
      height: 'auto'
    }).render(true);
  }

  /**
   * 获取类型的默认骰数
   */
  _getDefaultDiceFormula(type) {
    const defaults = {
      'combatDice': '1d6+3',
      'shootDice': '1d6+3',
      'defenseDice': '1d10',
      'triggerDice': '★',
      'passiveDice': 'O',
      'weapon': '▼',
      'armor': '▼',
      'item': '▼',
      'equipment': '▼'
    };
    return defaults[type] || '▼';
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

    if (!item) return;

    // 根据物品类型分发到不同的处理方法
    switch (item.type) {
      case 'combatDice':
      case 'shootDice':
        // 战斗骰：发起对抗
        await this._useItemAsCombatDice(item);
        break;

      case 'triggerDice':
        // 触发骰：消耗EX资源并使用
        await this._useItemAsTriggerDice(item);
        break;

      case 'weapon':
      case 'armor':
      case 'equipment':
      case 'item':
      case 'passiveDice':
        // 装备类物品：发送使用消息并触发效果
        await this._useItemAsEquipment(item);
        break;

      case 'defenseDice':
        // 守备骰只能在对抗时使用
        ui.notifications.warn("守备骰只能在对抗时使用");
        break;

      default:
        // 其他类型，调用默认的use方法（如果存在）
        if (item.use) {
          await item.use();
        }
        break;
    }
  }

  /**
   * 使用战斗骰发起对抗
   */
  async _useItemAsCombatDice(item) {
    // 请求调整值
    const adjustment = await this._requestAdjustmentForInitiate();
    if (adjustment === null) return; // 用户取消

    // 计算BUFF加成（从Actor的flags中获取战斗状态）
    const buffBonus = this._calculateInitiatorBuffBonus();

    // 获取选择的目标（如果有）
    const targets = Array.from(game.user.targets);
    const targetActor = targets.length > 0 ? targets[0].actor : null;

    // 创建发起数据（不提前投骰，等对抗时再投）
    const initiateData = {
      initiatorId: this.actor.id,
      initiatorName: this.actor.name,
      diceId: item.id,
      diceName: item.name,
      diceFormula: item.system.diceFormula,
      diceImg: item.img,
      diceCost: item.system.cost || 0,
      diceType: item.type,
      diceCategory: item.system.category || '',
      diceEffect: item.system.effect || '无特殊效果',
      diceRoll: null, // 不提前投骰
      buffBonus: buffBonus,
      adjustment: adjustment,
      targetId: targetActor ? targetActor.id : null,
      targetName: targetActor ? targetActor.name : null
    };

    // 创建发起对抗聊天卡片
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: await renderTemplate("systems/shuhai-dalu/templates/chat/combat-dice-initiate.hbs", initiateData),
      sound: CONFIG.sounds.dice,
      flags: {
        'shuhai-dalu': {
          initiateData: initiateData
        }
      }
    };

    await ChatMessage.create(chatData);
    ui.notifications.info(`${item.name} 发起对抗！`);
  }

  /**
   * 使用触发骰（消耗1个EX资源）
   */
  async _useItemAsTriggerDice(item) {
    // 从Actor的flags中获取战斗状态
    let combatState = this.actor.getFlag('shuhai-dalu', 'combatState');

    // 如果没有combatState，初始化一个（默认拥有3个EX资源）
    if (!combatState) {
      combatState = {
        exResources: [true, true, true],
        costResources: [false, false, false, false, false, false],
        activatedDice: [false, false, false, false, false, false],
        buffs: []
      };
      await this.actor.setFlag('shuhai-dalu', 'combatState', combatState);
    }

    // 确保exResources存在且正确
    if (!combatState.exResources || combatState.exResources.length !== 3) {
      combatState.exResources = [true, true, true];
    }

    // 检查是否有可用的EX资源（找到第一个true，表示拥有资源）
    const availableIndex = combatState.exResources.findIndex(ex => ex === true);

    if (availableIndex === -1) {
      ui.notifications.warn("没有可用的EX资源！");
      return;
    }

    // 消耗1个EX资源（将true变为false，实心变空心）
    combatState.exResources[availableIndex] = false;
    await this.actor.setFlag('shuhai-dalu', 'combatState', combatState);

    // 发送使用消息到聊天框
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div style="border: 2px solid #E1AA43; border-radius: 4px; padding: 12px; background: #0F0D1B; color: #EBBD68; font-family: 'Noto Sans SC', sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #E1AA43;">使用触发骰: ${item.name}</h3>
          <div style="color: #888; margin-bottom: 8px;">消耗: <span style="color: #c14545; font-weight: bold;">1 EX资源</span></div>
          ${item.system.category ? `<div style="color: #888; margin-bottom: 8px;">分类: ${item.system.category}</div>` : ''}
          <div style="color: #EBBD68;">${item.system.effect || '无特殊效果'}</div>
        </div>
      `
    };

    await ChatMessage.create(chatData);

    // 触发【使用时】Activities
    await this._triggerActivities(item, 'onUse');

    ui.notifications.info(`使用了 ${item.name}，消耗了1个EX资源！`);

    // 刷新角色表以显示更新后的EX资源
    this.render();
  }

  /**
   * 使用装备类物品
   */
  async _useItemAsEquipment(item) {
    // 发送使用消息到聊天框
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: `
        <div style="border: 2px solid #E1AA43; border-radius: 4px; padding: 12px; background: #0F0D1B; color: #EBBD68; font-family: 'Noto Sans SC', sans-serif;">
          <h3 style="margin: 0 0 8px 0; color: #E1AA43;">使用${this._getItemTypeName(item.type)}: ${item.name}</h3>
          ${item.system.cost ? `<div style="color: #888; margin-bottom: 8px;">费用: ${item.system.cost}</div>` : ''}
          ${item.system.category ? `<div style="color: #888; margin-bottom: 8px;">分类: ${item.system.category}</div>` : ''}
          <div style="color: #EBBD68;">${item.system.effect || '无特殊效果'}</div>
        </div>
      `
    };

    await ChatMessage.create(chatData);

    // 触发【使用时】Activities（如果物品支持）
    await this._triggerActivities(item, 'onUse');

    ui.notifications.info(`使用了 ${item.name}！`);
  }

  /**
   * 获取物品类型的中文名称
   */
  _getItemTypeName(type) {
    const typeNames = {
      'weapon': '武器',
      'armor': '防具',
      'equipment': '装备',
      'item': '物品',
      'passiveDice': '被动骰',
      'combatDice': '战斗骰',
      'shootDice': '射击骰',
      'defenseDice': '守备骰',
      'triggerDice': '触发骰'
    };
    return typeNames[type] || type;
  }

  /**
   * 请求发起者的调整值
   */
  async _requestAdjustmentForInitiate() {
    return new Promise((resolve) => {
      new Dialog({
        title: "输入调整值",
        content: `
          <form>
            <div class="form-group">
              <label>调整值:</label>
              <input type="number" name="adjustment" value="0" style="width: 100%; padding: 0.5rem; background: #0F0D1B; border: 1px solid #EBBD68; color: #EBBD68; border-radius: 3px;"/>
            </div>
          </form>
        `,
        buttons: {
          confirm: {
            icon: '<i class="fas fa-check"></i>',
            label: "确认",
            callback: (html) => {
              const adj = parseInt(html.find('[name="adjustment"]').val()) || 0;
              resolve(adj);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "取消",
            callback: () => resolve(null)
          }
        },
        default: "confirm"
      }).render(true);
    });
  }

  /**
   * 计算发起者的BUFF加成
   */
  _calculateInitiatorBuffBonus() {
    let bonus = 0;

    // 从Actor的flags中获取战斗状态
    const combatState = this.actor.getFlag('shuhai-dalu', 'combatState');
    if (!combatState || !combatState.buffs) return bonus;

    for (const buff of combatState.buffs) {
      if (buff.id === 'strong') {
        // 强壮：骰数增加
        bonus += buff.layers;
      } else if (buff.id === 'weak') {
        // 虚弱：骰数减少
        bonus -= buff.layers;
      }
      // 可以添加更多BUFF效果
    }

    return bonus;
  }

  /**
   * 触发物品的Activities
   */
  async _triggerActivities(item, trigger) {
    // 检查物品是否有Activities
    if (!item.system.activities) {
      return;
    }

    // 兼容对象和数组两种格式
    const activitiesArray = Array.isArray(item.system.activities)
      ? item.system.activities
      : Object.values(item.system.activities);

    if (activitiesArray.length === 0) {
      return;
    }

    // 过滤出符合触发条件的Activities
    const activities = activitiesArray.filter(act => act.trigger === trigger);

    if (activities.length === 0) return;

    // 执行每个Activity
    for (const activity of activities) {
      console.log(`书海大陆 | 触发Activity: ${activity.name} (${trigger})`);

      // 检查是否是新格式的activity（有effects数组）
      if (activity.effects && (Array.isArray(activity.effects) || typeof activity.effects === 'object')) {
        // 使用增强版执行引擎
        try {
          const { ActivityExecutor, createContext } = await import('../helpers/activity-executor.mjs');

          // 创建执行上下文
          const context = createContext(
            this.actor,      // actor
            this.actor,      // target (默认自己)
            item,            // item
            null,            // dice
            game.combat      // combat
          );

          // 执行activity
          const result = await ActivityExecutor.execute(activity, context);

          if (result.success) {
            console.log(`书海大陆 | Activity执行成功: ${activity.name}`);

            // 发送成功消息到聊天
            const chatData = {
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              content: `
                <div style="border: 2px solid #4a9eff; border-radius: 4px; padding: 8px; background: #0F0D1B; color: #EBBD68; font-family: 'Noto Sans SC', sans-serif;">
                  <div style="font-weight: bold; color: #4a9eff; margin-bottom: 4px;">⚡ ${activity.name}</div>
                  <div style="color: #EBBD68; font-size: 13px;">触发成功</div>
                </div>
              `
            };
            await ChatMessage.create(chatData);
          } else {
            console.warn(`书海大陆 | Activity执行失败: ${activity.name}`, result.reason);
            ui.notifications.warn(`${activity.name} 执行失败: ${result.reason}`);
          }
        } catch (error) {
          console.error(`书海大陆 | Activity执行异常: ${activity.name}`, error);
          ui.notifications.error(`${activity.name} 执行异常: ${error.message}`);
        }
      }
      // 旧格式兼容（简单的effect字符串）
      else if (activity.effect) {
        const chatData = {
          user: game.user.id,
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: `
            <div style="border: 2px solid #c14545; border-radius: 4px; padding: 8px; background: #0F0D1B; color: #EBBD68; font-family: 'Noto Sans SC', sans-serif;">
              <div style="font-weight: bold; color: #c14545; margin-bottom: 4px;">⚡ ${activity.name}</div>
              <div style="color: #EBBD68; font-size: 13px;">${activity.effect}</div>
            </div>
          `
        };
        await ChatMessage.create(chatData);
      }
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
   * 装备/卸下物品（原收藏功能）
   */
  async _onItemFavorite(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    // 检查是否已装备
    const isEquipped = this._isItemEquipped(item);

    if (isEquipped) {
      // 如果已装备，则卸下
      await this._autoUnequipItem(item);
    } else {
      // 如果未装备，则自动装备
      await this._autoEquipItem(item);
    }
  }

  /**
   * 自动装备物品到合适的槽位
   */
  async _autoEquipItem(item) {
    const equipment = this.actor.system.equipment;

    // 根据物品类型找到合适的槽位
    let slotType = null;
    let slotIndex = null;

    switch (item.type) {
      case 'weapon':
        if (!equipment.weapon) {
          slotType = 'weapon';
        } else {
          ui.notifications.warn('武器槽已满，请先卸下当前武器');
          return;
        }
        break;

      case 'armor':
        if (!equipment.armor) {
          slotType = 'armor';
        } else {
          ui.notifications.warn('防具槽已满，请先卸下当前防具');
          return;
        }
        break;

      case 'defenseDice':
        if (!equipment.defenseDice) {
          slotType = 'defenseDice';
        } else {
          ui.notifications.warn('守备骰槽已满，请先卸下当前守备骰');
          return;
        }
        break;

      case 'triggerDice':
        if (!equipment.triggerDice) {
          slotType = 'triggerDice';
        } else {
          ui.notifications.warn('触发骰槽已满，请先卸下当前触发骰');
          return;
        }
        break;

      case 'combatDice':
      case 'shootDice':
        // 找到第一个空的战斗骰槽位
        slotType = 'combatDice';
        slotIndex = equipment.combatDice.findIndex(id => !id || id === '');
        if (slotIndex === -1) {
          ui.notifications.warn('战斗骰槽已满，请先卸下一个战斗骰');
          return;
        }
        break;

      case 'passiveDice':
        // 找到第一个空的被动骰槽位
        slotType = 'passiveDice';
        slotIndex = equipment.passives.findIndex(id => !id || id === '');
        if (slotIndex === -1) {
          ui.notifications.warn('被动骰槽已满，请先卸下一个被动骰');
          return;
        }
        break;

      case 'equipment':
      case 'item':
        // 找到第一个空的装备槽位
        slotType = 'gear';
        slotIndex = equipment.gear.findIndex(id => !id || id === '');
        if (slotIndex === -1) {
          ui.notifications.warn('装备槽已满，请先卸下一个装备');
          return;
        }
        break;

      default:
        ui.notifications.warn(`无法自动装备 ${item.type} 类型的物品`);
        return;
    }

    // 装备物品
    await game.shuhai.equipItem(this.actor, item, slotType, slotIndex);
  }

  /**
   * 自动卸下物品
   */
  async _autoUnequipItem(item) {
    const equipment = this.actor.system.equipment;
    const itemId = item.id;

    // 找到物品所在的槽位
    if (equipment.weapon === itemId) {
      await game.shuhai.unequipItem(this.actor, 'weapon');
    } else if (equipment.armor === itemId) {
      await game.shuhai.unequipItem(this.actor, 'armor');
    } else if (equipment.defenseDice === itemId) {
      await game.shuhai.unequipItem(this.actor, 'defenseDice');
    } else if (equipment.triggerDice === itemId) {
      await game.shuhai.unequipItem(this.actor, 'triggerDice');
    } else if (equipment.combatDice && equipment.combatDice.includes(itemId)) {
      const slotIndex = equipment.combatDice.indexOf(itemId);
      await game.shuhai.unequipItem(this.actor, 'combatDice', slotIndex);
    } else if (equipment.passives && equipment.passives.includes(itemId)) {
      const slotIndex = equipment.passives.indexOf(itemId);
      await game.shuhai.unequipItem(this.actor, 'passiveDice', slotIndex);
    } else if (equipment.gear && equipment.gear.includes(itemId)) {
      const slotIndex = equipment.gear.indexOf(itemId);
      await game.shuhai.unequipItem(this.actor, 'gear', slotIndex);
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
  * 单击物品图标：使用物品
   */
  async _onItemIconClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (item) {
      // 调用使用物品的方法
      await this._onItemUse({ preventDefault: () => {}, stopPropagation: () => {}, currentTarget: { dataset: { itemId } } });
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
   * 搜索物品（搜索名称和标签）
   */
  _onSearchItems(event) {
    const searchTerm = event.currentTarget.value.toLowerCase();
    const items = this.element.find('.inventory-row');

    items.each((i, item) => {
      const $item = $(item);
      const itemId = $item.data('item-id');
      const itemDoc = this.actor.items.get(itemId);

      if (!itemDoc) {
        $item.attr('data-filtered', 'true');
        return;
      }

      const itemName = itemDoc.name.toLowerCase();
      const itemTags = (itemDoc.system.tags || '').toLowerCase();

      // 搜索名称或标签
      if (itemName.includes(searchTerm) || itemTags.includes(searchTerm)) {
        $item.attr('data-filtered', 'false');
      } else {
        $item.attr('data-filtered', 'true');
      }
    });
  }

  /**
   * 已装备物品过滤（原收藏过滤）
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
      // 激活过滤：只显示已装备的物品
      btn.addClass('active');
      const items = this.element.find('.inventory-row');

      items.each((i, itemRow) => {
        const $item = $(itemRow);
        const itemId = $item.data('item-id');
        const item = this.actor.items.get(itemId);

        if (item && this._isItemEquipped(item)) {
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
   * 处理物品拖放到装备槽或物品栏
   */
  async _onDropItem(event, data) {
    const item = await Item.implementation.fromDropData(data);
    const itemData = item.toObject();

    // 检查拖放目标 - 优先检查是否拖放到装备槽
    const dropTarget = event.target.closest('.slot-content');
    const inventoryRow = event.target.closest('.inventory-row');
    const inventoryList = event.target.closest('.inventory-list');

    if (dropTarget) {
      // 拖放到装备槽的逻辑
      // 如果是从其他角色或 FVTT 侧边栏拖入，需要先创建物品副本
      if (!item.parent || item.parent.id !== this.actor.id) {
        delete itemData._id;
        const createdItems = await this.actor.createEmbeddedDocuments("Item", [itemData]);

        if (createdItems && createdItems.length > 0) {
          const newItem = createdItems[0];

          const slotType = dropTarget.dataset.slot;
          const slotIndex = dropTarget.dataset.slotIndex !== undefined ?
            parseInt(dropTarget.dataset.slotIndex) : null;

          // 验证物品类型匹配槽位
          if (!this._validateItemForSlot(newItem, slotType)) {
            return false;
          }

          // 装备新创建的物品
          await game.shuhai.equipItem(this.actor, newItem, slotType, slotIndex);
        }

        return false;
      }

      // 如果是从自己的物品栏拖入装备槽
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

    // 拖放到物品栏的逻辑（没有找到 .slot-content）
    if (inventoryRow || inventoryList) {
      // 检查是否是从其他角色或外部拖入
      if (!item.parent || item.parent.id !== this.actor.id) {
        delete itemData._id;
        return this.actor.createEmbeddedDocuments("Item", [itemData]);
      }

      // 检查当前是否为类型排序模式
      if (this.sortState === 'type') {
        ui.notifications.warn('请先切换到手动排序模式才能拖动排序');
        return false;
      }

      // 如果拖放到特定的物品行，需要设置 sortBefore
      if (inventoryRow) {
        const targetItemId = inventoryRow.dataset.itemId;
        const targetItem = this.actor.items.get(targetItemId);

        if (targetItem && targetItem.id !== item.id) {
          // 获取所有兄弟物品
          const siblings = this.actor.items.filter(i => i.id !== item.id);

          // 计算新的排序值（使用新的API）
          const sortUpdates = foundry.utils.performIntegerSort(item, {
            target: targetItem,
            siblings: siblings
          });

          // 应用更新
          const updateData = sortUpdates.map(u => ({
            _id: u.target.id,
            ...u.update
          }));

          await Item.updateDocuments(updateData, {parent: this.actor});

          // 由于Foundry的items集合可能延迟更新，我们手动更新本地item对象的sort值
          // 确保_sortInventoryItems()能读取到最新的sort值
          for (const update of sortUpdates) {
            const itemToUpdate = this.actor.items.get(update.target.id);
            if (itemToUpdate && update.update.sort !== undefined) {
              // 直接更新item对象的_source.sort，这样get()能立即读取到新值
              itemToUpdate._source.sort = update.update.sort;
            }
          }

          // 直接调用_sortInventoryItems()重新排序DOM
          // 现在它能读取到我们刚刚更新的sort值了
          this._sortInventoryItems();

          return false;
        }
      }

      // 默认使用父类的排序逻辑
      return super._onDropItem(event, data);
    }

    // 其他情况使用默认逻辑
    return super._onDropItem(event, data);
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
      passiveDice: ['passiveDice'],
      gear: ['equipment', 'item']
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
        passiveDice: '被动骰',
        gear: '装备'
      };
      ui.notifications.warn(`只能装备${allowedTypes.map(t => this._getTypeName(t)).join('或')}到${slotNames[slotType]}槽位`);
      return false;
    }

    return true;
  }
}
