/**
 * 书海大陆物品卡表单
 * 支持条件触发系统的独立物品类型
 */

// BUFF预设列表
const BUFF_PRESETS = [
  // 增益
  { id: 'strong', name: '强壮', type: 'positive', icon: 'icons/svg/upgrade.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'guard', name: '守护', type: 'positive', icon: 'icons/svg/shield.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'swift', name: '迅捷', type: 'positive', icon: 'icons/svg/wing.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'endure', name: '忍耐', type: 'positive', icon: 'icons/svg/stone-pile.svg', defaultLayers: 1, defaultStrength: 0 },
  // 减益
  { id: 'weak', name: '虚弱', type: 'negative', icon: 'icons/svg/downgrade.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'vulnerable', name: '易损', type: 'negative', icon: 'icons/svg/break.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'bound', name: '束缚', type: 'negative', icon: 'icons/svg/net.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'flaw', name: '破绽', type: 'negative', icon: 'icons/svg/hazard.svg', defaultLayers: 1, defaultStrength: 0 },
  // 效果
  { id: 'rupture', name: '破裂', type: 'effect', icon: 'icons/svg/explosion.svg', defaultLayers: 1, defaultStrength: 3 },
  { id: 'bleed', name: '流血', type: 'effect', icon: 'icons/svg/blood.svg', defaultLayers: 1, defaultStrength: 2 },
  { id: 'corruption_effect', name: '沉沦', type: 'effect', icon: 'icons/svg/shadow.svg', defaultLayers: 1, defaultStrength: 2 },
  { id: 'burn', name: '燃烧', type: 'effect', icon: 'icons/svg/fire.svg', defaultLayers: 1, defaultStrength: 4 },
  { id: 'breath', name: '呼吸', type: 'effect', icon: 'icons/svg/breath.svg', defaultLayers: 1, defaultStrength: 5 },
  { id: 'charge', name: '充能', type: 'effect', icon: 'icons/svg/lightning.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'tremor', name: '震颤', type: 'effect', icon: 'icons/svg/frozen.svg', defaultLayers: 1, defaultStrength: 3 },
  { id: 'ammo', name: '弹药', type: 'effect', icon: 'icons/svg/sword.svg', defaultLayers: 10, defaultStrength: 0 },
  { id: 'chant', name: '吟唱', type: 'effect', icon: 'icons/svg/book.svg', defaultLayers: 1, defaultStrength: 0 },
  { id: 'paralyze', name: '麻痹', type: 'effect', icon: 'icons/svg/paralysis.svg', defaultLayers: 1, defaultStrength: 0 }
];

export default class ItemCardSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "item", "item-card"],
      width: 520,
      height: 630,
      tabs: []
    });
  }

  /** @override */
  get template() {
    return `systems/shuhai-dalu/templates/item-card/item-card-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = super.getData();
    const itemData = this.item.toObject(false);

    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    context.system = itemData.system;
    context.flags = itemData.flags;

    // BUFF预设
    context.buffPresets = BUFF_PRESETS;

    // 确保conditions数组存在
    if (!context.system.conditions) {
      context.system.conditions = [];
    }

    // 富文本编辑器
    context.enrichedEffect = await TextEditor.enrichHTML(
      this.item.system.effect || '',
      { async: true }
    );

    // 编辑锁状态
    context.isLocked = this.item.getFlag('shuhai-dalu', 'isLocked') || false;

    // 根据类型添加category选项
    context.categoryChoices = this._getCategoryChoices(this.item.type);

    return context;
  }

  /**
   * 获取分类选项
   */
  _getCategoryChoices(itemType) {
    const choices = {
      'combatDice': ['打击', '突刺', '斩击'],
      'shootDice': ['打击', '突刺', '斩击'],
      'defenseDice': ['闪避', '反击-斩击', '反击-突刺', '反击-打击', '强化反击-斩击', '强化反击-突刺', '强化反击-打击', '防御', '强化防御'],
      'triggerDice': ['EX'],
      'passiveDice': ['道具', '标签']
    };
    return choices[itemType] || null;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 编辑锁
    html.find('.item-card-lock').click(this._onToggleLock.bind(this));

    // 标签页切换
    html.find('.item-card-tab').click(this._onTabChange.bind(this));

    // 面板折叠
    html.find('.item-card-panel-header').click(this._onTogglePanel.bind(this));

    // 只在可编辑状态添加以下监听器
    if (!this.isEditable) return;

    // 条件管理
    html.find('.item-card-add-condition-btn').click(this._onAddCondition.bind(this));
    html.find('.delete-condition-btn').click(this._onDeleteCondition.bind(this));

    // 消耗管理
    html.find('.add-consume-btn').click(this._onAddConsume.bind(this));
    html.find('.remove-consume-btn').click(this._onRemoveConsume.bind(this));

    // 使用/聊天按钮
    html.find('.item-use-btn').click(this._onItemUse.bind(this));
    html.find('.item-chat-btn').click(this._onItemChat.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * 切换编辑锁
   */
  async _onToggleLock(event) {
    event.preventDefault();
    const currentLock = this.item.getFlag('shuhai-dalu', 'isLocked') || false;
    await this.item.setFlag('shuhai-dalu', 'isLocked', !currentLock);
    this.render();
  }

  /**
   * 标签页切换
   */
  _onTabChange(event) {
    event.preventDefault();
    const tab = $(event.currentTarget);
    const tabName = tab.data('tab');

    tab.siblings('.item-card-tab').removeClass('active');
    tab.addClass('active');

    const content = this.element.find(`.item-card-tab-content`);
    content.removeClass('active');
    this.element.find(`.item-card-tab-content[data-tab="${tabName}"]`).addClass('active');
  }

  /**
   * 面板折叠切换
   */
  _onTogglePanel(event) {
    event.preventDefault();
    const header = $(event.currentTarget);
    const content = header.next('.item-card-panel-content');
    const icon = header.find('.collapse-icon');

    content.toggleClass('collapsed');

    // 切换图标方向
    if (content.hasClass('collapsed')) {
      icon.removeClass('fa-chevron-down').addClass('fa-chevron-right');
    } else {
      icon.removeClass('fa-chevron-right').addClass('fa-chevron-down');
    }
  }

  /**
   * 添加条件
   */
  async _onAddCondition(event) {
    event.preventDefault();
    event.stopPropagation();

    const conditions = this.item.system.conditions || [];
    const newCondition = {
      trigger: 'onUse',
      hasConsume: false,
      consumes: [],
      target: 'selected',
      effects: {},
      customEffect: {
        enabled: false,
        name: '',
        layers: 0,
        strength: 0
      }
    };

    conditions.push(newCondition);

    await this.item.update({
      'system.conditions': conditions
    });
  }

  /**
   * 删除条件
   */
  async _onDeleteCondition(event) {
    event.preventDefault();
    event.stopPropagation();

    const conditionIndex = parseInt($(event.currentTarget).closest('.item-card-condition-panel').data('index'));
    const conditions = this.item.system.conditions || [];

    const confirm = await Dialog.confirm({
      title: "删除条件",
      content: `<p>确定要删除条件 ${conditionIndex + 1} 吗？</p>`,
      yes: () => true,
      no: () => false
    });

    if (!confirm) return;

    conditions.splice(conditionIndex, 1);

    await this.item.update({
      'system.conditions': conditions
    });
  }

  /**
   * 添加消耗
   */
  async _onAddConsume(event) {
    event.preventDefault();
    event.stopPropagation();

    const conditionIndex = parseInt($(event.currentTarget).data('condition-index'));
    const conditions = [...this.item.system.conditions];

    if (!conditions[conditionIndex].consumes) {
      conditions[conditionIndex].consumes = [];
    }

    conditions[conditionIndex].consumes.push({
      buffId: 'charge',
      layers: 1,
      strength: 0
    });

    await this.item.update({
      'system.conditions': conditions
    });
  }

  /**
   * 移除消耗
   */
  async _onRemoveConsume(event) {
    event.preventDefault();
    event.stopPropagation();

    const conditionIndex = parseInt($(event.currentTarget).data('condition-index'));
    const consumeIndex = parseInt($(event.currentTarget).data('consume-index'));
    const conditions = [...this.item.system.conditions];

    conditions[conditionIndex].consumes.splice(consumeIndex, 1);

    await this.item.update({
      'system.conditions': conditions
    });
  }

  /**
   * 使用物品
   */
  async _onItemUse(event) {
    event.preventDefault();

    ui.notifications.info(`使用 ${this.item.name}`);
    await this.item.displayCard();
  }

  /**
   * 发送到聊天
   */
  async _onItemChat(event) {
    event.preventDefault();
    await this.item.displayCard();
  }

  /* -------------------------------------------- */

  /** @override */
  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);

    // 处理conditions数组
    if (expanded.system?.conditions) {
      const conditions = [];
      const conditionsObj = expanded.system.conditions;

      for (let i = 0; i < 100; i++) {
        if (conditionsObj[i]) {
          const condition = conditionsObj[i];

          // 处理effects对象
          const effects = {};
          if (condition.effects) {
            for (const [buffId, buffData] of Object.entries(condition.effects)) {
              if (buffData.enabled) {
                effects[buffId] = {
                  enabled: true,
                  layers: parseInt(buffData.layers) || 0,
                  strength: parseInt(buffData.strength) || 0
                };
              }
            }
          }

          conditions.push({
            trigger: condition.trigger || 'onUse',
            hasConsume: condition.hasConsume || false,
            consumes: condition.consumes || [],
            target: condition.target || 'selected',
            effects: effects,
            customEffect: condition.customEffect || {
              enabled: false,
              name: '',
              layers: 0,
              strength: 0
            }
          });
        }
      }

      expanded.system.conditions = conditions;
    }

    return this.item.update(expanded);
  }
}
