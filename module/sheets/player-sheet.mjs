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
        { dragSelector: ".item-icon-wrapper[draggable]", dropSelector: ".slot-content" }
      ],
      scrollY: [".skills-section", ".equipment-section", ".inventory-list"]
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

    console.log('书海大陆 | 准备物品数据', {
      itemCount: context.items.length,
      firstItem: context.items[0] ? {
        id: context.items[0]._id,
        name: context.items[0].name,
        type: context.items[0].type,
        isEquipped: context.items[0].isEquipped
      } : null
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

    console.log('书海大陆 | Player Sheet 激活监听器', {
      isEditable: this.isEditable,
      itemButtons: html.find('.item-use-btn').length,
      iconWrappers: html.find('.item-icon-wrapper').length
    });

    // 游玩/编辑模式切换 - 总是可用
    html.find('.lock-btn').click(this._onToggleLock.bind(this));

    // 以下功能需要编辑权限
    if (!this.isEditable) {
      console.warn('书海大陆 | 角色卡不可编辑，跳过事件监听器绑定');
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

    console.log('书海大陆 | Player Sheet 事件监听器绑定完成');
  }

  /**
   * 排序物品
   */
  _onSortItems(event) {
    event.preventDefault();

    // 获取当前排序状态
    const currentSort = this.sortState || 'cost-asc';

    // 循环切换排序状态：费用升序 -> 费用降序 -> 星光升序 -> 星光降序 -> 费用升序
    const sortStates = ['cost-asc', 'cost-desc', 'starlight-asc', 'starlight-desc'];
    const currentIndex = sortStates.indexOf(currentSort);
    const nextIndex = (currentIndex + 1) % sortStates.length;
    this.sortState = sortStates[nextIndex];

    // 更新按钮显示
    const btn = $(event.currentTarget);
    const sortLabels = {
      'cost-asc': '费用↑',
      'cost-desc': '费用↓',
      'starlight-asc': '星光↑',
      'starlight-desc': '星光↓'
    };
    btn.html(`<i class="fas fa-sort"></i> ${sortLabels[this.sortState]}`);

    // 执行排序
    this._sortInventoryItems();

    ui.notifications.info(`按${sortLabels[this.sortState]}排序`);
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

      let aVal, bVal;

      if (this.sortState.startsWith('cost')) {
        // 费用排序：需要解析费用字符串
        aVal = this._parseCost(aItem.system.cost);
        bVal = this._parseCost(bItem.system.cost);
      } else {
        // 星光排序
        aVal = aItem.system.starlightCost || 0;
        bVal = bItem.system.starlightCost || 0;
      }

      // 升序或降序
      if (this.sortState.endsWith('asc')) {
        return aVal - bVal;
      } else {
        return bVal - aVal;
      }
    });

    // 重新排列DOM元素
    items.forEach(item => {
      inventoryList.append(item);
    });
  }

  /**
   * 解析费用字符串为数字
   */
  _parseCost(costStr) {
    if (!costStr || costStr === '-') return 0;

    // 如果是纯数字
    const num = parseFloat(costStr);
    if (!isNaN(num)) return num;

    // 如果包含Cost:或San:前缀
    const match = costStr.match(/(?:Cost:|San:)?(\d+)/);
    if (match) {
      return parseFloat(match[1]);
    }

    return 0;
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

    console.log('书海大陆 | 开始拖动物品', { itemId, item: item.name });
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

    // 保存滚动位置
    const scrollElement = this.element.find('.skills-content')[0];
    const scrollPos = scrollElement?.scrollTop || 0;

    await this.actor.update({ [`system.skills.${skillKey}`]: currentValue + 1 });

    // 恢复滚动位置
    setTimeout(() => {
      const newScrollElement = this.element.find('.skills-content')[0];
      if (newScrollElement) newScrollElement.scrollTop = scrollPos;
    }, 50);
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

    // 保存滚动位置
    const scrollElement = this.element.find('.skills-content')[0];
    const scrollPos = scrollElement?.scrollTop || 0;

    await this.actor.update({ [`system.skills.${skillKey}`]: currentValue - 1 });

    // 恢复滚动位置
    setTimeout(() => {
      const newScrollElement = this.element.find('.skills-content')[0];
      if (newScrollElement) newScrollElement.scrollTop = scrollPos;
    }, 50);
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

    // 保存滚动位置
    const scrollElement = this.element.find('.equipment-content')[0];
    const scrollPos = scrollElement?.scrollTop || 0;

    await game.shuhai.unequipItem(this.actor, slotType, slotIndex);

    // 恢复滚动位置
    setTimeout(() => {
      const newScrollElement = this.element.find('.equipment-content')[0];
      if (newScrollElement) newScrollElement.scrollTop = scrollPos;
    }, 50);
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

            console.log('书海大陆 | 创建物品', itemData);

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
    console.log('书海大陆 | 使用物品按钮被点击');
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    console.log('书海大陆 | 使用物品', { itemId, item: item?.name });

    if (item) {
      await item.use();
    }
  }

  /**
   * 编辑物品
   */
  _onItemEdit(event) {
    console.log('书海大陆 | 编辑物品按钮被点击');
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    console.log('书海大陆 | 编辑物品', { itemId, item: item?.name });

    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * 删除物品
   */
  async _onItemDelete(event) {
    console.log('书海大陆 | 删除物品按钮被点击');
    event.preventDefault();
    event.stopPropagation();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    console.log('书海大陆 | 删除物品', { itemId, item: item?.name });

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
  * 单击物品图标：编辑物品信息
   */
  _onItemIconClick(event) {
    console.log('书海大陆 | 物品图标被单击');
    event.preventDefault();
    event.stopPropagation();

    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    console.log('书海大陆 | 单击图标', { itemId, item: item?.name });

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
