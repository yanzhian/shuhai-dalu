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

    // 为每个物品添加中文类型名称和确保有正确的ID
    context.items = context.actor.items.contents.map(item => {
      const itemObj = item.toObject(false);
      return {
        ...itemObj,
        // 确保_id正确设置
        _id: item.id,
        // 添加类型标签
        typeLabel: typeNames[item.type] || item.type
      };
    });

    console.log('书海大陆 | 准备物品数据', {
      itemCount: context.items.length,
      firstItem: context.items[0] ? {
        id: context.items[0]._id,
        name: context.items[0].name,
        type: context.items[0].type
      } : null
    });
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

    // === 拖放 - 只有图标可拖动 ===
    this._setupDragAndDrop(html);

    console.log('书海大陆 | Player Sheet 事件监听器绑定完成');
  }

  /**
   * 设置拖放功能
   */
  _setupDragAndDrop(html) {
    // 为物品图标包装器设置拖放
    html.find('.col-icon .item-icon-wrapper').each((i, wrapper) => {
      wrapper.addEventListener('dragstart', this._onDragItemStart.bind(this), false);
      wrapper.addEventListener('dragend', this._onDragItemEnd.bind(this), false);
    });

    // 为物品行设置drop区域（用于位置交换）
    html.find('.inventory-row').each((i, row) => {
      row.addEventListener('dragover', this._onDragOver.bind(this), false);
      row.addEventListener('drop', this._onDropOnRow.bind(this), false);
      row.addEventListener('dragleave', this._onDragLeave.bind(this), false);
    });
  }

  /**
   * 拖动物品图标开始
   */
  _onDragItemStart(event) {
    const wrapper = event.currentTarget;
    const itemId = wrapper.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    // 添加拖动样式
    const row = wrapper.closest('.inventory-row');
    if (row) {
      row.classList.add('dragging');
    }

    // 设置拖动数据
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'Item',
      uuid: item.uuid,
      itemId: itemId
    }));
  }

  /**
   * 拖动物品图标结束
   */
  _onDragItemEnd(event) {
    const wrapper = event.currentTarget;
    const row = wrapper.closest('.inventory-row');
    if (row) {
      row.classList.remove('dragging');
    }

    // 清除所有drag-over样式
    this.element.find('.drag-over').removeClass('drag-over');
  }

  /**
   * 拖动经过
   */
  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const row = event.currentTarget;
    if (!row.classList.contains('dragging')) {
      row.classList.add('drag-over');
    }

    return false;
  }

  /**
   * 拖动离开
   */
  _onDragLeave(event) {
    const row = event.currentTarget;
    row.classList.remove('drag-over');
  }

  /**
   * 放下到物品行（交换位置）
   */
  async _onDropOnRow(event) {
    event.preventDefault();
    event.stopPropagation();

    const targetRow = event.currentTarget;
    targetRow.classList.remove('drag-over');

    // 获取拖动的物品
    const data = event.dataTransfer.getData('text/plain');
    if (!data) return;

    const dragData = JSON.parse(data);
    const dragItemId = dragData.itemId;
    const targetItemId = targetRow.dataset.itemId;

    if (!dragItemId || !targetItemId || dragItemId === targetItemId) return;

    // 交换两个物品的sort值
    await this._swapItemPositions(dragItemId, targetItemId);
  }

  /**
   * 交换两个物品的位置
   */
  async _swapItemPositions(itemId1, itemId2) {
    const item1 = this.actor.items.get(itemId1);
    const item2 = this.actor.items.get(itemId2);

    if (!item1 || !item2) return;

    const sort1 = item1.sort;
    const sort2 = item2.sort;

    await item1.update({ sort: sort2 });
    await item2.update({ sort: sort1 });

    ui.notifications.info("物品位置已交换");
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
                category: html.find('[name="category"]').val(),
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
