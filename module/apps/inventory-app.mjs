/**
 * 独立的物品栏Application
 */
export default class InventoryApp extends Application {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "inventory-app"],
      template: "systems/shuhai-dalu/templates/apps/inventory-app.hbs",
      width: 1000,
      height: 700,
      resizable: true,
      dragDrop: [
        { dragSelector: ".item-icon", dropSelector: ".slot-container" }
      ]
    });
  }

  /** @override */
  get title() {
    return `${this.actor.name} - 物品栏`;
  }

  /** @override */
  async getData() {
    const context = {};

    // 准备物品数据
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

    context.items = this.actor.items.contents.map(item => {
      return {
        ...item,
        typeLabel: typeNames[item.type] || item.type
      };
    });

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // 搜索
    html.find('.item-search').on('input', this._onSearchItems.bind(this));

    // 创建物品
    html.find('.create-item-btn').click(this._onItemCreate.bind(this));

    // 筛选按钮
    html.find('.filter-menu-btn').click(this._onToggleFilterMenu.bind(this));
    html.find('.apply-filter-btn').click(this._onApplyFilter.bind(this));
    html.find('.clear-filter-btn').click(this._onClearFilter.bind(this));

    // 物品操作
    html.find('.item-use-btn').click(this._onItemUse.bind(this));
    html.find('.item-edit-btn').click(this._onItemEdit.bind(this));
    html.find('.item-delete-btn').click(this._onItemDelete.bind(this));

    // 物品图标交互
    html.find('.item-icon-wrapper').click(this._onItemIconClick.bind(this));
    html.find('.item-icon-wrapper').dblclick(this._onItemIconDblClick.bind(this));

    // 拖放
    this._setupDragAndDrop(html);
  }

  /**
   * 设置拖放
   */
  _setupDragAndDrop(html) {
    html.find('.item-icon').each((i, icon) => {
      icon.addEventListener('dragstart', this._onDragStart.bind(this), false);
    });
  }

  /**
   * 拖动开始
   */
  _onDragStart(event) {
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    event.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'Item',
      uuid: item.uuid
    }));
  }

  /**
   * 切换筛选菜单
   */
  _onToggleFilterMenu(event) {
    event.preventDefault();
    const dropdown = this.element.find('.filter-dropdown');
    dropdown.toggle();
  }

  /**
   * 搜索物品
   */
  _onSearchItems(event) {
    const searchTerm = event.currentTarget.value.toLowerCase();
    const items = this.element.find('.inventory-item-row');

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
   * 应用筛选
   */
  _onApplyFilter(event) {
    event.preventDefault();

    const filterType = this.element.find('[name="filterType"]').val();
    const filterCost = this.element.find('[name="filterCost"]').val().toLowerCase();
    const filterStarlight = this.element.find('[name="filterStarlight"]').val();

    const items = this.element.find('.inventory-item-row');

    items.each((i, item) => {
      const $item = $(item);
      const itemType = $item.data('item-type');
      const itemCost = String($item.data('item-cost') || '').toLowerCase();
      const itemStarlight = $item.data('item-starlight');

      let show = true;

      // 类型筛选
      if (filterType && itemType !== filterType) {
        show = false;
      }

      // 费用筛选
      if (filterCost && !itemCost.includes(filterCost)) {
        show = false;
      }

      // 星光筛选
      if (filterStarlight && itemStarlight != filterStarlight) {
        show = false;
      }

      $item.attr('data-filtered', show ? 'false' : 'true');
    });

    ui.notifications.info("已应用筛选条件");
    this.element.find('.filter-dropdown').hide();
  }

  /**
   * 清除筛选
   */
  _onClearFilter(event) {
    event.preventDefault();

    this.element.find('[name="filterType"]').val('');
    this.element.find('[name="filterCost"]').val('');
    this.element.find('[name="filterStarlight"]').val('');

    this.element.find('.inventory-item-row').attr('data-filtered', 'false');

    ui.notifications.info("已清除筛选");
    this.element.find('.filter-dropdown').hide();
  }

  /**
   * 创建物品
   */
  async _onItemCreate(event) {
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

            const itemData = {
              name: `新${typeNames[type]}`,
              type: type,
              system: {}
            };

            const cls = getDocumentClass("Item");
            const item = await cls.create(itemData, { parent: this.actor });

            if (item) {
              item.sheet.render(true);
              this.render(false);
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
      this.render(false);
    }
  }

  /**
   * 单击图标：编辑物品
   */
  _onItemIconClick(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * 双击图标：编辑描述
   */
  async _onItemIconDblClick(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

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
}
