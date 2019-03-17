import throttle from "lodash.throttle";
import ResizeObserver from "resize-observer-polyfill";
import { Options } from "Options";
import { number2Pixcel, isUrl, isCSSColor, loadImage, getElementPos,
  isMobileDevice } from "./util";
import Brush from 'Brush'

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

  private throttleMove: EventListenerOrEventListenerObject;

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
      this.cheight = this.container.clientHeight - 300;
    }

    this.createCanvas();
    this.brush = new Brush(this.ctx);

    // set a refresh rate time
    this.throttleMove = <EventListenerOrEventListenerObject>(
      throttle(this.handleMouseMove, 16)
    );

    this.init();
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
      this.cwidth = target.clientWidth;
      this.cheight = target.clientHeight - 300;

      this.canvas.width = this.cwidth;
      this.canvas.height = this.cheight;

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
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else if (rcoat instanceof HTMLImageElement) {
      this.ctx.drawImage(rcoat, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      new Error(`"${coating}", this type of coating is not supported`);
    }
  }

  // background must be inserted into html
  public setBackground = (
    bg: string | HTMLImageElement | HTMLElement
  ): void => {
    if (isUrl(bg)) {
      const htmlImg = document.createElement("img");
      htmlImg.alt = "";
      htmlImg.className = "scratchcard-content";
      loadImage(bg).then((img: HTMLImageElement) => {
        htmlImg.src = img.src;
        this.container.appendChild(htmlImg);
      });
    } else if (bg instanceof HTMLImageElement) {
      const htmlImg = document.createElement("img");
      htmlImg.alt = "";
      htmlImg.className = "scratchcard-content";
      htmlImg.src = bg.src;
      this.container.appendChild(htmlImg);
    } else if (typeof bg === "string") {
      this.ctx.font = `${this.options.fontSize} ${this.options.fontFamily}`;
      const mtxt = this.ctx.measureText(bg);
      console.log("setBackground measureText", bg, mtxt);
      const div = document.createElement("div");
      const span = document.createElement("span");
      span.innerText = bg;
      span.className = "scratchcard-content-bg";
      div.className = "scratchcard-content";
      div.appendChild(span);
      this.container.appendChild(div);
    } else {
      (bg as HTMLElement).classList.add("scratchcard-content");
      this.container.appendChild(bg as HTMLElement);
    }
  }

  private init(): void {
    this.clear();
    this.setCoating(this.options.coating);
    this.setBackground(this.options.content);
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
        self.canvas.removeEventListener(mmovename, self.throttleMove);
        document.body.removeEventListener(mupname, upFunc);
      }
      self.canvas.addEventListener(mmovename, self.throttleMove);
      document.body.addEventListener(mupname, upFunc);
    });

    window.addEventListener("scroll", throttle(this.relocateCanvas, 16));
  }

  private handleMouseMove = (evt: Event): void => {
    evt.preventDefault();
    console.log("handleMouseMove", this);
    const pos = this.getMousePos(evt);
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

    let pos: MousePos = {
      x: ex - this.canvasPos.left,
      y: ey - this.canvasPos.top
    };

    return pos;
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
}