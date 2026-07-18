/** Main-menu entries use stable IDs while the scene owns only drawing and input polling. */
export type TitleMenuItemId = 'new-game' | 'continue' | 'help' | 'clear-save' | 'cancel' | 'confirm';

/** Modal menu state is temporary and intentionally never persisted. */
export type TitleMenuMode = 'main' | 'help' | 'confirm-new-game' | 'confirm-clear-save';

/** Scene actions are explicit so confirmations cannot mutate storage by themselves. */
export type TitleMenuAction = 'none' | 'start-new-game' | 'continue-game' | 'clear-save';

/** One UI-ready menu item with a player-facing disabled reason. */
export interface TitleMenuItemView {
  id: TitleMenuItemId;
  label: string;
  enabled: boolean;
  unavailableReason?: string;
}

/** Complete render state for the title scene. */
export interface TitleMenuView {
  mode: TitleMenuMode;
  items: TitleMenuItemView[];
  selectedIndex: number;
  confirmationText?: string;
}

/** Pure keyboard menu model centralizes confirmation and disabled-item behavior. */
export class TitleMenuModel {
  private mode: TitleMenuMode = 'main';
  private selectedIndex = 0;

  public constructor(private hasSave: boolean) {}

  /** Updates continue/clear availability immediately after storage changes. */
  public setHasSave(hasSave: boolean): void {
    this.hasSave = hasSave;
    this.mode = 'main';
    this.selectedIndex = 0;
  }

  /** Cycles through enabled entries only. */
  public move(direction: -1 | 1): void {
    const items = this.getView().items;
    if (items.length === 0) return;
    for (let offset = 1; offset <= items.length; offset += 1) {
      const index = (this.selectedIndex + direction * offset + items.length) % items.length;
      if (items[index]?.enabled) {
        this.selectedIndex = index;
        return;
      }
    }
  }

  /** Confirms the selected item or opens the required safety confirmation. */
  public confirm(itemId?: TitleMenuItemId): TitleMenuAction {
    const view = this.getView();
    const item = itemId ? view.items.find(({ id }) => id === itemId) : view.items[this.selectedIndex];
    if (!item?.enabled) return 'none';

    if (this.mode === 'confirm-new-game' || this.mode === 'confirm-clear-save') {
      if (item.id === 'cancel') {
        this.back();
        return 'none';
      }
      if (item.id === 'confirm') {
        const action = this.mode === 'confirm-new-game' ? 'start-new-game' : 'clear-save';
        this.mode = 'main';
        this.selectedIndex = 0;
        return action;
      }
      return 'none';
    }

    if (item.id === 'new-game') {
      if (!this.hasSave) return 'start-new-game';
      this.mode = 'confirm-new-game';
      this.selectedIndex = 0;
    } else if (item.id === 'continue') {
      return 'continue-game';
    } else if (item.id === 'help') {
      this.mode = 'help';
      this.selectedIndex = 0;
    } else if (item.id === 'clear-save') {
      this.mode = 'confirm-clear-save';
      this.selectedIndex = 0;
    }
    return 'none';
  }

  /** Escape closes help or confirmation and returns to the main menu. */
  public back(): void {
    this.mode = 'main';
    this.selectedIndex = 0;
  }

  /** Builds a deterministic view for both Phaser rendering and unit tests. */
  public getView(): TitleMenuView {
    if (this.mode === 'help') return { mode: this.mode, items: [], selectedIndex: 0 };
    if (this.mode === 'confirm-new-game') {
      return {
        mode: this.mode,
        items: createConfirmationItems(),
        selectedIndex: this.selectedIndex,
        confirmationText: '開始新遊戲會覆蓋目前進度。確定要重新開始嗎？',
      };
    }
    if (this.mode === 'confirm-clear-save') {
      return {
        mode: this.mode,
        items: createConfirmationItems(),
        selectedIndex: this.selectedIndex,
        confirmationText: '這會刪除目前所有進度，且無法復原。',
      };
    }
    return {
      mode: 'main',
      selectedIndex: this.selectedIndex,
      items: [
        { id: 'new-game', label: '開始新遊戲', enabled: true },
        {
          id: 'continue',
          label: '繼續遊戲',
          enabled: this.hasSave,
          ...(this.hasSave ? {} : { unavailableReason: '尚無可繼續的進度' }),
        },
        { id: 'help', label: '操作說明', enabled: true },
        {
          id: 'clear-save',
          label: '清除存檔',
          enabled: this.hasSave,
          ...(this.hasSave ? {} : { unavailableReason: '目前沒有存檔' }),
        },
      ],
    };
  }
}

/** Confirmation order defaults safely to cancel. */
function createConfirmationItems(): TitleMenuItemView[] {
  return [
    { id: 'cancel', label: '取消', enabled: true },
    { id: 'confirm', label: '確定', enabled: true },
  ];
}
