import throttle from "lodash.throttle";
import ResizeObserver from "resize-observer-polyfill";
import { Options } from "Options";
import { number2Pixcel, isUrl, isCSSColor, loadImage, getElementPos,
  isMobileDevice } from "./util";
import Brush from 'Brush'

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
  coating: "#c5c5c5",
};

export default class ScratchCard {
  readonly options: Options;
  private cwidth: number;
  private cheight: number;
  public scratchedPercent: number;
  private ctx: CanvasRenderingContext2D;
  readonly container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private cRO: ResizeObserver;
  private bg: HTMLElement;
  private canvasPos: Pos;
  private brush: Brush;

  constructor(container: HTMLElement, options: Options) {
    this.options = {
      ...optionsDefault,
      ...options,
      fontSize: number2Pixcel(options.fontSize) || optionsDefault.fontSize
    };
    this.container = <HTMLElement>container;
    this.scratchedPercent = 0;
    this.bg = null;

    if (!this.options.sizeAdaption) {
      this.cwidth = this.options.size.width;
      this.cheight = this.options.size.height;
    } else {
      this.cwidth = this.container.clientWidth;
      this.cheight = this.container.clientHeight;
    }

    // init background before canvas
    this.setBackground(this.options.content);

    this.createCanvas();
    this.brush = new Brush(this.ctx);

    this.initCard();
    this.initEvent();

    this.cRO = new ResizeObserver(this.resizeCanvas);
    this.cRO.observe(this.container);
  }

  private createCanvas(): void {
    this.canvas = document.createElement("canvas");

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
      console.log("resizeCanvas", target);
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

  public setCoating = (
    coating?: string | HTMLImageElement | CanvasGradient
  ): void => {
    const rcoat = coating || this.options.coating;
    if (isUrl(rcoat)) {
      loadImage(rcoat).then((img: HTMLImageElement) => {
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      });
    } else if (isCSSColor(rcoat)) {
      this.ctx.fillStyle = rcoat as (string | CanvasGradient);
      console.log("setCoating", coating, this.ctx);
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else if (rcoat instanceof HTMLImageElement) {
      this.ctx.drawImage(rcoat, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      new Error(`"${coating}", this type of coating is not supported`);
    }
  }

  // background must be inserted into html
  // but background visibility = hidden
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
      const mtxt = this.ctx.measureText(bg);
      console.log("setBackground measureText", bg, mtxt);
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
    this.setCoating(this.options.coating);
    this.showBackground();
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
      function upFunc() {
        self.canvas.removeEventListener(mmovename, self.handleMouseMove);
        document.body.removeEventListener(mupname, upFunc);
      }
      self.canvas.addEventListener(mmovename, self.handleMouseMove);
      document.body.addEventListener(mupname, upFunc);
    });

    window.addEventListener("scroll", throttle(this.relocateCanvas, 16));
    window.addEventListener("resize", throttle(this.relocateCanvas, 16));
  }

  private handleMouseMove = (evt: Event): void => {
    evt.preventDefault();
    const pos = this.getMousePos(evt);
    console.log("handleMouseMove", pos);
    this.brush.moveBrushPos(pos.x, pos.y);
    this.scrach();
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
      bg.style.visibility = "";
    });
  }
}