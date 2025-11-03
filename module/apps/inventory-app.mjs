/**
 * 物品栏应用 - 独立的物品管理界面
 */
export default class InventoryApp extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.searchTerm = "";
    this.filters = {
      type: null,
      cost: null,
      starlight: null
    };
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shuhai-dalu", "inventory-app"],
      template: "systems/shuhai-dalu/templates/apps/inventory-app.hbs",
      width: 1000,
      height: 700,
      title: "物品栏",
      resizable: true,
      dragDrop: [
        { dragSelector: ".inventory-row", dropSelector: null }
      ]
    });
  }

  /** @override */
  getData() {
    const context = super.getData();

    context.actor = this.actor;
    context.items = this._prepareItems();
    context.searchTerm = this.searchTerm;

    return context;
  }

  /**
   * 准备物品数据
   */
  _prepareItems() {
    let items = this.actor.items.contents.map(item => {
      // 获取分类显示名称
      const category = this._getItemCategory(item);

      return {
        id: item.id,
        name: item.name,
        img: item.img,
        type: item.type,
        typeLabel: this._getItemTypeLabel(item.type),
        category: category,
        diceFormula: item.system.diceFormula || "-",
        cost: item.system.cost || "-",
        quantity: item.system.quantity ?? "-",
        starlightCost: item.system.starlightCost || 0,
        tags: item.system.tags || "",
        effect: item.system.effect || "",
        item: item
      };
    });

    // 应用搜索
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.tags.toLowerCase().includes(term)
      );
    }

    // 应用筛选
    if (this.filters.type) {
      items = items.filter(item => item.type === this.filters.type);
    }

    if (this.filters.cost) {
      items = items.filter(item => {
        const cost = item.cost;
        if (this.filters.cost === "free") {
          return cost === "-" || cost === "0";
        } else if (this.filters.cost === "currency") {
          return cost !== "-" && !cost.startsWith("Cost:") && !cost.startsWith("San:");
        } else if (this.filters.cost === "special") {
          return cost.startsWith("Cost:") || cost.startsWith("San:");
        }
        return true;
      });
    }

    if (this.filters.starlight) {
      items = items.filter(item => {
        const starlight = item.starlightCost;
        if (this.filters.starlight === "none") {
          return starlight === 0;
        } else if (this.filters.starlight === "has") {
          return starlight > 0;
        }
        return true;
      });
    }

    return items;
  }

  /**
   * 获取物品分类
   */
  _getItemCategory(item) {
    // 对于使用自定义分类的类型，返回 customCategory
    if (['weapon', 'armor', 'equipment', 'item'].includes(item.type)) {
      return item.system.customCategory || item.system.category || "未分类";
    }
    return item.system.category || "未分类";
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

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    // 搜索
    html.find('.search-input').on('input', this._onSearch.bind(this));

    // 创建物品
    html.find('.create-item-btn').click(this._onCreateItem.bind(this));

    // 筛选按钮
    html.find('.filter-type-btn').click(this._onFilterType.bind(this));
    html.find('.filter-cost-btn').click(this._onFilterCost.bind(this));
    html.find('.filter-starlight-btn').click(this._onFilterStarlight.bind(this));

    // 清除筛选
    html.find('.clear-filters-btn').click(this._onClearFilters.bind(this));

    // 物品行点击
    html.find('.item-name-cell').click(this._onEditItem.bind(this));
    html.find('.item-icon').click(this._onShowItemDetails.bind(this));
    html.find('.item-icon').dblclick(this._onEditItemEffect.bind(this));

    // 右键菜单
    html.find('.inventory-row').contextmenu(this._onRightClick.bind(this));

    // 删除按钮
    html.find('.delete-item-btn').click(this._onDeleteItem.bind(this));

    // 拖拽
    const dragHandler = ev => this._onDragStart(ev);
    html.find('.inventory-row').each((i, row) => {
      row.setAttribute("draggable", true);
      row.addEventListener("dragstart", dragHandler, false);
    });
  }

  /* -------------------------------------------- */
  /*  事件处理                                      */
  /* -------------------------------------------- */

  /**
   * 搜索物品
   */
  _onSearch(event) {
    event.preventDefault();
    this.searchTerm = event.currentTarget.value;
    this.render();
  }

  /**
   * 创建物品
   */
  async _onCreateItem(event) {
    event.preventDefault();

    const content = await renderTemplate("systems/shuhai-dalu/templates/dialog/create-item.hbs", {});

    new Dialog({
      title: "创建物品",
      content: content,
      buttons: {
        create: {
          icon: '<i class="fas fa-check"></i>',
          label: "创建",
          callback: async (html) => {
            const name = html.find('[name="name"]').val();
            const type = html.find('[name="type"]').val();

            if (!name) {
              ui.notifications.warn("请输入物品名称");
              return;
            }

            const itemData = {
              name: name,
              type: type,
              system: {}
            };

            const cls = getDocumentClass("Item");
            const item = await cls.create(itemData, { parent: this.actor });

            if (item) {
              item.sheet.render(true);
              this.render();
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
   * 筛选类型
   */
  _onFilterType(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;

    if (this.filters.type === type) {
      this.filters.type = null;
      event.currentTarget.classList.remove('active');
    } else {
      // 移除其他按钮的 active 状态
      this.element.find('.filter-type-btn').removeClass('active');
      this.filters.type = type;
      event.currentTarget.classList.add('active');
    }

    this.render();
  }

  /**
   * 筛选费用
   */
  _onFilterCost(event) {
    event.preventDefault();
    const cost = event.currentTarget.dataset.cost;

    if (this.filters.cost === cost) {
      this.filters.cost = null;
      event.currentTarget.classList.remove('active');
    } else {
      // 移除其他按钮的 active 状态
      this.element.find('.filter-cost-btn').removeClass('active');
      this.filters.cost = cost;
      event.currentTarget.classList.add('active');
    }

    this.render();
  }

  /**
   * 筛选星光
   */
  _onFilterStarlight(event) {
    event.preventDefault();
    const starlight = event.currentTarget.dataset.starlight;

    if (this.filters.starlight === starlight) {
      this.filters.starlight = null;
      event.currentTarget.classList.remove('active');
    } else {
      // 移除其他按钮的 active 状态
      this.element.find('.filter-starlight-btn').removeClass('active');
      this.filters.starlight = starlight;
      event.currentTarget.classList.add('active');
    }

    this.render();
  }

  /**
   * 清除所有筛选
   */
  _onClearFilters(event) {
    event.preventDefault();
    this.filters = {
      type: null,
      cost: null,
      starlight: null
    };
    this.searchTerm = "";
    this.element.find('.filter-type-btn').removeClass('active');
    this.element.find('.filter-cost-btn').removeClass('active');
    this.element.find('.filter-starlight-btn').removeClass('active');
    this.element.find('.search-input').val('');
    this.render();
  }

  /**
   * 编辑物品
   */
  _onEditItem(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).closest('.inventory-row').data('item-id');
    const item = this.actor.items.get(itemId);

    if (item) {
      item.sheet.render(true);
    }
  }

  /**
   * 显示物品详情
   */
  _onShowItemDetails(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).closest('.inventory-row').data('item-id');
    const item = this.actor.items.get(itemId);

    if (!item) return;

    const content = `
      <div class="item-details-dialog">
        <div class="item-header">
          <img src="${item.img}" alt="${item.name}"/>
          <h3>${item.name}</h3>
        </div>
        ${item.system.tags ? `<p><strong>标签:</strong> ${item.system.tags}</p>` : ''}
        ${item.system.effect ? `<div class="item-effect"><strong>效果:</strong><div>${item.system.effect}</div></div>` : '<p class="no-effect">暂无效果描述</p>'}
      </div>
    `;

    new Dialog({
      title: item.name,
      content: content,
      buttons: {
        edit: {
          icon: '<i class="fas fa-edit"></i>',
          label: "编辑",
          callback: () => {
            item.sheet.render(true);
          }
        },
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "关闭"
        }
      }
    }).render(true);
  }

  /**
   * 双击编辑效果描述
   */
  async _onEditItemEffect(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).closest('.inventory-row').data('item-id');
    const item = this.actor.items.get(itemId);

    if (!item) return;

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
            this.render();
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
   * 右键菜单
   */
  _onRightClick(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).data('item-id');
    const item = this.actor.items.get(itemId);

    if (!item) return;

    // 创建右键菜单
    const menu = $(`
      <div class="context-menu" style="
        position: fixed;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: #2a2a2a;
        border: 1px solid #4a4a4a;
        border-radius: 4px;
        padding: 0.5rem 0;
        z-index: 10000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      ">
        <div class="menu-item" data-action="edit" style="
          padding: 0.5rem 1rem;
          cursor: pointer;
          color: #e0e0e0;
        ">
          <i class="fas fa-edit"></i> 编辑
        </div>
        <div class="menu-item" data-action="delete" style="
          padding: 0.5rem 1rem;
          cursor: pointer;
          color: #e74c3c;
        ">
          <i class="fas fa-trash"></i> 删除
        </div>
      </div>
    `);

    $('body').append(menu);

    // 菜单项悬停效果
    menu.find('.menu-item').hover(
      function() { $(this).css('background', '#3a3a3a'); },
      function() { $(this).css('background', 'transparent'); }
    );

    // 点击菜单项
    menu.find('.menu-item').click(async (e) => {
      const action = $(e.currentTarget).data('action');

      if (action === 'edit') {
        item.sheet.render(true);
      } else if (action === 'delete') {
        const confirmed = await Dialog.confirm({
          title: `删除 ${item.name}?`,
          content: `<p>确定要删除 <strong>${item.name}</strong> 吗?</p>`
        });

        if (confirmed) {
          await item.delete();
          this.render();
        }
      }

      menu.remove();
    });

    // 点击其他地方关闭菜单
    $(document).one('click', () => menu.remove());
  }

  /**
   * 删除物品
   */
  async _onDeleteItem(event) {
    event.preventDefault();
    event.stopPropagation();
    const itemId = $(event.currentTarget).closest('.inventory-row').data('item-id');
    const item = this.actor.items.get(itemId);

    if (!item) return;

    const confirmed = await Dialog.confirm({
      title: `删除 ${item.name}?`,
      content: `<p>确定要删除 <strong>${item.name}</strong> 吗?</p>`
    });

    if (confirmed) {
      await item.delete();
      this.render();
    }
  }

  /**
   * 拖拽开始
   */
  _onDragStart(event) {
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Item",
      uuid: item.uuid
    }));
  }
}
