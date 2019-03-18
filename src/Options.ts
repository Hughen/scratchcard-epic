type EleSize = {
  width: number;
  height: number;
}

export interface Options {
  callback?: () => void;
  size?: EleSize;
  sizeAdaption?: boolean;
  finishedThreshold?: number;

  /**
   * The string type is the same as the coating field.
   * Also supports HTMLElement type content
   */
  content: string | HTMLImageElement | HTMLElement;

  fontFamily?: string;
  fontSize?: number | string;

  /**
   * Special instructions for string type:
   * 1. String using CSS Color syntax style, such as: "#c5c5c5"
   * 2. Can also be a picture uri, such as:
   *    "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png"
   */
  coating?: string | HTMLImageElement | CanvasGradient;

  /**
   * When this option is turned on, the proportion of the scratched area
   * is automatically updated.
   * For high performance requirements, this option should be turned off.
   * Default value is true.
   */
  autoRefreshScratchedPercent?: boolean;
}

export type MenuItemKey = "copy";

export interface MenuItem {
  key: MenuItemKey;
  text: string | HTMLElement;
  onClick: (evt: Event) => void;
  disabled?: boolean;
}
