import throttle from "lodash.throttle";
import ResizeObserver from "resize-observer-polyfill";
import { Options, MenuItem } from "Options";
import { number2Pixcel, isUrl, isCSSColor, loadImage, getElementPos,
  isMobileDevice, mouseClickType } from "./util";
import Brush from "Brush";
import ContextMenu from "ContextMenu";

const classPrefix = "scratchcard-content";

type Pos = {
  top: number;
  left: number;
};

type MousePos = {
  x: number;
  y: number;
};

const optionsDefault = {
  callback: () => {},
  size: {
    width: 300,
    height: 150
  },
  sizeAdaption: true,
  finishedThreshold: 0.5,
  fontFamily: "serif",
  fontSize: "14px",
  coating: "#b5b5b5",
  autoRefreshScratchedPercent: true,
  menuContainer: document.body,
};

/**
 * TODO: no sizeAdaption feature.
 *
 * @export
 * @class ScratchCard
 */
export default class ScratchCard {
  readonly options: Options;
  private cwidth: number;
  private cheight: number;
  public scratchedPercent: number;
  private ctx: CanvasRenderingContext2D;
  readonly container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private cRO: ResizeObserver;
  private canvasPos: Pos;
  private brush: Brush;
  private contextMenu: ContextMenu;
  private alreadyRefreshContextMenu: boolean;
  private menuData: MenuItem[];

  constructor(container: HTMLElement, options: Options, menu: MenuItem[]) {
    this.options = {
      ...optionsDefault,
      ...options,
      fontSize: number2Pixcel(options.fontSize) || optionsDefault.fontSize
    };
    this.container = <HTMLElement>container;
    this.scratchedPercent = 0;
    this.alreadyRefreshContextMenu = false;

    if (!this.options.sizeAdaption) {
      this.cwidth = this.options.size.width;
      this.cheight = this.options.size.height;
    } else {
      this.cwidth = this.container.clientWidth;
      this.cheight = this.container.clientHeight;
    }

    this.updateScratchedPercent = throttle(this.updateScratchedPercent, 16);

    // init background before canvas
    this.setBackground(this.options.content);

    this.createCanvas();
    this.brush = new Brush(this.ctx);

    this.initCard();
    this.initEvent();

    this.cRO = new ResizeObserver(this.resizeCanvas);
    this.cRO.observe(this.container);

    this.menuData = [...menu];
    this.contextMenu = new ContextMenu(this.canvas, this.menuData, this.options.menuContainer);
  }

  private createCanvas(): void {
    this.canvas = document.createElement("canvas");
    this.canvas.tabIndex = 0;

    this.canvas.width = this.cwidth;
    this.canvas.height = this.cheight;

    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext("2d");

    // init canvas pos
    this.relocateCanvas();
  }

  private resizeCanvas = (entries: any): void => {
    for (const entry of entries) {
      const target = (entry as any).target as HTMLElement;
      if (target !== this.container) continue;
      this.cwidth = target.clientWidth;
      this.cheight = target.clientHeight;

      this.canvas.width = this.cwidth;
      this.canvas.height = this.cheight;
      this.initCard();

      this.relocateCanvas();
    }
  }

  private clear = (): void => {
    // clear all content in canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * return Promise
   *
   * @memberof ScratchCard
   */
  public setCoating = (
    coating?: string | HTMLImageElement | CanvasGradient
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const rcoat = coating || this.options.coating;
      if (isUrl(rcoat)) {
        loadImage(rcoat).then((img: HTMLImageElement) => {
          this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
          resolve();
        }, reject);
      } else if (isCSSColor(rcoat)) {
        this.ctx.fillStyle = rcoat as (string | CanvasGradient);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        resolve();
      } else if (rcoat instanceof HTMLImageElement) {
        rcoat.crossOrigin = "";
        this.ctx.drawImage(rcoat, 0, 0, this.canvas.width, this.canvas.height);
        resolve();
      } else {
        reject(new Error(`"${coating}", this type of coating is not supported`));
      }
    });
  }

  // background must be inserted into html
  public setBackground = (
    bg: string | HTMLImageElement | HTMLElement
  ): void => {
    this.removeAllBackground();
    if (isUrl(bg)) {
      const htmlImg = document.createElement("img");
      htmlImg.alt = "";
      htmlImg.className = classPrefix;
      loadImage(bg).then((img: HTMLImageElement) => {
        htmlImg.src = img.src;
        htmlImg.style.visibility = "hidden";
        this.container.appendChild(htmlImg);
      });
    } else if (bg instanceof HTMLImageElement) {
      const htmlImg = document.createElement("img");
      htmlImg.alt = "";
      htmlImg.className = classPrefix;
      htmlImg.src = bg.src;
      htmlImg.style.visibility = "hidden";
      this.container.appendChild(htmlImg);
    } else if (typeof bg === "string") {
      this.ctx.font = `${this.options.fontSize} ${this.options.fontFamily}`;
      const div = document.createElement("div");
      const span = document.createElement("span");
      span.innerText = bg;
      span.className = `${classPrefix}-text`;
      div.className = classPrefix;
      div.appendChild(span);
      div.style.visibility = "hidden";
      this.container.appendChild(div);
    } else {
      (bg as HTMLElement).classList.add(classPrefix);
      (bg as HTMLElement).style.visibility = "hidden";
      this.container.appendChild(bg as HTMLElement);
    }
  }

  private initCard(): void {
    this.clear();
    this.setCoating(this.options.coating)
      .then(this.showBackground, (err) => {
        throw err;
      });
  }

  private initEvent(): void {
    const self = this;
    let mdownname: string, mupname: string, mmovename: string;
    if (isMobileDevice()) {
      mdownname = "touchstart";
      mupname = "touchend";
      mmovename = "touchmove";
    } else {
      mdownname = "mousedown";
      mupname = "mouseup";
      mmovename = "mousemove";
    }
    this.canvas.addEventListener(mdownname, function(evt) {
      evt.preventDefault();
      function upFunc(e: Event) {
        self.canvas.removeEventListener(mmovename, self.handleMouseMove);
        document.body.removeEventListener(mupname, upFunc);
        if (!self.options.autoRefreshScratchedPercent) {
          self.updateScratchedPercent();
        }
        if (self.scratchedPercent > self.options.finishedThreshold) {
          if (!self.alreadyRefreshContextMenu) {
            self.alreadyRefreshContextMenu = true;
            self.enableAllMenu();
            self.contextMenu.reCreateMenu(self.menuData);
          }
          if (mouseClickType(e) === 1) {
            self.triggerFinished();
          }
        }
      }
      self.canvas.addEventListener(mmovename, self.handleMouseMove);
      document.body.addEventListener(mupname, upFunc);
    });

    window.addEventListener("scroll", throttle(this.relocateCanvas, 16));
    window.addEventListener("resize", throttle(this.relocateCanvas, 16));
  }

  private handleMouseMove = (evt: MouseEvent): void => {
    evt.preventDefault();

    // disable hold on mouse right to scratch
    if (mouseClickType(evt) !== 1) return;

    const pos = this.getMousePos(evt);
    this.brush.moveBrushPos(pos.x, pos.y);
    this.scrach();

    if (this.options.autoRefreshScratchedPercent) {
      this.updateScratchedPercent();
    }
  }

  private getMousePos = (evt: Event): MousePos => {
    let ex, ey;
    if (evt.type === "mousemove") {
      ex = (evt as MouseEvent).clientX;
      ey = (evt as MouseEvent).clientY;
    } else if (evt.type === "touchmove") {
      ex = (evt as TouchEvent).touches[0].clientX;
      ey = (evt as TouchEvent).touches[0].clientY;
    }

    return {
      x: ex - this.canvasPos.left,
      y: ey - this.canvasPos.top
    };
  }

  private scrach = (): void => {
    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.save();
    this.brush.brush();
    this.ctx.restore();
  }

  private relocateCanvas = (): void => {
    this.canvasPos = getElementPos(this.canvas);
  }

  private removeAllBackground = (): void => {
    const bgs = this.container.querySelectorAll(`.${classPrefix}`);
    [].forEach.call(bgs, function(bg: HTMLElement) {
      bg.remove();
    });
  }

  private showBackground = (): void => {
    const bgs = this.container.querySelectorAll(`.${classPrefix}`);
    [].forEach.call(bgs, function(bg: HTMLElement) {
      bg.style.visibility = "visible";
    });
  }

  private updateScratchedPercent = (): void => {
    const imageData = this.ctx.getImageData(0, 0,
      this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const len = data.length;
    let lucidNum = 0;
    for (let i = 0; i < len; i += 4) {
      // RGBA is transparent
      if (data[i] === 0 && data[i+1] === 0 && data[i+2] === 0 && data[i+3] === 0) {
        lucidNum++;
      }
    }

    if (lucidNum > 0) {
      this.scratchedPercent =
        lucidNum / (this.canvas.width * this.canvas.height);
    } else {
      this.scratchedPercent = 0;
    }
  }

  private triggerFinished = (): void => {
    if (!this.options.callback) return;
    this.options.callback();
  }

  public setContextMenu = (menu: MenuItem[]): void => {
    this.contextMenu.reCreateMenu(menu);
  }

  private enableAllMenu = (): void => {
    const len = this.menuData.length;
    for (let i = 0; i < len; i++) {
      this.menuData[i].disabled = false;
    }
  }
}
