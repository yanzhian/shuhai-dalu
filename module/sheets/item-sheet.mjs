/**
 * 书海大陆物品表单 - 通用版
 */
export default class ShuhaiItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "item"],
      width: 520,
      height: 600,
      tabs: []
    });
  }

  /** @override */
  get template() {
    // 使用通用模板
    return `systems/shuhai-dalu/templates/item/item-sheet.hbs`;
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

    // 添加富文本编辑器
    context.enrichedEffect = await TextEditor.enrichHTML(
      this.item.system.effect || "", 
      { async: true }
    );

    // 根据物品类型添加特定数据
    this._prepareItemTypeData(context);

    return context;
  }

  /**
   * 准备物品类型特定数据
   */
  _prepareItemTypeData(context) {
    const itemType = this.item.type;

    // 物品类型标签
    context.itemTypeLabel = this._getItemTypeLabel(itemType);

    // 是否使用自定义分类（武器、防具、装备、物品类型需要玩家填写）
    context.useCustomCategory = ['weapon', 'armor', 'equipment', 'item'].includes(itemType);

    // 所有物品类型的分类选项
    context.categories = this._getCategoryOptions(itemType);

    // 是否显示特定字段
    context.showDiceFormula = ['combatDice', 'shootDice', 'defenseDice', 'triggerDice', 'passiveDice'].includes(itemType);
    context.showQuantity = !['passiveDice'].includes(itemType);
    context.showStarlightCost = ['combatDice', 'shootDice', 'defenseDice', 'triggerDice', 'passiveDice', 'weapon', 'armor', 'equipment'].includes(itemType);
    context.showArmorProperties = itemType === 'armor';
  }

  /**
   * 获取物品类型标签
   */
  _getItemTypeLabel(type) {
    const typeLabels = {
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
    return typeLabels[type] || type;
  }

  /**
   * 获取分类选项
   */
  _getCategoryOptions(type) {
    const categoryMap = {
      'combatDice': ['打击', '突刺', '斩击'],
      'shootDice': ['打击', '突刺', '斩击'],
      'defenseDice': ['闪避', '反击-斩击', '反击-突刺', '反击-打击', '强化反击-斩击', '强化反击-突刺', '强化反击-打击', '防御', '强化防御'],
      'triggerDice': ['EX'],
      'passiveDice': ['道具', '标签'],
      'weapon': [],
      'armor': [],
      'item': [],
      'equipment': []
    };

    const categories = categoryMap[type] || [];
    return categories.map(cat => ({
      value: cat,
      label: cat
    }));
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 只在拥有权限时添加监听器
    if (!this.isEditable) return;

    // 使用物品按钮
    html.find('.item-use').click(this._onItemUse.bind(this));

    // 发送到聊天
    html.find('.item-chat').click(this._onItemChat.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * 使用物品
   */
  async _onItemUse(event) {
    event.preventDefault();

    if (this.item.type === 'combatDice' || this.item.type === 'shootDice' || this.item.type === 'defenseDice') {
      // 使用骰子
      await this.item.use();
    } else {
      ui.notifications.info(`使用 ${this.item.name}`);
      await this.item.displayCard();
    }
  }

  /**
   * 发送到聊天
   */
  async _onItemChat(event) {
    event.preventDefault();
    await this.item.displayCard();
  }
}