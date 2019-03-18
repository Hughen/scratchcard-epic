import { MenuItem } from "Options";
import { getElementPos } from "./util";

import "./style.css";

const classPrefix = "scratchcard-menu";

export default class ContextMenu {
  private menuData: MenuItem[];
  private menuList: HTMLElement;
  private container: HTMLElement;

  private topDiv: HTMLElement;
  private dropdownDiv: HTMLElement;

  private contextClient: HTMLElement;

  constructor(
    client: HTMLElement, menu?: MenuItem[], popupContainer?: HTMLElement
  ) {
    this.contextClient = client;
    this.menuData = menu || [];

    this.container = popupContainer || document.body;
    this.createMenuElement();
    this.loadToHtml();

    // global events can only be initialized once
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
      if (item.disabled) {
        li.classList.add("disabled");
      }
      li.setAttribute("role", "menuitem");
      console.log("createMenuElement", item);
      if (typeof item.text === "string") {
        li.innerText = item.text as string;
      } else {
        li.appendChild(item.text as HTMLElement);
      }
      li.addEventListener("click", item.onClick);
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
    this.menuList.remove();
    this.dropdownDiv.remove();
    this.topDiv.remove();
    this.menuList = null;
    this.menuData = [];

    // need to remove the listener?
    // is safe?
  }

  public reCreateMenu = (menu?: MenuItem[]): void => {
    this.remove();
    this.menuData = menu || [];
    this.createMenuElement();
    this.loadToHtml();
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
    console.log("handleWindowClick", evt);
    if (evt.target) {
      const clist = (evt.target as HTMLElement).classList;
      if (clist.contains(`${classPrefix}-item`) &&
        clist.contains("disabled"))
        return;
    }
    this.hide();
  }

  private handleContextMenu = (evt: MouseEvent, area?: string): void => {
    console.log("handleContextMenu", evt, area);
    if (area) {
      this.hide();
      if (this.pointerInClient(evt)) {
        evt.preventDefault();
      }
      return;
    }
    evt.preventDefault();
    evt.stopPropagation();
    this.move(evt.pageX, evt.pageY);
    this.show();
  }

  private initEvent(): void {
    this.contextClient.addEventListener("contextmenu", this.handleContextMenu);
    window.addEventListener("contextmenu", (evt) => {
      this.handleContextMenu(evt, "global");
    });
    window.addEventListener("click", this.handleWindowClick);
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