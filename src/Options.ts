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
}