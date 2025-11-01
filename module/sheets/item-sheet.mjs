/**
 * 书海大陆物品表单
 */
export default class ShuhaiItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/shuhai-dalu/templates/item";
    return `${path}/item-${this.item.type}-sheet.hbs`;
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
    context.enrichedDescription = await TextEditor.enrichHTML(
      this.item.system.description || "", 
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
    // 卡牌分类选项
    if (this.item.type === 'card') {
      context.categories = [
        { value: '斩击', label: '斩击' },
        { value: '打击', label: '打击' },
        { value: '突刺', label: '突刺' },
        { value: '闪避', label: '闪避' },
        { value: '格挡', label: '格挡' },
        { value: '防御', label: '防御' },
        { value: '反击-斩击', label: '反击-斩击' },
        { value: '反击-打击', label: '反击-打击' },
        { value: '反击-突刺', label: '反击-突刺' },
        { value: '强化反击-斩击', label: '强化反击-斩击' },
        { value: '强化反击-打击', label: '强化反击-打击' },
        { value: '强化防御', label: '强化防御' }
      ];
    }

    // 武器伤害类型选项
    if (this.item.type === 'weapon') {
      context.damageTypes = [
        { value: '斩击', label: '斩击' },
        { value: '打击', label: '打击' },
        { value: '突刺', label: '突刺' }
      ];

      context.rangeTypes = [
        { value: '近战', label: '近战' },
        { value: '远程', label: '远程' },
        { value: '投掷', label: '投掷' }
      ];
    }

    // 护甲类型选项
    if (this.item.type === 'armor') {
      context.armorTypes = [
        { value: '轻甲', label: '轻甲' },
        { value: '中甲', label: '中甲' },
        { value: '重甲', label: '重甲' },
        { value: '盾牌', label: '盾牌' }
      ];
    }
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

    if (this.item.type === 'card') {
      // 使用卡牌
      await this.item.useCard();
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