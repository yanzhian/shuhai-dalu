/**
 * 书海大陆角色表单
 */
export default class ShuhaiActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "actor", "character"],
      width: 1200,
      height: 900,
      tabs: [],
      dragDrop: [
        { dragSelector: ".inventory-item", dropSelector: null },
        { dragSelector: ".equipped-item-card", dropSelector: null }
      ],
      scrollY: [".inventory-list"]
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

    // 注册 Handlebars helpers
    this._registerHelpers();

    return context;
  }

  /**
   * 注册 Handlebars helpers
   */
  _registerHelpers() {
    Handlebars.registerHelper('hp-percentage', function(current, max) {
      if (!max || max === 0) return 0;
      return Math.min(100, Math.max(0, (current / max) * 100));
    });

    Handlebars.registerHelper('range', function(start, end) {
      const result = [];
      for (let i = start; i < end; i++) {
        result.push(i);
      }
      return result;
    });

    Handlebars.registerHelper('concat', function(...args) {
      args.pop(); // Remove the options object
      return args.join('');
    });

    Handlebars.registerHelper('lookup', function(obj, key) {
      return obj ? obj[key] : null;
    });
  }

  /**
   * 准备角色特定数据
   */
  _prepareCharacterData(context) {
    const system = context.system;

    // 属性列表
    context.attributes = {
      strength: { key: 'strength', label: '力量', value: system.attributes.strength.value },
      constitution: { key: 'constitution', label: '体质', value: system.attributes.constitution.value },
      dexterity: { key: 'dexterity', label: '敏捷', value: system.attributes.dexterity.value },
      perception: { key: 'perception', label: '感知', value: system.attributes.perception.value },
      intelligence: { key: 'intelligence', label: '智力', value: system.attributes.intelligence.value },
      charisma: { key: 'charisma', label: '魅力', value: system.attributes.charisma.value }
    };

    // 技能分类
    context.skillGroups = {
      physical: {
        label: '力敏系',
        athletics: { key: 'athletics', label: '运动', value: system.skills.athletics },
        acrobatics: { key: 'acrobatics', label: '体操', value: system.skills.acrobatics },
        sleight: { key: 'sleight', label: '巧手', value: system.skills.sleight },
        stealth: { key: 'stealth', label: '隐蔽', value: system.skills.stealth }
      },
      intelligence: {
        label: '智力系',
        qidian: { key: 'qidian', label: '奇点', value: system.skills.qidian },
        history: { key: 'history', label: '历史', value: system.skills.history },
        investigation: { key: 'investigation', label: '调查', value: system.skills.investigation },
        nature: { key: 'nature', label: '自然', value: system.skills.nature },
        religion: { key: 'religion', label: '宗教', value: system.skills.religion }
      },
      perception: {
        label: '感知系',
        animal: { key: 'animal', label: '驯兽', value: system.skills.animal },
        insight: { key: 'insight', label: '洞悉', value: system.skills.insight },
        medicine: { key: 'medicine', label: '医药', value: system.skills.medicine },
        perception: { key: 'perception', label: '察觉', value: system.skills.perception },
        survival: { key: 'survival', label: '求生', value: system.skills.survival }
      },
      charisma: {
        label: '魅力系',
        deception: { key: 'deception', label: '欺瞒', value: system.skills.deception },
        intimidation: { key: 'intimidation', label: '威吓', value: system.skills.intimidation },
        performance: { key: 'performance', label: '表演', value: system.skills.performance },
        persuasion: { key: 'persuasion', label: '游说', value: system.skills.persuasion }
      }
    };

    // 技能上限值
    context.skillMaxValues = system.skillMaxValues || {
      physical: 0,
      intelligence: 0,
      perception: 0,
      charisma: 0
    };
  }

  /**
   * 准备物品数据
   */
  _prepareItems(context) {
    const inventoryItems = [];
    const equippedItems = {};

    // 分类物品
    for (let item of context.items) {
      item.img = item.img || DEFAULT_TOKEN;

      // 添加类型标签
      item.typeLabel = this._getItemTypeLabel(item.type);

      // 检查是否已装备
      const equippedSlot = this._findEquippedSlot(item._id);
      if (equippedSlot) {
        equippedItems[equippedSlot] = item;
      } else {
        inventoryItems.push(item);
      }
    }

    context.inventoryItems = inventoryItems;
    context.equippedItems = equippedItems;
  }

  /**
   * 获取物品类型标签
   */
  _getItemTypeLabel(type) {
    const labels = {
      'combatDice': '攻击骰',
      'shootDice': '射击骰',
      'defenseDice': '守备骰',
      'triggerDice': '触发骰',
      'passiveDice': '被动骰',
      'weapon': '武器',
      'armor': '防具',
      'item': '物品',
      'equipment': '装备'
    };
    return labels[type] || type;
  }

  /**
   * 查找物品装备在哪个槽位
   */
  _findEquippedSlot(itemId) {
    const equipment = this.actor.system.equipment;
    for (const [slot, id] of Object.entries(equipment)) {
      if (id === itemId) {
        return slot;
      }
    }
    return null;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 只在拥有权限时添加监听器
    if (!this.isEditable) return;

    // 头像点击
    html.find('.profile-img').click(this._onEditImage.bind(this));

    // 锁定切换
    html.find('.edit-lock-toggle').click(this._onToggleLock.bind(this));

    // 属性检定
    html.find('.attr-roll-btn').click(this._onAttributeRoll.bind(this));

    // 技能检定
    html.find('.skill-roll-btn').click(this._onSkillRoll.bind(this));

    // 动作按钮
    html.find('[data-action="long-rest"]').click(this._onLongRest.bind(this));
    html.find('[data-action="corruption-check"]').click(this._onCorruptionCheck.bind(this));
    html.find('[data-action="battle-form"]').click(this._onBattleForm.bind(this));

    // 物品相关
    html.find('[data-action="create-item"]').click(this._onItemCreate.bind(this));
    html.find('[data-action="edit-item"]').click(this._onItemEdit.bind(this));
    html.find('[data-action="delete-item"]').click(this._onItemDelete.bind(this));
    html.find('[data-action="search-item"]').on('input', this._onSearchItem.bind(this));
    html.find('[data-action="filter-item"]').change(this._onFilterItem.bind(this));

    // 卸下装备
    html.find('[data-action="unequip-item"]').click(this._onUnequipItem.bind(this));

    // 物品数量变化
    html.find('.inventory-item input[name="quantity"]').change(this._onQuantityChange.bind(this));

    // 拖拽相关
    this._setupDragAndDrop(html);
  }

  /* -------------------------------------------- */
  /*  拖拽系统                                       */
  /* -------------------------------------------- */

  /**
   * 设置拖拽和放置
   */
  _setupDragAndDrop(html) {
    // 拖拽开始
    html.find('.inventory-item').each((i, item) => {
      item.setAttribute("draggable", true);
      item.addEventListener("dragstart", ev => {
        const itemId = ev.currentTarget.dataset.itemId;
        ev.dataTransfer.setData("text/plain", JSON.stringify({
          type: "Item",
          uuid: this.actor.items.get(itemId).uuid
        }));
      });
    });

    // 装备槽位放置区域
    html.find('.equipment-slot').each((i, slot) => {
      slot.addEventListener("dragover", ev => {
        ev.preventDefault();
        ev.currentTarget.classList.add("drag-over");
      });

      slot.addEventListener("dragleave", ev => {
        ev.currentTarget.classList.remove("drag-over");
      });

      slot.addEventListener("drop", ev => {
        ev.preventDefault();
        ev.currentTarget.classList.remove("drag-over");
        this._onDropItemToSlot(ev);
      });
    });
  }

  /**
   * 物品放置到装备槽
   */
  async _onDropItemToSlot(event) {
    const slot = event.currentTarget;
    const slotName = slot.dataset.slot;
    const allowedTypes = slot.dataset.slotType.split(',');

    try {
      const data = JSON.parse(event.dataTransfer.getData("text/plain"));
      const item = await fromUuid(data.uuid);

      if (!item) return;

      // 检查类型是否匹配
      if (!allowedTypes.includes(item.type)) {
        ui.notifications.warn(`该槽位不接受${this._getItemTypeLabel(item.type)}类型的物品`);
        return;
      }

      // 检查星光是否足够
      const starlightCost = item.system.starlightCost || 0;
      const currentStarlight = this.actor.system.starlight.current;

      // 如果槽位已有物品，返还其星光
      const oldItemId = this.actor.system.equipment[slotName];
      let starlightToReturn = 0;
      if (oldItemId) {
        const oldItem = this.actor.items.get(oldItemId);
        if (oldItem) {
          starlightToReturn = oldItem.system.starlightCost || 0;
        }
      }

      const availableStarlight = currentStarlight + starlightToReturn;
      if (starlightCost > availableStarlight) {
        ui.notifications.warn(`星光不足！需要 ${starlightCost}，可用 ${availableStarlight}`);
        return;
      }

      // 装备物品
      await this.actor.update({
        [`system.equipment.${slotName}`]: item.id,
        [`system.starlight.current`]: availableStarlight - starlightCost
      });

      ui.notifications.info(`已装备 ${item.name}`);
    } catch (err) {
      console.error("Drop error:", err);
    }
  }

  /* -------------------------------------------- */
  /*  事件处理                                      */
  /* -------------------------------------------- */

  /**
   * 编辑头像
   */
  async _onEditImage(event) {
    event.preventDefault();
    const fp = new FilePicker({
      type: "image",
      current: this.actor.img,
      callback: path => {
        this.actor.update({ img: path });
      }
    });
    return fp.browse();
  }

  /**
   * 切换编辑锁定
   */
  async _onToggleLock(event) {
    event.preventDefault();
    const current = this.actor.system.editLocked;
    await this.actor.update({ "system.editLocked": !current });
  }

  /**
   * 属性检定
   */
  async _onAttributeRoll(event) {
    event.preventDefault();
    const attr = event.currentTarget.dataset.attribute;
    const attrValue = this.actor.system.attributes[attr].value;
    const attrLabel = this.actor.system.attributes[attr].label;

    // 投掷希望骰和侵蚀骰 (2d12)
    const roll = await new Roll("2d12 + @attrValue", { attrValue }).roll({ async: true });

    const dice = roll.dice[0].results;
    const hope = dice[0].result;
    const corruption = dice[1].result;
    const total = roll.total;

    // 判断结果类型
    let resultType = '普通';
    let resultClass = 'normal';
    if (hope === corruption) {
      resultType = '大成功';
      resultClass = 'critical';
    } else if (hope > corruption) {
      resultType = '希望';
      resultClass = 'hope';
    } else {
      resultType = '侵蚀';
      resultClass = 'corruption';
    }

    // 发送到聊天
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${attrLabel}属性检定`,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: roll,
      content: `
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">${roll.formula}</div>
            <div class="dice-tooltip">
              <div class="dice">
                <span class="hope-dice">希望骰: ${hope}</span>
                <span class="corruption-dice">侵蚀骰: ${corruption}</span>
              </div>
            </div>
            <h4 class="dice-total ${resultClass}">${total} - ${resultType}</h4>
          </div>
        </div>
      `
    };

    await ChatMessage.create(messageData);
  }

  /**
   * 技能检定
   */
  async _onSkillRoll(event) {
    event.preventDefault();
    const skill = event.currentTarget.dataset.skill;
    const skillValue = this.actor.system.skills[skill];

    // 查找技能标签
    let skillLabel = skill;
    for (const group of Object.values(this.skillGroups || {})) {
      if (group[skill]) {
        skillLabel = group[skill].label;
        break;
      }
    }

    // 投掷希望骰和侵蚀骰 (2d12)
    const roll = await new Roll("2d12 + @skillValue", { skillValue }).roll({ async: true });

    const dice = roll.dice[0].results;
    const hope = dice[0].result;
    const corruption = dice[1].result;
    const total = roll.total;

    // 判断结果类型
    let resultType = '普通';
    let resultClass = 'normal';
    if (hope === corruption) {
      resultType = '大成功';
      resultClass = 'critical';
    } else if (hope > corruption) {
      resultType = '希望';
      resultClass = 'hope';
    } else {
      resultType = '侵蚀';
      resultClass = 'corruption';
    }

    // 发送到聊天
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${skillLabel}技能检定`,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: roll,
      content: `
        <div class="dice-roll">
          <div class="dice-result">
            <div class="dice-formula">${roll.formula}</div>
            <div class="dice-tooltip">
              <div class="dice">
                <span class="hope-dice">希望骰: ${hope}</span>
                <span class="corruption-dice">侵蚀骰: ${corruption}</span>
              </div>
            </div>
            <h4 class="dice-total ${resultClass}">${total} - ${resultType}</h4>
          </div>
        </div>
      `
    };

    await ChatMessage.create(messageData);
  }

  /**
   * 侵蚀检定
   */
  async _onCorruptionCheck(event) {
    event.preventDefault();

    const roll = await new Roll("1d20").roll({ async: true });
    const result = roll.total;
    const corruptionMax = this.actor.system.corruption.max;

    let message = '';
    let updateData = {};

    if (result <= corruptionMax) {
      message = `<p class="corruption-pass">侵蚀检定成功！（${result} <= ${corruptionMax}）</p><p>你成功抵抗了侵蚀的影响。</p>`;
    } else {
      message = `<p class="corruption-fail">侵蚀检定失败！（${result} > ${corruptionMax}）</p><p>你受到了侵蚀的影响，侵蚀值+1。</p>`;
      const newCorruption = Math.min(
        this.actor.system.corruption.value + 1,
        this.actor.system.corruption.max
      );
      updateData["system.corruption.value"] = newCorruption;
    }

    if (Object.keys(updateData).length > 0) {
      await this.actor.update(updateData);
    }

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "侵蚀检定",
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: roll,
      content: message
    });
  }

  /**
   * 长休
   */
  async _onLongRest(event) {
    event.preventDefault();

    const hpMax = this.actor.system.hp.max;
    const starlightMax = this.actor.system.starlight.max;

    await this.actor.update({
      "system.hp.value": hpMax,
      "system.corruption.value": 0,
      "system.chaos.value": 0,
      "system.starlight.current": starlightMax
    });

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "长期休息",
      content: `
        <div class="shuhai-rest">
          <p>经过长时间的休息和调整，你恢复了精神和体力...</p>
          <ul>
            <li>生命值: ${hpMax}/${hpMax} (完全恢复)</li>
            <li>侵蚀值: 0 (心灵得到净化)</li>
            <li>混乱值: 0 (精神恢复平静)</li>
            <li>星光: ${starlightMax}/${starlightMax} (星光充盈)</li>
          </ul>
        </div>
      `
    });
  }

  /**
   * 战斗形态
   */
  async _onBattleForm(event) {
    event.preventDefault();
    // TODO: 实现战斗形态逻辑
    ui.notifications.info("战斗形态功能开发中...");
  }

  /**
   * 创建物品
   */
  async _onItemCreate(event) {
    event.preventDefault();

    // 弹出对话框选择物品类型
    const types = {
      'combatDice': '攻击骰',
      'shootDice': '射击骰',
      'defenseDice': '守备骰',
      'triggerDice': '触发骰',
      'passiveDice': '被动骰',
      'weapon': '武器',
      'armor': '防具',
      'item': '物品',
      'equipment': '装备'
    };

    let options = '';
    for (const [key, label] of Object.entries(types)) {
      options += `<option value="${key}">${label}</option>`;
    }

    new Dialog({
      title: "创建物品",
      content: `
        <form>
          <div class="form-group">
            <label>物品类型:</label>
            <select id="item-type">${options}</select>
          </div>
          <div class="form-group">
            <label>物品名称:</label>
            <input type="text" id="item-name" placeholder="新物品" />
          </div>
        </form>
      `,
      buttons: {
        create: {
          icon: '<i class="fas fa-check"></i>',
          label: "创建",
          callback: async (html) => {
            const type = html.find('#item-type').val();
            const name = html.find('#item-name').val() || `新${types[type]}`;

            const itemData = {
              name: name,
              type: type,
              system: {
                category: '',
                diceFormula: '',
                cost: '-',
                effect: '',
                quantity: 1,
                starlightCost: 0
              }
            };

            const item = await Item.create(itemData, { parent: this.actor });
            item.sheet.render(true);
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
   * 编辑物品
   */
  _onItemEdit(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest('.inventory-item').dataset.itemId;
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
      content: `<p>确定要删除 <strong>${item.name}</strong> 吗？</p>`
    });

    if (confirmed) {
      // 如果物品已装备，先卸下
      const equippedSlot = this._findEquippedSlot(itemId);
      if (equippedSlot) {
        const starlightCost = item.system.starlightCost || 0;
        await this.actor.update({
          [`system.equipment.${equippedSlot}`]: "",
          [`system.starlight.current`]: this.actor.system.starlight.current + starlightCost
        });
      }

      await item.delete();
      ui.notifications.info(`已删除 ${item.name}`);
    }
  }

  /**
   * 搜索物品
   */
  _onSearchItem(event) {
    const searchTerm = event.target.value.toLowerCase();
    const items = this.element.find('.inventory-item');

    items.each((i, item) => {
      const name = $(item).find('.col-name').text().toLowerCase();
      if (name.includes(searchTerm)) {
        $(item).show();
      } else {
        $(item).hide();
      }
    });
  }

  /**
   * 过滤物品
   */
  _onFilterItem(event) {
    const filterType = event.target.value;
    const items = this.element.find('.inventory-item');

    if (!filterType) {
      items.show();
      return;
    }

    items.each((i, item) => {
      const itemId = $(item).data('itemId');
      const itemObj = this.actor.items.get(itemId);
      if (itemObj && itemObj.type === filterType) {
        $(item).show();
      } else {
        $(item).hide();
      }
    });
  }

  /**
   * 卸下装备
   */
  async _onUnequipItem(event) {
    event.preventDefault();
    event.stopPropagation();

    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    const slot = this._findEquippedSlot(itemId);
    if (!slot) return;

    const starlightCost = item.system.starlightCost || 0;

    await this.actor.update({
      [`system.equipment.${slot}`]: "",
      [`system.starlight.current`]: this.actor.system.starlight.current + starlightCost
    });

    ui.notifications.info(`已卸下 ${item.name}`);
  }

  /**
   * 修改物品数量
   */
  async _onQuantityChange(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const newQuantity = parseInt(event.currentTarget.value) || 0;
    const item = this.actor.items.get(itemId);

    if (item) {
      await item.update({ "system.quantity": newQuantity });
    }
  }
}
