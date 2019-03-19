import { MenuItem, MenuItemKey } from "Options";
import { getElementPos, isMobileDevice, isAppleMac } from "./util";

import "./style.css";

const classPrefix = "scratchcard-menu";

function getShortcutByKey(key: MenuItemKey): string {
  switch(key) {
  case "copy":
    if (!isMobileDevice() && isAppleMac())
      return "Command+C";
    else
      return "Ctrl+C";
  default:
    return "";
  }
}

export default class ContextMenu {
  private menuData: MenuItem[];
  private menuList: HTMLElement;
  private container: HTMLElement;

  private topDiv: HTMLElement;
  private dropdownDiv: HTMLElement;

  private contextClient: HTMLElement;
  private menuItemListenerList: Array<Function>;

  constructor(
    client: HTMLElement, menu?: MenuItem[], popupContainer?: HTMLElement
  ) {
    this.contextClient = client;
    this.menuData = menu || [];

    this.container = popupContainer || document.body;
    this.menuItemListenerList = [];

    this.createMenuElement();
    this.loadToHtml();

    this.initEvent();
  }

  private createMenuElement(): void {
    if (!this.menuData.length) {
      this.menuList = null;
      return;
    }
    const ul = document.createElement("ul");
    ul.className = `${classPrefix}-root`;
    ul.setAttribute("role", "menu");
    this.menuData.forEach((item: MenuItem) => {
      const li = document.createElement("li");
      li.className = `${classPrefix}-item`;
      const disabled = item.disabled === undefined || !!item.disabled;
      if (disabled) {
        li.classList.add("disabled");
      }
      li.setAttribute("role", "menuitem");
      const lspan = document.createElement("span");
      lspan.className = `${classPrefix}-item-text`;
      if (typeof item.text === "string") {
        lspan.innerText = item.text as string;
      } else {
        lspan.appendChild(item.text as HTMLElement);
      }
      li.appendChild(lspan);
      if (!disabled) {
        li.addEventListener("click", item.onClick);
      }
      this.menuItemListenerList.push(() => {
        li.removeEventListener("click", item.onClick);
      });
      ul.appendChild(li);
    });

    const tdiv = document.createElement("div");
    tdiv.style.position = "absolute";
    tdiv.style.top = "0px";
    tdiv.style.left = "0px";
    tdiv.style.width = "100%";
    const wrapper = document.createElement("div");
    wrapper.className = `${classPrefix}-wrapper ${classPrefix}-hidden`;
    wrapper.appendChild(ul);
    tdiv.appendChild(wrapper);

    this.menuList = ul;
    this.dropdownDiv = wrapper;
    this.topDiv = tdiv;
  }

  public remove = (): void => {
    this.removeEvent();
    if (this.menuList) {
      this.menuList.remove();
      this.dropdownDiv.remove();
      this.topDiv.remove();
    }
    this.menuList = null;
    this.menuData = [];
  }

  public reCreateMenu = (menu?: MenuItem[]): void => {
    this.remove();
    this.menuData = menu || [];
    this.createMenuElement();
    this.loadToHtml();

    this.initEvent();
  }

  private loadToHtml(): void {
    if (!this.menuData.length) return;
    
    this.container.appendChild(this.topDiv);
  }

  public move = (px: number, py: number): void => {
    this.dropdownDiv.style.left = `${px}px`;
    this.dropdownDiv.style.top = `${py}px`;
  }

  private hide = (): void => {
    if (!this.menuData.length) return;

    this.dropdownDiv.classList.add(`${classPrefix}-hidden`);
  }

  private show = (): void => {
    if (!this.menuData.length) return;

    this.dropdownDiv.classList.remove(`${classPrefix}-hidden`);
  }

  private handleWindowClick = (evt: Event): void => {
    if (!this.menuList) return;
    if (evt.target) {
      const clist = (evt.target as HTMLElement).classList;
      if (clist.contains(`${classPrefix}-item`) &&
        clist.contains("disabled"))
        return;
    }
    this.hide();
  }

  private handleContextMenu = (evt: MouseEvent, area?: string): void => {
    if (area) {
      if (!this.menuList && this.pointerInClient(evt)) {
        evt.preventDefault();
      }
      this.hide();
      return;
    }
    evt.preventDefault();
    if (!this.menuList) return;
    evt.stopPropagation();
    this.move(evt.pageX, evt.pageY);
    this.show();
  }

  private handleGlobalContextMenu = (evt: MouseEvent): void => {
    this.handleContextMenu(evt, "global");
  }

  /**
   * call it before remove all menu item
   *
   * @private
   * @memberof ContextMenu
   */
  private initEvent(): void {
    this.contextClient.addEventListener("contextmenu", this.handleContextMenu);
    window.addEventListener("contextmenu", this.handleGlobalContextMenu);
    window.addEventListener("click", this.handleWindowClick);
  }

  private removeEvent(): void {
    window.removeEventListener("click", this.handleWindowClick);
    window.removeEventListener("contextmenu", this.handleGlobalContextMenu);
    this.contextClient.removeEventListener("contextmenu", this.handleContextMenu);
    this.menuItemListenerList.forEach((func: Function) => func());
    this.menuItemListenerList = [];
  }

  private pointerInClient = (evt: MouseEvent): boolean => {
    const pos = getElementPos(this.contextClient);
    const maxX = pos.left + this.contextClient.offsetWidth;
    const maxY = pos.top + this.contextClient.offsetHeight;
    if (pos.left <= evt.pageX && evt.pageX <= maxX &&
      pos.top <= evt.pageY && evt.pageY <= maxY) {
      return true;
    } else {
      return false;
    }
  }
}